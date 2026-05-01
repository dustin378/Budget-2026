import type { AppState, Credit, MonthData } from '../types'
import { computeMonthTotals } from './compute'
import { nextMonthKey, todayISO } from './dates'
import { round2 } from './money'
import { newId } from './seed'

/**
 * Close a month and propagate state to the next month.
 *
 * Rules:
 *  1. Month is marked closed; closingBalance = computed actualBal.
 *  2. Next month exists (already seeded for the year). Its:
 *      - openingBalance := closingBalance of just-closed month
 *      - billBudgets    := merged from current month's billBudgets (preserves edits)
 *      - categoryBudgets:= merged from current month's categoryBudgets
 *      - incomeBudgets  := merged from current month's incomeBudgets
 *      - recurringCreditBudget := from current month
 *      - a 'carryForward' credit is added equal to unspent envelope total
 *        (sum of (budget - actual) for bills + categories, clamped at 0)
 *  3. If the next month already had a 'carryForward' credit (from a prior close),
 *     it is replaced.
 */
export function closeMonth(state: AppState, key: string): AppState {
  const month = state.months[key]
  if (!month) return state
  if (month.status === 'closed') return state

  const totals = computeMonthTotals(month)

  // unspent envelope total = sum of (budget - actual) for each bill/category, only positive
  let unspent = 0
  for (const [billId, budget] of Object.entries(month.billBudgets)) {
    const spent = month.billPayments
      .filter(p => p.billId === billId)
      .reduce((a, p) => a + p.amount, 0)
    const left = budget - spent
    if (left > 0) unspent += left
  }
  for (const [catId, budget] of Object.entries(month.categoryBudgets)) {
    const spent = month.transactions
      .filter(t => t.categoryId === catId)
      .reduce((a, t) => a + t.amount, 0)
    const left = budget - spent
    if (left > 0) unspent += left
  }
  unspent = round2(unspent)

  const closedMonth: MonthData = {
    ...month,
    status: 'closed',
    closingBalance: totals.actualBal,
    reconciledAt: todayISO(),
  }

  const nextKey = nextMonthKey(key)
  const next = state.months[nextKey]
  let updatedNext: MonthData | undefined

  if (next) {
    // remove any prior carryForward credit, replace with this one
    const filteredCredits = next.credits.filter(c => c.type !== 'carryForward')
    const carry: Credit = {
      id: newId('cred_cf_'),
      type: 'carryForward',
      amount: unspent,
      date: todayISO(),
      note: `Carried forward from ${key}`,
    }

    updatedNext = {
      ...next,
      openingBalance: totals.actualBal,
      // merge budgets: forward current month's budgets but preserve any non-default user edits
      // simplest defensible rule: forward current budgets if next is still 'planning'
      billBudgets: next.status === 'planning' ? { ...month.billBudgets } : next.billBudgets,
      categoryBudgets: next.status === 'planning' ? { ...month.categoryBudgets } : next.categoryBudgets,
      incomeBudgets: next.status === 'planning' ? { ...month.incomeBudgets } : next.incomeBudgets,
      recurringCreditBudget: next.status === 'planning' ? month.recurringCreditBudget : next.recurringCreditBudget,
      credits: [carry, ...filteredCredits],
      status: next.status === 'planning' ? 'active' : next.status,
    }
  }

  return {
    ...state,
    months: {
      ...state.months,
      [key]: closedMonth,
      ...(updatedNext ? { [nextKey]: updatedNext } : {}),
    },
  }
}

/**
 * Reopen a closed month.
 *  - Status returns to 'active'
 *  - closingBalance cleared
 *  - The carryForward credit added to the next month by this close is removed
 *    (next month's opening balance is also rolled back to its pre-close value
 *     — but since we don't track that history, we recompute from prior month's close
 *     or fall back to 0 if prior month is also non-closed)
 */
export function reopenMonth(state: AppState, key: string): AppState {
  const month = state.months[key]
  if (!month || month.status !== 'closed') return state

  const reopened: MonthData = {
    ...month,
    status: 'active',
    closingBalance: null,
  }

  const nextKey = nextMonthKey(key)
  const next = state.months[nextKey]
  let updatedNext: MonthData | undefined

  if (next) {
    updatedNext = {
      ...next,
      credits: next.credits.filter(c => c.type !== 'carryForward'),
      // recompute opening balance from this (now-reopened) month's current actualBal
      openingBalance: computeMonthTotals(reopened).actualBal,
    }
  }

  return {
    ...state,
    months: {
      ...state.months,
      [key]: reopened,
      ...(updatedNext ? { [nextKey]: updatedNext } : {}),
    },
  }
}
