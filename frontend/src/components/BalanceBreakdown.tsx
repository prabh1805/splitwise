import type { ReactNode } from 'react'
import { breakdownWith } from '../lib/balances'
import { useGroups } from '../lib/groups'
import { formatMoney } from '../lib/money'
import { GroupIcon } from './Sidebar'
import { Skeleton } from './ui'

// Explains an overall balance with one person: direct (no group) expenses, then each shared group,
// then whatever's left from groups you've since left or that were deleted. Amounts: positive = they owe you.
export function BalanceBreakdown({
  me,
  otherId,
  otherName,
  total,
  direct,
  linkDirect = true,
}: {
  me: number
  otherId: number
  otherName: string
  total: number
  direct: number | undefined
  linkDirect?: boolean
}) {
  const { groups, balances: byGroup } = useGroups()
  if (!groups || direct === undefined) {
    return (
      <div className="space-y-2 p-2">
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
      </div>
    )
  }

  const parts = breakdownWith(me, otherId, byGroup)
  const remainder = total - direct - parts.reduce((sum, p) => sum + p.amount, 0)
  const groupName = (id: number) => groups.find((g) => g.id === id)?.name ?? `Group #${id}`
  const lines = parts.length + (Math.abs(direct) >= 0.005 ? 1 : 0) + (Math.abs(remainder) >= 0.005 ? 1 : 0)

  if (lines === 0) return <p className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">You and {otherName} are all settled up.</p>

  return (
    <ul className="space-y-1">
      {Math.abs(direct) >= 0.005 && (
        <Line
          href={linkDirect ? `#/friends/${otherId}` : undefined}
          icon={<span className="flex size-7 items-center justify-center rounded-xl bg-slate-200 text-sm dark:bg-slate-700">👤</span>}
          label="Direct expenses"
          amount={direct}
          otherName={otherName}
        />
      )}
      {parts.map((p) => (
        <Line
          key={p.groupId}
          href={`#/groups/${p.groupId}`}
          icon={<GroupIcon id={p.groupId} name={groupName(p.groupId)} className="size-7 text-xs" />}
          label={groupName(p.groupId)}
          amount={p.amount}
          otherName={otherName}
        />
      ))}
      {Math.abs(remainder) >= 0.005 && (
        <Line
          icon={<span className="flex size-7 items-center justify-center rounded-xl bg-slate-200 text-xs dark:bg-slate-700">…</span>}
          label="Groups you’re no longer in"
          amount={remainder}
          otherName={otherName}
          muted
        />
      )}
      {lines > 1 && (
        <li className="mt-1 flex justify-between border-t border-slate-200 px-2 pt-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <span>Net overall</span>
          <span className={`font-semibold tabular-nums ${total < 0 ? 'text-owe-600 dark:text-owe-400' : 'text-brand-700 dark:text-brand-400'}`}>
            {Math.abs(total) < 0.005 ? 'settled up' : total < 0 ? `you owe ${formatMoney(-total)}` : `owes you ${formatMoney(total)}`}
          </span>
        </li>
      )}
    </ul>
  )
}

function Line({
  href,
  icon,
  label,
  amount,
  otherName,
  muted,
}: {
  href?: string
  icon: ReactNode
  label: string
  amount: number
  otherName: string
  muted?: boolean
}) {
  const body = (
    <>
      {icon}
      <span className="min-w-0 flex-1">
        <span className={`block truncate ${muted ? 'text-slate-500 dark:text-slate-400' : 'font-medium'}`}>{label}</span>
        <span className={`block truncate text-xs ${amount < 0 ? 'text-owe-600 dark:text-owe-400' : 'text-brand-700 dark:text-brand-400'}`}>
          {amount < 0 ? `you owe ${otherName}` : `${otherName} owes you`}
        </span>
      </span>
      <strong className={`shrink-0 text-sm tabular-nums ${amount < 0 ? 'text-owe-600 dark:text-owe-400' : 'text-brand-700 dark:text-brand-400'}`}>
        {formatMoney(Math.abs(amount))}
      </strong>
    </>
  )
  return (
    <li>
      {href ? (
        <a href={href} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm transition hover:bg-white dark:hover:bg-slate-800">
          {body}
        </a>
      ) : (
        <div className="flex items-center gap-3 px-2 py-2 text-sm">{body}</div>
      )}
    </li>
  )
}
