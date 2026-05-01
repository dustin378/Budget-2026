import { useState } from 'react'
import { useStore } from '../store'
import type { MonthData } from '../types'
import { Section } from './ui/Section'
import { NumberInput } from './ui/NumberInput'
import { DateInput } from './ui/DateInput'
import { TextInput } from './ui/TextInput'
import { fmtMoney } from '../lib/money'
import { todayISO } from '../lib/dates'
import { mileageTotal } from '../lib/compute'

export function MileageCard({ month }: { month: MonthData }) {
  const rate = useStore((s) => s.mileageRates[month.year] ?? 0.67)
  const addEntry = useStore((s) => s.addMileEntry)
  const updateEntry = useStore((s) => s.updateMileEntry)
  const removeEntry = useStore((s) => s.removeMileEntry)
  const locked = month.status === 'closed'

  const { miles, dollars } = mileageTotal(month, rate)

  return (
    <Section
      title="Business Miles"
      total={{ label: 'Deductible', value: fmtMoney(dollars, { cents: false }), tone: 'neutral' }}
      action={<span className="text-xs text-ink-muted ml-2">@ ${rate}/mi</span>}
    >
      <div className="px-4 py-2 grid grid-cols-[1fr,1fr,1fr,1fr,2fr,auto] gap-2 items-center border-b border-line-soft">
        <div className="label">Date</div>
        <div className="label text-right">Start</div>
        <div className="label text-right">End</div>
        <div className="label text-right">Miles</div>
        <div className="label">Purpose</div>
        <div className="w-6" />
      </div>

      <div>
        {month.mileage.map((m) => {
          const total = Math.max(0, m.endMi - m.startMi)
          return (
            <div key={m.id} className="px-4 py-1.5 grid grid-cols-[1fr,1fr,1fr,1fr,2fr,auto] gap-2 items-center border-b border-line-soft last:border-0 text-sm">
              <DateInput value={m.date} onChange={(date) => updateEntry(month.key, m.id, { date })} />
              <NumberInput value={m.startMi} onChange={(startMi) => updateEntry(month.key, m.id, { startMi })} disabled={locked} />
              <NumberInput value={m.endMi} onChange={(endMi) => updateEntry(month.key, m.id, { endMi })} disabled={locked} />
              <div className="text-right num">{total.toFixed(1)}</div>
              <TextInput value={m.purpose} onChange={(purpose) => updateEntry(month.key, m.id, { purpose })} placeholder="purpose" />
              {!locked && (
                <button onClick={() => removeEntry(month.key, m.id)} className="btn-ghost">×</button>
              )}
            </div>
          )
        })}
      </div>
      {!locked && <AddMileForm onAdd={(date, startMi, endMi, purpose) => addEntry(month.key, date, startMi, endMi, purpose)} />}

      <div className="px-4 py-3 grid grid-cols-[1fr,1fr,1fr,1fr,2fr,auto] gap-2 items-center bg-paper/40 border-t border-line-soft">
        <div className="label">Total</div>
        <div />
        <div />
        <div className="text-right num text-sm font-semibold">{miles.toFixed(1)}</div>
        <div className="num text-sm font-semibold">{fmtMoney(dollars)}</div>
        <div />
      </div>
    </Section>
  )
}

function AddMileForm({
  onAdd,
}: {
  onAdd: (date: string, startMi: number, endMi: number, purpose: string) => void
}) {
  const [date, setDate] = useState(todayISO())
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [purpose, setPurpose] = useState('')

  return (
    <div className="px-4 py-3 grid grid-cols-[1fr,1fr,1fr,1fr,2fr,auto] gap-2 items-center border-t border-line-soft">
      <DateInput value={date} onChange={setDate} />
      <NumberInput value={start} onChange={setStart} />
      <NumberInput value={end} onChange={setEnd} />
      <div className="text-right num text-sm text-ink-muted">{Math.max(0, end - start).toFixed(1)}</div>
      <TextInput value={purpose} onChange={setPurpose} placeholder="purpose" />
      <button
        className="btn"
        onClick={() => {
          if (end > start) {
            onAdd(date, start, end, purpose)
            setStart(end)
            setEnd(0)
            setPurpose('')
          }
        }}
      >
        +
      </button>
    </div>
  )
}
