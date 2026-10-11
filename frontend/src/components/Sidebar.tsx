import { useState } from 'react'
import { useGroups } from '../lib/groups'
import type { Route } from '../lib/router'
import { useFriends } from '../lib/friends'
import { AddFriendModal } from './AddFriendModal'
import { CreateGroupModal } from './CreateGroupModal'
import { HomeIcon, PlusIcon } from './icons'
import { formatMoney } from '../lib/money'
import { Avatar, NetLabel, Skeleton } from './ui'

const groupColors = ['bg-brand-500', 'bg-sky-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-lime-600']

export function GroupIcon({ id, name, className = 'size-8 text-sm' }: { id: number; name: string; className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-xl font-bold text-white ${groupColors[id % groupColors.length]} ${className}`}>
      {name.trim().charAt(0).toUpperCase() || '#'}
    </span>
  )
}

export function Sidebar({ route }: { route: Route }) {
  const { groups, loading, myNet } = useGroups()
  const [creating, setCreating] = useState(false)
  const [addingFriend, setAddingFriend] = useState(false)
  const { friends, overall } = useFriends()

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
      active
        ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800 dark:text-white dark:ring-slate-700'
        : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
    }`

  return (
    <nav className="sticky top-22 space-y-6">
      <a href="#/" className={linkClass(route.name === 'home')}>
        <span className="flex size-8 items-center justify-center rounded-xl bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <HomeIcon className="size-4.5" />
        </span>
        Dashboard
      </a>

      <div>
        <div className="mb-2 flex items-center justify-between px-3">
          <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">Groups</h2>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950"
          >
            <PlusIcon className="size-3.5" /> Add
          </button>
        </div>
        {!groups && loading ? (
          <div className="space-y-3 px-3 py-2">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) : groups?.length === 0 ? (
          <p className="px-3 text-sm text-slate-500 dark:text-slate-400">No groups yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {groups?.map((g) => (
              <li key={g.id}>
                <a href={`#/groups/${g.id}`} className={linkClass(route.name === 'group' && route.groupId === g.id)}>
                  <GroupIcon id={g.id} name={g.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{g.name}</span>
                    {myNet[g.id] != null && (
                      <NetLabel net={myNet[g.id]} format={formatMoney} className="block truncate text-xs font-normal" />
                    )}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between px-3">
          <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">Friends</h2>
          <button
            type="button"
            onClick={() => setAddingFriend(true)}
            className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950"
          >
            <PlusIcon className="size-3.5" /> Add
          </button>
        </div>
        {!friends ? (
          <div className="space-y-3 px-3 py-2">
            <Skeleton className="h-8" />
          </div>
        ) : friends.length === 0 ? (
          <p className="px-3 text-sm text-slate-500 dark:text-slate-400">Add a friend to split without a group.</p>
        ) : (
          <ul className="space-y-0.5">
            {friends.map((f) => (
              <li key={f.id}>
                <a href={`#/friends/${f.id}`} className={linkClass(route.name === 'friend' && route.userId === f.id)}>
                  <Avatar id={f.id} name={f.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{f.name}</span>
                    <NetLabel net={overall[f.id] ?? 0} format={formatMoney} className="block truncate text-xs font-normal" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {creating && <CreateGroupModal onClose={() => setCreating(false)} />}
      {addingFriend && <AddFriendModal onClose={() => setAddingFriend(false)} />}
    </nav>
  )
}
