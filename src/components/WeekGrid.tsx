import { format, isToday } from 'date-fns'
import { useDroppable } from '@dnd-kit/core'
import { useTripStore } from '../store/tripStore'
import type { TripEvent } from '../types'
import { currentEventAt, isoDate, tripDaysIncludingEvents, cn } from '../lib/time'
import { CATEGORIES } from '../data/categories'
import { DayColumn, TimeGutter } from './DayColumn'
import { useIsMobile } from '../lib/useMedia'

interface Props {
  events: TripEvent[]
  warnings: { eventId: string; message: string }[]
  onSelect: (e: TripEvent) => void
}

function WeekDayHeader({
  iso,
  d,
  today,
  selected,
  onSelectDay,
}: {
  iso: string
  d: Date
  today: boolean
  selected: boolean
  onSelectDay: () => void
}) {
  const mode = useTripStore((s) => s.mode)
  const drop = useDroppable({ id: `day|${iso}`, disabled: mode !== 'edit' })

  return (
    <button
      ref={drop.setNodeRef}
      type="button"
      onClick={onSelectDay}
      className={cn(
        'min-w-[140px] flex-1 border-r border-[var(--gcal-border)] px-2 py-2 text-center transition-colors',
        today && 'bg-[#e8f0fe]',
        selected && 'bg-[#d2e3fc]',
        drop.isOver && 'ring-2 ring-inset ring-[var(--gcal-blue)]',
      )}
    >
      <div
        className={cn(
          'text-[11px] font-semibold tracking-wide',
          today ? 'text-[var(--gcal-blue)]' : 'text-[var(--gcal-muted)]',
        )}
      >
        {format(d, 'EEE').toUpperCase()}
      </div>
      <div
        className={cn(
          'mx-auto mt-1 flex size-8 items-center justify-center rounded-full text-xl font-medium',
          today && 'bg-[var(--gcal-blue)] text-white',
        )}
      >
        {format(d, 'd')}
      </div>
      <div className="text-[10px] text-[var(--gcal-muted)]">{format(d, 'dd/MM/yyyy')}</div>
    </button>
  )
}

function MobileWeekOverview({
  days,
  events,
  selectedDate,
  onSelect,
  onOpenDay,
}: {
  days: Date[]
  events: TripEvent[]
  selectedDate: string
  onSelect: (e: TripEvent) => void
  onOpenDay: (iso: string) => void
}) {
  return (
    <div className="divide-y divide-[var(--gcal-border)] bg-white">
      {days.map((d) => {
        const iso = isoDate(d)
        const today = isToday(d)
        const selected = iso === selectedDate
        const dayEvents = events
          .filter((e) => e.date === iso)
          .sort((a, b) => a.startTime.localeCompare(b.startTime))

        return (
          <section key={iso} className={cn(selected && 'bg-[#f8fbff]')}>
            <button
              type="button"
              onClick={() => onOpenDay(iso)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <div
                className={cn(
                  'flex size-10 shrink-0 flex-col items-center justify-center rounded-xl text-center',
                  today ? 'bg-[var(--gcal-blue)] text-white' : 'bg-[var(--gcal-bg)] text-[var(--gcal-text)]',
                )}
              >
                <span className="text-[9px] font-bold uppercase opacity-90">{format(d, 'EEE')}</span>
                <span className="text-ui-base font-bold leading-none">{format(d, 'd')}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-ui-base font-semibold">{format(d, 'EEEE, MMM d')}</div>
                <div className="text-ui-sm text-[var(--gcal-muted)]">
                  {dayEvents.length === 0
                    ? 'Nothing planned'
                    : `${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}`}
                </div>
              </div>
              <span className="text-ui-sm font-semibold text-[var(--gcal-blue)]">Open</span>
            </button>
            {dayEvents.length > 0 ? (
              <ul className="border-t border-[var(--gcal-border)]/60 px-4 pb-3">
                {dayEvents.slice(0, 5).map((ev) => {
                  const cat = CATEGORIES[ev.category]
                  return (
                    <li key={ev.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(ev)}
                        className="flex w-full items-center gap-2 py-2 text-left"
                      >
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ background: cat.border }}
                          aria-hidden
                        />
                        <span className="w-11 shrink-0 tabular-nums text-ui-sm text-[var(--gcal-muted)]">
                          {ev.startTime}
                        </span>
                        <span className="truncate text-ui-sm font-medium">{ev.title}</span>
                      </button>
                    </li>
                  )
                })}
                {dayEvents.length > 5 ? (
                  <li className="pt-1 text-ui-sm font-semibold text-[var(--gcal-blue)]">
                    +{dayEvents.length - 5} more — open day
                  </li>
                ) : null}
              </ul>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}

export function WeekGrid({ events, warnings, onSelect }: Props) {
  const trip = useTripStore((s) => s.trip)!
  const allEvents = useTripStore((s) => s.events)
  const selectedDate = useTripStore((s) => s.selectedDate)
  const setSelectedDate = useTripStore((s) => s.setSelectedDate)
  const setView = useTripStore((s) => s.setView)
  const isMobile = useIsMobile()
  const days = tripDaysIncludingEvents(trip.startDate, trip.endDate, allEvents)
  const nowEv = currentEventAt(events)

  if (isMobile) {
    return (
      <MobileWeekOverview
        days={days}
        events={events}
        selectedDate={selectedDate}
        onSelect={onSelect}
        onOpenDay={(iso) => {
          setSelectedDate(iso)
          setView('day')
        }}
      />
    )
  }

  return (
    <div className="min-w-max">
      <div className="sticky top-0 z-30 flex border-b border-[var(--gcal-border)] bg-white/95 backdrop-blur">
        <div className="w-14 shrink-0 border-r border-[var(--gcal-border)]" />
        {days.map((d) => {
          const iso = isoDate(d)
          const today = isToday(d)
          const selected = iso === selectedDate
          return (
            <WeekDayHeader
              key={iso}
              iso={iso}
              d={d}
              today={today}
              selected={selected}
              onSelectDay={() => {
                setSelectedDate(iso)
                setView('day')
              }}
            />
          )
        })}
      </div>

      <div className="flex">
        <TimeGutter />
        {days.map((d) => {
          const iso = isoDate(d)
          return (
            <DayColumn
              key={iso}
              date={iso}
              className="min-w-[140px]"
              events={events.filter((e) => e.date === iso)}
              warnings={warnings}
              onSelect={onSelect}
              nowEventId={nowEv?.id ?? null}
            />
          )
        })}
      </div>
    </div>
  )
}
