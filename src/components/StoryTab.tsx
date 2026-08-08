import { format, parseISO } from 'date-fns'
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  MapPin,
  Plane,
  Sparkles,
} from 'lucide-react'
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
import type { EventCategory, TripEvent } from '../types'

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
  if (cats.has('flight')) return 'Travel day'
  if (cats.has('hotel') && dayIndex <= 1) return 'Arrival'
  if (cats.has('attraction') || cats.has('show')) return 'Explore'
  if (cats.has('shopping')) return 'Free time'
  if (events.length === 0) return 'Open day'
  return 'On the trip'
}

function formatEventTime(ev: TripEvent): string {
  if (ev.category === 'flight' && ev.flight?.departLocal) return ev.flight.departLocal
  return ev.startTime
}

interface DayCardProps {
  date: string
  dayNumber: number
  totalDays: number
  events: TripEvent[]
  isToday: boolean
  isPast: boolean
  onOpenSchedule: () => void
  onSelectEvent: (id: string) => void
}

function DayCard({
  date,
  dayNumber,
  totalDays,
  events,
  isToday,
  isPast,
  onOpenSchedule,
  onSelectEvent,
}: DayCardProps) {
  const d = parseISO(date)
  const place = dayPlace(events)
  const vibe = dayVibe(events, dayNumber - 1, totalDays)
  const highlights = [...events]
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .slice(0, 5)
  const catCounts = events.reduce(
    (acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + 1
      return acc
    },
    {} as Partial<Record<EventCategory, number>>,
  )

  return (
    <article
      className={cn(
        'story-day-card rounded-2xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md',
        isToday && 'border-[var(--gcal-blue)] ring-2 ring-[#e8f0fe]',
        isPast && !isToday && 'opacity-75',
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gcal-muted)]">
              Day {dayNumber}
            </span>
            {isToday ? (
              <span className="rounded-full bg-[var(--gcal-blue)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Today
              </span>
            ) : null}
            <span className="rounded-full bg-[var(--gcal-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--gcal-muted)]">
              {vibe}
            </span>
          </div>
          <h3 className="brand-serif mt-1 text-xl leading-tight">
            {format(d, 'EEEE, MMM d')}
          </h3>
          {place ? (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-[var(--gcal-muted)]">
              <MapPin className="size-3.5 shrink-0" />
              {place}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onOpenSchedule}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-[var(--gcal-border)] px-2.5 py-1 text-xs font-medium text-[var(--gcal-blue)] hover:bg-[#e8f0fe]"
        >
          Schedule
          <ChevronRight className="size-3.5" />
        </button>
      </div>

      {highlights.length ? (
        <ul className="space-y-1.5">
          {highlights.map((ev) => {
            const cat = CATEGORIES[ev.category]
            const past = isEventPast(ev)
            const backups = backupCount(ev)
            return (
              <li key={ev.id}>
                <button
                  type="button"
                  onClick={() => onSelectEvent(ev.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-[var(--gcal-bg)]',
                    past && 'opacity-60',
                  )}
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: cat.border }}
                  />
                  <span className="w-12 shrink-0 tabular-nums text-xs text-[var(--gcal-muted)]">
                    {formatEventTime(ev)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{ev.title}</span>
                    {backups > 0 ? (
                      <span className="block text-[10px] text-[var(--gcal-muted)]">
                        or {backups} other plan{backups > 1 ? 's' : ''}
                      </span>
                    ) : null}
                  </span>
                  {ev.category === 'flight' ? (
                    <Plane className="size-3.5 shrink-0 text-[var(--gcal-muted)]" />
                  ) : null}
                </button>
              </li>
            )
          })}
          {events.length > 5 ? (
            <li className="px-2 text-xs text-[var(--gcal-muted)]">
              +{events.length - 5} more on schedule
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="rounded-xl bg-[var(--gcal-bg)] px-3 py-2 text-sm text-[var(--gcal-muted)]">
          Nothing planned yet — open schedule to add events.
        </p>
      )}

      {events.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {(Object.entries(catCounts) as [EventCategory, number][]).map(([cat, n]) => (
            <span
              key={cat}
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                background: CATEGORIES[cat].bg,
                color: CATEGORIES[cat].color,
              }}
            >
              {n} {CATEGORIES[cat].label.toLowerCase()}
              {n > 1 ? 's' : ''}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  )
}

export function StoryTab() {
  const trip = useTripStore((s) => s.trip)!
  const events = useTripStore((s) => s.events)
  const checklist = useTripStore((s) => s.checklist)
  const expenses = useTripStore((s) => s.expenses)
  const setActiveTab = useTripStore((s) => s.setActiveTab)
  const setSelectedDate = useTripStore((s) => s.setSelectedDate)
  const setView = useTripStore((s) => s.setView)
  const selectEvent = useTripStore((s) => s.selectEvent)

  const today = isoDate(new Date())
  const days = tripDays(trip.startDate, trip.endDate)
  const totalDays = days.length
  const countdown = daysUntil(trip.startDate)
  const nowEvent = currentEventAt(events)
  const openChecklist = checklist.filter((c) => !c.done).length
  const spentCents = expenses.reduce((s, e) => s + e.amountCents, 0)
  const plannedCents = events.reduce((s, e) => s + e.budgetCents, 0)

  const tripStatus =
    countdown > 0
      ? `${countdown} day${countdown === 1 ? '' : 's'} until you go`
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
    <div className="story-tab mx-auto max-w-3xl space-y-5 p-4 pb-10 sm:p-6">
      <header className="story-hero rounded-2xl bg-gradient-to-br from-[#e8f0fe] via-white to-[#e6f4ea] p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/80 text-[var(--gcal-blue)] shadow-sm">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="brand-serif text-2xl leading-tight sm:text-3xl">{trip.name}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-[var(--gcal-muted)]">
              <Calendar className="size-3.5" />
              {format(parseISO(trip.startDate), 'MMM d')} –{' '}
              {format(parseISO(trip.endDate), 'MMM d, yyyy')}
              <span className="text-[var(--gcal-border)]">·</span>
              {totalDays} days
            </p>
            <p className="mt-2 text-sm font-semibold text-[var(--gcal-blue)]">{tripStatus}</p>
          </div>
        </div>

        {nowEvent ? (
          <div className="mt-4 rounded-xl border border-[#c2d7f7] bg-white/70 px-3 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gcal-muted)]">
              Right now
            </div>
            <div className="mt-0.5 font-medium">{nowEvent.title}</div>
            {nowEvent.location ? (
              <div className="text-xs text-[var(--gcal-muted)]">{nowEvent.location}</div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Events" value={String(events.length)} />
          <Stat label="To pack" value={String(openChecklist)} />
          <Stat
            label="Spent"
            value={spentCents ? `$${(spentCents / 100).toFixed(0)}` : '—'}
          />
          <Stat
            label="Budgeted"
            value={plannedCents ? `$${(plannedCents / 100).toFixed(0)}` : '—'}
          />
        </div>
      </header>

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--gcal-muted)]">
          Your days
        </h3>
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--gcal-blue)] hover:underline"
        >
          Full schedule
          <ArrowRight className="size-3.5" />
        </button>
      </div>

      <div className="space-y-4">
        {sortedDays.map((d) => {
          const date = isoDate(d)
          const dayEvents = events.filter((e) => e.date === date)
          const dayNumber = days.findIndex((x) => isoDate(x) === date) + 1
          return (
            <DayCard
              key={date}
              date={date}
              dayNumber={dayNumber}
              totalDays={totalDays}
              events={dayEvents}
              isToday={date === today}
              isPast={date < today}
              onOpenSchedule={() => openDayOnSchedule(date)}
              onSelectEvent={(id) => selectEvent(id)}
            />
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/60 px-3 py-2 text-center">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--gcal-muted)]">
        {label}
      </div>
    </div>
  )
}
