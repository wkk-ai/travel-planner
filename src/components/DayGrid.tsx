import { format, isToday, parseISO } from 'date-fns'
import { useTripStore } from '../store/tripStore'
import type { TripEvent } from '../types'
import { currentEventAt, cn } from '../lib/time'
import { DayColumn, TimeGutter } from './DayColumn'

interface Props {
  events: TripEvent[]
  warnings: { eventId: string; message: string }[]
  onSelect: (e: TripEvent) => void
}

export function DayGrid({ events, warnings, onSelect }: Props) {
  const selectedDate = useTripStore((s) => s.selectedDate)
  const dayEvents = events.filter((e) => e.date === selectedDate)
  const d = parseISO(selectedDate)
  const today = isToday(d)
  const nowEv = currentEventAt(events)

  return (
    <div>
      <div className="sticky top-0 z-30 border-b border-[var(--gcal-border)] bg-white/95 px-4 py-3 backdrop-blur">
        <div className="text-[11px] font-semibold tracking-wide text-[var(--gcal-muted)]">
          {format(d, 'EEEE').toUpperCase()}
        </div>
        <div className="mt-1 flex items-center gap-3">
          <div
            className={cn(
              'flex size-12 items-center justify-center rounded-full text-2xl font-semibold',
              today && 'bg-[var(--gcal-blue)] text-white',
            )}
          >
            {format(d, 'd')}
          </div>
          <div>
            <div className="brand-serif text-2xl">{format(d, 'MMMM yyyy')}</div>
            <div className="text-sm text-[var(--gcal-muted)]">{dayEvents.length} events</div>
          </div>
        </div>
      </div>

      <div className="flex">
        <TimeGutter />
        <DayColumn
          date={selectedDate}
          events={dayEvents}
          warnings={warnings}
          onSelect={onSelect}
          nowEventId={nowEv?.id ?? null}
        />
      </div>
    </div>
  )
}
