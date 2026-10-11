import { useSyncExternalStore } from 'react'
import type { TokenResponse } from './types'

const KEY = 'splitwise.session'

export type Session = {
  accessToken: string
  refreshToken: string
  userId: number
}

const listeners = new Set<() => void>()
let cachedRaw: string | null | undefined
let cached: Session | null = null

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

// Reads straight from storage so a token rotated by another tab is seen immediately.
// The parsed value is cached per raw string so useSyncExternalStore gets a stable snapshot.
function get(): Session | null {
  const raw = readRaw()
  if (raw !== cachedRaw) {
    cachedRaw = raw
    try {
      cached = raw ? (JSON.parse(raw) as Session) : null
    } catch {
      cached = null
    }
  }
  return cached
}

function emit() {
  listeners.forEach((listener) => listener())
}

// The access token's `sub` claim is the user id; the backend has no other way to ask "who am I".
function userIdFromJwt(token: string): number {
  const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  const json = atob(payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '='))
  return Number(JSON.parse(json).sub)
}

function set(tokens: TokenResponse) {
  const session: Session = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    userId: userIdFromJwt(tokens.accessToken),
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    // Storage blocked: the session only lasts until reload
    cachedRaw = JSON.stringify(session)
    cached = session
  }
  emit()
}

function clear() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

window.addEventListener('storage', (e) => {
  if (e.key === KEY) emit()
})

export const session = { get, set, clear, subscribe }

export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, get)
}
