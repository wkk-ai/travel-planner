import { useTripStore } from '../store/tripStore'
import type { AppTab } from '../types'
import { cn } from '../lib/time'

const TABS: { id: AppTab; label: string }[] = [
  { id: 'story', label: 'Story' },
  { id: 'schedule', label: 'Schedule' },
]

export function TabBar() {
  const activeTab = useTripStore((s) => s.activeTab)
  const setActiveTab = useTripStore((s) => s.setActiveTab)

  return (
    <nav
      className="no-print flex shrink-0 border-b border-[var(--gcal-border)] bg-white"
      aria-label="Trip views"
    >
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => setActiveTab(id)}
          className={cn(
            'flex-1 border-b-2 py-3 text-ui-base font-semibold transition-colors sm:flex-none sm:px-6',
            activeTab === id
              ? 'border-[var(--gcal-blue)] text-[var(--gcal-blue)]'
              : 'border-transparent text-[var(--gcal-muted)] hover:text-[var(--gcal-text)]',
          )}
          aria-current={activeTab === id ? 'page' : undefined}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}
