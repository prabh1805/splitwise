import { useCallback, useState } from 'react'
import { api, errorMessage } from '../lib/api'
import { formatMoney } from '../lib/money'
import { toast } from '../lib/toast'
import type { Settlement } from '../lib/types'
import { useAsync } from '../lib/useAsync'
import { displayName, useUserNames } from '../lib/users'
import { Alert, Avatar, Button, Card, Empty, ListSkeleton, StatusBadge } from './ui'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function Payments({ me, onChange }: { me: number; onChange: () => void }) {
  const load = useCallback(() => api.listSettlements(), [])
  const { data, error, reload } = useAsync(load)
  const settlements = data ?? []
  const nameOf = useUserNames(settlements.flatMap((s) => [s.payerId, s.receiverId]))
  const [busy, setBusy] = useState<{ id: number; action: 'acknowledge' | 'reject' }>()

  const toConfirm = settlements.filter((s) => s.status === 'PENDING' && s.receiverId === me)
  const waiting = settlements.filter((s) => s.status === 'PENDING' && s.payerId === me)
  const history = settlements.filter((s) => s.status !== 'PENDING').slice(0, 5)

  async function decide(s: Settlement, action: 'acknowledge' | 'reject') {
    setBusy({ id: s.id, action })
    try {
      if (action === 'acknowledge') await api.acknowledgeSettlement(s.id)
      else await api.rejectSettlement(s.id)
      toast(action === 'acknowledge' ? 'Payment confirmed' : 'Payment marked as not received')
      reload()
      onChange()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(undefined)
    }
  }

  const name = (id: number) => displayName(nameOf(id), id, me)

  return (
    <Card title="Payments" padded={false}>
      {error ? (
        <div className="p-5">
          <Alert>{errorMessage(error)}</Alert>
        </div>
      ) : !data ? (
        <ListSkeleton rows={2} />
      ) : settlements.length === 0 ? (
        <Empty icon="💸" title="No payments yet">
          When you record paying someone back from a group, it shows up here.
        </Empty>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {toConfirm.length > 0 && (
            <section className="p-5">
              <h3 className="mb-3 text-sm font-semibold">Did you receive these?</h3>
              <ul className="space-y-3">
                {toConfirm.map((s) => (
                  <li key={s.id} className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200/70 dark:bg-amber-950/30 dark:ring-amber-900/60">
                    <div className="flex items-center gap-3">
                      <Avatar id={s.payerId} name={nameOf(s.payerId)?.name} />
                      <p className="min-w-0 flex-1 text-sm">
                        <strong>{name(s.payerId)}</strong> says they paid you{' '}
                        <strong className="text-brand-700 dark:text-brand-400">{formatMoney(s.amount)}</strong>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">{formatDate(s.createdAt)}</span>
                      </p>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => decide(s, 'acknowledge')} loading={busy?.id === s.id && busy.action === 'acknowledge'} disabled={!!busy}>
                        Yes, I got it
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => decide(s, 'reject')} loading={busy?.id === s.id && busy.action === 'reject'} disabled={!!busy}>
                        Not received
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {waiting.length > 0 && (
            <section className="p-5">
              <h3 className="mb-3 text-sm font-semibold">Waiting for confirmation</h3>
              <ul className="space-y-2">
                {waiting.map((s) => (
                  <PaymentRow key={s.id} s={s} me={me} name={name} nameOf={nameOf} />
                ))}
              </ul>
            </section>
          )}

          {history.length > 0 && (
            <section className="p-5">
              <h3 className="mb-3 text-sm font-semibold">Recent</h3>
              <ul className="space-y-2">
                {history.map((s) => (
                  <PaymentRow key={s.id} s={s} me={me} name={name} nameOf={nameOf} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Card>
  )
}

function PaymentRow({
  s,
  me,
  name,
  nameOf,
}: {
  s: Settlement
  me: number
  name: (id: number) => string
  nameOf: ReturnType<typeof useUserNames>
}) {
  const other = s.payerId === me ? s.receiverId : s.payerId
  return (
    <li className="flex items-center gap-3 text-sm">
      <Avatar id={other} name={nameOf(other)?.name} size="sm" />
      <span className="min-w-0 flex-1 truncate">
        {s.payerId === me ? (
          <>You paid <strong>{name(s.receiverId)}</strong></>
        ) : (
          <><strong>{name(s.payerId)}</strong> paid you</>
        )}
        <span className="ml-1.5 text-xs text-slate-400">{formatDate(s.createdAt)}</span>
      </span>
      <span className="font-semibold tabular-nums">{formatMoney(s.amount)}</span>
      <StatusBadge status={s.status} />
    </li>
  )
}
