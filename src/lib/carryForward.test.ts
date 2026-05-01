import { describe, expect, it } from 'vitest'
import { closeMonth, reopenMonth } from './carryForward'
import { seedState } from './seed'
import { monthKey } from './dates'

describe('closeMonth', () => {
  it('closes month, sets closingBalance, rolls to next month opening', () => {
    let s = seedState(2026)
    const janKey = monthKey(2026, 0)
    const febKey = monthKey(2026, 1)

    // set jan opening balance and add some income
    s = {
      ...s,
      months: {
        ...s.months,
        [janKey]: {
          ...s.months[janKey],
          openingBalance: 1000,
          incomeDeposits: [
            { id: 'd1', sourceId: 'inc_1', amount: 500, date: '2026-01-15' },
          ],
          status: 'active',
        },
      },
    }

    s = closeMonth(s, janKey)
    expect(s.months[janKey].status).toBe('closed')
    expect(s.months[janKey].closingBalance).toBe(1500)
    expect(s.months[febKey].openingBalance).toBe(1500)
  })

  it('adds a carryForward credit to next month equal to unspent envelopes', () => {
    let s = seedState(2026)
    const janKey = monthKey(2026, 0)
    const febKey = monthKey(2026, 1)

    s = {
      ...s,
      months: {
        ...s.months,
        [janKey]: {
          ...s.months[janKey],
          status: 'active',
          openingBalance: 0,
          billBudgets: { bill_rent: 1000, bill_phone: 50 },
          categoryBudgets: { cat_grocery: 500 },
          billPayments: [
            { id: 'p1', billId: 'bill_rent', amount: 1000, date: '2026-01-01' },
            // phone unpaid: $50 unspent
          ],
          transactions: [
            { id: 't1', categoryId: 'cat_grocery', amount: 300, date: '2026-01-10', source: 'Kroger' },
            // grocery: $200 unspent
          ],
        },
      },
    }

    s = closeMonth(s, janKey)
    const cf = s.months[febKey].credits.find(c => c.type === 'carryForward')
    expect(cf).toBeDefined()
    expect(cf?.amount).toBe(250) // 50 + 200
  })

  it('does not double-count if month already closed', () => {
    let s = seedState(2026)
    const janKey = monthKey(2026, 0)
    s = {
      ...s,
      months: {
        ...s.months,
        [janKey]: { ...s.months[janKey], status: 'active' },
      },
    }
    const closed = closeMonth(s, janKey)
    const closedAgain = closeMonth(closed, janKey)
    expect(closed).toBe(closedAgain) // reference equal: no-op
  })
})

describe('reopenMonth', () => {
  it('reopens, clears carryForward credit on next month', () => {
    let s = seedState(2026)
    const janKey = monthKey(2026, 0)
    const febKey = monthKey(2026, 1)

    s = {
      ...s,
      months: {
        ...s.months,
        [janKey]: {
          ...s.months[janKey],
          status: 'active',
          billBudgets: { bill_rent: 1000 },
          categoryBudgets: {},
          // no payment, $1000 unspent
        },
      },
    }
    s = closeMonth(s, janKey)
    expect(s.months[febKey].credits.find(c => c.type === 'carryForward')).toBeDefined()

    s = reopenMonth(s, janKey)
    expect(s.months[janKey].status).toBe('active')
    expect(s.months[janKey].closingBalance).toBeNull()
    expect(s.months[febKey].credits.find(c => c.type === 'carryForward')).toBeUndefined()
  })
})
