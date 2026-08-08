import { format, isToday } from 'date-fns'
import { useTripStore } from '../store/tripStore'
import type { TripEvent } from '../types'
import { currentEventAt, isoDate, tripDaysIncludingEvents, cn } from '../lib/time'
import { DayColumn, TimeGutter } from './DayColumn'

interface Props {
  events: TripEvent[]
  warnings: { eventId: string; message: string }[]
  onSelect: (e: TripEvent) => void
}

export function WeekGrid({ events, warnings, onSelect }: Props) {
  const trip = useTripStore((s) => s.trip)!
  const allEvents = useTripStore((s) => s.events)
  const selectedDate = useTripStore((s) => s.selectedDate)
  const setSelectedDate = useTripStore((s) => s.setSelectedDate)
  const setView = useTripStore((s) => s.setView)
  const days = tripDaysIncludingEvents(trip.startDate, trip.endDate, allEvents)
  const nowEv = currentEventAt(events)

  return (
    <div className="min-w-max">
      <div className="sticky top-0 z-30 flex border-b border-[var(--gcal-border)] bg-white/95 backdrop-blur">
        <div className="w-14 shrink-0 border-r border-[var(--gcal-border)]" />
        {days.map((d) => {
          const iso = isoDate(d)
          const today = isToday(d)
          const selected = iso === selectedDate
          return (
            <button
              key={iso}
              type="button"
              onClick={() => {
                setSelectedDate(iso)
                setView('day')
              }}
              className={cn(
                'min-w-[140px] flex-1 border-r border-[var(--gcal-border)] px-2 py-2 text-center transition-colors',
                today && 'bg-[#e8f0fe]',
                selected && 'bg-[#d2e3fc]',
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
