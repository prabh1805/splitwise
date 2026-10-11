import { useCallback, useState } from 'react'
import { api, errorMessage } from '../lib/api'
import { formatMoney } from '../lib/money'
import type { Expense } from '../lib/types'
import { useAsync } from '../lib/useAsync'
import { displayName, useUserNames } from '../lib/users'
import { categoryFor } from '../lib/categories'
import { Alert, Avatar, Button, Card, Empty, ListSkeleton } from './ui'

const PAGE_SIZE = 20

export function ExpenseList({ groupId, me, onAdd }: { groupId: number; me: number; onAdd: () => void }) {
  const [page, setPage] = useState(0)
  const load = useCallback(() => api.listExpenses(groupId, page, PAGE_SIZE), [groupId, page])
  const { data, error } = useAsync(load)
  const nameOf = useUserNames(data?.items.flatMap((e) => [e.paidBy, ...e.shares.map((s) => s.userId)]) ?? [])

  // Group rows under month headings, newest first (the API already sorts by date)
  const months: { label: string; items: Expense[] }[] = []
  for (const expense of data?.items ?? []) {
    const label = new Date(expense.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    const last = months[months.length - 1]
    if (last?.label === label) last.items.push(expense)
    else months.push({ label, items: [expense] })
  }

  return (
    <Card title="Expenses" padded={false} action={data && data.totalElements > 0 && <span className="text-xs text-slate-400">{data.totalElements} total</span>}>
      {error ? (
        <div className="p-5">
          <Alert>{errorMessage(error)}</Alert>
        </div>
      ) : !data ? (
        <ListSkeleton rows={4} />
      ) : data.items.length === 0 ? (
        <Empty icon="🧾" title="No expenses yet">
          Add the first one and we’ll work out who owes whom.
          <div className="mt-4">
            <Button onClick={onAdd}>Add an expense</Button>
          </div>
        </Empty>
      ) : (
        <>
          {months.map((month) => (
            <section key={month.label}>
              <h3 className="bg-slate-50 px-5 py-1.5 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:bg-slate-800/50 dark:text-slate-400">
                {month.label}
              </h3>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {month.items.map((expense) => (
                  <ExpenseRow key={expense.id} expense={expense} me={me} nameOf={nameOf} />
                ))}
              </ul>
            </section>
          ))}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm dark:border-slate-800">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Newer
              </Button>
              <span className="text-slate-500 dark:text-slate-400">
                Page {data.page + 1} of {data.totalPages}
              </span>
              <Button variant="secondary" size="sm" disabled={page + 1 >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                Older
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  )
}

function ExpenseRow({ expense, me, nameOf }: { expense: Expense; me: number; nameOf: ReturnType<typeof useUserNames> }) {
  const [open, setOpen] = useState(false)
  const myShare = expense.shares.find((s) => s.userId === me)?.shareAmount ?? 0
  const date = new Date(expense.createdAt)
  const payer = displayName(nameOf(expense.paidBy), expense.paidBy, me)
  const category = categoryFor(expense.description)

  let summary: { label: string; amount?: number; className: string }
  if (expense.paidBy === me) {
    const lent = expense.totalAmount - myShare
    summary = lent > 0
      ? { label: 'you lent', amount: lent, className: 'text-brand-700 dark:text-brand-400' }
      : { label: 'just for you', className: 'text-slate-400' }
  } else if (myShare > 0) {
    summary = { label: 'you borrowed', amount: myShare, className: 'text-owe-600 dark:text-owe-400' }
  } else {
    summary = { label: 'not involved', className: 'text-slate-400' }
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
      >
        <div className="w-9 shrink-0 text-center leading-none">
          <div className="text-[0.65rem] font-semibold text-slate-400 uppercase">{date.toLocaleDateString(undefined, { month: 'short' })}</div>
          <div className="mt-0.5 text-lg font-semibold text-slate-600 dark:text-slate-300">{date.getDate()}</div>
        </div>
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-xl ${category.tile}`} aria-hidden>
          {category.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{expense.description || 'Expense'}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {payer} paid <span className="font-medium text-slate-700 dark:text-slate-300">{formatMoney(expense.totalAmount)}</span>
          </p>
        </div>
        <div className={`shrink-0 text-right ${summary.className}`}>
          <div className="text-xs">{summary.label}</div>
          {summary.amount != null && <div className="font-bold tabular-nums">{formatMoney(summary.amount)}</div>}
        </div>
      </button>
      {open && (
        <div className="px-5 pb-4 sm:pl-[6.25rem]">
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <Avatar id={expense.paidBy} name={nameOf(expense.paidBy)?.name} size="sm" />
              <span>
                <strong>{payer}</strong> paid <strong>{formatMoney(expense.totalAmount)}</strong>
              </span>
              <span className="ml-auto text-xs text-slate-400">
                {date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
            <ul className="mt-4 space-y-3">
              {expense.shares.map((s) => {
                const user = nameOf(s.userId)
                const pct = expense.totalAmount > 0 ? (s.shareAmount / expense.totalAmount) * 100 : 0
                return (
                  <li key={s.userId} className="text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span>
                        {displayName(user, s.userId, me)}{' '}
                        <span className="text-slate-500 dark:text-slate-400">{s.userId === me ? 'owe' : 'owes'}</span>
                      </span>
                      <span className="font-semibold tabular-nums">{formatMoney(s.shareAmount)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className={`h-full rounded-full ${s.userId === me ? 'bg-owe-400' : 'bg-brand-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </li>
  )
}
