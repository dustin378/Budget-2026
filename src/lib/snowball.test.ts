import { describe, expect, it } from 'vitest'
import type { Loan, SnowballConfig } from '../types'
import { orderLoans, projectPayoff } from './snowball'

const baseConfig: SnowballConfig = {
  strategy: 'snowball',
  customOrder: [],
  extraMonthly: 0,
  rollPaidPaymentsForward: true,
}

const loan = (over: Partial<Loan>): Loan => ({
  id: over.id ?? Math.random().toString(36).slice(2),
  name: over.name ?? 'Loan',
  currentBalance: over.currentBalance ?? 1000,
  apr: over.apr ?? 0,
  minimumPayment: over.minimumPayment ?? 100,
  active: over.active ?? true,
  order: over.order ?? 0,
})

describe('orderLoans', () => {
  it('snowball orders smallest balance first', () => {
    const loans = [
      loan({ id: 'a', currentBalance: 5000 }),
      loan({ id: 'b', currentBalance: 1000 }),
      loan({ id: 'c', currentBalance: 3000 }),
    ]
    const ordered = orderLoans(loans, { ...baseConfig, strategy: 'snowball' })
    expect(ordered.map((l) => l.id)).toEqual(['b', 'c', 'a'])
  })

  it('avalanche orders highest APR first', () => {
    const loans = [
      loan({ id: 'a', apr: 0.05 }),
      loan({ id: 'b', apr: 0.18 }),
      loan({ id: 'c', apr: 0.09 }),
    ]
    const ordered = orderLoans(loans, { ...baseConfig, strategy: 'avalanche' })
    expect(ordered.map((l) => l.id)).toEqual(['b', 'c', 'a'])
  })

  it('custom respects explicit order, appends unlisted', () => {
    const loans = [
      loan({ id: 'a' }),
      loan({ id: 'b' }),
      loan({ id: 'c' }),
    ]
    const ordered = orderLoans(loans, {
      ...baseConfig,
      strategy: 'custom',
      customOrder: ['c', 'a'],
    })
    expect(ordered.map((l) => l.id)).toEqual(['c', 'a', 'b'])
  })

  it('skips inactive and zero-balance loans', () => {
    const loans = [
      loan({ id: 'a', currentBalance: 1000 }),
      loan({ id: 'b', active: false }),
      loan({ id: 'c', currentBalance: 0 }),
    ]
    const ordered = orderLoans(loans, baseConfig)
    expect(ordered.map((l) => l.id)).toEqual(['a'])
  })
})

describe('projectPayoff', () => {
  it('pays off a single zero-interest loan in expected months', () => {
    const loans = [loan({ currentBalance: 1000, apr: 0, minimumPayment: 100 })]
    const result = projectPayoff(loans, baseConfig)
    expect(result.monthsToFreedom).toBe(10)
    expect(result.totalInterestPaid).toBe(0)
    expect(result.totalPrincipalPaid).toBeCloseTo(1000, 1)
  })

  it('zero-interest snowball: rolls payment forward when first loan pays off', () => {
    const loans = [
      loan({ id: 'small', currentBalance: 500, apr: 0, minimumPayment: 100 }),
      loan({ id: 'big', currentBalance: 1000, apr: 0, minimumPayment: 100 }),
    ]
    // strategy snowball: small ($500/$100) pays off in 5 months
    // then big had 5*100=500 paid via min, balance=500 remaining
    // months 6-7: big gets its $100 + rolled $100 = $200/mo, paid off in 3 more months
    // total = 5 + 3 = 8 months (vs 10 without rolling)
    const result = projectPayoff(loans, baseConfig)
    expect(result.monthsToFreedom).toBe(8)
    expect(result.payoffDates['small']).toBe(4) // 0-indexed month 4 = 5th month
    expect(result.payoffDates['big']).toBe(7) // month 7 = 8th month
  })

  it('zero-interest snowball without roll: same total time as separate payoffs', () => {
    const loans = [
      loan({ id: 'small', currentBalance: 500, apr: 0, minimumPayment: 100 }),
      loan({ id: 'big', currentBalance: 1000, apr: 0, minimumPayment: 100 }),
    ]
    const result = projectPayoff(loans, { ...baseConfig, rollPaidPaymentsForward: false })
    // small pays off month 5; big gets only $100/mo, finishes month 10
    expect(result.monthsToFreedom).toBe(10)
  })

  it('extra monthly accelerates the target loan', () => {
    const loans = [loan({ currentBalance: 1000, apr: 0, minimumPayment: 100 })]
    const result = projectPayoff(loans, { ...baseConfig, extraMonthly: 100 })
    expect(result.monthsToFreedom).toBe(5) // $200/mo vs $100/mo
  })

  it('accrues interest correctly on a 12% APR loan', () => {
    const loans = [loan({ currentBalance: 1000, apr: 0.12, minimumPayment: 100 })]
    const result = projectPayoff(loans, baseConfig)
    // first month: interest = 1000 * 0.01 = $10, principal = $90, balance = $910
    const m0 = result.payments[0]
    expect(m0.interest).toBeCloseTo(10, 2)
    expect(m0.principal).toBeCloseTo(90, 2)
    expect(m0.endBalance).toBeCloseTo(910, 2)
    expect(result.totalInterestPaid).toBeGreaterThan(0)
  })

  it('avalanche prioritizes highest APR even with bigger balance', () => {
    const loans = [
      loan({ id: 'lowapr_small', currentBalance: 1000, apr: 0.04, minimumPayment: 50 }),
      loan({ id: 'highapr_big', currentBalance: 5000, apr: 0.20, minimumPayment: 100 }),
    ]
    const config: SnowballConfig = { ...baseConfig, strategy: 'avalanche', extraMonthly: 200 }
    const result = projectPayoff(loans, config)
    // under avalanche: high-APR is targeted first, so it pays off no later than low-APR
    expect(result.payoffDates['highapr_big']).toBeLessThanOrEqual(result.payoffDates['lowapr_small'])

    // sanity: under snowball with same loans, smaller-balance lowapr_small pays off first
    const snowResult = projectPayoff(loans, { ...baseConfig, extraMonthly: 200 })
    expect(snowResult.payoffDates['lowapr_small']).toBeLessThan(snowResult.payoffDates['highapr_big'])
  })

  it('handles empty loan list', () => {
    const result = projectPayoff([], baseConfig)
    expect(result.monthsToFreedom).toBe(0)
    expect(result.payments).toEqual([])
  })

  it('respects max months cap (no infinite loop)', () => {
    // minimum doesn't cover interest — would never pay off
    const loans = [loan({ currentBalance: 10000, apr: 0.30, minimumPayment: 50 })]
    const result = projectPayoff(loans, { ...baseConfig, extraMonthly: 0 }, 24)
    expect(result.monthsToFreedom).toBeLessThanOrEqual(24)
  })

  it('multi-loan with extra money: total months less than sum of individual times', () => {
    const loans = [
      loan({ id: 'a', currentBalance: 2000, apr: 0.06, minimumPayment: 100 }),
      loan({ id: 'b', currentBalance: 3000, apr: 0.06, minimumPayment: 100 }),
    ]
    const result = projectPayoff(loans, { ...baseConfig, extraMonthly: 200 })
    // sanity: should finish in well under 50 months
    expect(result.monthsToFreedom).toBeGreaterThan(0)
    expect(result.monthsToFreedom).toBeLessThan(20)
    expect(result.payoffDates['a']).toBeDefined()
    expect(result.payoffDates['b']).toBeDefined()
  })
})
