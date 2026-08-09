import { useTripStore } from '../store/tripStore'
import type { AppTab } from '../types'
import { cn } from '../lib/time'

const TABS: { id: AppTab; label: string }[] = [
  { id: 'story', label: 'Story' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'map', label: 'Map' },
  { id: 'pack', label: 'Pack' },
  { id: 'wallet', label: 'Wallet' },
]

export function ViewTabToggle({ className }: { className?: string }) {
  const activeTab = useTripStore((s) => s.activeTab)
  const setActiveTab = useTripStore((s) => s.setActiveTab)

  return (
    <div
      className={cn(
        'no-scrollbar flex max-w-[min(100%,520px)] shrink-0 gap-0.5 overflow-x-auto rounded-full bg-[var(--gcal-bg)] p-0.5',
        className,
      )}
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
            'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors sm:px-3.5 sm:py-1.5 sm:text-ui-sm',
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
