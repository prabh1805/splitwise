# Backend Design — V1

This covers the three services built so far: **user-group-service** (registration and JWT login), **expense-service** and **balance-service** (including settle up). It explains how they fit together and why things are done the way they are.

## Overview

```
          POST /api/v1/auth/register  ·  POST /api/v1/auth/login
                          │
                          ▼
┌──────────────────── user-group-service (MySQL: usergroup_service, port 8082) ────────────┐
│  AuthController → UserService → user row (BCrypt hash, normalized email)                 │
│  login → AuthenticationManager → JwtService signs access token (RSA private key)         │
│                                                                                          │
│  JwtAuthenticationFilter verifies Bearer tokens with the public key → userId             │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                          │  { accessToken, tokenType: "Bearer", expiresIn }
                          ▼
           client sends  Authorization: Bearer <jwt>  on later requests
                          │
                          ▼  POST /api/v1/expenses
┌──────────────────── expense-service (MySQL: expense_service, port 8080) ─────────────────┐
│  (JWT verification with the public key: in progress, see Authentication)                 │
│  ExpenseController → ExpenseService                                                      │
│     one DB transaction:  expense  +  expense_share rows  +  outbox row (PENDING)         │
│                                                                                          │
│  OutboxPoller (every 5s) → reads PENDING rows → publishes to Kafka → marks PUBLISHED     │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                          │  topic: expense-created   key: expenseId   value: JSON
                          ▼
┌──────────────────── balance-service (MySQL: balance_service, port 8081) ─────────────────┐
│  ExpenseCreatedConsumer → LedgerService → ledger_entry rows (one per debtor)             │
│                                                                                          │
│  BalanceController → sums ledger per (debtor, creditor) pair → nets opposite pairs       │
│                                                                                          │
│  SettlementController → SettlementService → settlement row (PENDING)                     │
│     receiver acknowledges → ACKNOWLEDGED + one SETTLEMENT ledger entry (same txn)        │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

- Each service owns its own database. Neither one reads the other's tables.
- Nothing calls another service over HTTP at runtime. The only link to user-group-service is the JWT it issues: other services check the token with the RSA **public key** and never call back to it (see **Authentication**).
- expense-service and balance-service only talk through Kafka (Aiven-hosted, SASL_SSL + SCRAM-SHA-256, CA cert loaded from `ca.pem` on the classpath).
- Payloads are plain JSON strings (String serializer/deserializer), not Avro or typed JSON serde. Each side has its own copy of the event class.
  - **Benefit:** no shared library, so the services aren't compile-coupled and can be versioned and deployed independently.
  - **Cost:** if the copies drift apart, nothing fails. Spring Boot's `ObjectMapper` ignores unknown properties, so a renamed or missing field just arrives as `null`. A shared event module would catch that at compile time, but it would compile-couple the two services and force them to bump versions together.

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

Users and groups are just `Long` ids. user-group-service now owns users, groups and memberships, but expense-service doesn't call it, so nothing checks that the ids exist.

### Polymorphic request

`ExpenseRequest` is abstract. Jackson picks the subclass from the `splitType` field:

- `EQUAL` → `EqualSplitRequest { participantUserIds }`
- `CUSTOM` → `CustomSplitRequest { participantShares: [{ userId, shareAmount }] }`

The shared fields (`paidBy`, `totalAmount > 0`, `splitType`) are validated with Bean Validation on the base class. The service then dispatches with `instanceof` pattern matching.

### Money handling

- Always `BigDecimal`, never `double`.
- **Equal split**: each share is `total / n` rounded **down** to 2 decimals. The leftover paise (always fewer than `n`) go to the **first participant**, so the shares always add up to exactly the total. Examples:
  - ₹100 / 3 → base 33.33, 1 paisa left over → 33.34, 33.33, 33.33.
  - ₹100 / 6 → base 16.66 × 6 = 99.96, 4 paise left over, **all to the first participant** → 16.70, 16.66, 16.66, 16.66, 16.66, 16.66.
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
| `POST` | `/api/v1/settlements` | Record a payment `{ idempotencyKey, payerId, receiverId, groupId?, amount }` → `201`, `PENDING` |
| `POST` | `/api/v1/settlements/{id}/acknowledge?userId=` | Receiver confirms the money arrived → `ACKNOWLEDGED` |
| `POST` | `/api/v1/settlements/{id}/reject?userId=` | Receiver says it never arrived → `REJECTED` |
| `GET` | `/api/v1/settlements/{id}` | Get one settlement |

### Ledger, not running balances

**Decision:** store an **append-only ledger** instead of updating a "balance" row.

`LedgerEntry`: `eventId`, `groupId`, `debtorId`, `creditorId`, `amount` (`DECIMAL(19,2)`), `sourceType` (`EXPENSE` / `SETTLEMENT`), `sourceId`, `createdAt`.

- The entity is Hibernate `@Immutable`, has no setters, and has a protected no-arg constructor, so rows can't be edited.
- **Why:** there's a full audit trail, no read-modify-write races on a shared balance row, and every balance can be traced back to its source expense. Balances are always derived, so there's nothing to drift out of sync.
- `SourceType.SETTLEMENT` was reserved from the start so that settle up could be one more ledger entry in the opposite direction instead of a special case. It's now used that way (see **Settle up** below).

### Consuming `expense-created`

For each share in the event, write one entry `debtor = share.userId → creditor = paidBy` for `share.amount`. **The payer's own share is skipped** (you don't owe yourself). All entries for one event are saved in a single transaction.

**Malformed events** (missing `eventId`, `expenseId`, `paidBy` or `shares`) are logged and skipped. They could never succeed. Spring Kafka's default error handler would retry each one (10 attempts) and then commit past it, so the partition does unblock in the end. The cost is ten identical failures and ten stack traces for an event that was never going to work. (A poison row blocking the queue was a real problem in the outbox poller, not here.)

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

### Settle up

**Problem:** when A pays B back outside the app, the balance has to go down. But A alone saying "I paid" shouldn't be enough to wipe out a debt.

**Decision:** a settlement is a two-step handshake. The payer records it, and it only counts once the **receiver acknowledges** it.

`Settlement`: `idempotencyKey` (unique), `payerId`, `receiverId`, `groupId` (optional), `amount` (`DECIMAL(19,2)`), `status`, `createdAt`, `statusChangedAt`.

```
            create                acknowledge (receiver only)
  (none) ─────────▶ PENDING ─────────────────────────────▶ ACKNOWLEDGED  → ledger entry written
                       │
                       └──────── reject (receiver only) ──▶ REJECTED     → no ledger change
