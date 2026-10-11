import { useCallback, useEffect, useRef, useState } from 'react'
import { AddExpenseModal } from '../components/AddExpenseModal'
import { ExpenseList } from '../components/ExpenseList'
import { GroupBalancesPanel } from '../components/GroupBalancesPanel'
import { GroupSettingsModal } from '../components/GroupSettingsModal'
import { CashIcon, CogIcon, PlusIcon, UsersIcon } from '../components/icons'
import { SettleUpModal } from '../components/SettleUpModal'
import { GroupIcon } from '../components/Sidebar'
import { Alert, Avatar, Button, Card, Empty, ListSkeleton, Skeleton } from '../components/ui'
import { ApiError, api, errorMessage } from '../lib/api'
import { netByPerson } from '../lib/balances'
import { refreshGroups, updateGroupBalances } from '../lib/groups'
import { formatMoney } from '../lib/money'
import { toast } from '../lib/toast'
import type { GroupDetails } from '../lib/types'
import { useAsync } from '../lib/useAsync'
import { rememberUsers } from '../lib/users'

// Balances are written by balance-service after it consumes the expense event from Kafka, and the
// outbox poller only publishes every 5s, so a new expense can take several seconds to show up.
const BALANCE_RELOADS_MS = [1500, 4000, 7000, 11000]

type Dialog = { kind: 'expense' } | { kind: 'settle'; initial?: { receiverId: number; amount: number } } | { kind: 'settings' }

