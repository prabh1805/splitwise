import { useEffect, useSyncExternalStore } from 'react'
import { api } from './api'
import type { UserSummary } from './types'

// Names for user ids, shared across the app. The backend only reveals people who share a group with you,
// so ids it doesn't return (e.g. someone who left every shared group) stay unknown.
const known = new Map<number, UserSummary>()
const requested = new Set<number>()
const listeners = new Set<() => void>()
let version = 0

function emit() {
  version++
  listeners.forEach((l) => l())
}

export function rememberUsers(users: UserSummary[]) {
  users.forEach((u) => known.set(u.id, u))
  emit()
}

async function fetchMissing(ids: number[]) {
  const missing = [...new Set(ids)].filter((id) => !known.has(id) && !requested.has(id))
  if (missing.length === 0) return
  missing.forEach((id) => requested.add(id))
  try {
    rememberUsers(await api.lookupUsers(missing))
  } catch {
    missing.forEach((id) => requested.delete(id))
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useUserNames(ids: number[]) {
  useSyncExternalStore(subscribe, () => version)
  const key = [...new Set(ids)].sort((a, b) => a - b).join(',')

  useEffect(() => {
    if (key) fetchMissing(key.split(',').map(Number))
  }, [key])

  return (id: number) => known.get(id)
}

export function displayName(user: UserSummary | undefined, id: number, me: number) {
  if (id === me) return 'You'
  return user?.name ?? `User #${id}`
}

export function clearUsers() {
  known.clear()
  requested.clear()
  emit()
}
