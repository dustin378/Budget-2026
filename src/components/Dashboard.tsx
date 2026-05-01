import { useStore } from '../store'
import { fmtMoney } from '../lib/money'
import { computeMonthTotals, computeYTDIncome } from '../lib/compute'
import { MONTH_NAMES_SHORT, monthKey } from '../lib/dates'
import { Section } from './ui/Section'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { projectPayoff } from '../lib/snowball'
import { useMemo } from 'react'

export function Dashboard() {
  const state = useStore()
  const ytd = computeYTDIncome(state)
  const months = state.year
  const setActiveView = useStore((s) => s.setActiveView)
  const setActiveMonth = useStore((s) => s.setActiveMonth)

  const monthData = Array.from({ length: 12 }, (_, i) => {
    const key = monthKey(state.year, i)
    const md = state.months[key]
    if (!md) return null
    const t = computeMonthTotals(md)
    return {
      key,
      monthIndex: i,
      label: MONTH_NAMES_SHORT[i],
      status: md.status,
      budgetedNet: t.budgetedNet,
      actualNet: t.actualNet,
      actualBal: t.actualBal,
      budgetBal: t.budgetBal,
      income: t.actualIncome,
      spent: t.actualBills + t.actualCategories,
    }
  }).filter((x): x is NonNullable<typeof x> => x !== null)

  const totalIncome = monthData.reduce((a, m) => a + m.income, 0)
  const totalSpent = monthData.reduce((a, m) => a + m.spent, 0)
  const monthsClosed = monthData.filter(m => m.status === 'closed').length

  const snowball = useMemo(() => projectPayoff(state.loans, state.snowballConfig), [state.loans, state.snowballConfig])
  const totalLoanBalance = state.loans.filter(l => l.active).reduce((a, l) => a + l.currentBalance, 0)

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="px-8 pt-8 pb-6 border-b border-line">
        <div className="label">Year</div>
        <h1 className="display text-6xl leading-none mt-1">
          {months}
          <span className="display italic text-ink-muted ml-3">overview</span>
        </h1>
      </header>

      <div className="px-8 py-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <Tile label="YTD income" value={fmtMoney(ytd, { cents: false })} sub={`${monthsClosed}/12 closed`} />
          <Tile label="YTD spent" value={fmtMoney(totalSpent, { cents: false })} />
          <Tile
            label="Net YTD"
            value={fmtMoney(totalIncome - totalSpent, { sign: true, cents: false })}
            tone={totalIncome - totalSpent < 0 ? 'neg' : 'pos'}
          />
          <Tile
            label="Loan balance"
            value={fmtMoney(totalLoanBalance, { cents: false })}
            sub={snowball.monthsToFreedom > 0 ? `${snowball.monthsToFreedom} mo to $0` : 'No active loans'}
          />
        </div>

        <Section title="Monthly net">
          <div className="px-4 py-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#e8e2d6" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#6b6660', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  stroke="#d4cdc1"
                />
                <YAxis
                  tick={{ fill: '#6b6660', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  stroke="#d4cdc1"
                />
                <ReferenceLine y={0} stroke="#1a1814" strokeWidth={1} />
                <Tooltip
                  contentStyle={{
                    background: '#fbf9f4',
                    border: '1px solid #d4cdc1',
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: 'JetBrains Mono',
                  }}
                  formatter={(v: number) => fmtMoney(v, { cents: false })}
                  cursor={{ fill: '#e8e2d6', opacity: 0.4 }}
                />
                <Bar dataKey="budgetedNet" fill="#a39d92" name="Budgeted" radius={[1, 1, 0, 0]} />
                <Bar dataKey="actualNet" fill="#1a1814" name="Actual" radius={[1, 1, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Months">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {monthData.map((m) => (
              <button
                key={m.key}
                onClick={() => {
                  setActiveView('month')
                  setActiveMonth(m.key)
                }}
                className="text-left px-4 py-3 border-r border-b border-line-soft hover:bg-line-soft/50 transition-colors"
              >
                <div className="flex items-baseline justify-between">
                  <div className="display text-2xl">{m.label}</div>
                  <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 ${
                    m.status === 'closed' ? 'text-positive' : m.status === 'active' ? 'text-flag' : 'text-ink-faint'
                  }`}>
                    {m.status}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <span className="text-ink-muted">In</span>
                  <span className="num text-right">{fmtMoney(m.income, { cents: false })}</span>
                  <span className="text-ink-muted">Out</span>
                  <span className="num text-right">{fmtMoney(m.spent, { cents: false })}</span>
                  <span className="text-ink-muted">Bal</span>
                  <span className={`num text-right font-semibold ${m.actualBal < 0 ? 'text-negative' : ''}`}>
                    {fmtMoney(m.actualBal, { cents: false })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}

function Tile({ label, value, sub, tone = 'neutral' }: { label: string; value: string; sub?: string; tone?: 'neutral' | 'neg' | 'pos' }) {
  return (
    <div className="card px-4 py-3">
      <div className="label">{label}</div>
      <div className={`num text-2xl mt-1 ${tone === 'neg' ? 'text-negative' : tone === 'pos' ? 'text-positive' : 'text-ink'}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-ink-faint mt-1 num">{sub}</div>}
    </div>
  )
}
