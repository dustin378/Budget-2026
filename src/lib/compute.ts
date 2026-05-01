import type { AppState, MonthData, MonthKey } from '../types'
import { round2 } from './money'
import { monthKey } from './dates'

export interface MonthTotals {
  // BUDGETED
  budgetedIncome: number
  budgetedCredits: number
  budgetedBills: number
  budgetedCategories: number
  budgetedNet: number // (income + credits) - (bills + categories)
  budgetBal: number // openingBalance + budgetedNet — the "Budget Bal" cell

  // ACTUAL
  actualIncome: number
  actualCredits: number
  actualBills: number
  actualCategories: number
  actualNet: number
  actualBal: number // openingBalance + actualNet — the "Actual Bal" cell

  // utility
  carryForward: number // sum of credits typed 'carryForward'
  miscCredits: number
  interestCredits: number
  recurringCredits: number
}

export function computeMonthTotals(month: MonthData): MonthTotals {
  const budgetedIncome = Object.values(month.incomeBudgets).reduce((a, b) => a + b, 0)
  const budgetedBills = Object.values(month.billBudgets).reduce((a, b) => a + b, 0)
  const budgetedCategories = Object.values(month.categoryBudgets).reduce((a, b) => a + b, 0)
  const budgetedCredits = month.recurringCreditBudget +
    month.credits.filter(c => c.type === 'carryForward').reduce((a, c) => a + c.amount, 0)

  const actualIncome = month.incomeDeposits.reduce((a, d) => a + d.amount, 0)
  const actualCredits = month.credits.reduce((a, c) => a + c.amount, 0)
  const actualBills = month.billPayments.reduce((a, p) => a + p.amount, 0)
  const actualCategories = month.transactions.reduce((a, t) => a + t.amount, 0)

  const budgetedNet = budgetedIncome + budgetedCredits - budgetedBills - budgetedCategories
  const actualNet = actualIncome + actualCredits - actualBills - actualCategories

  const carryForward = month.credits.filter(c => c.type === 'carryForward').reduce((a, c) => a + c.amount, 0)
  const miscCredits = month.credits.filter(c => c.type === 'misc').reduce((a, c) => a + c.amount, 0)
  const interestCredits = month.credits.filter(c => c.type === 'interest').reduce((a, c) => a + c.amount, 0)
  const recurringCredits = month.credits.filter(c => c.type === 'recurring').reduce((a, c) => a + c.amount, 0)

  return {
    budgetedIncome: round2(budgetedIncome),
    budgetedCredits: round2(budgetedCredits),
    budgetedBills: round2(budgetedBills),
    budgetedCategories: round2(budgetedCategories),
    budgetedNet: round2(budgetedNet),
    budgetBal: round2(month.openingBalance + budgetedNet),
    actualIncome: round2(actualIncome),
    actualCredits: round2(actualCredits),
    actualBills: round2(actualBills),
    actualCategories: round2(actualCategories),
    actualNet: round2(actualNet),
    actualBal: round2(month.openingBalance + actualNet),
    carryForward: round2(carryForward),
    miscCredits: round2(miscCredits),
    interestCredits: round2(interestCredits),
    recurringCredits: round2(recurringCredits),
  }
}

/** YTD income across all months in current year (income only — does not include misc credits). */
export function computeYTDIncome(state: AppState): number {
  let total = 0
  for (let m = 0; m < 12; m++) {
    const md = state.months[monthKey(state.year, m)]
    if (!md) continue
    for (const dep of md.incomeDeposits) total += dep.amount
  }
  return round2(total)
}

/** Per-bill spend for a month. */
export function billActuals(month: MonthData): Record<string, number> {
  const out: Record<string, number> = {}
  for (const p of month.billPayments) {
    out[p.billId] = round2((out[p.billId] ?? 0) + p.amount)
  }
  return out
}

/** Per-category spend for a month. */
export function categoryActuals(month: MonthData): Record<string, number> {
  const out: Record<string, number> = {}
  for (const t of month.transactions) {
    out[t.categoryId] = round2((out[t.categoryId] ?? 0) + t.amount)
  }
  return out
}

/** Mileage total dollars for a month at the year's rate. */
export function mileageTotal(month: MonthData, ratePerMile: number): { miles: number; dollars: number } {
  let miles = 0
  for (const m of month.mileage) {
    const d = m.endMi - m.startMi
    if (d > 0) miles += d
  }
  return { miles: round2(miles), dollars: round2(miles * ratePerMile) }
}

/** Sorted month keys for the current year. */
export function yearMonthKeys(state: AppState): MonthKey[] {
  return Array.from({ length: 12 }, (_, m) => monthKey(state.year, m))
}
