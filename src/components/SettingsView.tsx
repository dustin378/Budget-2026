import { useRef, useState } from 'react'
import { useStore } from '../store'
import { Section } from './ui/Section'
import { NumberInput } from './ui/NumberInput'
import { TextInput } from './ui/TextInput'
import { downloadJSON, importJSON } from '../lib/exportImport'

export function SettingsView() {
  const year = useStore((s) => s.year)
  const recurringCreditAmount = useStore((s) => s.recurringCreditAmount)
  const mileageRates = useStore((s) => s.mileageRates)
  const incomeSources = useStore((s) => s.incomeSources)
  const bills = useStore((s) => s.bills)
  const categories = useStore((s) => s.categories)

  const setRecurring = useStore((s) => s.setRecurringCreditAmount)
  const setMileageRate = useStore((s) => s.setMileageRate)
  const addIncomeSource = useStore((s) => s.addIncomeSource)
  const updateIncomeSource = useStore((s) => s.updateIncomeSource)
  const removeIncomeSource = useStore((s) => s.removeIncomeSource)
  const addBill = useStore((s) => s.addBill)
  const updateBill = useStore((s) => s.updateBill)
  const removeBill = useStore((s) => s.removeBill)
  const addCategory = useStore((s) => s.addCategory)
  const updateCategory = useStore((s) => s.updateCategory)
  const removeCategory = useStore((s) => s.removeCategory)
  const loadState = useStore((s) => s.loadState)
  const resetAll = useStore((s) => s.resetAll)

  const [newIncome, setNewIncome] = useState('')
  const [newBill, setNewBill] = useState('')
  const [newCat, setNewCat] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importMsg, setImportMsg] = useState('')

  const handleImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = importJSON(String(reader.result))
      if ('error' in result) {
        setImportMsg(result.error)
      } else {
        loadState(result)
        setImportMsg('Imported successfully.')
      }
    }
    reader.readAsText(file)
  }

  const exportSnapshot = () => {
    const snapshot = useStore.getState()
    downloadJSON(snapshot, `budget-${year}-${Date.now()}.json`)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="px-8 pt-8 pb-6 border-b border-line">
        <div className="label">Configuration</div>
        <h1 className="display text-6xl leading-none mt-1">Settings</h1>
      </header>

      <div className="px-8 py-6 space-y-6 max-w-5xl">
        <Section title="Globals">
          <div className="px-4 py-4 grid grid-cols-2 gap-6">
            <div>
              <div className="label mb-1.5">Recurring credit (monthly default)</div>
              <NumberInput value={recurringCreditAmount} onChange={setRecurring} />
              <p className="text-xs text-ink-muted mt-2">
                Used as the default budget value when seeding new months.
              </p>
            </div>
            <div>
              <div className="label mb-1.5">Mileage rate · {year} ($/mi)</div>
              <NumberInput
                value={mileageRates[year] ?? 0.67}
                onChange={(n) => setMileageRate(year, n)}
              />
              <p className="text-xs text-ink-muted mt-2">
                IRS standard rate for {year} business mileage.
              </p>
            </div>
          </div>
        </Section>

        <Section title="Income sources">
          <div className="px-4 py-2 grid grid-cols-[2fr,1fr,auto] gap-3 items-center border-b border-line-soft">
            <div className="label">Name</div>
            <div className="label text-right">Default budget</div>
            <div className="w-6" />
          </div>
          {incomeSources.filter((s) => s.active).map((s) => (
            <div key={s.id} className="px-4 py-1.5 grid grid-cols-[2fr,1fr,auto] gap-3 items-center border-b border-line-soft last:border-0">
              <TextInput value={s.name} onChange={(name) => updateIncomeSource(s.id, { name })} />
              <NumberInput value={s.budgetedAmount} onChange={(budgetedAmount) => updateIncomeSource(s.id, { budgetedAmount })} />
              <button onClick={() => removeIncomeSource(s.id)} className="btn-ghost">×</button>
            </div>
          ))}
          <div className="px-4 py-3 grid grid-cols-[2fr,1fr,auto] gap-3 items-center border-t border-line-soft">
            <TextInput value={newIncome} onChange={setNewIncome} placeholder="New source name" />
            <div />
            <button
              className="btn"
              onClick={() => {
                if (newIncome.trim()) {
                  addIncomeSource(newIncome.trim())
                  setNewIncome('')
                }
              }}
            >
              +
            </button>
          </div>
        </Section>

        <Section title="Bills">
          <div className="px-4 py-2 grid grid-cols-[2fr,1fr,auto,auto,auto] gap-3 items-center border-b border-line-soft">
            <div className="label">Name</div>
            <div className="label text-right">Default budget</div>
            <div className="label">Auto</div>
            <div className="label">Day</div>
            <div className="w-6" />
          </div>
          {bills.filter((b) => b.active).sort((a, b) => a.order - b.order).map((b) => (
            <div key={b.id} className="px-4 py-1.5 grid grid-cols-[2fr,1fr,auto,auto,auto] gap-3 items-center border-b border-line-soft last:border-0">
              <TextInput value={b.name} onChange={(name) => updateBill(b.id, { name })} />
              <NumberInput value={b.budgetedAmount} onChange={(budgetedAmount) => updateBill(b.id, { budgetedAmount })} />
              <input
                type="checkbox"
                checked={b.autopay}
                onChange={(e) => updateBill(b.id, { autopay: e.target.checked })}
                className="accent-ink"
              />
              <input
                type="number"
                min={1}
                max={31}
                value={b.dueDay ?? ''}
                onChange={(e) => updateBill(b.id, { dueDay: e.target.value ? Number(e.target.value) : undefined })}
                className="field font-mono w-14 text-center text-sm"
              />
              <button onClick={() => removeBill(b.id)} className="btn-ghost">×</button>
            </div>
          ))}
          <div className="px-4 py-3 grid grid-cols-[2fr,1fr,auto,auto,auto] gap-3 items-center border-t border-line-soft">
            <TextInput value={newBill} onChange={setNewBill} placeholder="New bill name" />
            <div /><div /><div />
            <button
              className="btn"
              onClick={() => {
                if (newBill.trim()) {
                  addBill(newBill.trim())
                  setNewBill('')
                }
              }}
            >
              +
            </button>
          </div>
        </Section>

        <Section title="Expense categories">
          <div className="px-4 py-2 grid grid-cols-[2fr,1fr,auto] gap-3 items-center border-b border-line-soft">
            <div className="label">Name</div>
            <div className="label text-right">Default budget</div>
            <div className="w-6" />
          </div>
          {categories.filter((c) => c.active).sort((a, b) => a.order - b.order).map((c) => (
            <div key={c.id} className="px-4 py-1.5 grid grid-cols-[2fr,1fr,auto] gap-3 items-center border-b border-line-soft last:border-0">
              <TextInput value={c.name} onChange={(name) => updateCategory(c.id, { name })} />
              <NumberInput value={c.budgetedAmount} onChange={(budgetedAmount) => updateCategory(c.id, { budgetedAmount })} />
              <button onClick={() => removeCategory(c.id)} className="btn-ghost">×</button>
            </div>
          ))}
          <div className="px-4 py-3 grid grid-cols-[2fr,1fr,auto] gap-3 items-center border-t border-line-soft">
            <TextInput value={newCat} onChange={setNewCat} placeholder="New category name" />
            <div />
            <button
              className="btn"
              onClick={() => {
                if (newCat.trim()) {
                  addCategory(newCat.trim())
                  setNewCat('')
                }
              }}
            >
              +
            </button>
          </div>
        </Section>

        <Section title="Data">
          <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="btn" onClick={exportSnapshot}>
              Export JSON
            </button>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleImport(f)
                  e.target.value = ''
                }}
              />
              <button className="btn w-full" onClick={() => fileInputRef.current?.click()}>
                Import JSON
              </button>
              {importMsg && <div className="text-xs mt-2 text-ink-muted">{importMsg}</div>}
            </div>
            <button
              className="btn border-negative/40 hover:bg-negative hover:border-negative"
              onClick={() => {
                if (confirm('Reset all data? This cannot be undone.')) resetAll()
              }}
            >
              Reset all data
            </button>
          </div>
          <div className="px-4 pb-4 text-xs text-ink-muted">
            All data is stored in your browser (localStorage). Export regularly to back up.
          </div>
        </Section>
      </div>
    </div>
  )
}
