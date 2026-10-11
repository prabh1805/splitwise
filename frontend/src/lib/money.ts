const AMOUNT = /^\d+(\.\d{1,2})?$/

const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

// Amounts are handled as integer paise in the browser so splits add up exactly.
export function toPaise(input: string): number | null {
  const value = input.trim()
  if (!AMOUNT.test(value)) return null
  const [rupees, fraction = ''] = value.split('.')
  return Number(rupees) * 100 + Number(fraction.padEnd(2, '0'))
}

// Sent to the backend as a string so BigDecimal gets the exact value
export function paiseToAmount(paise: number): string {
  return (paise / 100).toFixed(2)
}

export function formatMoney(amount: number): string {
  return formatter.format(amount)
}

export function formatPaise(paise: number): string {
  return formatter.format(paise / 100)
}
