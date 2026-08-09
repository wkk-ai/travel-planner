import { format, isToday } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { CATEGORIES } from '../data/categories'
import { cn, isoDate, tripDaysIncludingEvents } from '../lib/time'
import { useTripStore } from '../store/tripStore'
import type { EventCategory } from '../types'
import { ViewTabToggle } from './ViewTabToggle'

export function TabBar() {
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

  return (
    <div className="no-print shrink-0 border-b border-[var(--gcal-border)] bg-white">
      <div className="flex min-h-12 flex-wrap items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
        <ViewTabToggle />

        {activeTab === 'schedule' ? (
          <>
            <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 sm:gap-2">
              <button
                type="button"
                disabled={dayIndex <= 0}
                onClick={prevDay}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--gcal-muted)] hover:bg-[var(--gcal-bg)] disabled:opacity-30"
                aria-label="Previous day"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="shrink-0 rounded-lg bg-[#e8f0fe] px-2.5 py-1 text-ui-sm font-bold tabular-nums text-[var(--gcal-blue)]">
                {format(selectedDay, 'd')}
              </span>
              <span className="truncate text-ui-sm font-semibold text-[var(--gcal-text)]">
                {format(selectedDay, 'EEEE, MMM')}
              </span>
              <button
                type="button"
                disabled={dayIndex < 0 || dayIndex >= days.length - 1}
                onClick={nextDay}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--gcal-muted)] hover:bg-[var(--gcal-bg)] disabled:opacity-30"
                aria-label="Next day"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => setView('day')}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-ui-sm font-semibold',
                  view === 'day'
                    ? 'text-[var(--gcal-blue)]'
                    : 'text-[var(--gcal-muted)] hover:bg-[var(--gcal-bg)]',
                )}
              >
                Day
              </button>
              <button
                type="button"
                onClick={() => setView('week')}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-ui-sm font-semibold',
                  view === 'week'
                    ? 'text-[var(--gcal-blue)]'
                    : 'text-[var(--gcal-muted)] hover:bg-[var(--gcal-bg)]',
                )}
              >
                Week
              </button>

              <div className="relative ml-1">
                <CalendarDays className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-[var(--gcal-muted)]" />
                <select
                  className="max-w-[7rem] appearance-none rounded-lg border-0 bg-transparent py-1.5 pl-7 pr-2 text-ui-sm font-semibold text-[var(--gcal-muted)] hover:bg-[var(--gcal-bg)] focus:outline-none focus:ring-2 focus:ring-[#e8f0fe] sm:max-w-[8.5rem]"
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
              </div>

              <div className="relative">
                <SlidersHorizontal className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-[var(--gcal-muted)]" />
                <select
                  className="max-w-[5.5rem] appearance-none rounded-lg border-0 bg-transparent py-1.5 pl-7 pr-2 text-ui-sm font-semibold text-[var(--gcal-muted)] hover:bg-[var(--gcal-bg)] focus:outline-none focus:ring-2 focus:ring-[#e8f0fe] sm:max-w-[6.5rem]"
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
          </>
        ) : (
          <div className="min-h-8 flex-1" aria-hidden />
        )}
      </div>

      {activeTab === 'schedule' ? (
        <div className="flex gap-1.5 overflow-x-auto px-3 pb-2.5 sm:hidden">
          {days.map((d) => {
            const iso = isoDate(d)
            const selected = iso === selectedDate
            const today = isToday(d)
            return (
              <button
                key={iso}
                type="button"
                onClick={() => {
                  setSelectedDate(iso)
                  setView('day')
                }}
                className={cn(
                  'flex shrink-0 flex-col items-center rounded-xl px-3 py-1.5 text-center',
                  selected
                    ? 'bg-[var(--gcal-blue)] text-white'
                    : 'bg-white text-[var(--gcal-text)] ring-1 ring-[var(--gcal-border)]',
                  today && !selected && 'ring-[var(--gcal-blue)]',
                )}
              >
                <span className="text-[10px] font-semibold uppercase opacity-80">{format(d, 'EEE')}</span>
                <span className="text-ui-base font-bold leading-tight">{format(d, 'd')}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
