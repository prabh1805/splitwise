import { useState, type FormEvent } from 'react'
import { api, errorMessage } from '../lib/api'
import { formatPaise, paiseToAmount, toPaise } from '../lib/money'
import type { ExpenseRequest, UserSummary } from '../lib/types'
import { Alert, Avatar, Button, Field, Input, Label, Modal, SegmentedControl, Select } from './ui'

type SplitType = 'EQUAL' | 'CUSTOM'

// Used for both group expenses (groupId set, people = members) and direct ones (groupId null, you + one friend)
export function AddExpenseModal({
  people,
  groupId,
  context,
  me,
  onClose,
  onCreated,
}: {
  people: UserSummary[]
  groupId: number | null
  context: string
  me: number
  onClose: () => void
  onCreated: () => void
}) {
  const members = people
  const [description, setDescription] = useState('')
  const [total, setTotal] = useState('')
  const [paidBy, setPaidBy] = useState(me)
  const [splitType, setSplitType] = useState<SplitType>('EQUAL')
  const [included, setIncluded] = useState<Set<number>>(() => new Set(members.map((m) => m.id)))
  const [exact, setExact] = useState<Record<number, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()

  const totalPaise = toPaise(total)
  const exactPaise = members.reduce((sum, m) => sum + (toPaise(exact[m.id] ?? '') ?? 0), 0)
  const remaining = totalPaise != null ? totalPaise - exactPaise : null
  const each = totalPaise && included.size ? Math.floor(totalPaise / included.size) : null

  function toggle(id: number) {
    const next = new Set(included)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setIncluded(next)
  }

  function buildRequest(): ExpenseRequest | string {
    if (!description.trim()) return 'Add a short description'
    if (!totalPaise) return 'Enter an amount greater than zero, with at most 2 decimals'
    const base = { groupId, description: description.trim(), paidBy, totalAmount: paiseToAmount(totalPaise) }

    if (splitType === 'EQUAL') {
      if (included.size === 0) return 'Pick at least one person to split with'
      return { ...base, splitType, participantUserIds: members.filter((m) => included.has(m.id)).map((m) => m.id) }
    }

    const shares: { userId: number; shareAmount: string }[] = []
    for (const m of members) {
      const raw = (exact[m.id] ?? '').trim()
      if (!raw) continue
      const paise = toPaise(raw)
      if (paise == null) return `Check the amount for ${m.id === me ? 'you' : m.name}`
      if (paise > 0) shares.push({ userId: m.id, shareAmount: paiseToAmount(paise) })
    }
    if (shares.length === 0) return 'Enter how much each person owes'
    if (remaining !== 0) return `The amounts need to add up to ${formatPaise(totalPaise)}`
    return { ...base, splitType, participantShares: shares }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const request = buildRequest()
    if (typeof request === 'string') return setError(request)
    setSubmitting(true)
    setError(undefined)
    try {
      await api.createExpense(request)
      onCreated()
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="Add an expense"
      description={context}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-expense" loading={submitting}>
            Save expense
          </Button>
        </>
      }
    >
      <form id="add-expense" onSubmit={onSubmit} className="space-y-5">
        {error && <Alert>{error}</Alert>}

        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <Field
            label="Description"
            name="description"
            placeholder="e.g. Dinner at Thalassa"
            maxLength={100}
            autoFocus
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Field
            label="Amount"
            name="amount"
            prefix="₹"
            inputMode="decimal"
            placeholder="0.00"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="paid-by">Paid by</Label>
          <Select id="paid-by" value={paidBy} onChange={(e) => setPaidBy(Number(e.target.value))}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === me ? `You (${m.name})` : m.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Split</span>
            <SegmentedControl
              value={splitType}
              onChange={(v) => {
                setSplitType(v)
                setError(undefined)
              }}
              options={[
                { value: 'EQUAL', label: 'Equally' },
                { value: 'CUSTOM', label: 'Exact amounts' },
              ]}
            />
          </div>

          <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200 dark:divide-slate-800 dark:ring-slate-700">
            {members.map((m) => {
              const label = m.id === me ? `You` : m.name
              return (
                <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                  {splitType === 'EQUAL' ? (
                    <label className="flex flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={included.has(m.id)}
                        onChange={() => toggle(m.id)}
                        className="size-4.5 rounded accent-brand-500"
                      />
                      <Avatar id={m.id} name={m.name} size="sm" />
                      <span className="flex-1 text-sm font-medium">{label}</span>
                      <span className="text-sm text-slate-500 tabular-nums dark:text-slate-400">
                        {included.has(m.id) && each != null ? formatPaise(each) : '—'}
                      </span>
                    </label>
                  ) : (
                    <>
                      <Avatar id={m.id} name={m.name} size="sm" />
                      <label htmlFor={`share-${m.id}`} className="flex-1 text-sm font-medium">
                        {label}
                      </label>
                      <div className="relative w-32">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">₹</span>
                        <Input
                          id={`share-${m.id}`}
                          inputMode="decimal"
                          placeholder="0.00"
                          className="h-9 pl-7 text-right"
                          value={exact[m.id] ?? ''}
                          onChange={(e) => setExact({ ...exact, [m.id]: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                </li>
              )
            })}
          </ul>

          {splitType === 'EQUAL' && each != null && totalPaise != null && totalPaise % included.size !== 0 && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">It doesn’t divide evenly, so the first person ticked covers the extra paise.</p>
          )}
          {splitType === 'CUSTOM' && remaining != null && (
            <p
              className={`mt-2 text-right text-sm font-medium ${
                remaining === 0 ? 'text-brand-700 dark:text-brand-400' : 'text-owe-600 dark:text-owe-400'
              }`}
            >
              {remaining === 0 ? 'Adds up ✓' : remaining > 0 ? `${formatPaise(remaining)} left to assign` : `${formatPaise(-remaining)} too much`}
            </p>
          )}
        </div>
      </form>
    </Modal>
  )
}
