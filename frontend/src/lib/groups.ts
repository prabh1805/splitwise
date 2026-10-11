import { useSyncExternalStore } from 'react'
import { api } from './api'
import { netByPerson } from './balances'
import { session } from './session'
import type { GroupBalance, GroupSummary } from './types'

// The signed-in user's groups, each group's pairwise balances, and the user's own net position
// in each (myNet > 0 means they're owed money there). Shared by the sidebar, dashboard and group page.
type State = {
  groups?: GroupSummary[]
  balances: Record<number, GroupBalance[]>
  myNet: Record<number, number>
  error?: unknown
  loading: boolean
}

let state: State = { balances: {}, myNet: {}, loading: false }
const listeners = new Set<() => void>()

function set(next: State) {
  state = next
  listeners.forEach((l) => l())
}

function netFor(balances: GroupBalance[]) {
  const me = session.get()?.userId
  return me == null ? 0 : (netByPerson(balances).get(me) ?? 0)
}

export async function refreshGroups() {
  set({ ...state, loading: true })
  try {
    const groups = await api.listGroups()
    set({ ...state, groups, error: undefined, loading: false })

    const results = await Promise.allSettled(groups.map((g) => api.groupBalances(g.id)))
    const myNet: Record<number, number> = {}
    const balances: Record<number, GroupBalance[]> = {}
    results.forEach((r, i) => {
      if (r.status !== 'fulfilled') return
      balances[groups[i].id] = r.value.balances
      myNet[groups[i].id] = netFor(r.value.balances)
    })
    set({ ...state, balances, myNet })
  } catch (error) {
    set({ ...state, error, loading: false })
  }
}

// Called by the group page whenever it loads fresher balances than the store has
export function updateGroupBalances(groupId: number, balances: GroupBalance[]) {
  if (state.balances[groupId] === balances) return
  set({
    ...state,
    balances: { ...state.balances, [groupId]: balances },
    myNet: { ...state.myNet, [groupId]: netFor(balances) },
  })
}

export function resetGroups() {
  set({ balances: {}, myNet: {}, loading: false })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useGroups() {
  return useSyncExternalStore(subscribe, () => state)
}
