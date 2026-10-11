import { useState, type FormEvent } from 'react'
import { api, errorMessage } from '../lib/api'
import { refreshGroups } from '../lib/groups'
import { navigate } from '../lib/router'
import { toast } from '../lib/toast'
import type { GroupDetails } from '../lib/types'
import { Alert, Avatar, Button, Field, Modal } from './ui'

export function GroupSettingsModal({
  group,
  me,
  onClose,
  onChanged,
}: {
  group: GroupDetails
  me: number
  onClose: () => void
  onChanged: (group: GroupDetails) => void
}) {
  const isCreator = group.createdBy === me
  const [name, setName] = useState(group.name)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState<string>()
  const [error, setError] = useState<string>()
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key)
    setError(undefined)
    try {
      await action()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(undefined)
    }
  }

  function rename(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || name.trim() === group.name) return
    run('rename', async () => {
      onChanged(await api.renameGroup(group.id, name.trim()))
      refreshGroups()
      toast('Group renamed')
    })
  }

  function addMember(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    run('add', async () => {
      const updated = await api.addMember(group.id, email.trim())
      onChanged(updated)
      refreshGroups()
      toast(`Added ${updated.members[updated.members.length - 1]?.name ?? email.trim()}`)
      setEmail('')
    })
  }

  function remove(memberId: number, memberName: string) {
    const leaving = memberId === me
    run(`remove-${memberId}`, async () => {
      await api.removeMember(group.id, memberId)
      await refreshGroups()
      if (leaving) {
        toast(`You left ${group.name}`)
        onClose()
        navigate('/')
      } else {
        onChanged({ ...group, members: group.members.filter((m) => m.id !== memberId) })
        toast(`Removed ${memberName}`)
      }
    })
  }

  function deleteGroup() {
    run('delete', async () => {
      await api.deleteGroup(group.id)
      await refreshGroups()
      toast(`Deleted ${group.name}`)
      onClose()
      navigate('/')
    })
  }

  return (
    <Modal title="Group settings" onClose={onClose} size="lg">
      <div className="space-y-7">
        {error && <Alert>{error}</Alert>}

        <form onSubmit={rename} className="flex items-end gap-2">
          <Field label="Group name" name="groupName" maxLength={100} className="flex-1" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" variant="secondary" loading={busy === 'rename'} disabled={!name.trim() || name.trim() === group.name}>
            Save
          </Button>
        </form>

        <section>
          <h3 className="mb-3 text-sm font-semibold">Members · {group.members.length}</h3>
          <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200 dark:divide-slate-800 dark:ring-slate-700">
            {group.members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar id={m.id} name={m.name} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {m.name}
                    {m.id === me && <span className="font-normal text-slate-400"> (you)</span>}
                    {m.id === group.createdBy && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-500 uppercase dark:bg-slate-800 dark:text-slate-400">
                        Owner
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">{m.email}</div>
                </div>
                {m.id !== group.createdBy && (m.id === me || isCreator) && (
                  <Button size="sm" variant="ghost" loading={busy === `remove-${m.id}`} disabled={!!busy} onClick={() => remove(m.id, m.name)}>
                    {m.id === me ? 'Leave' : 'Remove'}
                  </Button>
                )}
              </li>
            ))}
          </ul>

          <form onSubmit={addMember} className="mt-3 flex items-end gap-2">
            <Field
              label="Add someone by email"
              name="memberEmail"
              type="email"
              placeholder="friend@example.com"
              className="flex-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" loading={busy === 'add'} disabled={!email.trim()}>
              Add
            </Button>
          </form>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">They need a Splitwise account first.</p>
        </section>

        {isCreator && (
          <section className="rounded-2xl p-4 ring-1 ring-rose-200 dark:ring-rose-900">
            <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-400">Delete group</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Removes the group and its members for everyone. Expenses and balances already recorded are kept.
            </p>
            {confirmDelete ? (
              <div className="mt-3 flex gap-2">
                <Button variant="danger" size="sm" loading={busy === 'delete'} onClick={deleteGroup}>
                  Yes, delete {group.name}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="secondary" size="sm" className="mt-3 text-rose-700 dark:text-rose-400" onClick={() => setConfirmDelete(true)}>
                Delete this group
              </Button>
            )}
          </section>
        )}
      </div>
    </Modal>
  )
}
