import { useSyncExternalStore } from 'react'
import { api } from './api'
import { session } from './session'
import type { UserSummary } from './types'
import { rememberUsers } from './users'

// The signed-in user's friends and their overall balance with each person
// (positive = that person owes you). Shared by the sidebar, dashboard and friend page.
type State = { friends?: UserSummary[]; overall: Record<number, number>; error?: unknown }

let state: State = { overall: {} }
const listeners = new Set<() => void>()

function set(next: State) {
  state = next
  listeners.forEach((l) => l())
}

export async function refreshFriends() {
  const me = session.get()?.userId
  if (me == null) return
  try {
    const [friends, balances] = await Promise.all([api.listFriends(), api.userBalances(me)])
    rememberUsers(friends)
    const overall: Record<number, number> = {}
    balances.balances.forEach((b) => (overall[b.otherUserId] = b.youOwe ? -b.amount : b.amount))
    set({ friends, overall })
  } catch (error) {
    set({ ...state, error })
  }
}

export function resetFriends() {
  set({ overall: {} })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useFriends() {
  return useSyncExternalStore(subscribe, () => state)
}
