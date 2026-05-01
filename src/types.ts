// Domain types for Budget 2026

export type ID = string

export type MonthStatus = 'planning' | 'active' | 'closed'

export type MonthKey = string // "2026-01" .. "2026-12"

export interface IncomeSource {
  id: ID
  name: string
  budgetedAmount: number // default monthly budget
  active: boolean
}

export interface Bill {
  id: ID
  name: string
  budgetedAmount: number
  autopay: boolean
  dueDay?: number // day of month, 1-31
  active: boolean
  order: number
}

export interface ExpenseCategory {
  id: ID
  name: string
  budgetedAmount: number
  active: boolean
  order: number
}

export interface IncomeDeposit {
  id: ID
  sourceId: ID
  amount: number
  date: string // ISO yyyy-mm-dd
  note?: string
}

export type CreditType = 'interest' | 'misc' | 'recurring' | 'carryForward'

export interface Credit {
  id: ID
  type: CreditType
  amount: number
  date: string
  note?: string
}

export interface BillPayment {
  id: ID
  billId: ID
  amount: number
  date: string
  note?: string
}

export interface Transaction {
  id: ID
  categoryId: ID
  amount: number
  date: string
  source: string // store/vendor
  note?: string
}

export interface MileEntry {
  id: ID
  date: string
  startMi: number
  endMi: number
  purpose: string
}

export interface MonthData {
  key: MonthKey
  year: number
  monthIndex: number // 0-11
  status: MonthStatus
  openingBalance: number // carried from prior month's close
  closingBalance: number | null // set on close
  reconciledAt: string | null

  // budget snapshots — frozen at month-create so editing globals doesn't retro-edit
  incomeBudgets: Record<ID, number> // sourceId -> budgeted
  billBudgets: Record<ID, number>
  categoryBudgets: Record<ID, number>
  recurringCreditBudget: number

  // actuals
  incomeDeposits: IncomeDeposit[]
  credits: Credit[]
  billPayments: BillPayment[]
  transactions: Transaction[]
  mileage: MileEntry[]
}

export type SnowballStrategy = 'snowball' | 'avalanche' | 'custom'

export interface Loan {
  id: ID
  name: string
  currentBalance: number
  apr: number // 0.0599 = 5.99%
  minimumPayment: number
  active: boolean
  paidOffDate?: string // set when balance hits 0
  order: number
}

export interface LoanPayment {
  id: ID
  loanId: ID
  scheduledDate: string
  scheduledAmount: number
  postedDate?: string
  postedAmount?: number
}

export interface SnowballConfig {
  strategy: SnowballStrategy
  customOrder: ID[] // loan ids when strategy === 'custom'
  extraMonthly: number // additional payment above sum of minimums
  rollPaidPaymentsForward: boolean // true = real snowball mechanic
}

export interface Account {
  checkingBalance: number
  balanceDate: string
  lastReconciledDate: string | null
}

export interface AppState {
  schemaVersion: number
  year: number
  account: Account
  incomeSources: IncomeSource[]
  bills: Bill[]
  categories: ExpenseCategory[]
  recurringCreditAmount: number // standing recurring credit budget
  months: Record<MonthKey, MonthData>
  loans: Loan[]
  loanPayments: LoanPayment[]
  snowballConfig: SnowballConfig
  mileageRates: Record<number, number> // year -> $/mi
  ui: {
    activeMonth: MonthKey
    activeView: 'month' | 'dashboard' | 'loans' | 'settings'
  }
}
