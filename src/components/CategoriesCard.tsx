import { useState } from 'react'
import { useStore } from '../store'
import type { MonthData } from '../types'
import { Section } from './ui/Section'
import { NumberInput } from './ui/NumberInput'
import { DateInput } from './ui/DateInput'
import { TextInput } from './ui/TextInput'
import { fmtMoney } from '../lib/money'
import { todayISO } from '../lib/dates'
import { categoryActuals } from '../lib/compute'

export function CategoriesCard({ month }: { month: MonthData }) {
  const categories = useStore((s) =>
    s.categories.filter((c) => c.active && month.categoryBudgets[c.id] !== undefined),
  )
  const setCategoryBudget = useStore((s) => s.setCategoryBudget)
  const addTransaction = useStore((s) => s.addTransaction)
  const updateTransaction = useStore((s) => s.updateTransaction)
  const removeTransaction = useStore((s) => s.removeTransaction)
  const locked = month.status === 'closed'

  const actuals = categoryActuals(month)
  const totalBudget = categories.reduce((a, c) => a + (month.categoryBudgets[c.id] ?? 0), 0)
  const totalActual = month.transactions.reduce((a, t) => a + t.amount, 0)

  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <Section
      title="Other Expenses"
      budget={{ label: 'Budget', value: fmtMoney(totalBudget, { cents: false }) }}
      total={{
        label: 'Spent',
        value: fmtMoney(totalActual, { cents: false }),
        tone: totalActual > totalBudget * 1.05 ? 'neg' : 'neutral',
      }}
    >
      <div className="px-4 py-2 grid grid-cols-[2fr,1fr,1fr,1fr,auto] gap-3 items-center border-b border-line-soft">
        <div className="label">Category</div>
        <div className="label text-right">Budget</div>
        <div className="label text-right">Spent</div>
        <div className="label text-right">Left</div>
        <div className="w-6" />
      </div>

      {categories.sort((a, b) => a.order - b.order).map((c) => {
        const spent = actuals[c.id] ?? 0
        const budget = month.categoryBudgets[c.id] ?? 0
        const left = budget - spent
        const over = left < 0
        const isOpen = expanded === c.id
        const txs = month.transactions.filter((t) => t.categoryId === c.id)

        return (
          <div key={c.id} className="border-b border-line-soft last:border-0">
            <div className="px-4 py-1.5 grid grid-cols-[2fr,1fr,1fr,1fr,auto] gap-3 items-center">
              <div className="text-sm">{c.name}</div>
              <NumberInput
                value={budget}
                onChange={(n) => setCategoryBudget(month.key, c.id, n)}
                disabled={locked}
              />
              <div className="text-right num text-sm">{spent > 0 ? fmtMoney(spent, { cents: false }) : '—'}</div>
              <div className={`text-right num text-sm ${over ? 'text-negative font-semibold' : 'text-ink-muted'}`}>
                {budget > 0 ? fmtMoney(left, { cents: false }) : '—'}
              </div>
              <button className="btn-ghost" onClick={() => setExpanded(isOpen ? null : c.id)}>
                {isOpen ? '−' : '+'}
              </button>
            </div>
            {isOpen && (
              <div className="px-4 pb-3 pl-8 bg-paper/40">
                <div className="space-y-1 mt-2">
                  {txs.length === 0 && <div className="text-xs text-ink-faint italic">No transactions yet.</div>}
                  {txs.map((t) => (
                    <div key={t.id} className="grid grid-cols-[1fr,1fr,2fr,auto] gap-2 items-center text-sm">
                      <NumberInput
                        value={t.amount}
                        onChange={(amount) => updateTransaction(month.key, t.id, { amount })}
                        disabled={locked}
                      />
                      <DateInput value={t.date} onChange={(date) => updateTransaction(month.key, t.id, { date })} />
                      <TextInput
                        value={t.source}
                        onChange={(source) => updateTransaction(month.key, t.id, { source })}
                        placeholder="source"
                      />
                      {!locked && (
                        <button onClick={() => removeTransaction(month.key, t.id)} className="btn-ghost">×</button>
                      )}
                    </div>
                  ))}
                </div>
                {!locked && (
                  <AddTransactionForm
                    onAdd={(amount, date, source, note) =>
                      addTransaction(month.key, c.id, amount, date, source, note)
                    }
                  />
                )}
              </div>
            )}
          </div>
        )
      })}
    </Section>
  )
}

function AddTransactionForm({
  onAdd,
}: {
  onAdd: (amount: number, date: string, source: string, note?: string) => void
}) {
  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState(todayISO())
  const [source, setSource] = useState('')

  return (
    <div className="mt-3 grid grid-cols-[1fr,1fr,2fr,auto] gap-2 items-center">
      <NumberInput value={amount} onChange={setAmount} />
      <DateInput value={date} onChange={setDate} />
      <TextInput value={source} onChange={setSource} placeholder="source / vendor" />
      <button
        className="btn"
        onClick={() => {
          if (amount > 0 && source) {
            onAdd(amount, date, source)
            setAmount(0)
            setSource('')
          }
        }}
      >
        +
      </button>
    </div>
  )
}
