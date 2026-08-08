import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CATEGORIES } from '../data/categories'
import { cn, isoDate, tripDaysIncludingEvents } from '../lib/time'
import { useTripStore } from '../store/tripStore'
import type { EventCategory } from '../types'

/** Fixed-height row below Story | Schedule tabs — prevents tab bar from jumping. */
export function ScheduleToolbar() {
  const trip = useTripStore((s) => s.trip)!
  const activeTab = useTripStore((s) => s.activeTab)
  const view = useTripStore((s) => s.view)
  const setView = useTripStore((s) => s.setView)
  const selectedDate = useTripStore((s) => s.selectedDate)
  const setSelectedDate = useTripStore((s) => s.setSelectedDate)
  const categoryFilter = useTripStore((s) => s.categoryFilter)
  const setCategoryFilter = useTripStore((s) => s.setCategoryFilter)

  const events = useTripStore((s) => s.events)
  const days = tripDaysIncludingEvents(trip.startDate, trip.endDate, events)
  const dayIndex = days.findIndex((d) => isoDate(d) === selectedDate)
  const selectedDay = days[Math.max(0, dayIndex)]

  function prevDay() {
    if (dayIndex > 0) setSelectedDate(isoDate(days[dayIndex - 1]))
  }

  function nextDay() {
    if (dayIndex >= 0 && dayIndex < days.length - 1) setSelectedDate(isoDate(days[dayIndex + 1]))
  }

  const showSchedule = activeTab === 'schedule'

  return (
    <div
      className={cn(
        'no-print schedule-toolbar shrink-0 border-b border-[var(--gcal-border)] bg-[var(--gcal-bg)]',
        showSchedule ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
      aria-hidden={!showSchedule}
    >
      <div className="flex h-12 items-center gap-2 px-3 sm:px-4">
        <div className="flex shrink-0 rounded-lg bg-white p-0.5 ring-1 ring-[var(--gcal-border)]">
          <button
            type="button"
            className={cn(
              'rounded-md px-3 py-1.5 text-ui-sm font-semibold',
              view === 'day' && 'bg-[var(--gcal-blue)] text-white',
            )}
            onClick={() => setView('day')}
          >
            Day
          </button>
          <button
            type="button"
            className={cn(
              'rounded-md px-3 py-1.5 text-ui-sm font-semibold',
              view === 'week' && 'bg-[var(--gcal-blue)] text-white',
            )}
            onClick={() => setView('week')}
          >
            Week
          </button>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5 sm:justify-start">
          <button
            type="button"
            disabled={dayIndex <= 0}
            onClick={prevDay}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--gcal-muted)] hover:bg-white disabled:opacity-30"
            aria-label="Previous day"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="min-w-0 truncate text-center text-ui-base font-semibold sm:min-w-[10rem]">
            {format(selectedDay, 'EEE, MMM d')}
          </div>
          <button
            type="button"
            disabled={dayIndex < 0 || dayIndex >= days.length - 1}
            onClick={nextDay}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--gcal-muted)] hover:bg-white disabled:opacity-30"
            aria-label="Next day"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <select
          className="hidden max-w-[8rem] shrink-0 rounded-lg border border-[var(--gcal-border)] bg-white px-2 py-1.5 text-ui-sm sm:block"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          aria-label="Jump to day"
        >
          {days.map((d) => (
            <option key={isoDate(d)} value={isoDate(d)}>
              {format(d, 'EEE dd/MM')}
            </option>
          ))}
        </select>

        <select
          className="max-w-[6.5rem] shrink-0 rounded-lg border border-[var(--gcal-border)] bg-white px-2 py-1.5 text-ui-sm font-medium sm:max-w-[8rem]"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as EventCategory | 'all')}
          aria-label="Filter by category"
        >
          <option value="all">All</option>
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
