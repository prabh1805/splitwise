import { session } from './session'
import type {
  CreateSettlementRequest,
  Expense,
  ExpenseRequest,
  GroupBalances,
  GroupDetails,
  GroupSummary,
  Page,
  Settlement,
  TokenResponse,
  UserBalance,
  UserBalances,
  UserResponse,
  UserSummary,
} from './types'

export class ApiError extends Error {
  status: number
  fieldErrors: Record<string, string>

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

type ErrorBody = { message?: string; detail?: string; fieldErrors?: Record<string, string> }

async function toApiError(res: Response): Promise<ApiError> {
  let body: ErrorBody = {}
  try {
    body = await res.json()
  } catch {
    // non-JSON error body
  }
  const message = body.detail ?? body.message ?? `Request failed (${res.status})`
  return new ApiError(res.status, message, body.fieldErrors)
}

let refreshInFlight: Promise<boolean> | null = null

// Refresh tokens are single-use, so concurrent 401s must share one refresh call.
// Two calls with the same token would make the second one fail and log the user out.
export function refreshTokens(): Promise<boolean> {
  refreshInFlight ??= doRefresh().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

async function doRefresh(): Promise<boolean> {
  const token = session.get()?.refreshToken
  if (!token) return false

  const res = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: token }),
  })
  if (res.ok) {
    session.set(await res.json())
    return true
  }
  // Another tab may have rotated the token first; its new one is already in storage
  if (session.get()?.refreshToken !== token && session.get()) return true

  session.clear()
  return false
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  auth?: boolean
}

async function request<T>(path: string, { method = 'GET', body, auth = true }: RequestOptions = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const accessToken = session.get()?.accessToken
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`

  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (res.status === 401 && auth && !retried) {
    if (await refreshTokens()) return request<T>(path, { method, body, auth }, true)
  }
  if (!res.ok) throw await toApiError(res)

  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

// Spring Data serializes Page either flat or with a nested `page` object depending on version/config.
type RawPage<T> = {
  content?: T[]
  number?: number
  totalPages?: number
  totalElements?: number
  page?: { number?: number; totalPages?: number; totalElements?: number }
}

function toPage<T>(raw: RawPage<T>): Page<T> {
  const meta = raw.page ?? raw
  return {
    items: raw.content ?? [],
    page: meta.number ?? 0,
    totalPages: meta.totalPages ?? 1,
    totalElements: meta.totalElements ?? 0,
  }
}

export const api = {
  register: (body: { name: string; email: string; password: string }) =>
    request<UserResponse>('/api/v1/auth/register', { method: 'POST', body, auth: false }),

  async login(body: { email: string; password: string }) {
    session.set(await request<TokenResponse>('/api/v1/auth/login', { method: 'POST', body, auth: false }))
  },

  me: () => request<UserResponse>('/api/v1/users/me'),

  lookupUsers: (ids: number[]) => request<UserSummary[]>(`/api/v1/users?ids=${ids.join(',')}`),

  listFriends: () => request<UserSummary[]>('/api/v1/friends'),

  addFriend: (email: string) => request<UserSummary>('/api/v1/friends', { method: 'POST', body: { email } }),

  listGroups: () => request<GroupSummary[]>('/api/v1/groups'),

  createGroup: (name: string) => request<GroupDetails>('/api/v1/groups', { method: 'POST', body: { name } }),

  getGroup: (groupId: number) => request<GroupDetails>(`/api/v1/groups/${groupId}`),

  renameGroup: (groupId: number, name: string) =>
    request<GroupDetails>(`/api/v1/groups/${groupId}`, { method: 'PATCH', body: { name } }),

  deleteGroup: (groupId: number) => request<void>(`/api/v1/groups/${groupId}`, { method: 'DELETE' }),

  addMember: (groupId: number, email: string) =>
    request<GroupDetails>(`/api/v1/groups/${groupId}/members`, { method: 'POST', body: { email } }),

  removeMember: (groupId: number, userId: number) =>
    request<void>(`/api/v1/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),

  async listExpenses(groupId: number, page: number, size = 10) {
    const params = new URLSearchParams({
      groupId: String(groupId),
      page: String(page),
      size: String(size),
      sortBy: 'createdAt',
      sortDirection: 'DESC',
    })
    return toPage(await request<RawPage<Expense>>(`/api/v1/expenses?${params}`))
  },

  async listDirectExpenses(otherUserId: number, page: number, size = 10) {
    const params = new URLSearchParams({ with: String(otherUserId), page: String(page), size: String(size) })
    return toPage(await request<RawPage<Expense>>(`/api/v1/expenses/direct?${params}`))
  },

  createExpense: (body: ExpenseRequest) => request<Expense>('/api/v1/expenses', { method: 'POST', body }),

  groupBalances: (groupId: number) => request<GroupBalances>(`/api/v1/balances?groupId=${groupId}`),

  directBalance: (otherUserId: number) => request<UserBalance>(`/api/v1/balances/direct?with=${otherUserId}`),

  userBalances: (userId: number) => request<UserBalances>(`/api/v1/balances/users/${userId}`),

  createSettlement: (body: CreateSettlementRequest) =>
    request<Settlement>('/api/v1/settlements', { method: 'POST', body }),

  listSettlements: () => request<Settlement[]>('/api/v1/settlements'),

  getSettlement: (id: number) => request<Settlement>(`/api/v1/settlements/${id}`),

  acknowledgeSettlement: (id: number) => request<Settlement>(`/api/v1/settlements/${id}/acknowledge`, { method: 'POST' }),

  rejectSettlement: (id: number) => request<Settlement>(`/api/v1/settlements/${id}/reject`, { method: 'POST' }),
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const fields = Object.entries(error.fieldErrors)
    return fields.length ? fields.map(([field, msg]) => `${field}: ${msg}`).join(' · ') : error.message
  }
  if (error instanceof TypeError) return 'Can’t reach the server. Is the backend running?'
  return error instanceof Error ? error.message : 'Something went wrong'
}
