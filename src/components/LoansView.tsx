import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { Section } from './ui/Section'
import { NumberInput } from './ui/NumberInput'
import { TextInput } from './ui/TextInput'
import { fmtMoney } from '../lib/money'
import { orderLoans, projectPayoff, projectionByMonth } from '../lib/snowball'
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts'

export function LoansView() {
  const loans = useStore((s) => s.loans)
  const config = useStore((s) => s.snowballConfig)
  const addLoan = useStore((s) => s.addLoan)
  const updateLoan = useStore((s) => s.updateLoan)
  const removeLoan = useStore((s) => s.removeLoan)
  const setStrategy = useStore((s) => s.setSnowballStrategy)
  const setExtra = useStore((s) => s.setSnowballExtra)
  const setRoll = useStore((s) => s.setSnowballRoll)

  const summary = useMemo(() => projectPayoff(loans, config), [loans, config])
  const chartData = useMemo(
    () =>
      projectionByMonth(summary).map((p) => ({
        month: p.monthIndex,
        balance: p.totalBalance,
        interest: p.totalInterest,
      })),
    [summary],
  )

  const ordered = orderLoans(loans, config)
  const totalBalance = loans.filter(l => l.active).reduce((a, l) => a + l.currentBalance, 0)
  const totalMin = loans.filter(l => l.active).reduce((a, l) => a + l.minimumPayment, 0)
  const monthlyOutlay = totalMin + config.extraMonthly

  const yearsToFreedom = (summary.monthsToFreedom / 12).toFixed(1)

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="px-8 pt-8 pb-6 border-b border-line">
        <div className="label">Debt</div>
        <h1 className="display text-6xl leading-none mt-1">
          Loans <span className="italic text-ink-muted">· Snowball</span>
        </h1>
      </header>

      <div className="px-8 py-6 space-y-6">
        {/* Snowball summary panel */}
        <div className="grid grid-cols-4 gap-4">
          <Tile label="Total balance" value={fmtMoney(totalBalance, { cents: false })} />
          <Tile label="Monthly outlay" value={fmtMoney(monthlyOutlay, { cents: false })} sub={`min ${fmtMoney(totalMin, { cents: false })} + extra ${fmtMoney(config.extraMonthly, { cents: false })}`} />
          <Tile
            label="Months to freedom"
            value={summary.monthsToFreedom > 0 ? String(summary.monthsToFreedom) : '—'}
            sub={summary.monthsToFreedom > 0 ? `${yearsToFreedom} years` : ''}
            tone={summary.insufficientPayment ? 'neg' : 'neutral'}
          />
          <Tile label="Interest projected" value={fmtMoney(summary.totalInterestPaid, { cents: false })} />
        </div>

        {/* Strategy controls */}
        <Section title="Strategy">
          <div className="px-4 py-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <div className="label mb-2">Method</div>
              <div className="grid grid-cols-3 gap-1 text-xs">
                <StrategyBtn active={config.strategy === 'snowball'} onClick={() => setStrategy('snowball')}>
                  Snowball
                </StrategyBtn>
                <StrategyBtn active={config.strategy === 'avalanche'} onClick={() => setStrategy('avalanche')}>
                  Avalanche
                </StrategyBtn>
                <StrategyBtn active={config.strategy === 'custom'} onClick={() => setStrategy('custom')}>
                  Custom
                </StrategyBtn>
              </div>
              <p className="text-xs text-ink-muted mt-3 leading-relaxed">
                {config.strategy === 'snowball' && 'Smallest balance first. Fastest psychological wins.'}
                {config.strategy === 'avalanche' && 'Highest APR first. Lowest total interest paid.'}
                {config.strategy === 'custom' && 'Drag to reorder targets below.'}
              </p>
            </div>

            <div>
              <div className="label mb-2">Extra monthly</div>
              <NumberInput value={config.extraMonthly} onChange={setExtra} />
              <p className="text-xs text-ink-muted mt-2 leading-relaxed">
                Additional dollars above the sum of minimums, directed at the priority loan.
              </p>
            </div>

            <div>
              <div className="label mb-2">Roll payments forward</div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.rollPaidPaymentsForward}
                  onChange={(e) => setRoll(e.target.checked)}
                  className="accent-ink"
                />
                <span>When a loan is paid off, roll its minimum into the next target.</span>
              </label>
              <p className="text-xs text-ink-muted mt-2 leading-relaxed">
                This is the actual snowball mechanic. Disable to model paying minimums only.
              </p>
            </div>
          </div>
          {summary.insufficientPayment && (
            <div className="px-4 py-2 bg-negative/5 border-t border-negative/20 text-xs text-negative">
              Warning: minimum payment on at least one loan does not cover its monthly interest. The projection may not converge.
            </div>
          )}
        </Section>

        {/* Loans table */}
        <Section
          title="Loans"
          action={<span className="text-xs text-ink-muted ml-2">Priority order top to bottom</span>}
        >
          <div className="px-4 py-2 grid grid-cols-[2fr,1fr,1fr,1fr,1fr,auto] gap-3 items-center border-b border-line-soft">
            <div className="label">Name</div>
            <div className="label text-right">Balance</div>
            <div className="label text-right">APR</div>
            <div className="label text-right">Min</div>
            <div className="label text-right">Payoff</div>
            <div className="w-6" />
          </div>
          {ordered.length === 0 && (
            <div className="px-4 py-6 text-center text-ink-muted italic text-sm">
              No active loans. Add one below.
            </div>
          )}
          {ordered.map((l, i) => {
            const payoff = summary.payoffDates[l.id]
            const payoffMonths = payoff !== undefined ? payoff + 1 : null
            return (
              <div
                key={l.id}
                className="px-4 py-1.5 grid grid-cols-[2fr,1fr,1fr,1fr,1fr,auto] gap-3 items-center border-b border-line-soft last:border-0"
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-ink-faint num text-xs">{String(i + 1).padStart(2, '0')}</span>
                  <TextInput value={l.name} onChange={(name) => updateLoan(l.id, { name })} />
                </div>
                <NumberInput
                  value={l.currentBalance}
                  onChange={(currentBalance) => updateLoan(l.id, { currentBalance })}
                />
                <NumberInput
                  value={l.apr}
                  onChange={(apr) => updateLoan(l.id, { apr })}
                />
                <NumberInput
                  value={l.minimumPayment}
                  onChange={(minimumPayment) => updateLoan(l.id, { minimumPayment })}
                />
                <div className="text-right text-xs text-ink-muted">
                  {payoffMonths ? `${payoffMonths}mo` : '—'}
                </div>
                <button onClick={() => removeLoan(l.id)} className="btn-ghost">×</button>
              </div>
            )
          })}
          <AddLoanForm onAdd={addLoan} />
        </Section>

        {/* Projection chart */}
        {chartData.length > 0 && (
          <Section title="Projection">
            <div className="px-4 py-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="balgrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1a1814" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#1a1814" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e8e2d6" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#6b6660', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                      tickFormatter={(m) => `${m}mo`}
                      stroke="#d4cdc1"
                    />
                    <YAxis
                      tick={{ fill: '#6b6660', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      stroke="#d4cdc1"
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#fbf9f4',
                        border: '1px solid #d4cdc1',
                        borderRadius: 2,
                        fontSize: 12,
                        fontFamily: 'JetBrains Mono',
                      }}
                      formatter={(v: number, name: string) => [
                        fmtMoney(v, { cents: false }),
                        name === 'balance' ? 'Balance' : 'Interest',
                      ]}
                      labelFormatter={(m) => `Month ${m}`}
                    />
                    <Area type="monotone" dataKey="balance" stroke="#1a1814" strokeWidth={1.5} fill="url(#balgrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Section>
        )}
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

function StrategyBtn({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 border rounded-sm transition-colors uppercase tracking-wider text-[11px] ${
        active ? 'bg-ink text-paper-light border-ink' : 'border-line hover:border-ink'
      }`}
    >
      {children}
    </button>
  )
}

function AddLoanForm({ onAdd }: { onAdd: (loan: any) => void }) {
  const [name, setName] = useState('')
  const [balance, setBalance] = useState(0)
  const [apr, setApr] = useState(0)
  const [min, setMin] = useState(0)

  return (
    <div className="px-4 py-3 grid grid-cols-[2fr,1fr,1fr,1fr,1fr,auto] gap-3 items-center border-t border-line-soft">
      <TextInput value={name} onChange={setName} placeholder="Loan name" />
      <NumberInput value={balance} onChange={setBalance} />
      <NumberInput value={apr} onChange={setApr} />
      <NumberInput value={min} onChange={setMin} />
      <div />
      <button
        className="btn"
        onClick={() => {
          if (name && balance > 0) {
            onAdd({ name, currentBalance: balance, apr, minimumPayment: min, active: true })
            setName('')
            setBalance(0)
            setApr(0)
            setMin(0)
          }
        }}
      >
        +
      </button>
    </div>
  )
}
