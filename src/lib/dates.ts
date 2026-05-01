export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

export function parseMonthKey(key: string): { year: number; monthIndex: number } {
  const [y, m] = key.split('-').map(Number)
  return { year: y, monthIndex: m - 1 }
}

export function nextMonthKey(key: string): string {
  const { year, monthIndex } = parseMonthKey(key)
  if (monthIndex === 11) return monthKey(year + 1, 0)
  return monthKey(year, monthIndex + 1)
}

export function prevMonthKey(key: string): string {
  const { year, monthIndex } = parseMonthKey(key)
  if (monthIndex === 0) return monthKey(year - 1, 11)
  return monthKey(year, monthIndex - 1)
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function fmtDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return `${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getDate()}`
}

export function currentMonthKey(): string {
  const d = new Date()
  return monthKey(d.getFullYear(), d.getMonth())
}

export function currentYear(): number {
  return new Date().getFullYear()
}
