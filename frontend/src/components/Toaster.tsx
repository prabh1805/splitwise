import { dismissToast, useToasts } from '../lib/toast'
import { CheckIcon } from './icons'

export function Toaster() {
  const toasts = useToasts()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismissToast(t.id)}
          className={`pointer-events-auto flex max-w-md animate-toast-in items-center gap-2.5 rounded-2xl px-4 py-3 text-left text-sm font-medium text-white shadow-lg ${
            t.tone === 'error' ? 'bg-rose-600' : 'bg-slate-900 dark:bg-slate-700'
          }`}
        >
          {t.tone === 'success' && (
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-500">
              <CheckIcon className="size-3.5" />
            </span>
          )}
          {t.message}
        </button>
      ))}
    </div>
  )
}