export function GroupPage({ groupId, me }: { groupId: number; me: number }) {
  const loadGroup = useCallback(() => api.getGroup(groupId), [groupId])
  const { data: loaded, error } = useAsync(loadGroup)
  const [edited, setEdited] = useState<GroupDetails>()
  const group = edited ?? loaded

  const loadBalances = useCallback(() => api.groupBalances(groupId), [groupId])
  const balances = useAsync(loadBalances)

  const [expensesVersion, setExpensesVersion] = useState(0)
  const [dialog, setDialog] = useState<Dialog>()
  const reloadTimers = useRef<number[]>([])

  useEffect(() => () => reloadTimers.current.forEach(clearTimeout), [])

  function reloadBalancesSoon() {
    reloadTimers.current.forEach(clearTimeout)
    reloadTimers.current = BALANCE_RELOADS_MS.map((ms) => window.setTimeout(balances.reload, ms))
  }

  useEffect(() => {
    if (group) rememberUsers(group.members)
  }, [group])

  // Keep the sidebar and dashboard in step with what this page shows
  useEffect(() => {
    if (balances.data) updateGroupBalances(groupId, balances.data.balances)
  }, [groupId, balances.data])

  if (error) {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <Card>
        <Empty icon="🔍" title={notFound ? 'Group not found' : 'Couldn’t load this group'}>
          {notFound ? 'It may have been deleted, or you’re not a member.' : errorMessage(error)}
          <div className="mt-4">
            <a href="#/" className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-400">
              Back to dashboard
            </a>
          </div>
        </Empty>
      </Card>
    )
  }
  if (!group) return <GroupPageSkeleton />

  const closeDialog = () => setDialog(undefined)
  const myNet = balances.data ? (netByPerson(balances.data.balances).get(me) ?? 0) : undefined

  return (
    <div className="space-y-6 pb-20 sm:pb-0">
      <a href="#/" className="text-sm font-medium text-slate-500 hover:text-slate-900 lg:hidden dark:text-slate-400 dark:hover:text-white">
        ← Dashboard
      </a>
      <section className="relative overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-brand-50 via-white to-white dark:from-brand-950/40 dark:via-slate-900 dark:to-slate-900" />
        <div className="relative flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <GroupIcon id={group.id} name={group.name} className="size-14 text-2xl shadow-sm sm:size-16" />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{group.name}</h1>
              <button
                type="button"
                onClick={() => setDialog({ kind: 'settings' })}
                className="mt-1.5 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <span className="flex -space-x-2">
                  {group.members.slice(0, 5).map((m) => (
                    <Avatar key={m.id} id={m.id} name={m.name} size="sm" className="ring-2 ring-white dark:ring-slate-900" />
                  ))}
                </span>
                <UsersIcon className="size-4" />
                {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <MyPosition net={myNet} />
            <div className="flex gap-2">
              <Button className="hidden px-4 sm:inline-flex" onClick={() => setDialog({ kind: 'expense' })}>
                <PlusIcon className="size-4" /> Add expense
              </Button>
              <Button className="flex-1 px-4 sm:flex-none" variant="owe" onClick={() => setDialog({ kind: 'settle' })}>
                <CashIcon className="size-4" /> Settle up
              </Button>
              <Button variant="secondary" aria-label="Group settings" title="Group settings" onClick={() => setDialog({ kind: 'settings' })}>
                <CogIcon className="size-4.5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* On phones, Add expense lives in a floating button */}
      <button
        type="button"
        onClick={() => setDialog({ kind: 'expense' })}
        aria-label="Add expense"
        className="fixed right-5 bottom-5 z-30 flex size-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600 active:scale-95 sm:hidden"
      >
        <PlusIcon className="size-7" />
      </button>

      {group.members.length === 1 && (
        <Alert tone="info">
          You’re the only one here.{' '}
          <button type="button" className="font-semibold text-brand-700 underline dark:text-brand-400" onClick={() => setDialog({ kind: 'settings' })}>
            Add people
          </button>{' '}
          to start splitting.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <ExpenseList key={expensesVersion} groupId={group.id} me={me} onAdd={() => setDialog({ kind: 'expense' })} />
        </div>
        <div>
          {balances.error ? (
            <Alert>{errorMessage(balances.error)}</Alert>
          ) : (
            <GroupBalancesPanel
              me={me}
              members={group.members}
              balances={balances.data?.balances}
              onSettle={(initial) => setDialog({ kind: 'settle', initial })}
            />
          )}
        </div>
      </div>

      {dialog?.kind === 'expense' && (
        <AddExpenseModal
          people={group.members}
          groupId={group.id}
          context={`In ${group.name}`}
          me={me}
          onClose={closeDialog}
          onCreated={() => {
            closeDialog()
            toast('Expense added')
            setExpensesVersion((v) => v + 1)
            reloadBalancesSoon()
            setTimeout(refreshGroups, BALANCE_RELOADS_MS[BALANCE_RELOADS_MS.length - 1])
          }}
        />
      )}
      {dialog?.kind === 'settle' && (
        <SettleUpModal
          people={group.members}
          groupId={group.id}
          context="in this group"
          me={me}
          debts={(balances.data?.balances ?? []).filter((b) => b.debtorId === me)}
          initial={dialog.initial}
          onClose={closeDialog}
          onRecorded={(name) => {
            closeDialog()
            toast(`Payment recorded. It counts once ${name} confirms it.`)
          }}
        />
      )}
      {dialog?.kind === 'settings' && <GroupSettingsModal group={group} me={me} onClose={closeDialog} onChanged={setEdited} />}
    </div>
  )
}

function MyPosition({ net }: { net: number | undefined }) {
  if (net == null) return <Skeleton className="h-11 w-36 rounded-2xl" />
  const settled = Math.abs(net) < 0.005
  const style = settled
    ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
    : net > 0
      ? 'bg-brand-100 text-brand-800 dark:bg-brand-500/15 dark:text-brand-300'
      : 'bg-owe-100 text-owe-700 dark:bg-owe-500/15 dark:text-owe-400'
  return (
    <div className={`rounded-2xl px-4 py-2 leading-tight ${style}`}>
      <div className="text-xs font-medium opacity-80">{settled ? 'In this group' : net > 0 ? 'You are owed' : 'You owe'}</div>
      <div className="font-bold tabular-nums">{settled ? 'All settled up' : formatMoney(Math.abs(net))}</div>
    </div>
  )
}

function GroupPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
        <Skeleton className="size-16 rounded-xl" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card padded={false}>
          <ListSkeleton rows={4} />
        </Card>
        <Card padded={false}>
          <ListSkeleton rows={3} />
        </Card>
      </div>
    </div>
  )
}
