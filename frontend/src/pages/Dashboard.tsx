import { useCallback, useState } from 'react'
import { CreateGroupModal } from '../components/CreateGroupModal'
import { PlusIcon } from '../components/icons'
import { Payments } from '../components/Payments'
import { GroupIcon } from '../components/Sidebar'
import { Alert, Avatar, Button, Card, Empty, ListSkeleton, NetLabel, Skeleton } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { refreshGroups, useGroups } from '../lib/groups'
import { breakdownWith } from '../lib/balances'
import { formatMoney } from '../lib/money'
import type { UserBalance } from '../lib/types'
import { useAsync } from '../lib/useAsync'
import { displayName, useUserNames } from '../lib/users'

export function Dashboard({ me }: { me: number }) {
  const load = useCallback(() => api.userBalances(me), [me])
  const { data, error, reload } = useAsync(load)
  const balances = data?.balances ?? []
  const nameOf = useUserNames([me, ...balances.map((b) => b.otherUserId)])
  const firstName = nameOf(me)?.name.split(' ')[0]

  const oweList = balances.filter((b) => b.youOwe).sort((a, b) => b.amount - a.amount)
  const owedList = balances.filter((b) => !b.youOwe).sort((a, b) => b.amount - a.amount)
  const owe = oweList.reduce((sum, b) => sum + b.amount, 0)
  const owed = owedList.reduce((sum, b) => sum + b.amount, 0)
  const net = owed - owe

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{firstName ? `Hi ${firstName} 👋` : 'Dashboard'}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Here’s where you stand across all your groups.</p>
      </div>

      <BalanceHero loaded={!!data} net={net} owe={owe} owed={owed} />

      {error ? (
        <Alert>{errorMessage(error)}</Alert>
      ) : !data ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card padded={false}>
            <ListSkeleton rows={2} />
          </Card>
          <Card padded={false}>
            <ListSkeleton rows={2} />
          </Card>
        </div>
      ) : balances.length === 0 ? (
        <Card>
          <Empty icon="🎉" title="You’re all settled up">
            Add an expense in a group and balances will show up here.
          </Empty>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <BalanceList title="You owe" tone="owe" items={oweList} me={me} nameOf={nameOf} empty="You don’t owe anyone." />
          <BalanceList title="You are owed" tone="owed" items={owedList} me={me} nameOf={nameOf} empty="Nobody owes you right now." />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Payments
          me={me}
          onChange={() => {
            reload()
            refreshGroups()
          }}
        />
        <GroupsGrid />
      </div>
    </div>
  )
}

function BalanceHero({ loaded, net, owe, owed }: { loaded: boolean; net: number; owe: number; owed: number }) {
  const settled = Math.abs(net) < 0.005
  const tone = !loaded || settled ? 'from-slate-700 to-slate-900' : net > 0 ? 'from-brand-500 to-brand-700' : 'from-owe-500 to-owe-700'
  const headline = !loaded ? 'Your balance' : settled ? 'You’re all settled up' : net > 0 ? 'Overall, you are owed' : 'Overall, you owe'

  return (
    <section className={`relative overflow-hidden rounded-3xl bg-linear-to-br ${tone} p-6 text-white shadow-lg sm:p-8`}>
      <div className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute right-24 -bottom-20 size-40 rounded-full bg-white/5" />
      <div className="relative">
        <p className="text-sm font-medium text-white/80">{headline}</p>
        {loaded ? (
          <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">{formatMoney(Math.abs(net))}</p>
        ) : (
          <span className="mt-2 block h-11 w-48 animate-pulse rounded-xl bg-white/20" />
        )}
        <div className="mt-6 grid max-w-md grid-cols-2 gap-3">
          <HeroStat label="You owe" value={loaded ? formatMoney(owe) : undefined} />
          <HeroStat label="You are owed" value={loaded ? formatMoney(owed) : undefined} />
        </div>
      </div>
    </section>
  )
}

function HeroStat({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
      <div className="text-xs font-medium text-white/75">{label}</div>
      {value ? (
        <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
      ) : (
        <span className="mt-1.5 block h-5 w-20 animate-pulse rounded-md bg-white/20" />
      )}
    </div>
  )
}

function BalanceList({
  title,
  tone,
  items,
  me,
  nameOf,
  empty,
}: {
  title: string
  tone: 'owe' | 'owed'
  items: UserBalance[]
  me: number
  nameOf: ReturnType<typeof useUserNames>
  empty: string
}) {
  return (
    <Card title={title} padded={false}>
      {items.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">{empty}</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((b) => (
            <BalanceRow key={b.otherUserId} balance={b} tone={tone} me={me} nameOf={nameOf} />
          ))}
        </ul>
      )}
    </Card>
  )
}

