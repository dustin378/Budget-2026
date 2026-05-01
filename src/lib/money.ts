export function fmtMoney(n: number, opts: { sign?: boolean; cents?: boolean } = {}): string {
  const { sign = false, cents = true } = opts
  const abs = Math.abs(n)
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  })
  const prefix = n < 0 ? '−' : sign && n > 0 ? '+' : ''
  return `${prefix}$${formatted}`
}

export function fmtMoneyPlain(n: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function parseMoney(s: string): number {
  if (!s) return 0
  const cleaned = s.replace(/[^0-9.\-]/g, '')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}
