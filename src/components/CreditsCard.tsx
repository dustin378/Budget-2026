import { useState } from 'react'
import { useStore } from '../store'
import type { CreditType, MonthData } from '../types'
import { Section } from './ui/Section'
import { NumberInput } from './ui/NumberInput'
import { DateInput } from './ui/DateInput'
import { TextInput } from './ui/TextInput'
import { fmtMoney } from '../lib/money'
import { todayISO } from '../lib/dates'

const TYPE_LABEL: Record<CreditType, string> = {
  interest: 'Interest',
  misc: 'Misc',
  recurring: 'Recurring',
  carryForward: 'Carry fwd',
}

export function CreditsCard({ month }: { month: MonthData }) {
  const setRecurringBudget = useStore((s) => s.setRecurringCreditBudgetForMonth)
  const addCredit = useStore((s) => s.addCredit)
  const updateCredit = useStore((s) => s.updateCredit)
  const removeCredit = useStore((s) => s.removeCredit)
  const locked = month.status === 'closed'

  const totalActual = month.credits.reduce((a, c) => a + c.amount, 0)
  const totalBudget =
    month.recurringCreditBudget +
    month.credits.filter((c) => c.type === 'carryForward').reduce((a, c) => a + c.amount, 0)

  return (
    <Section
      title="Credits"
      budget={{ label: 'Budget', value: fmtMoney(totalBudget, { cents: false }) }}
      total={{ label: 'Actual', value: fmtMoney(totalActual, { cents: false }), tone: 'neutral' }}
    >
      <div className="px-4 py-2 grid grid-cols-[2fr,1fr,1fr] gap-3 items-center border-b border-line-soft">
        <div className="label">Type</div>
        <div className="label text-right">Budget</div>
        <div className="label text-right">Actual</div>
      </div>

      <div className="px-4 py-1.5 grid grid-cols-[2fr,1fr,1fr] gap-3 items-center border-b border-line-soft">
        <div className="text-sm">Recurring credit</div>
        <NumberInput
          value={month.recurringCreditBudget}
          onChange={(n) => setRecurringBudget(month.key, n)}
          disabled={locked}
        />
        <div className="text-right num text-sm">
          {fmtMoney(
            month.credits.filter((c) => c.type === 'recurring').reduce((a, c) => a + c.amount, 0),
            { cents: false },
          )}
        </div>
      </div>

      <div className="px-4 py-1.5 grid grid-cols-[2fr,1fr,1fr] gap-3 items-center border-b border-line-soft">
        <div className="text-sm">Carried forward</div>
        <div className="text-right num text-sm text-ink-muted">auto</div>
        <div className="text-right num text-sm">
          {fmtMoney(
            month.credits.filter((c) => c.type === 'carryForward').reduce((a, c) => a + c.amount, 0),
            { cents: false },
          )}
        </div>
      </div>

      {/* entries */}
      <div className="px-4 py-3">
        <div className="label mb-2">Entries</div>
        <div className="space-y-1">
          {month.credits.map((c) => (
            <div key={c.id} className="grid grid-cols-[1fr,1fr,1fr,2fr,auto] gap-2 items-center text-sm">
              <span className="text-ink-muted text-xs uppercase tracking-wider">{TYPE_LABEL[c.type]}</span>
              <NumberInput
                value={c.amount}
                onChange={(amount) => updateCredit(month.key, c.id, { amount })}
                disabled={locked || c.type === 'carryForward'}
              />
              <DateInput value={c.date} onChange={(date) => updateCredit(month.key, c.id, { date })} />
              <TextInput
                value={c.note ?? ''}
                onChange={(note) => updateCredit(month.key, c.id, { note })}
                placeholder="note"
              />
              {!locked && c.type !== 'carryForward' && (
                <button onClick={() => removeCredit(month.key, c.id)} className="btn-ghost">×</button>
              )}
              {(locked || c.type === 'carryForward') && <span />}
            </div>
          ))}
        </div>
        {!locked && <AddCreditForm onAdd={(type, amount, date, note) => addCredit(month.key, type, amount, date, note)} />}
      </div>
    </Section>
  )
}

function AddCreditForm({
  onAdd,
}: {
  onAdd: (type: CreditType, amount: number, date: string, note?: string) => void
}) {
  const [type, setType] = useState<CreditType>('misc')
  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')

  return (
    <div className="mt-3 grid grid-cols-[1fr,1fr,1fr,2fr,auto] gap-2 items-center">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as CreditType)}
        className="field text-sm"
      >
        <option value="misc">Misc</option>
        <option value="interest">Interest</option>
        <option value="recurring">Recurring</option>
      </select>
      <NumberInput value={amount} onChange={setAmount} />
      <DateInput value={date} onChange={setDate} />
      <TextInput value={note} onChange={setNote} placeholder="note" />
      <button
        className="btn"
        onClick={() => {
          if (amount > 0) {
            onAdd(type, amount, date, note || undefined)
            setAmount(0)
            setNote('')
          }
        }}
      >
        +
      </button>
    </div>
  )
}
