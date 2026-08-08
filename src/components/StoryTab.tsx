import { format, parseISO } from 'date-fns'
import { CATEGORIES } from '../data/categories'
import {
  cn,
  currentEventAt,
  daysUntil,
  isoDate,
  isEventPast,
  tripDays,
} from '../lib/time'
import { backupCount } from '../lib/eventBackups'
import { useTripStore } from '../store/tripStore'
import type { TripEvent } from '../types'

function dayPlace(events: TripEvent[]): string {
  const locs = events.map((e) => e.location.trim()).filter(Boolean)
  if (!locs.length) return ''
  const counts = new Map<string, number>()
  for (const l of locs) counts.set(l, (counts.get(l) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

function dayVibe(events: TripEvent[], dayIndex: number, totalDays: number): string {
  const cats = new Set(events.map((e) => e.category))
  if (cats.has('flight') && dayIndex === 0) return 'Departure'
  if (cats.has('flight') && dayIndex === totalDays - 1) return 'Head home'
  if (cats.has('flight')) return 'Travel'
  if (cats.has('attraction') || cats.has('show')) return 'Explore'
  if (events.length === 0) return 'Open'
  return 'On trip'
}

function formatEventTime(ev: TripEvent): string {
  if (ev.category === 'flight' && ev.flight?.departLocal) return ev.flight.departLocal
  return ev.startTime
}

export function StoryTab() {
  const trip = useTripStore((s) => s.trip)!
  const events = useTripStore((s) => s.events)
  const setActiveTab = useTripStore((s) => s.setActiveTab)
  const setSelectedDate = useTripStore((s) => s.setSelectedDate)
  const setView = useTripStore((s) => s.setView)
  const selectEvent = useTripStore((s) => s.selectEvent)

  const today = isoDate(new Date())
  const days = tripDays(trip.startDate, trip.endDate)
  const totalDays = days.length
  const countdown = daysUntil(trip.startDate)
  const nowEvent = currentEventAt(events)

  const tripStatus =
    countdown > 0
      ? `${countdown} days until you go`
      : countdown === 0
        ? 'Trip starts today'
        : `Day ${Math.abs(countdown) + 1} of ${totalDays}`

  function openDayOnSchedule(date: string) {
    setSelectedDate(date)
    setView('day')
    setActiveTab('schedule')
  }

  const todayInTrip = today >= trip.startDate && today <= trip.endDate
  const sortedDays = [...days].sort((a, b) => {
    const aIso = isoDate(a)
    const bIso = isoDate(b)
    if (aIso === today) return -1
    if (bIso === today) return 1
    if (todayInTrip) {
      if (aIso < today && bIso >= today) return 1
      if (bIso < today && aIso >= today) return -1
    }
    return a.getTime() - b.getTime()
  })

  return (
    <div className="story-tab mx-auto max-w-2xl px-4 py-5 pb-12 sm:px-6 sm:py-6">
      <header className="mb-6 border-b border-[var(--gcal-border)] pb-5">
        <h2 className="text-ui-xl font-semibold leading-tight text-[var(--gcal-text)]">{trip.name}</h2>
        <p className="mt-1 text-ui-sm text-[var(--gcal-muted)]">
          {format(parseISO(trip.startDate), 'MMM d')} – {format(parseISO(trip.endDate), 'MMM d, yyyy')}
          <span className="mx-1.5 text-[var(--gcal-border)]">·</span>
          {tripStatus}
        </p>
        {nowEvent ? (
          <p className="mt-3 text-ui-base">
            <span className="font-medium text-[var(--gcal-blue)]">Now</span>
            <span className="text-[var(--gcal-muted)]"> · </span>
            {nowEvent.title}
          </p>
        ) : null}
      </header>

      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-ui-sm font-semibold uppercase tracking-wide text-[var(--gcal-muted)]">
          Your days
        </h3>
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className="text-ui-sm font-medium text-[var(--gcal-blue)] hover:underline"
        >
          Full schedule
        </button>
      </div>

      <ul className="divide-y divide-[var(--gcal-border)] rounded-xl border border-[var(--gcal-border)] bg-white">
        {sortedDays.map((d) => {
          const date = isoDate(d)
          const dayEvents = events.filter((e) => e.date === date)
          const dayNumber = days.findIndex((x) => isoDate(x) === date) + 1
          const place = dayPlace(dayEvents)
          const vibe = dayVibe(dayEvents, dayNumber - 1, totalDays)
          const highlights = [...dayEvents]
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .slice(0, 3)
          const isToday = date === today
          const isPast = date < today

          return (
            <li key={date}>
              <button
                type="button"
                onClick={() => openDayOnSchedule(date)}
                className={cn(
                  'w-full px-4 py-4 text-left transition-colors hover:bg-[var(--gcal-bg)]',
                  isPast && 'opacity-60',
                )}
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-ui-base font-semibold">{format(d, 'EEE, MMM d')}</span>
                  {isToday ? (
                    <span className="text-ui-xs font-semibold text-[var(--gcal-blue)]">Today</span>
                  ) : null}
                  {place ? (
                    <span className="text-ui-sm text-[var(--gcal-muted)]">{place}</span>
                  ) : null}
                  <span className="text-ui-xs text-[var(--gcal-muted)]">· {vibe}</span>
                </div>

                {highlights.length > 0 ? (
                  <ul className="mt-2.5 space-y-1.5">
                    {highlights.map((ev) => {
                      const cat = CATEGORIES[ev.category]
                      const backups = backupCount(ev)
                      return (
                        <li key={ev.id}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              selectEvent(ev.id)
                            }}
                            className={cn(
                              'flex w-full items-start gap-2 rounded-lg px-1 py-0.5 text-left hover:bg-[var(--gcal-bg)]',
                              isEventPast(ev) && 'opacity-70',
                            )}
                          >
                            <span
                              className="mt-1.5 size-2 shrink-0 rounded-full"
                              style={{ background: cat.border }}
                            />
                            <span className="w-14 shrink-0 tabular-nums text-ui-sm text-[var(--gcal-muted)]">
                              {formatEventTime(ev)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-ui-base font-medium leading-snug">{ev.title}</span>
                              {backups > 0 ? (
                                <span className="text-ui-xs text-[var(--gcal-muted)]">
                                  or {backups} other plan{backups > 1 ? 's' : ''}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                    {dayEvents.length > 3 ? (
                      <li className="pl-6 text-ui-sm text-[var(--gcal-muted)]">
                        +{dayEvents.length - 3} more
                      </li>
                    ) : null}
                  </ul>
                ) : (
                  <p className="mt-2 text-ui-sm text-[var(--gcal-muted)]">Nothing planned</p>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
