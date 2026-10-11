import { netByPerson } from '../lib/balances'
import { formatMoney } from '../lib/money'
import type { GroupBalance, Member } from '../lib/types'
import { displayName, useUserNames } from '../lib/users'
import { ArrowRightIcon } from './icons'
import { Avatar, Card, ListSkeleton } from './ui'

export function GroupBalancesPanel({
  me,
  members,
  balances,
  onSettle,
}: {
  me: number
  members: Member[]
  balances: GroupBalance[] | undefined
  onSettle: (draft: { receiverId: number; amount: number }) => void
}) {
  // Include people who have balances but have since left the group
  const ids = [...new Set([...members.map((m) => m.id), ...(balances ?? []).flatMap((b) => [b.debtorId, b.creditorId])])]
  const nameOf = useUserNames(ids)
  const net = netByPerson(balances ?? [])
  const name = (id: number) => displayName(nameOf(id), id, me)
  // Biggest balances first, you at the top
  const ordered = [...ids].sort((a, b) => (a === me ? -1 : b === me ? 1 : Math.abs(net.get(b) ?? 0) - Math.abs(net.get(a) ?? 0)))
  const largest = Math.max(1, ...ids.map((id) => Math.abs(net.get(id) ?? 0)))

  return (
    <Card title="Balances" padded={false}>
      {!balances ? (
        <ListSkeleton rows={3} />
      ) : (
        <>
          <ul className="space-y-3 px-5 py-4">
            {ordered.map((id) => {
              const amount = net.get(id) ?? 0
              const settled = Math.abs(amount) < 0.005
              const width = settled ? 0 : (Math.abs(amount) / largest) * 100
              return (
                <li key={id} className="flex items-center gap-3">
                  <Avatar id={id} name={nameOf(id)?.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{name(id)}</span>
                      <span
                        className={`shrink-0 text-xs font-semibold tabular-nums ${
                          settled ? 'text-slate-400' : amount > 0 ? 'text-brand-700 dark:text-brand-400' : 'text-owe-600 dark:text-owe-400'
                        }`}
                      >
                        {settled ? 'settled' : `${amount > 0 ? '+' : '−'}${formatMoney(Math.abs(amount))}`}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className={`h-full rounded-full ${amount > 0 ? 'bg-brand-400' : 'bg-owe-400'}`} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          {balances.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-800">
              <h3 className="px-5 pt-4 pb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                Suggested payments
              </h3>
              <ul className="pb-2">
                {balances.map((b) => {
                  const mine = b.debtorId === me
                  return (
                    <li
                      key={`${b.debtorId}-${b.creditorId}`}
                      className={`mx-2 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${mine ? 'bg-owe-50 dark:bg-owe-500/10' : ''}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate font-medium">{name(b.debtorId)}</span>
                          <ArrowRightIcon className="size-3.5 shrink-0 text-slate-400" />
                          <span className="truncate font-medium">{name(b.creditorId)}</span>
                        </span>
                        <span className="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">{formatMoney(b.amount)}</span>
                      </span>
                      {mine && (
                        <button
                          type="button"
                          onClick={() => onSettle({ receiverId: b.creditorId, amount: b.amount })}
                          className="shrink-0 rounded-lg bg-owe-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-owe-600"
                        >
                          Settle
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
