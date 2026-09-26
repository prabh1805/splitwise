# Backend Design

This covers the two services built so far, **expense-service** and **balance-service**: how they fit together, and why things are done the way they are.

## Overview

```
                 POST /api/v1/expenses
                          │
                          ▼
┌──────────────────────── expense-service (MySQL: expense_service) ───────────────────────┐
│  ExpenseController → ExpenseService                                                      │
│     one DB transaction:  expense  +  expense_share rows  +  outbox row (PENDING)         │
│                                                                                          │
│  OutboxPoller (every 5s) → reads PENDING rows → publishes to Kafka → marks PUBLISHED     │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                          │  topic: expense-created   key: expenseId   value: JSON
                          ▼
┌──────────────────────── balance-service (MySQL: balance_service, port 8081) ────────────┐
│  ExpenseCreatedConsumer → LedgerService → ledger_entry rows (one per debtor)             │
│                                                                                          │
│  BalanceController → sums ledger per (debtor, creditor) pair → nets opposite pairs       │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

- Each service owns its own database. Neither one reads the other's tables.
- The services only talk through Kafka (Aiven-hosted, SASL_SSL + SCRAM-SHA-256, CA cert loaded from `ca.pem` on the classpath).
- Payloads are plain JSON strings (String serializer/deserializer), not Avro or typed JSON serde. Each side has its own copy of the event class, so they aren't coupled by a shared library.

---

## expense-service

### API

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/expenses` | Create an expense (equal or custom split) |
| `GET` | `/api/v1/expenses/{id}` | Get one expense with its shares |
| `GET` | `/api/v1/expenses?groupId=&page=&size=&sortBy=&sortDirection=` | Paged expenses for a group |

### Data model

- **`Expense`**: `id`, `groupId`, `paidBy`, `totalAmount` (`DECIMAL(12,2)`), timestamps.
- **`ExpenseShare`**: one row per participant, `(expense_id, user_id)` unique, `shareAmount`. The payer can also have a share; that's their own part of the bill.
- **`Outbox`**: `payload` (JSON column), `status` (`PENDING` / `PUBLISHED` / `FAILED`), `aggregateId` (the expense id), `attemptCount`, `publishedAt`.

Users and groups are just `Long` ids. There's no user or group service yet, so nothing checks that they exist.

### Polymorphic request

`ExpenseRequest` is abstract. Jackson picks the subclass from the `splitType` field:

- `EQUAL` → `EqualSplitRequest { participantUserIds }`
- `CUSTOM` → `CustomSplitRequest { participantShares: [{ userId, shareAmount }] }`

The shared fields (`paidBy`, `totalAmount > 0`, `splitType`) are validated with Bean Validation on the base class. The service then dispatches with `instanceof` pattern matching.

### Money handling

- Always `BigDecimal`, never `double`.
- **Equal split**: each share is `total / n` rounded **down** to 2 decimals. The leftover paise (always fewer than `n`) go to the **first participant**, so the shares always add up to exactly the total. Example: ₹100 / 3 → 33.34, 33.33, 33.33.
- **Custom split**: the request is rejected (`400`) unless the shares add up to exactly `totalAmount`.

### Transactional outbox

**Problem:** writing the expense to MySQL and publishing to Kafka are two separate systems. If you do both inline, a crash between them either loses the event or publishes an event for a rollback.

**Decision:** `createExpense` is `@Transactional` and writes the outbox row in the **same transaction** as the expense and shares. Either all three commit or none do. Publishing happens later and separately.

**`OutboxPoller`** (`@Scheduled(fixedDelay = 5000)`):

