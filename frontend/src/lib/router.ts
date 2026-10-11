import { useSyncExternalStore } from 'react'

export type Route = { name: 'home' } | { name: 'register' } | { name: 'group'; groupId: number }

function parse(hash: string): Route {
  const path = hash.replace(/^#/, '')
  const group = path.match(/^\/groups\/(\d+)$/)
  if (group) return { name: 'group', groupId: Number(group[1]) }
  if (path === '/register') return { name: 'register' }
  return { name: 'home' }
}

function subscribe(listener: () => void) {
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}

export function useRoute(): Route {
  return parse(useSyncExternalStore(subscribe, () => window.location.hash))
}

export function navigate(path: string) {
  window.location.hash = path
}
