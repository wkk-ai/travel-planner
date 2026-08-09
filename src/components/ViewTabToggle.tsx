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
            'rounded-full px-4 py-1.5 text-ui-sm font-semibold transition-colors',
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
