import { useCallback, useEffect } from 'react'
import { LogoutIcon, Logo } from './components/icons'
import { Sidebar } from './components/Sidebar'
import { Toaster } from './components/Toaster'
import { Avatar } from './components/ui'
import { api } from './lib/api'
import { refreshGroups, resetGroups } from './lib/groups'
import { useRoute } from './lib/router'
import { session, useSession } from './lib/session'
import { clearToasts } from './lib/toast'
import { useAsync } from './lib/useAsync'
import { clearUsers, rememberUsers } from './lib/users'
import { AuthPage } from './pages/AuthPage'
import { Dashboard } from './pages/Dashboard'
import { GroupPage } from './pages/GroupPage'

function logOut() {
  session.clear()
  resetGroups()
  clearUsers()
  clearToasts()
}

function App() {
  const current = useSession()
  const route = useRoute()

  if (!current) {
    return (
      <>
        <AuthPage mode={route.name === 'register' ? 'register' : 'login'} />
        <Toaster />
      </>
    )
  }
  return <SignedIn key={current.userId} me={current.userId} />
}

function SignedIn({ me }: { me: number }) {
  const route = useRoute()
  const loadMe = useCallback(() => api.me(), [])
  const { data: profile } = useAsync(loadMe)

  useEffect(() => {
    refreshGroups()
  }, [])

  useEffect(() => {
    if (profile) rememberUsers([profile])
  }, [profile])

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <a href="#/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
            <Logo />
            Splitwise
          </a>
          <div className="flex items-center gap-2">
            {profile && (
              <div className="flex items-center gap-2.5 rounded-full py-1 pr-3 pl-1">
                <Avatar id={me} name={profile.name} size="sm" />
                <div className="hidden leading-tight sm:block">
                  <div className="text-sm font-semibold">{profile.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{profile.email}</div>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={logOut}
              title="Log out"
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <LogoutIcon className="size-4.5" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[15rem_1fr] lg:py-8">
        <aside className="hidden lg:block">
          <Sidebar route={route} />
        </aside>
        <main className="min-w-0">
          {route.name === 'group' ? (
            <GroupPage key={route.groupId} groupId={route.groupId} me={me} />
          ) : (
            <Dashboard me={me} />
          )}
        </main>
      </div>
      <Toaster />
    </div>
  )
}

export default App