```

- **Only `PENDING` can move.** Acknowledging or rejecting anything else is a `409`. Both final states are terminal.
- **Only the receiver** can acknowledge or reject (`403` otherwise). For now the caller's id is a `userId` query param, since there's no auth yet.
- `payerId == receiverId` is rejected with `400`.

**Hitting the ledger:** on acknowledge, in the **same transaction** as the status change, one entry is written:

```
debtor = receiverId → creditor = payerId, amount, sourceType = SETTLEMENT, sourceId = settlement.id, eventId = idempotencyKey
```

That's the reverse of the original debt, so the existing `netPairs` logic cancels it out with no special case. This is exactly what `SourceType.SETTLEMENT` was reserved for. A rejected settlement never touches the ledger, so the ledger stays a record of money that actually moved.

**No check against the actual debt (deliberate).** The amount isn't validated against the current balance:
- **A check would race.** Expense events keep arriving, so the balance you validated can be out of date by the time the settlement is inserted.
- **Over- and under-payment are legitimate.** The ledger handles both as plain arithmetic. If B owes A ₹200 and settles ₹500, the pair nets to A owing B ₹300, with no special case.
- The receiver's acknowledgment is the human check.

**Idempotency:** the client sends an `idempotencyKey` (UUID). It's unique in the `settlement` table, so a retried `POST` hits the constraint and gets `409` instead of creating a second settlement. The `409` is deliberate, to match acknowledge/reject, which also return `409` for repeated work. Returning `200` with the existing settlement is a possible alternative, but the current behavior isn't a bug. The same key is reused as the ledger `eventId`, and the `(eventId, debtor_id)` constraint means one settlement can never produce two ledger entries.

### Errors

balance-service now has its own `GlobalExceptionHandler`, same shape as expense-service: `IllegalArgumentException` → 400, validation → 400 with `fieldErrors`, `ResponseStatusException` → its status. The catch-all 500 logs the stack trace server-side and returns a generic "Something went wrong", so internals don't leak to the client.

---

## user-group-service

Owns users, groups and group memberships, and issues the access tokens the other services trust. Groups and memberships have entities but no API yet.

### API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | public | Create a user `{ name, email, password }` → `201` with `{ id, name, email, createdAt }` |
| `POST` | `/api/v1/auth/login` | public | `{ email, password }` → `200` with `{ accessToken, tokenType: "Bearer", expiresIn }` |
| `GET` | `/api/v1/users/me` | Bearer | Who the token belongs to (for now a plain string, for testing) |

### Data model

- **`User`**: `id`, `name`, `email` (unique), `hashedPassword`, `createdAt`. It implements Spring Security's `UserDetails` directly (`username` = email, no authorities), so no separate adapter class is needed.
- **`Group`** (table `user_group`, because `group` is a reserved word in SQL): `id`, `groupName`, `createdBy` (`LAZY` `@ManyToOne` to `User`), `createdAt`.
- **`Membership`**: composite key `MembershipId(userId, groupId)` via `@EmbeddedId` + `@MapsId`, so one user can join a group only once, enforced by the primary key. Has `joinedAt`.

### Registration

- **Emails are normalized** (`trim` + lowercase, `Locale.ROOT`) on both register and login, so `Foo@X.com ` and `foo@x.com` are the same account. `Locale.ROOT` avoids locale bugs like the Turkish dotless `i`.
- **Passwords are hashed with BCrypt.** The 8 to 72 character limit matches BCrypt, which ignores anything after 72 bytes.
- **Duplicate email → `409`**, checked twice: `existsByEmail` gives a clean error in the normal case, and the unique constraint catches two registrations racing each other (`DataIntegrityViolationException` → `409`).

### Authentication

**Problem:** expense-service and balance-service need to know who is calling. Calling user-group-service on every request would make it a runtime dependency of everything, and sessions don't work across services.

**Decision:** stateless **JWT access tokens signed with RSA** (jjwt 0.13).

- **Login:** `AuthController` passes the credentials to an `AuthenticationManager` (a `DaoAuthenticationProvider` using `DbUserDetailsService` + BCrypt). A bad email or password throws `AuthenticationException`, and `GlobalExceptionHandler` maps it to `401 "Invalid email or password"`. The message is the same for both, so the endpoint doesn't reveal which emails are registered.
- **Token:** `sub` = user id, `iat`, `exp` = now + `jwt.access-token-ttl` (1800s = 30 min). No other claims. jjwt picks the RSA algorithm from the key size (RS256 for a 2048-bit key).
- **Why RSA and not a shared HMAC secret:** only user-group-service holds the **private key** and can sign tokens. Other services get just the **public key**, which can verify tokens but not create them. If expense-service leaked its key, nobody could forge tokens with it.
- **Keys** are PEM files read from `~/splitwise-keys/` (`jwt.private-key`, `jwt.public-key`), outside the repo. `JwtKeyConfig` strips the PEM header and footer and loads them as PKCS#8 (private) and X.509 (public).
- **Verifying requests:** `JwtAuthenticationFilter` (before `UsernamePasswordAuthenticationFilter`) reads `Authorization: Bearer …` and checks the signature and expiry. On success it sets the principal to the **`Long` user id** with no DB lookup. Controllers get it with `@AuthenticationPrincipal Long userId`.
  - A missing or bad token doesn't fail in the filter. The request continues as anonymous, and protected endpoints get `401` from the `HttpStatusEntryPoint`. That way one rule decides access, and public endpoints still work with a stale token.
- **Security config:** session policy `STATELESS`, form login and logout removed (this replaces the earlier session-based login), CSRF disabled. That's safe because the token comes from a header the browser doesn't attach automatically, unlike a cookie. `/api/v1/auth/**` and `/error` are public, everything else needs a token.

**Rolling it out to the other services (in progress):** expense-service now has `spring-boot-starter-security`, jjwt, and copies of `JwtKeyConfig`, `JwtService` and `JwtAuthenticationFilter`. It's meant to verify tokens with the public key only. The copies aren't adapted yet (see **Known gaps**). balance-service hasn't started.

---

## Known gaps / TODO

- **Poller isn't safe with multiple instances.** Two expense-service instances would read the same `PENDING` rows. That's still correct thanks to consumer idempotency, but it wastes sends. Fix: `SELECT … FOR UPDATE SKIP LOCKED`, or a leader lock (ShedLock).
- **No consumer error handling.** Deserialization errors and non-constraint DB errors fall back to Spring Kafka's default retry-then-skip. A `DefaultErrorHandler` with a dead-letter topic would be better.
- **`FAILED` outbox rows** have no replay endpoint or alert yet. They only show up in the logs.
- **No group/membership validation.** `groupId` is optional, and nothing checks that participants or the payer belong to the group, or that the payer is a participant.
- **Custom split** doesn't reject duplicate user ids up front. The DB unique constraint catches them, but as a 500 instead of a 400.
- **`PairBalance` is bound by position, not by alias.** `findPairBalancesByGroupId` aliases the sum as `total`, but the record's component is `amount`, and the endpoint still returns correct values. So Spring Data is matching columns to the record's constructor by position. If someone reorders the record's components (e.g. swaps `debtorId` and `creditorId`), the columns silently bind to the wrong fields and nothing errors. Fix: make the aliases match (`amount`), and cover it with a test.
- The unique constraint mixes a logical name (`eventId`) with a physical one (`debtor_id`). It works, but `event_id` would be consistent.
- **Both services use `ddl-auto=update`.** OK for dev, but move to migrations (Flyway) before keeping real data.
- Balance-service's Kafka config still has a temporary `System.out.println`.
- **No auth in balance-service yet.** The acting user for acknowledge/reject is a `userId` query param, so anyone can pass the receiver's id. Should come from the JWT principal once the filter is rolled out there.
- **`DataIntegrityViolationException` catches are too broad.** The consumer's "already processed" and settlement create's "duplicate key" both catch any integrity violation. A NOT NULL or data-too-long error would be reported as a duplicate.
- **`statusChangedAt` comes before `createdAt` on a new settlement.** The service sets `statusChangedAt = Instant.now()` before `@CreationTimestamp` fires at persist time, so `statusChangedAt` ends up slightly *earlier* than `createdAt`.
- **`GET /api/v1/settlements/{id}` has no caller check.** Anyone can read any settlement by id.
- No endpoint to list settlements (e.g. pending ones waiting on me, or all settlements in a group), and no way for the payer to cancel a `PENDING` one.
- `SettlementService.acknowledge` saves the settlement twice. Harmless, but the second save can go.
- The generic 500 handler in expense-service still returns `e.getMessage()` to the client, which can leak internal details. balance-service already does this right; copy that.
- No tests yet for the split math, the poller outcomes, the netting logic or the settlement state machine.

### Auth / user-group-service

- **expense-service JWT files are unedited copies and won't compile.** `JwtKeyConfig`, `JwtService` and `JwtAuthenticationFilter` under expense-service still declare `package com.prabh.splitwise.usergroup.*` and import `usergroup.entity.User` / `usergroup.service.JwtService`, which don't exist in that module. They need the `com.prabh.splitwise.expense` packages.
- **expense-service would need the private key.** The copied `JwtKeyConfig` builds a `PrivateKey` bean from `jwt.private-key`, and `JwtService` needs `jwt.access-token-ttl`. expense-service only sets `jwt.public-key`, so startup would fail. Worse, giving it the private key would defeat the point of RSA. expense-service should only load the public key and only verify tokens (no `generateToken`).
- **expense-service has no `SecurityFilterChain`.** With the security starter on the classpath, Spring Boot's default applies: every endpoint needs HTTP Basic/form login with a generated password, and the JWT filter isn't registered. It needs its own `SecurityConfig` like user-group-service's (stateless, JWT filter, `401` entry point).
- **The JWT code is now copied between services.** Fine for now, matching the "own copy of the event class" choice. If it spreads to balance-service too, a small shared `security` module, or Spring's `oauth2-resource-server` with a public key, would remove three copies.
- **No refresh tokens or logout.** Once issued, a token is valid for its full 30 minutes, and there's no way to revoke it (e.g. after a password change). The user has to log in again when it expires.
- **No `iss`/`aud` claims.** Any token signed by the key is accepted by any service. Fine with one issuer, but adding `iss` and checking it is cheap.
- **`user-group-service` uses `ddl-auto=create`**, which drops and recreates every table on each restart, so registered users disappear. Switch to `update` (or Flyway) like the other services.
- `logging.level.org.springframework.security=DEBUG` is still on in user-group-service.
- `LoginRequest` reuses the register rules (`@Email`, `@Size(min = 8)`), so a short password at login gets a `400` with field errors instead of `401`. Login should probably only check `@NotBlank`.
- `/api/v1/users/me` loads the user on each call and returns a string. It should return `UserResponse`.
- user-group-service's `GlobalExceptionHandler` only handles `AuthenticationException`. Validation errors and `ResponseStatusException` fall back to Spring's default error body, unlike the other two services.
- No group or membership endpoints yet (create group, add member, list my groups), so the "is this user in this group?" check expense-service needs doesn't exist yet.
