import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import type { SettlementStatus } from '../lib/types'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'owe' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const buttonVariants = {
  primary: 'bg-brand-500 text-white shadow-sm hover:bg-brand-600 disabled:bg-brand-500/50',
  owe: 'bg-owe-500 text-white shadow-sm hover:bg-owe-600 disabled:bg-owe-500/50',
  secondary:
    'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 disabled:bg-rose-600/50',
}

const buttonSizes = {
  sm: 'h-8 gap-1.5 px-3 text-sm',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-11 gap-2 px-5 text-base',
}

export function Button({ variant = 'primary', size = 'md', loading, disabled, className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex shrink-0 items-center justify-center rounded-xl whitespace-nowrap font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${buttonSizes[size]} ${buttonVariants[variant]} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

const controlBase =
  'w-full rounded-xl border bg-white text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none disabled:opacity-60 dark:bg-slate-900 dark:text-slate-100'

function controlBorder(invalid?: boolean) {
  return invalid ? 'border-rose-400 dark:border-rose-700' : 'border-slate-200 dark:border-slate-700'
}

export function Input({ invalid, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...rest} aria-invalid={invalid || undefined} className={`h-11 px-3.5 ${controlBase} ${controlBorder(invalid)} ${className}`} />
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={`h-11 appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-9 pl-3.5 ${controlBase} ${controlBorder()} ${className}`}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2394a3b8'%3E%3Cpath d='M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z'/%3E%3C/svg%3E\")" }}
    >
      {children}
    </select>
  )
}

export function Label({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
      {children}
    </label>
  )
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string; prefix?: string }

export function Field({ label, hint, error, prefix, id, className = '', ...rest }: FieldProps) {
  const inputId = id ?? rest.name
  return (
    <div className={className}>
      <Label htmlFor={inputId}>{label}</Label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-slate-400">{prefix}</span>
        )}
        <Input id={inputId} invalid={!!error} className={prefix ? 'pl-8' : ''} {...rest} />
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      )}
    </div>
  )
}

export function Card({ title, action, children, className = '', padded = true }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={`min-w-0 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800 ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          {title && <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">{title}</h2>}
          {action}
        </header>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  )
}

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'success' | 'info'; children: ReactNode }) {
  const tones = {
    error: 'bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900',
    success: 'bg-brand-50 text-brand-800 ring-brand-200 dark:bg-brand-950/40 dark:text-brand-200 dark:ring-brand-900',
    info: 'bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:ring-slate-700',
  }
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl px-3.5 py-2.5 text-sm ring-1 ${tones[tone]}`}>
      {children}
    </div>
  )
}

export function Spinner({ className = 'size-4' }: { className?: string }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent ${className}`} aria-hidden />
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500 dark:text-slate-400">
      <Spinner /> {label}
    </div>
  )
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      {icon && (
        <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl dark:bg-slate-800">{icon}</div>
      )}
      <p className="font-semibold text-slate-800 dark:text-slate-200">{title}</p>
      {children && <div className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">{children}</div>}
    </div>
  )
}

const avatarColors = [
  'bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100',
  'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100',
  'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100',
  'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
  'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100',
  'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-100',
]

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function Avatar({ id, name, size = 'md', className = '' }: { id: number; name?: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'size-7 text-[0.65rem]', md: 'size-9 text-xs', lg: 'size-12 text-sm' }
  return (
    <span
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${sizes[size]} ${avatarColors[id % avatarColors.length]} ${className}`}
    >
      {name ? initials(name) : '#'}
    </span>
  )
}

const statusStyles: Record<SettlementStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  ACKNOWLEDGED: 'bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300',
  REJECTED: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
}

const statusLabels: Record<SettlementStatus, string> = {
  PENDING: 'Pending',
  ACKNOWLEDGED: 'Confirmed',
  REJECTED: 'Rejected',
}

export function StatusBadge({ status }: { status: SettlementStatus }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyles[status]}`}>{statusLabels[status]}</span>
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className = '',
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={`grid auto-cols-fr grid-flow-col rounded-xl bg-slate-100 p-1 dark:bg-slate-800 ${className}`} role="radiogroup">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            value === option.value
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

// Rendered only while open; uses the native <dialog> for focus trapping and Escape handling
export function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
}: {
  title: string
  description?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg'
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onMouseDown={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className={`m-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] animate-dialog-in overflow-hidden rounded-3xl bg-white p-0 text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-slate-100 ${size === 'lg' ? 'max-w-xl' : 'max-w-md'}`}
    >
      <div className="flex max-h-[calc(100svh-2rem)] flex-col">
        <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 -mr-2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </header>
        <div className="overflow-y-auto px-6 pb-6">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60">
            {footer}
          </footer>
        )}
      </div>
    </dialog>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden className={`block animate-pulse rounded-lg bg-slate-200/80 dark:bg-slate-800 ${className}`} />
}

// Placeholder rows shaped like the lists they stand in for
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="divide-y divide-slate-100 dark:divide-slate-800">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-4">
          <Skeleton className="size-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

// "you owe ₹x" / "you are owed ₹x" / "settled up" for a net amount (positive = owed to you)
export function NetLabel({ net, format, className = '' }: { net: number; format: (n: number) => string; className?: string }) {
  if (Math.abs(net) < 0.005) return <span className={`text-slate-400 ${className}`}>settled up</span>
  return net > 0 ? (
    <span className={`text-brand-700 dark:text-brand-400 ${className}`}>
      you are owed <strong className="font-semibold">{format(net)}</strong>
    </span>
  ) : (
    <span className={`text-owe-600 dark:text-owe-400 ${className}`}>
      you owe <strong className="font-semibold">{format(-net)}</strong>
    </span>
  )
}
