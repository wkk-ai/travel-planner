import { BookOpen, CalendarDays } from 'lucide-react'
import { useTripStore } from '../store/tripStore'
import type { AppTab } from '../types'
import { cn } from '../lib/time'

const TABS: { id: AppTab; label: string; icon: typeof BookOpen }[] = [
  { id: 'story', label: 'Story', icon: BookOpen },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
]

export function TabBar() {
  const activeTab = useTripStore((s) => s.activeTab)
  const setActiveTab = useTripStore((s) => s.setActiveTab)

  return (
    <nav
      className="no-print flex shrink-0 gap-1 border-b border-[var(--gcal-border)] bg-white/95 px-3 py-1.5 sm:px-4"
      aria-label="Trip views"
    >
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setActiveTab(id)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
            activeTab === id
              ? 'bg-[var(--gcal-blue)] text-white shadow-sm'
              : 'text-[var(--gcal-muted)] hover:bg-[var(--gcal-bg)] hover:text-[var(--gcal-text)]',
          )}
          aria-current={activeTab === id ? 'page' : undefined}
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}
    </nav>
  )
}
