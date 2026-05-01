import { useStore } from './store'
import { Sidebar } from './components/Sidebar'
import { MonthView } from './components/MonthView'
import { Dashboard } from './components/Dashboard'
import { LoansView } from './components/LoansView'
import { SettingsView } from './components/SettingsView'

export function App() {
  const view = useStore((s) => s.ui.activeView)

  return (
    <div className="h-full flex">
      <Sidebar />
      {view === 'dashboard' && <Dashboard />}
      {view === 'month' && <MonthView />}
      {view === 'loans' && <LoansView />}
      {view === 'settings' && <SettingsView />}
    </div>
  )
}
