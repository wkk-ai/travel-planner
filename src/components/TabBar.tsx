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
      className="no-print shrink-0 border-b border-[var(--gcal-border)] bg-white px-3 py-2 sm:px-4"
      aria-label="Trip views"
    >
      <div className="flex gap-1 rounded-xl bg-[var(--gcal-bg)] p-1 sm:inline-flex sm:rounded-none sm:bg-transparent sm:p-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors sm:flex-none sm:rounded-full sm:px-3.5 sm:py-1.5 sm:font-medium',
              activeTab === id
                ? 'bg-white text-[var(--gcal-blue)] shadow-sm sm:bg-[var(--gcal-blue)] sm:text-white'
                : 'text-[var(--gcal-muted)] hover:text-[var(--gcal-text)] sm:hover:bg-[var(--gcal-bg)]',
            )}
            aria-current={activeTab === id ? 'page' : undefined}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}