function BalanceRow({
  balance,
  tone,
  me,
  nameOf,
}: {
  balance: UserBalance
  tone: 'owe' | 'owed'
  me: number
  nameOf: ReturnType<typeof useUserNames>
}) {
  const [open, setOpen] = useState(false)
  const { groups, balances: byGroup } = useGroups()
  const user = nameOf(balance.otherUserId)
  const name = displayName(user, balance.otherUserId, me)
  const color = tone === 'owe' ? 'text-owe-600 dark:text-owe-400' : 'text-brand-700 dark:text-brand-400'

  // Positive = they owe me. The overall figure also nets in groups you've left or that were deleted,
  // so whatever the current groups don't explain is shown as a separate line.
  const parts = breakdownWith(me, balance.otherUserId, byGroup)
  const total = balance.youOwe ? -balance.amount : balance.amount
  const remainder = total - parts.reduce((sum, p) => sum + p.amount, 0)
  const groupName = (id: number) => groups?.find((g) => g.id === id)?.name ?? `Group #${id}`
  const loaded = groups != null && Object.keys(byGroup).length > 0

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
      >
        <Avatar id={balance.otherUserId} name={user?.name} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{name}</div>
          <div className="truncate text-xs text-slate-500 dark:text-slate-400">
            {loaded && parts.length > 0 ? `in ${parts.map((p) => groupName(p.groupId)).join(', ')}` : tone === 'owe' ? 'you owe' : 'owes you'}
          </div>
        </div>
        <div className={`font-bold tabular-nums ${color}`}>{formatMoney(balance.amount)}</div>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="px-5 pb-4">
          <ul className="space-y-1 rounded-2xl bg-slate-50 p-2 dark:bg-slate-800/50">
            {!loaded ? (
              <li className="p-2">
                <Skeleton className="h-8" />
              </li>
            ) : (
              <>
                {parts.map((p) => (
                  <li key={p.groupId}>
                    <a
                      href={`#/groups/${p.groupId}`}
                      className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm transition hover:bg-white dark:hover:bg-slate-800"
                    >
                      <GroupIcon id={p.groupId} name={groupName(p.groupId)} className="size-7 text-xs" />
                      <span className="min-w-0 flex-1 truncate font-medium">{groupName(p.groupId)}</span>
                      <span className={`text-xs ${p.amount < 0 ? 'text-owe-600 dark:text-owe-400' : 'text-brand-700 dark:text-brand-400'}`}>
                        {p.amount < 0 ? `you owe ${name}` : `${name} owes you`}{' '}
                        <strong className="tabular-nums">{formatMoney(Math.abs(p.amount))}</strong>
                      </span>
                    </a>
                  </li>
                ))}
                {Math.abs(remainder) >= 0.005 && (
                  <li className="flex items-center gap-3 px-2 py-2 text-sm">
                    <span className="flex size-7 items-center justify-center rounded-xl bg-slate-200 text-xs dark:bg-slate-700">…</span>
                    <span className="min-w-0 flex-1 truncate text-slate-500 dark:text-slate-400">Groups you’re no longer in</span>
                    <span className={`text-xs ${remainder < 0 ? 'text-owe-600 dark:text-owe-400' : 'text-brand-700 dark:text-brand-400'}`}>
                      {remainder < 0 ? 'you owe' : 'owes you'} <strong className="tabular-nums">{formatMoney(Math.abs(remainder))}</strong>
                    </span>
                  </li>
                )}
                {parts.length > 1 && (
                  <li className="mt-1 flex justify-between border-t border-slate-200 px-2 pt-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <span>Net across groups</span>
                    <span className={`font-semibold tabular-nums ${color}`}>
                      {tone === 'owe' ? 'you owe' : 'owes you'} {formatMoney(balance.amount)}
                    </span>
                  </li>
                )}
              </>
            )}
          </ul>
        </div>
      )}
    </li>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={`size-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`}>
      <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
  )
}

function GroupsGrid() {
  const { groups, error, myNet } = useGroups()
  const [creating, setCreating] = useState(false)

  return (
    <Card
      title="Your groups"
      action={
        <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
          <PlusIcon className="size-4" /> New group
        </Button>
      }
    >
      {error && !groups ? (
        <Alert>{errorMessage(error)}</Alert>
      ) : !groups ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : groups.length === 0 ? (
        <Empty icon="👥" title="No groups yet">
          <Button className="mt-3" onClick={() => setCreating(true)}>
            <PlusIcon className="size-4" /> Create your first group
          </Button>
        </Empty>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {groups.map((g) => (
            <li key={g.id}>
              <a
                href={`#/groups/${g.id}`}
                className="flex items-center gap-3 rounded-xl p-3 ring-1 ring-slate-200/70 transition hover:bg-slate-50 hover:ring-brand-300 dark:ring-slate-800 dark:hover:bg-slate-800/60 dark:hover:ring-brand-800"
              >
                <GroupIcon id={g.id} name={g.name} className="size-10 text-base" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{g.name}</span>
                  {myNet[g.id] != null ? (
                    <NetLabel net={myNet[g.id]} format={formatMoney} className="block truncate text-xs" />
                  ) : (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {g.memberCount} {g.memberCount === 1 ? 'member' : 'members'}
                    </span>
                  )}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {creating && <CreateGroupModal onClose={() => setCreating(false)} />}
    </Card>
  )
}
