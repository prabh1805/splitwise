import { useState, type FormEvent } from 'react'
import { Logo } from '../components/icons'
import { Alert, Button, Field } from '../components/ui'
import { ApiError, api, errorMessage } from '../lib/api'

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const isRegister = mode === 'register'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(undefined)
    setFieldErrors({})
    const credentials = { email: email.trim(), password }
    try {
      if (isRegister) await api.register({ name: name.trim(), ...credentials })
      await api.login(credentials)
      window.location.hash = '/'
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setFieldErrors(err.fieldErrors)
      else setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-linear-to-br from-brand-500 via-brand-600 to-brand-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-xl font-bold">
          <span className="rounded-xl bg-white/15 p-1">
            <Logo className="size-8" />
          </span>
          Splitwise
        </div>
        <div className="max-w-md">
          <h2 className="text-4xl leading-tight font-bold tracking-tight">Less stress when sharing expenses.</h2>
          <p className="mt-4 text-lg text-white/80">Keep track of shared bills on trips, with flatmates and friends, and settle up without the awkward maths.</p>
        </div>
        <ul className="space-y-3 text-sm text-white/90">
          <li>✓ Split equally or by exact amounts</li>
          <li>✓ See who owes whom at a glance</li>
          <li>✓ Payments only count once they’re confirmed</li>
        </ul>
        <div className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute top-1/3 -right-10 size-40 rounded-full bg-white/10" />
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <Logo className="mb-6 size-11 lg:hidden" />
            <h1 className="text-3xl font-bold tracking-tight">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              {isRegister ? 'It takes less than a minute.' : 'Log in to see who owes whom.'}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {error && <Alert>{error}</Alert>}
            {isRegister && (
              <Field
                label="Your name"
                name="name"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={fieldErrors.name}
              />
            )}
            <Field
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
            />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
              minLength={8}
              maxLength={72}
              hint={isRegister ? 'At least 8 characters' : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
            />
            <Button type="submit" size="lg" className="w-full" loading={submitting}>
              {isRegister ? 'Create account' : 'Log in'}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
            {isRegister ? 'Already have an account? ' : 'New to Splitwise? '}
            <a href={isRegister ? '#/' : '#/register'} className="font-semibold text-brand-700 hover:underline dark:text-brand-400">
              {isRegister ? 'Log in' : 'Create an account'}
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
