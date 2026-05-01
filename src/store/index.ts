import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  AppState,
  Bill,
  ExpenseCategory,
  IncomeSource,
  Loan,
  MonthKey,
  SnowballStrategy,
  CreditType,
} from '../types'
import { newId, seedState } from '../lib/seed'
import { closeMonth, reopenMonth } from '../lib/carryForward'

interface Actions {
  // top-level
  resetAll: () => void
  loadState: (s: AppState) => void
  setActiveMonth: (key: MonthKey) => void
  setActiveView: (v: AppState['ui']['activeView']) => void

  // account
  setCheckingBalance: (amount: number, date: string) => void
  markReconciled: () => void

  // budgets / globals
  setRecurringCreditAmount: (n: number) => void
  setMileageRate: (year: number, rate: number) => void

  // income sources
  addIncomeSource: (name: string) => void
  updateIncomeSource: (id: string, patch: Partial<IncomeSource>) => void
  removeIncomeSource: (id: string) => void

  // bills
  addBill: (name: string) => void
  updateBill: (id: string, patch: Partial<Bill>) => void
  removeBill: (id: string) => void

  // categories
  addCategory: (name: string) => void
  updateCategory: (id: string, patch: Partial<ExpenseCategory>) => void
  removeCategory: (id: string) => void

  // month-level budget edits
  setIncomeBudget: (monthKey: MonthKey, sourceId: string, amount: number) => void
  setBillBudget: (monthKey: MonthKey, billId: string, amount: number) => void
  setCategoryBudget: (monthKey: MonthKey, categoryId: string, amount: number) => void
  setRecurringCreditBudgetForMonth: (monthKey: MonthKey, amount: number) => void
  setOpeningBalance: (monthKey: MonthKey, amount: number) => void
  setMonthStatus: (monthKey: MonthKey, status: AppState['months'][string]['status']) => void

  // entries
  addIncomeDeposit: (monthKey: MonthKey, sourceId: string, amount: number, date: string, note?: string) => void
  removeIncomeDeposit: (monthKey: MonthKey, id: string) => void
  updateIncomeDeposit: (monthKey: MonthKey, id: string, patch: { amount?: number; date?: string; note?: string }) => void

  addCredit: (monthKey: MonthKey, type: CreditType, amount: number, date: string, note?: string) => void
  removeCredit: (monthKey: MonthKey, id: string) => void
  updateCredit: (monthKey: MonthKey, id: string, patch: { amount?: number; date?: string; note?: string }) => void

  addBillPayment: (monthKey: MonthKey, billId: string, amount: number, date: string, note?: string) => void
  removeBillPayment: (monthKey: MonthKey, id: string) => void
  updateBillPayment: (monthKey: MonthKey, id: string, patch: { amount?: number; date?: string; note?: string }) => void

  addTransaction: (monthKey: MonthKey, categoryId: string, amount: number, date: string, source: string, note?: string) => void
  removeTransaction: (monthKey: MonthKey, id: string) => void
  updateTransaction: (monthKey: MonthKey, id: string, patch: { amount?: number; date?: string; source?: string; note?: string }) => void

  addMileEntry: (monthKey: MonthKey, date: string, startMi: number, endMi: number, purpose: string) => void
  removeMileEntry: (monthKey: MonthKey, id: string) => void
  updateMileEntry: (monthKey: MonthKey, id: string, patch: Partial<{ date: string; startMi: number; endMi: number; purpose: string }>) => void

  // month close
  closeMonthAction: (monthKey: MonthKey) => void
  reopenMonthAction: (monthKey: MonthKey) => void

  // loans
  addLoan: (loan: Omit<Loan, 'id' | 'order'>) => void
  updateLoan: (id: string, patch: Partial<Loan>) => void
  removeLoan: (id: string) => void
  setSnowballStrategy: (s: SnowballStrategy) => void
  setSnowballExtra: (n: number) => void
  setSnowballRoll: (b: boolean) => void
  setSnowballCustomOrder: (ids: string[]) => void
}

type Store = AppState & Actions

