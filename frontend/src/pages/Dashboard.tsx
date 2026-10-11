import { useCallback, useState } from 'react'
import { BalanceBreakdown } from '../components/BalanceBreakdown'
import { AddFriendModal } from '../components/AddFriendModal'
import { CreateGroupModal } from '../components/CreateGroupModal'
import { PlusIcon } from '../components/icons'
import { Payments } from '../components/Payments'
import { GroupIcon } from '../components/Sidebar'
import { Alert, Avatar, Button, Card, Empty, ListSkeleton, NetLabel, Skeleton } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { refreshFriends, useFriends } from '../lib/friends'
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
            refreshFriends()
          }}
        />
        <div className="space-y-6">
          <GroupsGrid />
          <FriendsCard me={me} />
        </div>
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
  const groupNames = breakdownWith(me, balance.otherUserId, byGroup).map((p) => groups?.find((g) => g.id === p.groupId)?.name ?? `Group #${p.groupId}`)

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
            {groups ? (groupNames.length > 0 ? `in ${groupNames.join(', ')}` : 'outside groups') : tone === 'owe' ? 'you owe' : 'owes you'}
          </div>
        </div>
        <div className={`font-bold tabular-nums ${color}`}>{formatMoney(balance.amount)}</div>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="px-5 pb-4">
          <div className="rounded-2xl bg-slate-50 p-2 dark:bg-slate-800/50">
            <RowBreakdown me={me} balance={balance} name={name} />
            <a
              href={`#/friends/${balance.otherUserId}`}
              className="mt-1 block rounded-xl px-2 py-2 text-xs font-semibold text-brand-700 hover:bg-white dark:text-brand-400 dark:hover:bg-slate-800"
            >
              See everything with {name} →
            </a>
          </div>
        </div>
      )}
    </li>
  )
}

// Mounted only when a row is opened, so the direct balance is fetched on demand
function RowBreakdown({ me, balance, name }: { me: number; balance: UserBalance; name: string }) {
  const load = useCallback(() => api.directBalance(balance.otherUserId), [balance.otherUserId])
  const { data } = useAsync(load)
  const direct = data ? (data.youOwe ? -data.amount : data.amount) : undefined
  return (
    <BalanceBreakdown
      me={me}
      otherId={balance.otherUserId}
      otherName={name}
      total={balance.youOwe ? -balance.amount : balance.amount}
      direct={direct}
    />
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

function FriendsCard({ me }: { me: number }) {
  const { friends, overall } = useFriends()
  const [adding, setAdding] = useState(false)

  return (
    <Card
      title="Friends"
      action={
        <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
          <PlusIcon className="size-4" /> Add friend
        </Button>
      }
      padded={false}
    >
      {!friends ? (
        <ListSkeleton rows={2} />
      ) : friends.length === 0 ? (
        <Empty icon="🤝" title="No friends yet">
          Add someone by email to split expenses without making a group.
        </Empty>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {friends.map((f) => (
            <li key={f.id}>
              <a href={`#/friends/${f.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <Avatar id={f.id} name={f.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{displayName(f, f.id, me)}</span>
                  <NetLabel net={overall[f.id] ?? 0} format={formatMoney} className="block truncate text-xs" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {adding && <AddFriendModal onClose={() => setAdding(false)} />}
    </Card>
  )
}
