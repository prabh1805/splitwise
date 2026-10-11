import { useState, type FormEvent } from 'react'
import { api, errorMessage } from '../lib/api'
import { refreshFriends } from '../lib/friends'
import { navigate } from '../lib/router'
import { toast } from '../lib/toast'
import { Alert, Button, Field, Modal } from './ui'

export function AddFriendModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return setError('Enter their email')
    setSubmitting(true)
    setError(undefined)
    try {
      const friend = await api.addFriend(email.trim())
      await refreshFriends()
      toast(`${friend.name} added`)
      onClose()
      navigate(`/friends/${friend.id}`)
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="Add a friend"
      description="Split expenses with someone directly, without making a group."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-friend" loading={submitting}>
            Add friend
          </Button>
        </>
      }
    >
      <form id="add-friend" onSubmit={onSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field
          label="Their email"
          name="friendEmail"
          type="email"
          placeholder="friend@example.com"
          autoFocus
          hint="They need a Splitwise account first."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </form>
    </Modal>
  )
}
