// Shapes returned by the backend services. BigDecimal amounts arrive as JSON numbers.

export type TokenResponse = {
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer'
  expiresIn: number
}

export type UserResponse = {
  id: number
  name: string
  email: string
  createdAt: string
}

export type Share = { userId: number; shareAmount: number }

export type Expense = {
  id: number
  groupId: number | null
  description: string | null
  paidBy: number
  totalAmount: number
  shares: Share[]
  createdAt: string
}

export type ExpenseRequest =
  | {
      groupId: number | null
      description: string
      paidBy: number
      totalAmount: string
      splitType: 'EQUAL'
      participantUserIds: number[]
    }
  | {
      groupId: number | null
      description: string
      paidBy: number
      totalAmount: string
      splitType: 'CUSTOM'
      participantShares: { userId: number; shareAmount: string }[]
    }

export type Page<T> = {
  items: T[]
  page: number
  totalPages: number
  totalElements: number
}

export type GroupBalance = { debtorId: number; creditorId: number; amount: number }
export type GroupBalances = { groupId: number; balances: GroupBalance[] }

export type UserBalance = { otherUserId: number; amount: number; youOwe: boolean }
export type UserBalances = { userId: number; balances: UserBalance[] }

export type SettlementStatus = 'PENDING' | 'ACKNOWLEDGED' | 'REJECTED'

export type Settlement = {
  id: number
  payerId: number
  receiverId: number
  groupId: number | null
  amount: number
  status: SettlementStatus
  createdAt: string
  statusChangedAt: string
}

export type CreateSettlementRequest = {
  idempotencyKey: string
  payerId: number
  receiverId: number
  groupId?: number
  amount: string
}

export type UserSummary = { id: number; name: string; email: string }

export type Member = UserSummary & { joinedAt: string }

export type GroupSummary = {
  id: number
  name: string
  createdBy: number
  memberCount: number
  createdAt: string
}

export type GroupDetails = {
  id: number
  name: string
  createdBy: number
  createdAt: string
  members: Member[]
}
