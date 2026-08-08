import { format, parseISO } from 'date-fns'
import { CATEGORIES } from '../data/categories'
import {
  cn,
  currentEventAt,
  daysUntil,
  isoDate,
  isEventPast,
  tripCalendarBounds,
  tripDaysIncludingEvents,
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

function uniquePlaces(events: TripEvent[]): number {
  return new Set(events.map((e) => e.location.trim()).filter(Boolean)).size
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
  const calendar = tripCalendarBounds(trip.startDate, trip.endDate, events)
  const days = tripDaysIncludingEvents(trip.startDate, trip.endDate, events)
  const totalDays = days.length
  const countdown = daysUntil(trip.startDate)
  const nowEvent = currentEventAt(events)
  const placeCount = uniquePlaces(events)

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

  const todayInTrip = today >= calendar.startDate && today <= calendar.endDate
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

  const primaryStat =
    countdown > 0
      ? { value: countdown, label: 'Days left', highlight: true }
      : { value: totalDays, label: 'Days', highlight: false }

  return (
    <div className="story-tab mx-auto max-w-2xl px-4 py-5 pb-12 sm:px-6 sm:py-6">
      <header className="mb-4">
        <h2 className="text-ui-xl font-bold leading-tight tracking-tight text-[var(--gcal-text)]">
          {trip.name}
        </h2>
        <p className="mt-1 text-ui-sm text-[var(--gcal-muted)]">
          {format(parseISO(calendar.startDate), 'MMM d')} – {format(parseISO(calendar.endDate), 'MMM d, yyyy')}
          <span className="mx-1.5 text-[var(--gcal-border)]">·</span>
          {tripStatus}
        </p>
        {nowEvent ? (
          <p className="mt-3 text-ui-base">
            <span className="font-semibold text-[var(--gcal-blue)]">Now</span>
            <span className="text-[var(--gcal-muted)]"> · </span>
            {nowEvent.title}
          </p>
        ) : null}
      </header>

      <div className="mb-5 flex gap-2">
        <div
          className={cn(
            'flex-1 rounded-[10px] border border-[var(--gcal-border)] bg-white px-3 py-2.5 text-center',
            primaryStat.highlight && 'border-[#c2d7f7] bg-[#e8f0fe]',
          )}
        >
          <div
            className={cn(
              'text-ui-lg font-bold tabular-nums',
              primaryStat.highlight ? 'text-[var(--gcal-blue)]' : 'text-[var(--gcal-text)]',
            )}
          >
            {primaryStat.value}
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--gcal-muted)]">
            {primaryStat.label}
          </div>
        </div>
        <div className="flex-1 rounded-[10px] border border-[var(--gcal-border)] bg-white px-3 py-2.5 text-center">
          <div className="text-ui-lg font-bold tabular-nums text-[var(--gcal-text)]">{events.length}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--gcal-muted)]">
            Events
          </div>
        </div>
        <div className="flex-1 rounded-[10px] border border-[var(--gcal-border)] bg-white px-3 py-2.5 text-center">
          <div className="text-ui-lg font-bold tabular-nums text-[var(--gcal-text)]">{placeCount}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--gcal-muted)]">
            Places
          </div>
        </div>
      </div>

      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-[var(--gcal-muted)]">
          Your days
        </h3>
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className="text-ui-sm font-semibold text-[var(--gcal-blue)] hover:underline"
        >
          Full schedule
        </button>
      </div>

      <ul className="flex flex-col gap-2.5">
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
          const meta = [place, vibe].filter(Boolean).join(' · ')

          return (
            <li key={date}>
              <button
                type="button"
                onClick={() => openDayOnSchedule(date)}
                className={cn(
                  'w-full rounded-[14px] border border-[var(--gcal-border)] bg-white px-4 py-3.5 text-left transition-shadow hover:shadow-sm',
                  isToday && 'border-[#93b4f4] shadow-[0_2px_12px_rgba(26,115,232,0.08)]',
                  isPast && 'opacity-55',
                )}
              >
                <div className="mb-2.5">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="text-ui-base font-bold">{format(d, 'EEE, MMM d')}</span>
                    {isToday ? (
                      <span className="rounded-full bg-[#e8f0fe] px-2 py-0.5 text-[11px] font-bold text-[var(--gcal-blue)]">
                        Today
                      </span>
                    ) : null}
                  </div>
                  {meta ? <p className="mt-0.5 text-ui-sm text-[var(--gcal-muted)]">{meta}</p> : null}
                </div>

                {highlights.length > 0 ? (
                  <ul>
                    {highlights.map((ev, i) => {
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
                              'flex w-full items-start gap-2.5 py-1.5 text-left',
                              i > 0 && 'border-t border-[#f1f3f4]',
                              isEventPast(ev) && 'opacity-70',
                            )}
                          >
                            <span
                              className="mt-1.5 size-2 shrink-0 rounded-full"
                              style={{ background: cat.border }}
                            />
                            <span className="w-11 shrink-0 tabular-nums text-ui-sm text-[var(--gcal-muted)]">
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
                      <li className="border-t border-[#f1f3f4] pt-1.5 pl-[62px] text-ui-sm text-[var(--gcal-muted)]">
                        +{dayEvents.length - 3} more
                      </li>
                    ) : null}
                  </ul>
                ) : (
                  <p className="text-ui-sm text-[var(--gcal-muted)]">Nothing planned</p>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
