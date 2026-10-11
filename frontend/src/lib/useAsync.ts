import { useCallback, useEffect, useState } from 'react'

type Result<T> = { load: unknown; nonce: number; data?: T; error?: unknown }

// Runs `load` whenever it changes (callers wrap it in useCallback) or reload() is called.
// Previous data stays visible while a reload is in flight.
export function useAsync<T>(load: () => Promise<T>) {
  const [nonce, setNonce] = useState(0)
  const [result, setResult] = useState<Result<T>>()

  useEffect(() => {
    let active = true
    load().then(
      (data) => active && setResult({ load, nonce, data }),
      (error) => active && setResult({ load, nonce, error }),
    )
    return () => {
      active = false
    }
  }, [load, nonce])

  const current = result?.load === load && result.nonce === nonce
  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return {
    data: result?.load === load ? result.data : undefined,
    error: current ? result.error : undefined,
    loading: !current,
    reload,
  }
}
