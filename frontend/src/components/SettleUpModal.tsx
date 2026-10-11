import { useState, type FormEvent } from 'react'
import { api, errorMessage } from '../lib/api'
import { formatMoney, paiseToAmount, toPaise } from '../lib/money'
import type { GroupBalance, GroupDetails } from '../lib/types'
import { Alert, Avatar, Button, Field, Label, Modal, Select } from './ui'

export function SettleUpModal({
  group,
  me,
  balances,
  initial,
  onClose,
  onRecorded,
}: {
  group: GroupDetails
  me: number
  balances: GroupBalance[]
  initial?: { receiverId: number; amount: number }
  onClose: () => void
  onRecorded: (receiverName: string) => void
}) {
  const others = group.members.filter((m) => m.id !== me)
  const myDebts = balances.filter((b) => b.debtorId === me).sort((a, b) => b.amount - a.amount)
  const suggestion = initial ?? (myDebts[0] && { receiverId: myDebts[0].creditorId, amount: myDebts[0].amount })

  const [receiverId, setReceiverId] = useState<number | undefined>(suggestion?.receiverId ?? others[0]?.id)
  const [amount, setAmount] = useState(suggestion ? suggestion.amount.toFixed(2) : '')
  // Reused if the same payment is resent after a network error, so it can't be recorded twice
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()

  const receiver = group.members.find((m) => m.id === receiverId)
  const owed = myDebts.find((b) => b.creditorId === receiverId)?.amount

  function changed() {
    setIdempotencyKey(crypto.randomUUID())
    setError(undefined)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const paise = toPaise(amount)
    if (!receiverId || !receiver) return setError('Choose who you paid')
    if (!paise) return setError('Enter an amount greater than zero, with at most 2 decimals')
    setSubmitting(true)
    setError(undefined)
    try {
      await api.createSettlement({ idempotencyKey, payerId: me, receiverId, groupId: group.id, amount: paiseToAmount(paise) })
      onRecorded(receiver.name)
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  if (others.length === 0) {
    return (
      <Modal title="Settle up" onClose={onClose}>
        <Alert tone="info">Add someone to this group first.</Alert>
      </Modal>
    )
  }

  return (
    <Modal
      title="Record a payment"
      description="Paid someone back outside the app? It counts once they confirm it."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="settle-up" loading={submitting}>
            Record payment
          </Button>
        </>
      }
    >
      <form id="settle-up" onSubmit={onSubmit} className="space-y-5">
        {error && <Alert>{error}</Alert>}

        <div className="flex items-start justify-center gap-4 py-2 text-center">
          <div className="w-24">
            <Avatar id={me} name={group.members.find((m) => m.id === me)?.name} size="lg" />
            <div className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">You</div>
          </div>
          <span className="mt-3 text-2xl text-slate-300">→</span>
          <div className="w-24">
            <Avatar id={receiverId ?? 0} name={receiver?.name} size="lg" />
            <div className="mt-1.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">{receiver?.name}</div>
          </div>
        </div>

        <div>
          <Label htmlFor="receiver">You paid</Label>
          <Select
            id="receiver"
            value={receiverId}
            onChange={(e) => {
              const id = Number(e.target.value)
              setReceiverId(id)
              const debt = myDebts.find((b) => b.creditorId === id)
              setAmount(debt ? debt.amount.toFixed(2) : '')
              changed()
            }}
          >
            {others.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
          {owed != null && (
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              You owe {receiver?.name} {formatMoney(owed)} in this group.
            </p>
          )}
        </div>

        <Field
          label="Amount"
          name="amount"
          prefix="₹"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            changed()
          }}
        />
      </form>
    </Modal>
  )
}
