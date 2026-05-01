import type { AppState } from '../types'

export function exportJSON(state: AppState): string {
  return JSON.stringify(state, null, 2)
}

export function downloadJSON(state: AppState, filename = 'budget-2026.json') {
  const blob = new Blob([exportJSON(state)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function importJSON(text: string): AppState | { error: string } {
  try {
    const parsed = JSON.parse(text) as AppState
    if (!parsed.schemaVersion || !parsed.months) {
      return { error: 'Not a valid budget file (missing schemaVersion or months).' }
    }
    return parsed
  } catch (e) {
    return { error: `Invalid JSON: ${(e as Error).message}` }
  }
}
