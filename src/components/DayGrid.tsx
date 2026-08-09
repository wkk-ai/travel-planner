import { format, isToday, parseISO } from 'date-fns'
import { useTripStore } from '../store/tripStore'
import type { TripEvent } from '../types'
import { currentEventAt, cn } from '../lib/time'
import { DayColumn, TimeGutter } from './DayColumn'

interface Props {
  events: TripEvent[]
  warnings: { eventId: string; message: string }[]
  onSelect: (e: TripEvent) => void
}

export function DayGrid({ events, warnings, onSelect }: Props) {
  const selectedDate = useTripStore((s) => s.selectedDate)
  const allEvents = useTripStore((s) => s.events)
  const categoryFilter = useTripStore((s) => s.categoryFilter)
  const searchQuery = useTripStore((s) => s.searchQuery)
  const setCategoryFilter = useTripStore((s) => s.setCategoryFilter)
  const setSearchQuery = useTripStore((s) => s.setSearchQuery)
  const mode = useTripStore((s) => s.mode)

  const dayEvents = events.filter((e) => e.date === selectedDate)
  const allDayEvents = allEvents.filter((e) => e.date === selectedDate)
  const filterActive =
    categoryFilter !== 'all' || searchQuery.trim().length > 0
  const d = parseISO(selectedDate)
  const today = isToday(d)
  const nowEv = currentEventAt(allEvents)

  return (
    <div>
      <div className="sticky top-0 z-30 hidden border-b border-[var(--gcal-border)] bg-white/95 px-3 py-2 backdrop-blur sm:block sm:px-4 sm:py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-bold tracking-wide text-[var(--gcal-muted)]">
            {format(d, 'EEEE').toUpperCase()}
          </div>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <div
            className={cn(
              'flex size-12 shrink-0 items-center justify-center rounded-full text-2xl font-semibold',
              today && 'bg-[var(--gcal-blue)] text-white',
            )}
          >
            {format(d, 'd')}
          </div>
          <div className="min-w-0">
            <div className="truncate text-2xl font-semibold">{format(d, 'MMMM yyyy')}</div>
            <div className="text-sm text-[var(--gcal-muted)]">{dayEvents.length} events</div>
          </div>
        </div>
      </div>

      {filterActive && dayEvents.length === 0 && allDayEvents.length > 0 ? (
        <div className="border-b border-[var(--gcal-border)] bg-[#e8f0fe]/60 px-4 py-3 text-center">
          <p className="text-ui-sm font-medium text-[var(--gcal-text)]">No events match your filters</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('')
              setCategoryFilter('all')
            }}
            className="mt-1 text-ui-sm font-semibold text-[var(--gcal-blue)] hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : null}

      {filterActive && dayEvents.length === 0 && allDayEvents.length === 0 && mode === 'edit' ? (
        <div className="border-b border-dashed border-[var(--gcal-border)] bg-[var(--gcal-bg)] px-4 py-6 text-center sm:py-8">
          <p className="text-ui-sm font-medium text-[var(--gcal-muted)]">Nothing planned this day</p>
          <p className="mt-1 text-ui-xs text-[var(--gcal-muted)]">Tap + to add an event</p>
        </div>
      ) : null}

      <div className="flex">
        <TimeGutter />
        <DayColumn
          date={selectedDate}
          events={dayEvents}
          warnings={warnings}
          onSelect={onSelect}
          nowEventId={nowEv?.id ?? null}
        />
      </div>
    </div>
  )
}
