import { ReactNode } from 'react'

export function Section({
  title,
  total,
  budget,
  children,
  action,
}: {
  title: string
  total?: { label: string; value: string; tone?: 'pos' | 'neg' | 'neutral' }
  budget?: { label: string; value: string }
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="card overflow-hidden">
      <header className="flex items-baseline justify-between px-4 py-3 border-b border-line-soft">
        <div className="flex items-baseline gap-3">
          <h3 className="display text-2xl">{title}</h3>
          {action}
        </div>
        <div className="flex items-baseline gap-4 text-xs">
          {budget && (
            <div className="flex items-baseline gap-1.5">
              <span className="label">{budget.label}</span>
              <span className="num text-ink">{budget.value}</span>
            </div>
          )}
          {total && (
            <div className="flex items-baseline gap-1.5">
              <span className="label">{total.label}</span>
              <span
                className={`num font-semibold ${
                  total.tone === 'neg' ? 'text-negative' : total.tone === 'pos' ? 'text-positive' : 'text-ink'
                }`}
              >
                {total.value}
              </span>
            </div>
          )}
        </div>
      </header>
      <div>{children}</div>
    </section>
  )
}

export function Row({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`grid items-center gap-2 px-4 py-2 border-b border-line-soft last:border-0 ${className}`}>{children}</div>
}