1. Fetches up to `outbox.poller.batch-size` `PENDING` rows, oldest first (`createdAt ASC`, hardcoded so ordering can't be misconfigured).
2. Sends them all to Kafka at once (async), then **waits for each ack** (10s timeout). Waiting keeps a run from overlapping the next scheduled run and double-sending the same rows.
3. Each result is handled based on *why* it failed:

| Outcome | Meaning | Action |
|---|---|---|
| Ack | Kafka stored it | `PUBLISHED`, set `publishedAt` |
| `ExecutionException` | Kafka answered and rejected *this message* | `attemptCount++`; after 5 attempts → `FAILED` (logged as error for manual attention) |
| `TimeoutException` | No answer, Kafka probably down | Stop the batch. Don't count an attempt, because it isn't the row's fault. Remaining rows stay `PENDING` |
| `InterruptedException` | App shutting down | Restore the interrupt flag and return |

- **Message key = expenseId**, so every event for one expense goes to the same partition, in order.
- **Delivery is at-least-once.** A row can be sent and then the service crashes before it's marked `PUBLISHED`, or a timed-out send can still land later. Either way, Kafka can get duplicates. The consumer handles that (see idempotency below).

### Event contract: `expense-created`

```json
{
  "eventId": "uuid",
  "expenseId": 42,
  "groupId": 7,
  "paidBy": 1,
  "totalAmount": 100.00,
  "shares": [ { "userId": 1, "shareAmount": 33.34 }, { "userId": 2, "shareAmount": 33.33 } ]
}
```

`eventId` is a random UUID generated when the outbox row is written, so it's stable across re-sends of that row. It's the dedupe key downstream.

### Reads

- The group listing is paginated. It fetches the page of expenses and then **all their shares in one `IN` query**, grouped in memory. That avoids an N+1 query per expense.
- `ExpenseShare → Expense` is `LAZY` `@ManyToOne`.

### Errors

`GlobalExceptionHandler` maps:
- `IllegalArgumentException` → 400
- validation errors → 400 with a `fieldErrors` map
- `ResponseStatusException` → its own status (e.g. 404 for an unknown expense)
- anything else → 500

---

## balance-service

### API

| Method | Path | Returns |
|---|---|---|
| `GET` | `/api/v1/balances?groupId=` | Net "who owes whom" within a group: `[{ debtorId, creditorId, amount }]` |
| `GET` | `/api/v1/balances/users/{userId}` | That user's net position with everyone: `[{ otherUserId, amount, youOwe }]` |

### Ledger, not running balances

**Decision:** store an **append-only ledger** instead of updating a "balance" row.

`LedgerEntry`: `eventId`, `groupId`, `debtorId`, `creditorId`, `amount` (`DECIMAL(19,2)`), `sourceType` (`EXPENSE` / `SETTLEMENT`), `sourceId`, `createdAt`.

- The entity is Hibernate `@Immutable`, has no setters, and has a protected no-arg constructor, so rows can't be edited.
- **Why:** there's a full audit trail, no read-modify-write races on a shared balance row, and every balance can be traced back to its source expense. Balances are always derived, so there's nothing to drift out of sync.
- `SourceType.SETTLEMENT` is there so a future "settle up" can be one more ledger entry in the opposite direction instead of a special case.

### Consuming `expense-created`

For each share in the event, write one entry `debtor = share.userId → creditor = paidBy` for `share.amount`. **The payer's own share is skipped** (you don't owe yourself). All entries for one event are saved in a single transaction.

**Malformed events** (missing `eventId`, `expenseId`, `paidBy` or `shares`) are logged and skipped. They could never succeed, so letting them go through the listener's retries would only block the partition.

### Idempotency

Because the producer is at-least-once, the same event can arrive twice.

- `ledger_entry` has a **unique constraint on `(eventId, debtor_id)`**. One event can create at most one entry per debtor.
- Replaying an event hits that constraint. The whole transaction rolls back, and the consumer catches `DataIntegrityViolationException` and logs "already processed".
- **Why a DB constraint instead of a "processed events" check:** it's atomic with the insert, so there's no check-then-insert race between two consumers, and no extra table.

Consumer group is `balance-service` with `auto.offset.reset = earliest`, so a new deployment reads the topic from the beginning instead of silently skipping history.

### Computing balances

1. SQL `GROUP BY (debtorId, creditorId)` → the total owed in each direction for each pair (`PairBalance`).
2. `netPairs` in Java: for each pair, subtract the reverse direction. Only a positive result is kept, so each pair of people shows up **once**, in the direction money actually flows. Pairs that net to zero are left out.
3. For the user view, each net pair is turned around from that user's side: `youOwe = true` if they're the debtor.

The user endpoint nets **across all groups**, like Splitwise's overall "you owe / you are owed" total. The group endpoint only looks at one group.

---

## Known gaps / TODO

- **Poller isn't safe with multiple instances.** Two expense-service instances would read the same `PENDING` rows. That's still correct thanks to consumer idempotency, but it wastes sends. Fix: `SELECT … FOR UPDATE SKIP LOCKED`, or a leader lock (ShedLock).
- **No consumer error handling.** Deserialization errors and non-constraint DB errors fall back to Spring Kafka's default retry-then-skip. A `DefaultErrorHandler` with a dead-letter topic would be better.
- **`FAILED` outbox rows** have no replay endpoint or alert yet. They only show up in the logs.
- **No group/membership validation.** `groupId` is optional, and nothing checks that participants or the payer belong to the group, or that the payer is a participant.
- **Custom split** doesn't reject duplicate user ids up front. The DB unique constraint catches them, but as a 500 instead of a 400.
- **`findPairBalancesByGroupId`** aliases the sum as `total`, while the user query and `PairBalance` use `amount`. Worth making them match.
- The unique constraint mixes a logical name (`eventId`) with a physical one (`debtor_id`). It works, but `event_id` would be consistent.
- **Balance-service uses `ddl-auto=create`**, which wipes the ledger on every restart. Fine for dev, but switch to `update` or migrations (Flyway) before keeping real data. Expense-service already uses `update`.
- Balance-service has no global exception handler yet, and its Kafka config still has a temporary `System.out.println`.
- The generic 500 handler in expense-service returns `e.getMessage()` to the client, which can leak internal details.
- No tests yet for the split math, the poller outcomes or the netting logic.
