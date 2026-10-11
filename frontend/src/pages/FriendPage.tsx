import { useCallback, useEffect, useRef, useState } from 'react'
import { AddExpenseModal } from '../components/AddExpenseModal'
import { BalanceBreakdown } from '../components/BalanceBreakdown'
import { ExpenseList } from '../components/ExpenseList'
import { CashIcon, PlusIcon } from '../components/icons'
import { SettleUpModal } from '../components/SettleUpModal'
import { Avatar, Button, Card, Empty, Skeleton } from '../components/ui'
import { api } from '../lib/api'
import { refreshFriends, useFriends } from '../lib/friends'
import { refreshGroups } from '../lib/groups'
import { formatMoney } from '../lib/money'
import { toast } from '../lib/toast'
import { useAsync } from '../lib/useAsync'
import { isUnknownUser, useUserNames } from '../lib/users'

// Same lag as on the group page: the expense reaches balance-service through the outbox poller and Kafka
const BALANCE_RELOADS_MS = [1500, 4000, 7000, 11000]

type Dialog = { kind: 'expense' } | { kind: 'settle' }

export function FriendPage({ friendId, me }: { friendId: number; me: number }) {
  const nameOf = useUserNames([me, friendId])
  const friend = nameOf(friendId)
  const meUser = nameOf(me)
  const { overall } = useFriends()

  const loadDirect = useCallback(() => api.directBalance(friendId), [friendId])
  const direct = useAsync(loadDirect)
  const directNet = direct.data ? (direct.data.youOwe ? -direct.data.amount : direct.data.amount) : undefined
  const total = overall[friendId] ?? 0

  const [expensesVersion, setExpensesVersion] = useState(0)
  const [dialog, setDialog] = useState<Dialog>()
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function reloadBalancesSoon() {
    timers.current.forEach(clearTimeout)
    timers.current = BALANCE_RELOADS_MS.map((ms) =>
      window.setTimeout(() => {
        direct.reload()
        refreshFriends()
        refreshGroups()
      }, ms),
    )
  }

  // The lookup only knows people who are your friends or share a group with you
  if (!friend) {
    if (!isUnknownUser(friendId)) return <Skeleton className="h-28 rounded-3xl" />
    return (
      <Card>
        <Empty icon="🔍" title="Person not found">
          You can only see people you’ve added as friends or share a group with.
          <div className="mt-4">
            <a href="#/" className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-400">
              Back to dashboard
            </a>
          </div>
        </Empty>
      </Card>
    )
  }

  const people = [meUser ?? { id: me, name: 'You', email: '' }, friend]
  const closeDialog = () => setDialog(undefined)
  const settled = Math.abs(total) < 0.005

  return (
    <div className="space-y-6 pb-20 sm:pb-0">
      <a href="#/" className="text-sm font-medium text-slate-500 hover:text-slate-900 lg:hidden dark:text-slate-400 dark:hover:text-white">
        ← Dashboard
      </a>

      <section className="relative overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-brand-50 via-white to-white dark:from-brand-950/40 dark:via-slate-900 dark:to-slate-900" />
        <div className="relative flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar id={friend.id} name={friend.name} size="lg" className="size-14 text-lg sm:size-16" />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{friend.name}</h1>
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">{friend.email}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div
              className={`rounded-2xl px-4 py-2 leading-tight ${
                settled
                  ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  : total > 0
                    ? 'bg-brand-100 text-brand-800 dark:bg-brand-500/15 dark:text-brand-300'
                    : 'bg-owe-100 text-owe-700 dark:bg-owe-500/15 dark:text-owe-400'
              }`}
            >
              <div className="text-xs font-medium opacity-80">{settled ? 'Overall' : total > 0 ? `${friend.name} owes you` : `You owe ${friend.name}`}</div>
              <div className="font-bold tabular-nums">{settled ? 'All settled up' : formatMoney(Math.abs(total))}</div>
            </div>
            <div className="flex gap-2">
              <Button className="hidden px-4 sm:inline-flex" onClick={() => setDialog({ kind: 'expense' })}>
                <PlusIcon className="size-4" /> Add expense
              </Button>
              <Button className="flex-1 px-4 sm:flex-none" variant="owe" onClick={() => setDialog({ kind: 'settle' })}>
                <CashIcon className="size-4" /> Settle up
              </Button>
            </div>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setDialog({ kind: 'expense' })}
        aria-label="Add expense"
        className="fixed right-5 bottom-5 z-30 flex size-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600 active:scale-95 sm:hidden"
      >
        <PlusIcon className="size-7" />
      </button>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <ExpenseList key={expensesVersion} withUserId={friend.id} me={me} onAdd={() => setDialog({ kind: 'expense' })} />
          <p className="mt-2 px-1 text-xs text-slate-500 dark:text-slate-400">
            Only expenses outside groups are listed here. Group expenses stay in their group.
          </p>
        </div>
        <Card title="Where it comes from" padded={false} className="self-start">
          <div className="p-3">
            <BalanceBreakdown me={me} otherId={friend.id} otherName={friend.name} total={total} direct={directNet} linkDirect={false} />
          </div>
        </Card>
      </div>

      {dialog?.kind === 'expense' && (
        <AddExpenseModal
          people={people}
          groupId={null}
          context={`Just between you and ${friend.name}, not in a group`}
          me={me}
          onClose={closeDialog}
          onCreated={() => {
            closeDialog()
            toast('Expense added')
            setExpensesVersion((v) => v + 1)
            reloadBalancesSoon()
          }}
        />
      )}
      {dialog?.kind === 'settle' && (
        <SettleUpModal
          people={people}
          groupId={null}
          context="overall"
          me={me}
          debts={total < 0 ? [{ creditorId: friend.id, amount: -total }] : []}
          onClose={closeDialog}
          onRecorded={(name) => {
            closeDialog()
            toast(`Payment recorded. It counts once ${name} confirms it.`)
          }}
        />
      )}
    </div>
  )
}
