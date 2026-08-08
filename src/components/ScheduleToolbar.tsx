import { format, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CATEGORIES } from '../data/categories'
import { cn, isoDate, tripDaysIncludingEvents } from '../lib/time'
import { useTripStore } from '../store/tripStore'
import type { EventCategory } from '../types'

export function ScheduleToolbar() {
  const trip = useTripStore((s) => s.trip)!
  const activeTab = useTripStore((s) => s.activeTab)
  const view = useTripStore((s) => s.view)
  const setView = useTripStore((s) => s.setView)
  const selectedDate = useTripStore((s) => s.selectedDate)
  const setSelectedDate = useTripStore((s) => s.setSelectedDate)
  const categoryFilter = useTripStore((s) => s.categoryFilter)
  const setCategoryFilter = useTripStore((s) => s.setCategoryFilter)
  const setActiveTab = useTripStore((s) => s.setActiveTab)
  const events = useTripStore((s) => s.events)

  if (activeTab !== 'schedule') return null

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
    <div className="no-print schedule-toolbar shrink-0 border-b border-[var(--gcal-border)] bg-[var(--gcal-bg)]">
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

        <button
          type="button"
          onClick={() => setActiveTab('story')}
          className="hidden shrink-0 text-ui-sm font-semibold text-[var(--gcal-blue)] hover:underline sm:block"
        >
          Story
        </button>

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

      {/* Mobile week strip */}
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
                selected ? 'bg-[var(--gcal-blue)] text-white' : 'bg-white text-[var(--gcal-text)] ring-1 ring-[var(--gcal-border)]',
                today && !selected && 'ring-[var(--gcal-blue)]',
              )}
            >
              <span className="text-[10px] font-semibold uppercase opacity-80">{format(d, 'EEE')}</span>
              <span className="text-ui-base font-bold leading-tight">{format(d, 'd')}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
