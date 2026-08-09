import { useState } from 'react'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { Calendar, ChevronDown, ChevronUp, Plus } from 'lucide-react'
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
import { storyStripeGiantStyle } from '../lib/storyCardStyle'
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

function uniqueStops(events: TripEvent[]): number {
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

function StoryDayCard({
  date,
  proximityIndex,
  allDays,
  totalDays,
  today,
  countdown,
  dayEvents,
  onOpenDay,
  onSelectEvent,
  muted,
}: {
  date: string
  proximityIndex: number
  allDays: Date[]
  totalDays: number
  today: string
  countdown: number
  dayEvents: TripEvent[]
  onOpenDay: (date: string) => void
  onSelectEvent: (id: string) => void
  muted?: boolean
}) {
  const d = parseISO(date)
  const dayNumber = allDays.findIndex((x) => isoDate(x) === date) + 1
  const place = dayPlace(dayEvents)
  const vibe = dayVibe(dayEvents, dayNumber - 1, totalDays)
  const highlights = [...dayEvents].sort((a, b) => a.startTime.localeCompare(b.startTime)).slice(0, 3)
  const isToday = date === today
  const meta = [place, vibe].filter(Boolean).join(' · ')
  const { stripe, numColumn } = storyStripeGiantStyle(proximityIndex)
  const daysUntilDay = differenceInCalendarDays(parseISO(date), parseISO(today))

  return (
    <li>
      <article
        className={cn(
          'flex overflow-hidden rounded-[14px] border border-[var(--gcal-border)] bg-white shadow-sm transition-shadow hover:shadow-md',
          isToday && 'ring-2 ring-[var(--gcal-blue)]/25',
          muted && 'opacity-90',
        )}
      >
        <div className="w-1.5 shrink-0" style={{ background: stripe }} aria-hidden />
        <div
          className="flex w-[54px] shrink-0 flex-col items-center border-r border-[#f1f3f4] px-1.5 py-3.5"
          style={{ background: numColumn }}
        >
          <span className="text-[26px] font-extrabold leading-none text-[#0d47a1]">{format(d, 'd')}</span>
          <span className="mt-1 text-[9px] font-bold uppercase tracking-wide text-[var(--gcal-blue)]">
            {format(d, 'MMM')}
          </span>
        </div>
        <div className="min-w-0 flex-1 px-3.5 py-3">
          <button type="button" onClick={() => onOpenDay(date)} className="w-full text-left">
            <h4 className="text-ui-base font-bold text-[var(--gcal-text)]">
              {format(d, 'EEEE')}
              {isToday ? (
                <span className="ml-1.5 text-[11px] font-bold text-[var(--gcal-blue)]">· Today</span>
              ) : daysUntilDay === 1 ? (
                <span className="ml-1.5 text-[11px] font-bold text-[var(--gcal-blue)]">· Tomorrow</span>
              ) : countdown > 0 && daysUntilDay > 0 ? (
                <span className="ml-1.5 text-[11px] font-bold text-[var(--gcal-blue)]">
                  · in {daysUntilDay}d
                </span>
              ) : muted && daysUntilDay < 0 ? (
                <span className="ml-1.5 text-[11px] font-medium text-[var(--gcal-muted)]">
                  · {Math.abs(daysUntilDay)}d ago
                </span>
              ) : null}
            </h4>
            {meta ? <p className="mt-0.5 text-ui-sm text-[var(--gcal-muted)]">{meta}</p> : null}
          </button>
          {highlights.length > 0 ? (
            <ul className="mt-2.5">
              {highlights.map((ev, i) => {
                const cat = CATEGORIES[ev.category]
                const backups = backupCount(ev)
                return (
                  <li key={ev.id}>
                    <button
                      type="button"
                      onClick={() => onSelectEvent(ev.id)}
                      className={cn(
                        'flex w-full items-start gap-2 py-1.5 text-left',
                        i > 0 && 'border-t border-[#f1f3f4]',
                        isEventPast(ev) && 'opacity-75',
                      )}
                    >
                      <span
                        className="mt-1.5 size-[7px] shrink-0 rounded-full"
                        style={{ background: cat.border }}
                        aria-hidden
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
                <button
                  type="button"
                  onClick={() => onOpenDay(date)}
                  className="mt-1.5 text-ui-sm font-semibold text-[var(--gcal-blue)]"
                >
                  +{dayEvents.length - 3} more
                </button>
              ) : null}
            </ul>
          ) : (
            <p className="mt-2 text-ui-sm text-[var(--gcal-muted)]">Nothing planned</p>
          )}
        </div>
      </article>
    </li>
  )
}

export function StoryTab() {
  const trip = useTripStore((s) => s.trip)!
  const events = useTripStore((s) => s.events)
  const mode = useTripStore((s) => s.mode)
  const setActiveTab = useTripStore((s) => s.setActiveTab)
  const setSelectedDate = useTripStore((s) => s.setSelectedDate)
  const setView = useTripStore((s) => s.setView)
  const selectEvent = useTripStore((s) => s.selectEvent)
  const setPanel = useTripStore((s) => s.setPanel)
  const searchQuery = useTripStore((s) => s.searchQuery)
  const setSearchQuery = useTripStore((s) => s.setSearchQuery)
  const categoryFilter = useTripStore((s) => s.categoryFilter)
  const setCategoryFilter = useTripStore((s) => s.setCategoryFilter)
  const [showPast, setShowPast] = useState(false)

  const today = isoDate(new Date())
  const calendar = tripCalendarBounds(trip.startDate, trip.endDate, events)
  const allDays = tripDaysIncludingEvents(trip.startDate, trip.endDate, events)
  const totalDays = allDays.length
  const countdown = daysUntil(trip.startDate)
  const nowEvent = currentEventAt(events)
  const stopCount = uniqueStops(events)
  const tripEnded = today > calendar.endDate

  const tripStatus =
    countdown > 0
      ? `${countdown} days until you go`
      : countdown === 0
        ? 'Trip starts today'
        : tripEnded
          ? 'Trip complete'
          : `Day ${Math.abs(countdown) + 1} of ${totalDays}`

  function openDayOnSchedule(date: string) {
    setSelectedDate(date)
    setView('day')
    setActiveTab('schedule')
  }

  const q = searchQuery.trim().toLowerCase()

  function eventsForDay(date: string) {
    let dayEvents = events.filter((e) => e.date === date)
    if (categoryFilter !== 'all') {
      dayEvents = dayEvents.filter((e) => e.category === categoryFilter)
    }
    if (!q) return dayEvents
    return dayEvents.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q),
    )
  }

  const filterActive = Boolean(q) || categoryFilter !== 'all'

  const upcomingDays = allDays
    .map((d) => isoDate(d))
    .filter((date) => date >= today)
    .filter((date) => !filterActive || eventsForDay(date).length > 0)
    .sort()

  const proximity = new Map(upcomingDays.map((d, i) => [d, i]))
  const onTrip = countdown <= 0 && !tripEnded
  const pastDays = allDays
    .map((d) => isoDate(d))
    .filter((date) => date < today)
    .filter((date) => !filterActive || eventsForDay(date).length > 0)
    .sort()
    .reverse()

  const stats =
    countdown > 0
      ? [
          { value: countdown, label: 'Until trip', highlight: true },
          { value: totalDays, label: 'Trip days', highlight: false },
          { value: events.length, label: 'Events', highlight: false },
        ]
      : tripEnded
        ? [
            { value: totalDays, label: 'Days', highlight: false },
            { value: events.length, label: 'Events', highlight: false },
            { value: stopCount, label: 'Stops', highlight: false },
          ]
        : [
            { value: Math.abs(countdown) + 1, label: 'Day now', highlight: true },
            { value: events.length, label: 'Events', highlight: false },
            { value: stopCount, label: 'Stops', highlight: false },
          ]

  return (
    <div className="story-tab mx-auto max-w-2xl px-4 py-5 pb-28 sm:px-6 sm:py-6 sm:pb-12">
      <header className="mb-4">
        <p className="text-ui-sm text-[var(--gcal-muted)]">
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
        {stats.map((s) => (
          <div
            key={s.label}
            className={cn(
              'flex-1 rounded-[10px] border border-[var(--gcal-border)] bg-white px-3 py-2.5 text-center',
              s.highlight && 'border-[#c2d7f7] bg-[#e8f0fe]',
            )}
          >
            <div
              className={cn(
                'text-ui-lg font-bold tabular-nums',
                s.highlight ? 'text-[var(--gcal-blue)]' : 'text-[var(--gcal-text)]',
              )}
            >
              {s.value}
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--gcal-muted)]">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-ui-sm font-semibold text-[var(--gcal-text)]">Upcoming days</h3>
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className="text-ui-sm font-semibold text-[var(--gcal-blue)] hover:underline"
        >
          Full schedule
        </button>
      </div>

      {upcomingDays.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-[var(--gcal-border)] bg-white px-6 py-10 text-center">
          <Calendar className="mx-auto size-10 text-[var(--gcal-muted)]" />
          <p className="mt-3 text-ui-base font-semibold text-[var(--gcal-text)]">
            {filterActive
              ? 'No matching days'
              : tripEnded
                ? 'Trip complete'
                : 'No upcoming days'}
          </p>
          <p className="mt-1 text-ui-sm text-[var(--gcal-muted)]">
            {filterActive
              ? 'Try a different search or category filter.'
              : tripEnded
                ? 'Past days live in your full schedule.'
                : 'Add events or extend trip dates in trip settings.'}
          </p>
          {filterActive ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setCategoryFilter('all')
              }}
              className="mt-4 text-ui-sm font-semibold text-[var(--gcal-blue)] hover:underline"
            >
              Clear filters
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className="mt-4 text-ui-sm font-semibold text-[var(--gcal-blue)] hover:underline"
            >
              Open schedule
            </button>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {upcomingDays.map((date) => (
            <StoryDayCard
              key={date}
              date={date}
              proximityIndex={proximity.get(date) ?? 0}
              allDays={allDays}
              totalDays={totalDays}
              today={today}
              countdown={countdown}
              dayEvents={eventsForDay(date)}
              onOpenDay={openDayOnSchedule}
              onSelectEvent={selectEvent}
            />
          ))}
        </ul>
      )}

      {onTrip && pastDays.length > 0 ? (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowPast(!showPast)}
            className="mb-2.5 flex w-full items-center justify-between text-ui-sm font-semibold text-[var(--gcal-text)]"
          >
            <span>Earlier ({pastDays.length} day{pastDays.length === 1 ? '' : 's'})</span>
            {showPast ? <ChevronUp className="size-4 text-[var(--gcal-muted)]" /> : <ChevronDown className="size-4 text-[var(--gcal-muted)]" />}
          </button>
          {showPast ? (
            <ul className="flex flex-col gap-2.5">
              {pastDays.map((date, i) => (
                <StoryDayCard
                  key={date}
                  date={date}
                  proximityIndex={Math.min(i + upcomingDays.length, 7)}
                  allDays={allDays}
                  totalDays={totalDays}
                  today={today}
                  countdown={countdown}
                  dayEvents={eventsForDay(date)}
                  onOpenDay={openDayOnSchedule}
                  onSelectEvent={selectEvent}
                  muted
                />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {mode === 'edit' && events.length === 0 ? (
        <button
          type="button"
          onClick={() => setPanel('settings')}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#93b4f4] bg-[#e8f0fe]/50 py-3 text-ui-sm font-semibold text-[var(--gcal-blue)]"
        >
          <Plus className="size-4" />
          Set trip dates & add events
        </button>
      ) : null}
    </div>
  )
}
