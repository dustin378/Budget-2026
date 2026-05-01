import type {
  AppState,
  Bill,
  ExpenseCategory,
  IncomeSource,
  MonthData,
} from '../types'
import { MONTH_NAMES, monthKey } from './dates'

let _id = 0
function uid(prefix = ''): string {
  _id += 1
  return `${prefix}${Date.now().toString(36)}_${_id.toString(36)}`
}

export function newId(prefix = ''): string {
  return uid(prefix)
}

const DEFAULT_INCOME_SOURCES: IncomeSource[] = [
  { id: 'inc_1', name: '1st Income', budgetedAmount: 0, active: true },
  { id: 'inc_2', name: '2nd Income', budgetedAmount: 0, active: true },
  { id: 'inc_3', name: '3rd Income', budgetedAmount: 0, active: true },
]

const DEFAULT_BILLS: Bill[] = [
  { id: 'bill_charity', name: 'Charitable Giving', budgetedAmount: 0, autopay: false, active: true, order: 0 },
  { id: 'bill_rent', name: 'Rent / Mortgage', budgetedAmount: 0, autopay: false, active: true, order: 1 },
  { id: 'bill_car1', name: 'Car Loan #1', budgetedAmount: 0, autopay: false, active: true, order: 2 },
  { id: 'bill_life', name: 'Life Insurance', budgetedAmount: 0, autopay: false, active: true, order: 3 },
  { id: 'bill_auto', name: 'Auto Insurance', budgetedAmount: 0, autopay: false, active: true, order: 4, dueDay: 30 },
  { id: 'bill_phone', name: 'Phone Bill', budgetedAmount: 0, autopay: true, active: true, order: 5, dueDay: 19 },
  { id: 'bill_savings', name: 'Savings', budgetedAmount: 0, autopay: false, active: true, order: 6 },
  { id: 'bill_electric', name: 'Electric Bill', budgetedAmount: 0, autopay: false, active: true, order: 7 },
  { id: 'bill_water', name: 'Water Bill', budgetedAmount: 0, autopay: false, active: true, order: 8 },
  { id: 'bill_gym', name: 'Gym Membership', budgetedAmount: 0, autopay: true, active: true, order: 9 },
]

const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: 'cat_grocery', name: 'Grocery', budgetedAmount: 0, active: true, order: 0 },
  { id: 'cat_gas', name: 'Gas', budgetedAmount: 0, active: true, order: 1 },
  { id: 'cat_cosmetics', name: 'Cosmetics', budgetedAmount: 0, active: true, order: 2 },
  { id: 'cat_dining', name: 'Dining Out', budgetedAmount: 0, active: true, order: 3 },
  { id: 'cat_home', name: 'Home Goods', budgetedAmount: 0, active: true, order: 4 },
  { id: 'cat_entertainment', name: 'Entertainment', budgetedAmount: 0, active: true, order: 5 },
  { id: 'cat_clothing', name: 'Clothing', budgetedAmount: 0, active: true, order: 6 },
  { id: 'cat_business', name: 'Business Exp', budgetedAmount: 0, active: true, order: 7 },
  { id: 'cat_misc', name: 'Misc. Exp', budgetedAmount: 0, active: true, order: 8 },
  { id: 'cat_medical', name: 'Medical', budgetedAmount: 0, active: true, order: 9 },
  { id: 'cat_supplements', name: 'Supplements', budgetedAmount: 0, active: true, order: 10 },
  { id: 'cat_cash', name: 'Cash Withdraw', budgetedAmount: 0, active: true, order: 11 },
]

export function emptyMonth(
  year: number,
  monthIndex: number,
  openingBalance: number,
  sources: IncomeSource[],
  bills: Bill[],
  categories: ExpenseCategory[],
  recurringCreditAmount: number,
): MonthData {
  return {
    key: monthKey(year, monthIndex),
    year,
    monthIndex,
    status: 'planning',
    openingBalance,
    closingBalance: null,
    reconciledAt: null,
    incomeBudgets: Object.fromEntries(sources.map((s) => [s.id, s.budgetedAmount])),
    billBudgets: Object.fromEntries(bills.filter((b) => b.active).map((b) => [b.id, b.budgetedAmount])),
    categoryBudgets: Object.fromEntries(categories.filter((c) => c.active).map((c) => [c.id, c.budgetedAmount])),
    recurringCreditBudget: recurringCreditAmount,
    incomeDeposits: [],
    credits: [],
    billPayments: [],
    transactions: [],
    mileage: [],
  }
}

export function seedState(year = 2026): AppState {
  const months: Record<string, MonthData> = {}
  for (let m = 0; m < 12; m++) {
    months[monthKey(year, m)] = emptyMonth(
      year, m, 0,
      DEFAULT_INCOME_SOURCES,
      DEFAULT_BILLS,
      DEFAULT_CATEGORIES,
      0,
    )
  }

  return {
    schemaVersion: 1,
    year,
    account: {
      checkingBalance: 0,
      balanceDate: '',
      lastReconciledDate: null,
    },
    incomeSources: DEFAULT_INCOME_SOURCES,
    bills: DEFAULT_BILLS,
    categories: DEFAULT_CATEGORIES,
    recurringCreditAmount: 0,
    months,
    loans: [],
    loanPayments: [],
    snowballConfig: {
      strategy: 'snowball',
      customOrder: [],
      extraMonthly: 0,
      rollPaidPaymentsForward: true,
    },
    mileageRates: { 2025: 0.67, 2026: 0.725 },
    ui: {
      activeMonth: monthKey(year, 0),
      activeView: 'month',
    },
  }
}

// expose for reset action
export const DEFAULTS = {
  incomeSources: DEFAULT_INCOME_SOURCES,
  bills: DEFAULT_BILLS,
  categories: DEFAULT_CATEGORIES,
}

export { MONTH_NAMES }
