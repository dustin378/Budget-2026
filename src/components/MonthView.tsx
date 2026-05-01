import { useStore } from '../store'
import { MONTH_NAMES, todayISO } from '../lib/dates'
import { computeMonthTotals } from '../lib/compute'
import { fmtMoney } from '../lib/money'
import { IncomeCard } from './IncomeCard'
import { CreditsCard } from './CreditsCard'
import { BillsCard } from './BillsCard'
import { CategoriesCard } from './CategoriesCard'
import { MileageCard } from './MileageCard'
import { NumberInput } from './ui/NumberInput'

export function MonthView() {
  const monthKey = useStore((s) => s.ui.activeMonth)
  const month = useStore((s) => s.months[monthKey])
  const setOpening = useStore((s) => s.setOpeningBalance)
  const closeMonth = useStore((s) => s.closeMonthAction)
  const reopenMonth = useStore((s) => s.reopenMonthAction)
  const setCheckingBalance = useStore((s) => s.setCheckingBalance)
  const markReconciled = useStore((s) => s.markReconciled)
  const account = useStore((s) => s.account)
  const setMonthStatus = useStore((s) => s.setMonthStatus)

  if (!month) return <div className="p-6">Month not found.</div>
  const totals = computeMonthTotals(month)

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero header */}
      <header className="px-8 pt-8 pb-6 border-b border-line">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <div className="label">Month</div>
            <h1 className="display text-6xl leading-none mt-1">
              {MONTH_NAMES[month.monthIndex]}
              <span className="display italic text-ink-muted ml-3">{month.year}</span>
            </h1>
            <div className="mt-3 flex items-center gap-3">
              <StatusBadge status={month.status} />
              {month.status !== 'closed' && month.status !== 'active' && (
                <button onClick={() => setMonthStatus(month.key, 'active')} className="btn-ghost">
                  Mark active
                </button>
              )}
              {month.status === 'active' && (
                <button onClick={() => closeMonth(month.key)} className="btn-primary">
                  Close month
                </button>
              )}
              {month.status === 'closed' && (
                <button onClick={() => reopenMonth(month.key)} className="btn">
                  Reopen
                </button>
              )}
            </div>
          </div>

          {/* Reconciliation strip */}
          <div className="card px-4 py-3 min-w-[280px]">
            <div className="label mb-2">Account reconciliation</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <span className="text-ink-muted">Checking balance</span>
              <NumberInput
                value={account.checkingBalance}
                onChange={(n) => setCheckingBalance(n, todayISO())}
              />
              <span className="text-ink-muted">As of</span>
              <span className="num text-xs text-ink-muted self-center">{account.balanceDate || '—'}</span>
              <span className="text-ink-muted">Last reconciled</span>
              <span className="num text-xs text-ink-muted self-center">{account.lastReconciledDate || 'never'}</span>
            </div>
            <button onClick={markReconciled} className="btn w-full mt-3 text-xs">
              Mark reconciled today
            </button>
          </div>
        </div>

        {/* Summary tiles */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          <Tile label="Opening balance" main={
            <NumberInput
              value={month.openingBalance}
              onChange={(n) => setOpening(month.key, n)}
              disabled={month.status === 'closed'}
            />
          } />
          <Tile
            label="Budget Bal"
            main={
              <span className="num text-2xl">{fmtMoney(totals.budgetBal, { cents: false })}</span>
            }
            sub="Planned net + opening"
          />
          <Tile
            label="Actual Bal"
            main={
              <span className={`num text-2xl ${totals.actualBal < 0 ? 'text-negative' : 'text-ink'}`}>
                {fmtMoney(totals.actualBal, { cents: false })}
              </span>
            }
            sub="Actual net + opening"
          />
          <Tile
            label="Variance"
            main={
              <span className={`num text-2xl ${totals.actualBal - totals.budgetBal < 0 ? 'text-negative' : 'text-positive'}`}>
                {fmtMoney(totals.actualBal - totals.budgetBal, { sign: true, cents: false })}
              </span>
            }
            sub="Actual − Budget"
          />
        </div>
      </header>

      {/* Cards grid */}
      <div className="px-8 py-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
        <IncomeCard month={month} />
        <CreditsCard month={month} />
        <BillsCard month={month} />
        <CategoriesCard month={month} />
        <div className="xl:col-span-2">
          <MileageCard month={month} />
        </div>
      </div>
    </div>
  )
}

function Tile({ label, main, sub }: { label: string; main: React.ReactNode; sub?: string }) {
  return (
    <div className="card px-4 py-3">
      <div className="label">{label}</div>
      <div className="mt-1.5">{main}</div>
      {sub && <div className="text-xs text-ink-faint mt-1">{sub}</div>}
    </div>
  )
}

function StatusBadge({ status }: { status: 'planning' | 'active' | 'closed' }) {
  const map = {
    planning: { label: 'Planning', className: 'border-line-soft text-ink-muted' },
    active: { label: 'Active', className: 'border-flag/40 text-flag bg-flag/5' },
    closed: { label: 'Closed', className: 'border-positive/40 text-positive bg-positive/5' },
  }
  const cfg = map[status]
  return (
    <span className={`text-[10px] uppercase tracking-[0.2em] px-2 py-1 border rounded-sm ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}