const updateMonth = (s: AppState, key: MonthKey, patch: Partial<AppState['months'][string]>): AppState => {
  const m = s.months[key]
  if (!m) return s
  return { ...s, months: { ...s.months, [key]: { ...m, ...patch } } }
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      ...seedState(2026),

      resetAll: () => set(seedState(2026)),
      loadState: (s) => set(s),
      setActiveMonth: (key) => set((st) => ({ ui: { ...st.ui, activeMonth: key } })),
      setActiveView: (v) => set((st) => ({ ui: { ...st.ui, activeView: v } })),

      setCheckingBalance: (amount, date) =>
        set((st) => ({ account: { ...st.account, checkingBalance: amount, balanceDate: date } })),
      markReconciled: () =>
        set((st) => ({ account: { ...st.account, lastReconciledDate: new Date().toISOString().slice(0, 10) } })),

      setRecurringCreditAmount: (n) => set({ recurringCreditAmount: n }),
      setMileageRate: (year, rate) =>
        set((st) => ({ mileageRates: { ...st.mileageRates, [year]: rate } })),

      addIncomeSource: (name) =>
        set((st) => ({
          incomeSources: [...st.incomeSources, { id: newId('inc_'), name, budgetedAmount: 0, active: true }],
        })),
      updateIncomeSource: (id, patch) =>
        set((st) => ({
          incomeSources: st.incomeSources.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),
      removeIncomeSource: (id) =>
        set((st) => ({
          incomeSources: st.incomeSources.map((s) => (s.id === id ? { ...s, active: false } : s)),
        })),

      addBill: (name) =>
        set((st) => ({
          bills: [
            ...st.bills,
            {
              id: newId('bill_'),
              name,
              budgetedAmount: 0,
              autopay: false,
              active: true,
              order: st.bills.length,
            },
          ],
        })),
      updateBill: (id, patch) =>
        set((st) => ({ bills: st.bills.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
      removeBill: (id) =>
        set((st) => ({ bills: st.bills.map((b) => (b.id === id ? { ...b, active: false } : b)) })),

      addCategory: (name) =>
        set((st) => ({
          categories: [
            ...st.categories,
            { id: newId('cat_'), name, budgetedAmount: 0, active: true, order: st.categories.length },
          ],
        })),
      updateCategory: (id, patch) =>
        set((st) => ({
          categories: st.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      removeCategory: (id) =>
        set((st) => ({
          categories: st.categories.map((c) => (c.id === id ? { ...c, active: false } : c)),
        })),

      setIncomeBudget: (monthKey, sourceId, amount) =>
        set((st) => {
          const m = st.months[monthKey]
          if (!m) return st
          return updateMonth(st, monthKey, {
            incomeBudgets: { ...m.incomeBudgets, [sourceId]: amount },
          })
        }),
      setBillBudget: (monthKey, billId, amount) =>
        set((st) => {
          const m = st.months[monthKey]
          if (!m) return st
          return updateMonth(st, monthKey, {
            billBudgets: { ...m.billBudgets, [billId]: amount },
          })
        }),
      setCategoryBudget: (monthKey, categoryId, amount) =>
        set((st) => {
          const m = st.months[monthKey]
          if (!m) return st
          return updateMonth(st, monthKey, {
            categoryBudgets: { ...m.categoryBudgets, [categoryId]: amount },
          })
        }),
      setRecurringCreditBudgetForMonth: (monthKey, amount) =>
        set((st) => updateMonth(st, monthKey, { recurringCreditBudget: amount })),
      setOpeningBalance: (monthKey, amount) =>
        set((st) => updateMonth(st, monthKey, { openingBalance: amount })),
      setMonthStatus: (monthKey, status) =>
        set((st) => updateMonth(st, monthKey, { status })),

      addIncomeDeposit: (monthKey, sourceId, amount, date, note) =>
        set((st) => {
          const m = st.months[monthKey]
          if (!m) return st
          return updateMonth(st, monthKey, {
            incomeDeposits: [
              ...m.incomeDeposits,
              { id: newId('d_'), sourceId, amount, date, note },
            ],
          })
        }),
      removeIncomeDeposit: (monthKey, id) =>
        set((st) => {
          const m = st.months[monthKey]
          if (!m) return st
          return updateMonth(st, monthKey, {
            incomeDeposits: m.incomeDeposits.filter((d) => d.id !== id),
          })
        }),
      updateIncomeDeposit: (monthKey, id, patch) =>
        set((st) => {
          const m = st.months[monthKey]
          if (!m) return st
          return updateMonth(st, monthKey, {
            incomeDeposits: m.incomeDeposits.map((d) => (d.id === id ? { ...d, ...patch } : d)),
          })
        }),

      addCredit: (monthKey, type, amount, date, note) =>
        set((st) => {
          const m = st.months[monthKey]
          if (!m) return st
          return updateMonth(st, monthKey, {
            credits: [
              ...m.credits,
              { id: newId('c_'), type, amount, date, note },
            ],
          })
        }),
      removeCredit: (monthKey, id) =>
        set((st) => {
          const m = st.months[monthKey]
          if (!m) return st
          return updateMonth(st, monthKey, { credits: m.credits.filter((c) => c.id !== id) })
        }),
      updateCredit: (monthKey, id, patch) =>
        set((st) => {
          const m = st.months[monthKey]
          if (!m) return st
          return updateMonth(st, monthKey, {
            credits: m.credits.map((c) => (c.id === id ? { ...c, ...patch } : c)),
          })
        }),

      addBillPayment: (monthKey, billId, amount, date, note) =>
        set((st) => {
          const m = st.months[monthKey]
          if (!m) return st
          return updateMonth(st, monthKey, {
            billPayments: [
              ...m.billPayments,
              { id: newId('bp_'), billId, amount, date, note },
            ],
          })
        }),
      removeBillPayment: (monthKey, id) =>
        set((st) => {
          const m = st.months[monthKey]
          if (!m) return st
          return updateMonth(st, monthKey, {
            billPayments: m.billPayments.filter((p) => p.id !== id),
          })
        }),
      updateBillPayment: (monthKey, id, patch) =>
        set((st) => {
          const m = st.months[monthKey]
          if (!m) return st
          return updateMonth(st, monthKey, {
            billPayments: m.billPayments.map((p) => (p.id === id ? { ...p, ...patch } : p)),
          })
        }),

      addTransaction: (monthKey, categoryId, amount, date, source, note) =>
        set((st) => {
          const m = st.months[monthKey]
          if (!m) return st
          return updateMonth(st, monthKey, {
            transactions: [
              ...m.transactions,
              { id: newId('t_'), categoryId, amount, date, source, note },
            ],
          })
        }),
      removeTransaction: (monthKey, id) =>
        set((st) => {
          const m = st.months[monthKey]
          if (!m) return st
          return updateMonth(st, monthKey, {
            transactions: m.transactions.filter((t) => t.id !== id),
          })
        }),
      updateTransaction: (monthKey, id, patch) =>
        set((st) => {
          const m = st.months[monthKey]
          if (!m) return st
          return updateMonth(st, monthKey, {
            transactions: m.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
          })
        }),

      addMileEntry: (monthKey, date, startMi, endMi, purpose) =>
        set((st) => {
          const m = st.months[monthKey]
          if (!m) return st
          return updateMonth(st, monthKey, {
            mileage: [
              ...m.mileage,
              { id: newId('m_'), date, startMi, endMi, purpose },
            ],
          })
        }),
      removeMileEntry: (monthKey, id) =>
        set((st) => {
          const m = st.months[monthKey]
          if (!m) return st
          return updateMonth(st, monthKey, {
            mileage: m.mileage.filter((e) => e.id !== id),
          })
        }),
      updateMileEntry: (monthKey, id, patch) =>
        set((st) => {
          const m = st.months[monthKey]
          if (!m) return st
          return updateMonth(st, monthKey, {
            mileage: m.mileage.map((e) => (e.id === id ? { ...e, ...patch } : e)),
          })
        }),

      closeMonthAction: (monthKey) => set((st) => closeMonth(st, monthKey)),
      reopenMonthAction: (monthKey) => set((st) => reopenMonth(st, monthKey)),

      addLoan: (loan) =>
        set((st) => ({
          loans: [
            ...st.loans,
            { ...loan, id: newId('loan_'), order: st.loans.length },
          ],
        })),
      updateLoan: (id, patch) =>
        set((st) => ({
          loans: st.loans.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        })),
      removeLoan: (id) =>
        set((st) => ({ loans: st.loans.filter((l) => l.id !== id) })),
      setSnowballStrategy: (s) =>
        set((st) => ({ snowballConfig: { ...st.snowballConfig, strategy: s } })),
      setSnowballExtra: (n) =>
        set((st) => ({ snowballConfig: { ...st.snowballConfig, extraMonthly: n } })),
      setSnowballRoll: (b) =>
        set((st) => ({ snowballConfig: { ...st.snowballConfig, rollPaidPaymentsForward: b } })),
      setSnowballCustomOrder: (ids) =>
        set((st) => ({ snowballConfig: { ...st.snowballConfig, customOrder: ids } })),
    }),
    {
      name: 'budget-2026-state',
      version: 1,
    },
  ),
)

export const selectActiveMonth = (s: AppState) => s.months[s.ui.activeMonth]
