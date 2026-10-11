import { useState, type FormEvent } from 'react'
import { api, errorMessage } from '../lib/api'
import { refreshGroups } from '../lib/groups'
import { navigate } from '../lib/router'
import { toast } from '../lib/toast'
import { Alert, Button, Field, Label, Modal } from './ui'

export function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [emails, setEmails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Give the group a name')
    setSubmitting(true)
    setError(undefined)
    try {
      const group = await api.createGroup(name.trim())
      const invites = emails.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean)
      const failed: string[] = []
      for (const email of invites) {
        try {
          await api.addMember(group.id, email)
        } catch (err) {
          failed.push(`${email}: ${errorMessage(err)}`)
        }
      }
      await refreshGroups()
      if (failed.length) toast(`Group created, but couldn’t add ${failed.join('; ')}`, 'error')
      else toast(`Created “${group.name}”`)
      onClose()
      navigate(`/groups/${group.id}`)
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="Start a new group"
      description="Trips, flatmates, dinners: anything you split."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-group" loading={submitting}>
            Create group
          </Button>
        </>
      }
    >
      <form id="create-group" onSubmit={onSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field
          label="Group name"
          name="groupName"
          placeholder="e.g. Goa trip"
          maxLength={100}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div>
          <Label htmlFor="invite-emails">Add people (optional)</Label>
          <textarea
            id="invite-emails"
            rows={3}
            placeholder="friend@example.com, flatmate@example.com"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          />
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">They need to have signed up already. You can add more later.</p>
        </div>
      </form>
    </Modal>
  )
}
