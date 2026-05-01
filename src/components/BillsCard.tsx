import { useState } from 'react'
import { useStore } from '../store'
import type { MonthData } from '../types'
import { Section } from './ui/Section'
import { NumberInput } from './ui/NumberInput'
import { DateInput } from './ui/DateInput'
import { fmtMoney } from '../lib/money'
import { todayISO } from '../lib/dates'
import { billActuals } from '../lib/compute'

export function BillsCard({ month }: { month: MonthData }) {
  const bills = useStore((s) => s.bills.filter((b) => b.active && month.billBudgets[b.id] !== undefined))
  const setBillBudget = useStore((s) => s.setBillBudget)
  const addBillPayment = useStore((s) => s.addBillPayment)
  const removeBillPayment = useStore((s) => s.removeBillPayment)
  const updateBillPayment = useStore((s) => s.updateBillPayment)
  const locked = month.status === 'closed'

  const actuals = billActuals(month)
  const totalBudget = bills.reduce((a, b) => a + (month.billBudgets[b.id] ?? 0), 0)
  const totalActual = month.billPayments.reduce((a, p) => a + p.amount, 0)

  const [expandedBillId, setExpandedBillId] = useState<string | null>(null)

  return (
    <Section
      title="Monthly Bills"
      budget={{ label: 'Budget', value: fmtMoney(totalBudget, { cents: false }) }}
      total={{
        label: 'Paid',
        value: fmtMoney(totalActual, { cents: false }),
        tone: totalActual > totalBudget * 1.05 ? 'neg' : 'neutral',
      }}
    >
      <div className="px-4 py-2 grid grid-cols-[2fr,1fr,1fr,auto] gap-3 items-center border-b border-line-soft">
        <div className="label">Bill</div>
        <div className="label text-right">Budget</div>
        <div className="label text-right">Paid</div>
        <div className="w-6" />
      </div>

      <div>
        {bills.sort((a, b) => a.order - b.order).map((b) => {
          const paid = actuals[b.id] ?? 0
          const budget = month.billBudgets[b.id] ?? 0
          const over = paid > budget && budget > 0
          const isOpen = expandedBillId === b.id
          const payments = month.billPayments.filter((p) => p.billId === b.id)

          return (
            <div key={b.id} className="border-b border-line-soft last:border-0">
              <div className="px-4 py-1.5 grid grid-cols-[2fr,1fr,1fr,auto] gap-3 items-center">
                <div className="flex items-center gap-1.5 text-sm">
                  {b.autopay && <span className="text-[9px] text-flag uppercase tracking-wider">auto</span>}
                  <span>{b.name}</span>
                  {b.dueDay && <span className="text-ink-faint text-xs">({b.dueDay})</span>}
                </div>
                <NumberInput
                  value={budget}
                  onChange={(n) => setBillBudget(month.key, b.id, n)}
                  disabled={locked}
                />
                <div className={`text-right num text-sm ${over ? 'text-negative' : ''}`}>
                  {paid > 0 ? fmtMoney(paid, { cents: false }) : '—'}
                </div>
                <button
                  className="btn-ghost"
                  aria-label={isOpen ? 'Collapse' : 'Expand'}
                  onClick={() => setExpandedBillId(isOpen ? null : b.id)}
                >
                  {isOpen ? '−' : '+'}
                </button>
              </div>
              {isOpen && (
                <div className="px-4 pb-3 pl-8 bg-paper/40">
                  <div className="space-y-1 mt-2">
                    {payments.map((p) => (
                      <div key={p.id} className="grid grid-cols-[1fr,1fr,2fr,auto] gap-2 items-center text-sm">
                        <NumberInput
                          value={p.amount}
                          onChange={(amount) => updateBillPayment(month.key, p.id, { amount })}
                          disabled={locked}
                        />
                        <DateInput value={p.date} onChange={(date) => updateBillPayment(month.key, p.id, { date })} />
                        <input
                          type="text"
                          value={p.note ?? ''}
                          onChange={(e) => updateBillPayment(month.key, p.id, { note: e.target.value })}
                          placeholder="note"
                          className="field text-sm"
                        />
                        {!locked && (
                          <button onClick={() => removeBillPayment(month.key, p.id)} className="btn-ghost">×</button>
                        )}
                      </div>
                    ))}
                  </div>
                  {!locked && (
                    <AddPaymentForm
                      onAdd={(amount, date, note) => addBillPayment(month.key, b.id, amount, date, note)}
                      defaultAmount={budget}
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Section>
  )
}

function AddPaymentForm({
  onAdd, defaultAmount,
}: {
  onAdd: (amount: number, date: string, note?: string) => void
  defaultAmount: number
}) {
  const [amount, setAmount] = useState(defaultAmount)
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')

  return (
    <div className="mt-3 grid grid-cols-[1fr,1fr,2fr,auto] gap-2 items-center">
      <NumberInput value={amount} onChange={setAmount} />
      <DateInput value={date} onChange={setDate} />
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="note"
        className="field text-sm"
      />
      <button
        className="btn"
        onClick={() => {
          if (amount > 0) {
            onAdd(amount, date, note || undefined)
            setAmount(defaultAmount)
            setNote('')
          }
        }}
      >
        Pay
      </button>
    </div>
  )
}
