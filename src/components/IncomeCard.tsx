import { useState } from 'react'
import { useStore } from '../store'
import type { MonthData } from '../types'
import { Section } from './ui/Section'
import { NumberInput } from './ui/NumberInput'
import { DateInput } from './ui/DateInput'
import { fmtMoney } from '../lib/money'
import { todayISO } from '../lib/dates'

export function IncomeCard({ month }: { month: MonthData }) {
  const sources = useStore((s) => s.incomeSources.filter((x) => x.active))
  const setIncomeBudget = useStore((s) => s.setIncomeBudget)
  const addDeposit = useStore((s) => s.addIncomeDeposit)
  const updateDeposit = useStore((s) => s.updateIncomeDeposit)
  const removeDeposit = useStore((s) => s.removeIncomeDeposit)

  const totalBudget = sources.reduce((a, s) => a + (month.incomeBudgets[s.id] ?? 0), 0)
  const totalActual = month.incomeDeposits.reduce((a, d) => a + d.amount, 0)
  const locked = month.status === 'closed'

  return (
    <Section
      title="Income"
      budget={{ label: 'Budget', value: fmtMoney(totalBudget, { cents: false }) }}
      total={{
        label: 'Actual',
        value: fmtMoney(totalActual, { cents: false }),
        tone: totalActual >= totalBudget ? 'pos' : 'neutral',
      }}
    >
      {/* per-source budget row */}
      <div className="px-4 py-2 grid grid-cols-[2fr,1fr,1fr] gap-3 items-center border-b border-line-soft">
        <div className="label">Source</div>
        <div className="label text-right">Budget</div>
        <div className="label text-right">Actual</div>
      </div>
      {sources.map((s) => {
        const actual = month.incomeDeposits
          .filter((d) => d.sourceId === s.id)
          .reduce((a, d) => a + d.amount, 0)
        return (
          <div key={s.id} className="px-4 py-1.5 grid grid-cols-[2fr,1fr,1fr] gap-3 items-center border-b border-line-soft">
            <div className="text-sm">{s.name}</div>
            <NumberInput
              value={month.incomeBudgets[s.id] ?? 0}
              onChange={(n) => setIncomeBudget(month.key, s.id, n)}
              disabled={locked}
            />
            <div className="text-right num text-sm">{fmtMoney(actual, { cents: false })}</div>
          </div>
        )
      })}

      {/* deposits */}
      <div className="px-4 py-3">
        <div className="label mb-2">Deposits</div>
        <div className="space-y-1">
          {month.incomeDeposits.map((d) => (
            <DepositRow
              key={d.id}
              deposit={d}
              sources={sources}
              onChange={(patch) => updateDeposit(month.key, d.id, patch)}
              onRemove={() => removeDeposit(month.key, d.id)}
              locked={locked}
            />
          ))}
        </div>
        {!locked && (
          <AddDepositForm
            sources={sources}
            onAdd={(sourceId, amount, date) => addDeposit(month.key, sourceId, amount, date)}
          />
        )}
      </div>
    </Section>
  )
}

function DepositRow({
  deposit, sources, onChange, onRemove, locked,
}: {
  deposit: { id: string; sourceId: string; amount: number; date: string; note?: string }
  sources: { id: string; name: string }[]
  onChange: (patch: any) => void
  onRemove: () => void
  locked: boolean
}) {
  const sourceName = sources.find((s) => s.id === deposit.sourceId)?.name ?? '—'
  return (
    <div className="grid grid-cols-[2fr,1fr,1fr,auto] gap-2 items-center text-sm">
      <span className="text-ink-muted truncate">{sourceName}</span>
      <NumberInput
        value={deposit.amount}
        onChange={(amount) => onChange({ amount })}
        disabled={locked}
      />
      <DateInput
        value={deposit.date}
        onChange={(date) => onChange({ date })}
      />
      {!locked && (
        <button onClick={onRemove} className="btn-ghost" aria-label="Remove deposit">×</button>
      )}
    </div>
  )
}

function AddDepositForm({
  sources, onAdd,
}: {
  sources: { id: string; name: string }[]
  onAdd: (sourceId: string, amount: number, date: string) => void
}) {
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? '')
  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState(todayISO())

  return (
    <div className="mt-3 grid grid-cols-[2fr,1fr,1fr,auto] gap-2 items-center">
      <select
        value={sourceId}
        onChange={(e) => setSourceId(e.target.value)}
        className="field text-sm"
      >
        {sources.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <NumberInput value={amount} onChange={setAmount} />
      <DateInput value={date} onChange={setDate} />
      <button
        className="btn"
        onClick={() => {
          if (amount > 0 && sourceId) {
            onAdd(sourceId, amount, date)
            setAmount(0)
          }
        }}
      >
        +
      </button>
    </div>
  )
}
