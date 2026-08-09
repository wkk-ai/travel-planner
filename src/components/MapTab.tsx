import { format } from 'date-fns'
import { ExternalLink, MapPin, Navigation } from 'lucide-react'
import { useMemo } from 'react'
import { CATEGORIES, eventColors } from '../data/categories'
import { dayRouteStops, openGoogleMapsRoute, stopDisplayLabel, stopUsesMapsPin } from '../lib/googleMapsRoute'
import { isoDate, tripDaysIncludingEvents } from '../lib/time'
import { useTripStore } from '../store/tripStore'
import type { TripEvent } from '../types'

function RoutePreview({ count }: { count: number }) {
  if (count === 0) return null
  const dots = Math.min(count, 6)
  return (
    <div
      className="relative flex h-28 items-center justify-center overflow-hidden rounded-2xl border border-[#c2d7f7] bg-gradient-to-br from-[#e8f0fe] via-[#f0f7ff] to-[#e6f4ea]"
      aria-hidden
    >
      <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 320 112">
        <path
          d="M40 80 Q120 20 200 60 T 280 40"
          fill="none"
          stroke="#1a73e8"
          strokeWidth="2"
          strokeDasharray="6 4"
        />
      </svg>
      <div className="relative flex items-center gap-3">
        {Array.from({ length: dots }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="flex size-8 items-center justify-center rounded-full bg-white text-sm font-bold text-[var(--gcal-blue)] shadow-sm ring-2 ring-[#c2d7f7]">
              {i + 1}
            </span>
          </div>
        ))}
        {count > 6 ? (
          <span className="text-xs font-semibold text-[var(--gcal-muted)]">+{count - 6}</span>
        ) : null}
      </div>
    </div>
  )
}

function StopRow({
  index,
  event,
  onSelect,
}: {
  index: number
  event: TripEvent
  onSelect: (id: string) => void
}) {
  const colors = eventColors(event.category, event.color)
  const mapsLink = event.mapsUrl.trim()
  const placeLabel = stopDisplayLabel(event)
  const pinned = stopUsesMapsPin(event)

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(event.id)}
        className="flex w-full items-start gap-3 rounded-xl border border-[var(--gcal-border)] bg-white px-3 py-3 text-left shadow-sm transition-shadow hover:shadow-md"
      >
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ background: colors.border }}
        >
          {index}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-ui-sm font-bold tabular-nums text-[var(--gcal-muted)]">
              {event.startTime}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: colors.bg, color: colors.color }}
            >
              {CATEGORIES[event.category].label}
            </span>
          </span>
          <span className="mt-0.5 block text-ui-base font-semibold text-[var(--gcal-text)]">
            {event.title}
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-ui-sm text-[var(--gcal-muted)]">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{placeLabel}</span>
          </span>
          {pinned ? (
            <span className="mt-0.5 block text-[10px] font-semibold text-[var(--gcal-blue)]">
              Pinned via Google Maps link
            </span>
          ) : null}
        </span>
        {mapsLink ? (
          <a
            href={mapsLink}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--gcal-border)] hover:bg-[var(--gcal-bg)]"
            aria-label="Open place in maps"
          >
            <ExternalLink className="size-4 text-[var(--gcal-blue)]" />
          </a>
        ) : null}
      </button>
    </li>
  )
}

export function MapTab() {
  const trip = useTripStore((s) => s.trip)!
  const events = useTripStore((s) => s.events)
  const selectedDate = useTripStore((s) => s.selectedDate)
  const selectEvent = useTripStore((s) => s.selectEvent)
  const searchQuery = useTripStore((s) => s.searchQuery)

  const days = tripDaysIncludingEvents(trip.startDate, trip.endDate, events)

  const dayEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return events
      .filter((e) => e.date === selectedDate)
      .filter((e) => {
        if (!q) return true
        return (
          e.title.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          e.category.includes(q)
        )
      })
  }, [events, selectedDate, searchQuery])

  const stops = useMemo(() => dayRouteStops(dayEvents), [dayEvents])
  const noLocation = dayEvents.filter((e) => !stops.some((s) => s.event.id === e.id))
  const selectedDay = days.find((d) => isoDate(d) === selectedDate) ?? days[0]

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 pb-24">
      <header className="mb-4">
        <h1 className="text-ui-xl font-bold text-[var(--gcal-text)]">Map</h1>
        <p className="mt-0.5 text-ui-sm text-[var(--gcal-muted)]">
          {selectedDay ? format(selectedDay, 'EEEE, MMM d') : 'Pick a day above'} · uses Maps links first
        </p>
      </header>

      <div className="mb-5 space-y-3">
        <RoutePreview count={stops.length} />
        <div className="flex flex-wrap gap-2">
          <div className="rounded-full bg-white px-3 py-1.5 text-ui-sm font-semibold shadow-sm ring-1 ring-[var(--gcal-border)]">
            {stops.length} mapped stop{stops.length === 1 ? '' : 's'}
          </div>
          {dayEvents.length > stops.length ? (
            <div className="rounded-full bg-[#fef7e0] px-3 py-1.5 text-ui-sm font-semibold text-[#8a5a00]">
              {dayEvents.length - stops.length} without place
            </div>
          ) : null}
        </div>
        {stops.length > 0 ? (
          <button
            type="button"
            onClick={() => openGoogleMapsRoute(stops.map((s) => s.query))}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--gcal-blue)] py-3.5 text-ui-base font-semibold text-white shadow-md hover:bg-[var(--gcal-blue-hover)]"
          >
            <Navigation className="size-5" />
            Open route in Google Maps
          </button>
        ) : null}
      </div>

      {stops.length > 0 ? (
        <section>
          <h2 className="mb-2 text-ui-sm font-bold uppercase tracking-wide text-[var(--gcal-muted)]">
            Route
          </h2>
          <ul className="space-y-2">
            {stops.map((stop, i) => (
              <StopRow
                key={stop.event.id}
                index={i + 1}
                event={stop.event}
                onSelect={selectEvent}
              />
            ))}
          </ul>
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--gcal-border)] bg-white px-6 py-12 text-center">
          <MapPin className="mx-auto size-10 text-[var(--gcal-muted)]/40" />
          <p className="mt-3 text-ui-base font-semibold text-[var(--gcal-text)]">No places for this day</p>
          <p className="mt-1 text-ui-sm text-[var(--gcal-muted)]">
            Add a Google Maps link on events — routes use the pin, not just the name.
          </p>
        </div>
      )}

      {noLocation.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-2 text-ui-sm font-bold uppercase tracking-wide text-[var(--gcal-muted)]">
            No location set
          </h2>
          <ul className="space-y-1.5">
            {noLocation.map((ev) => (
              <li key={ev.id}>
                <button
                  type="button"
                  onClick={() => selectEvent(ev.id)}
                  className="flex w-full items-center gap-2 rounded-xl border border-[var(--gcal-border)] bg-[var(--gcal-bg)] px-3 py-2 text-left text-ui-sm"
                >
                  <span className="tabular-nums text-[var(--gcal-muted)]">{ev.startTime}</span>
                  <span className="font-medium">{ev.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
