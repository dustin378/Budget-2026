import type { Loan, SnowballConfig } from '../types'
import { round2 } from './money'

export interface ProjectedPayment {
  loanId: ID
  loanName: string
  monthIndex: number // 0 = first projection month
  startBalance: number
  interest: number
  principal: number
  payment: number
  endBalance: number
  paidOffThisMonth: boolean
}

export interface ProjectionSummary {
  payments: ProjectedPayment[]
  monthsToFreedom: number
  totalInterestPaid: number
  totalPrincipalPaid: number
  payoffDates: Record<ID, number> // loanId -> monthIndex when paid off
  insufficientPayment: boolean // true if minimum payments don't cover interest somewhere
}

type ID = string

/**
 * Order loans according to strategy.
 * - snowball: smallest current balance first
 * - avalanche: highest APR first
 * - custom: explicit order; any active loans not in customOrder fall through by id
 */
export function orderLoans(loans: Loan[], config: SnowballConfig): Loan[] {
  const active = loans.filter((l) => l.active && l.currentBalance > 0)
  if (config.strategy === 'snowball') {
    return [...active].sort((a, b) => a.currentBalance - b.currentBalance)
  }
  if (config.strategy === 'avalanche') {
    return [...active].sort((a, b) => b.apr - a.apr)
  }
  // custom
  const ordered: Loan[] = []
  const seen = new Set<string>()
  for (const id of config.customOrder) {
    const found = active.find((l) => l.id === id)
    if (found) {
      ordered.push(found)
      seen.add(id)
    }
  }
  for (const l of active) {
    if (!seen.has(l.id)) ordered.push(l)
  }
  return ordered
}

/**
 * Project month-by-month payoff.
 *
 * Mechanics:
 *  - Interest accrues monthly at apr/12 on the start-of-month balance
 *  - All loans receive their minimum payment
 *  - The "target" loan (first in priority order with balance > 0) receives:
 *      extraMonthly + (rolled minimums from already paid-off loans, if rollPaidPaymentsForward)
 *  - When a loan is paid off mid-month, its remaining payment is rolled into the next target
 *    (within the same month)
 *  - Hard cap: 600 months (50 years) to prevent runaway projections
 */
export function projectPayoff(
  loans: Loan[],
  config: SnowballConfig,
  maxMonths = 600,
): ProjectionSummary {
  const ordered = orderLoans(loans, config)
  const balances = new Map<string, number>()
  const aprs = new Map<string, number>()
  const minimums = new Map<string, number>()
  const names = new Map<string, string>()
  const rolledMinimums = new Map<string, number>() // loanId -> when paid off, this min rolls forward

  for (const l of ordered) {
    balances.set(l.id, l.currentBalance)
    aprs.set(l.id, l.apr)
    minimums.set(l.id, l.minimumPayment)
    names.set(l.id, l.name)
  }

  const payments: ProjectedPayment[] = []
  const payoffDates: Record<string, number> = {}
  let totalInterest = 0
  let totalPrincipal = 0
  let monthsElapsed = 0
  let insufficient = false

  while (monthsElapsed < maxMonths) {
    const remaining = ordered.filter((l) => (balances.get(l.id) ?? 0) > 0.005)
    if (remaining.length === 0) break

    // accrue interest first
    const interestThisMonth = new Map<string, number>()
    for (const l of remaining) {
      const bal = balances.get(l.id)!
      const monthlyRate = (aprs.get(l.id) ?? 0) / 12
      const interest = round2(bal * monthlyRate)
      interestThisMonth.set(l.id, interest)
    }

    // compute total available payment pool for minimums + extras
    // first: minimums for all remaining loans
    const monthRecords = new Map<string, ProjectedPayment>()
    for (const l of remaining) {
      const bal = balances.get(l.id)!
      const interest = interestThisMonth.get(l.id)!
      monthRecords.set(l.id, {
        loanId: l.id,
        loanName: names.get(l.id)!,
        monthIndex: monthsElapsed,
        startBalance: bal,
        interest,
        principal: 0,
        payment: 0,
        endBalance: bal,
        paidOffThisMonth: false,
      })
    }

    // pool of "extra" money to direct at the target
    let extraPool = config.extraMonthly
    if (config.rollPaidPaymentsForward) {
      for (const [, amt] of rolledMinimums) extraPool += amt
    }

    // apply minimums first
    for (const l of remaining) {
      const rec = monthRecords.get(l.id)!
      const bal = balances.get(l.id)!
      const interest = interestThisMonth.get(l.id)!
      const min = minimums.get(l.id) ?? 0
      const owed = bal + interest // gross owed at end of month if no payment

      // detect insufficient minimum (doesn't cover interest)
      if (min < interest && remaining.length > 0) {
        // not necessarily fatal if extra covers it, but flag
        if (l.id !== remaining[0].id) {
          insufficient = true
        }
      }

      const minApplied = Math.min(min, owed)
      rec.payment += minApplied
      rec.principal += minApplied - interest
      rec.endBalance = round2(owed - minApplied)
      balances.set(l.id, rec.endBalance)
    }

    // direct extra pool at target loans in priority order, paying off as we go
    for (const l of remaining) {
      if (extraPool <= 0) break
      const rec = monthRecords.get(l.id)!
      const bal = balances.get(l.id)!
      if (bal <= 0.005) continue
      const apply = Math.min(extraPool, bal)
      rec.payment += apply
      rec.principal += apply
      rec.endBalance = round2(bal - apply)
      balances.set(l.id, rec.endBalance)
      extraPool -= apply
    }

    // mark paid off, roll minimums forward, accumulate totals
    for (const rec of monthRecords.values()) {
      rec.payment = round2(rec.payment)
      rec.principal = round2(rec.principal)
      rec.endBalance = round2(rec.endBalance)
      if (rec.endBalance <= 0.005 && rec.startBalance > 0) {
        rec.paidOffThisMonth = true
        rec.endBalance = 0
        if (payoffDates[rec.loanId] === undefined) {
          payoffDates[rec.loanId] = monthsElapsed
        }
        if (config.rollPaidPaymentsForward) {
          rolledMinimums.set(rec.loanId, minimums.get(rec.loanId) ?? 0)
        }
      }
      totalInterest += rec.interest
      totalPrincipal += rec.principal
      payments.push(rec)
    }

    monthsElapsed += 1
  }

  return {
    payments,
    monthsToFreedom: monthsElapsed,
    totalInterestPaid: round2(totalInterest),
    totalPrincipalPaid: round2(totalPrincipal),
    payoffDates,
    insufficientPayment: insufficient,
  }
}

/**
 * Aggregate projection per month for charting.
 */
export function projectionByMonth(summary: ProjectionSummary): {
  monthIndex: number
  totalBalance: number
  totalPayment: number
  totalInterest: number
}[] {
  const map = new Map<number, { totalBalance: number; totalPayment: number; totalInterest: number }>()
  for (const p of summary.payments) {
    const cur = map.get(p.monthIndex) ?? { totalBalance: 0, totalPayment: 0, totalInterest: 0 }
    cur.totalBalance += p.endBalance
    cur.totalPayment += p.payment
    cur.totalInterest += p.interest
    map.set(p.monthIndex, cur)
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([monthIndex, v]) => ({ monthIndex, ...v }))
}
