import { useTripStore } from '../store/tripStore'
import type { AppTab } from '../types'
import { cn } from '../lib/time'

const TABS: { id: AppTab; label: string }[] = [
  { id: 'story', label: 'Story' },
  { id: 'schedule', label: 'Schedule' },
]

export function ViewTabToggle({ className }: { className?: string }) {
  const activeTab = useTripStore((s) => s.activeTab)
  const setActiveTab = useTripStore((s) => s.setActiveTab)

  return (
    <div
      className={cn('flex shrink-0 rounded-full bg-[var(--gcal-bg)] p-0.5', className)}
      role="tablist"
      aria-label="Trip views"
    >
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={activeTab === id}
          onClick={() => setActiveTab(id)}
          className={cn(
            'rounded-full px-3 py-1 text-ui-xs font-semibold transition-colors sm:px-4 sm:py-1.5 sm:text-ui-sm',
            activeTab === id
              ? 'bg-[var(--gcal-blue)] text-white shadow-sm'
              : 'text-[var(--gcal-muted)] hover:text-[var(--gcal-text)]',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
