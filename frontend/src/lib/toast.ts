import { useSyncExternalStore } from 'react'

export type Toast = { id: number; message: string; tone: 'success' | 'error' }

const MAX_VISIBLE = 3

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function toast(message: string, tone: Toast['tone'] = 'success') {
  const id = nextId++
  toasts = [...toasts, { id, message, tone }].slice(-MAX_VISIBLE)
  emit()
  setTimeout(() => dismissToast(id), 4000)
}

export function clearToasts() {
  toasts = []
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useToasts() {
  return useSyncExternalStore(subscribe, () => toasts)
}
