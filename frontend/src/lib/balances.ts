import type { GroupBalance } from './types'

// Per-person net position from pairwise balances: positive = gets money back, negative = owes
export function netByPerson(balances: GroupBalance[]): Map<number, number> {
  const net = new Map<number, number>()
  for (const b of balances) {
    net.set(b.creditorId, (net.get(b.creditorId) ?? 0) + b.amount)
    net.set(b.debtorId, (net.get(b.debtorId) ?? 0) - b.amount)
  }
  return net
}

// Where the balance between `me` and `other` comes from: their net in each group, positive = they owe me
export function breakdownWith(me: number, other: number, byGroup: Record<number, GroupBalance[]>) {
  const parts: { groupId: number; amount: number }[] = []
  for (const [groupId, balances] of Object.entries(byGroup)) {
    let amount = 0
    for (const b of balances) {
      if (b.debtorId === other && b.creditorId === me) amount += b.amount
      if (b.debtorId === me && b.creditorId === other) amount -= b.amount
    }
    if (Math.abs(amount) >= 0.005) parts.push({ groupId: Number(groupId), amount })
  }
  return parts.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
}
