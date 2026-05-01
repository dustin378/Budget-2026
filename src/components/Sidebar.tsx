import { useStore } from '../store'
import { MONTH_NAMES_SHORT, monthKey } from '../lib/dates'
import { computeMonthTotals, computeYTDIncome } from '../lib/compute'
import { fmtMoney } from '../lib/money'

export function Sidebar() {
  const year = useStore((s) => s.year)
  const months = useStore((s) => s.months)
  const account = useStore((s) => s.account)
  const activeMonth = useStore((s) => s.ui.activeMonth)
  const activeView = useStore((s) => s.ui.activeView)
  const setActiveMonth = useStore((s) => s.setActiveMonth)
  const setActiveView = useStore((s) => s.setActiveView)

  const ytd = computeYTDIncome({ months, year } as any)

  return (
    <aside className="w-60 shrink-0 border-r border-line bg-paper-light flex flex-col">
      <div className="px-5 pt-6 pb-5 border-b border-line">
        <div className="display text-3xl leading-none">Budget</div>
        <div className="display italic text-3xl leading-none text-ink-muted">{year}</div>
      </div>

      <nav className="px-3 py-3 space-y-0.5">
        <NavBtn label="Dashboard" active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} />
        <NavBtn label="Loans · Snowball" active={activeView === 'loans'} onClick={() => setActiveView('loans')} />
        <NavBtn label="Settings" active={activeView === 'settings'} onClick={() => setActiveView('settings')} />
      </nav>

      <div className="rule mx-3" />

      <div className="px-3 py-3 flex-1 overflow-y-auto">
        <div className="label px-2 mb-2">Months</div>
        <div className="space-y-0.5">
          {MONTH_NAMES_SHORT.map((m, i) => {
            const key = monthKey(year, i)
            const md = months[key]
            const totals = md ? computeMonthTotals(md) : null
            const isActive = activeView === 'month' && activeMonth === key
            const overspend = totals && totals.actualBal < 0
            return (
              <button
                key={key}
                onClick={() => {
                  setActiveView('month')
                  setActiveMonth(key)
                }}
                className={`w-full flex items-baseline justify-between px-2 py-1.5 rounded-sm text-left transition-colors ${
                  isActive ? 'bg-ink text-paper-light' : 'hover:bg-line-soft text-ink'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase tracking-wider ${isActive ? 'text-paper-light/60' : 'text-ink-muted'}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm">{m}</span>
                  {md?.status === 'closed' && (
                    <span className={`text-[9px] uppercase tracking-wider ${isActive ? 'text-paper-light/60' : 'text-ink-faint'}`}>
                      ✓
                    </span>
                  )}
                </span>
                {totals && (
                  <span className={`num text-[11px] ${overspend && !isActive ? 'text-negative' : isActive ? 'text-paper-light/80' : 'text-ink-muted'}`}>
                    {fmtMoney(totals.actualBal, { cents: false })}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rule mx-3" />

      <div className="px-5 py-4 text-xs space-y-1.5">
        <div className="flex justify-between">
          <span className="label">YTD income</span>
          <span className="num font-semibold">{fmtMoney(ytd, { cents: false })}</span>
        </div>
        <div className="flex justify-between">
          <span className="label">Acct bal</span>
          <span className="num">{fmtMoney(account.checkingBalance, { cents: false })}</span>
        </div>
        {account.lastReconciledDate && (
          <div className="flex justify-between">
            <span className="label">Reconciled</span>
            <span className="num text-ink-muted">{account.lastReconciledDate}</span>
          </div>
        )}
      </div>
    </aside>
  )
}

function NavBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left text-sm px-2 py-1.5 rounded-sm transition-colors ${
        active ? 'bg-ink text-paper-light' : 'hover:bg-line-soft text-ink'
      }`}
    >
      {label}
    </button>
  )
}
