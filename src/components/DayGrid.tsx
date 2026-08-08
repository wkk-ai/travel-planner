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
      <div className="sticky top-0 z-30 border-b border-[var(--gcal-border)] bg-white/95 px-3 py-2 backdrop-blur sm:px-4 sm:py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-bold tracking-wide text-[var(--gcal-muted)] sm:text-[11px]">
            {format(d, 'EEEE').toUpperCase()}
          </div>
          <div className="text-xs text-[var(--gcal-muted)] sm:hidden">{dayEvents.length} events</div>
        </div>
        <div className="mt-0.5 flex items-center gap-2 sm:mt-1 sm:gap-3">
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full text-xl font-semibold sm:size-12 sm:text-2xl',
              today && 'bg-[var(--gcal-blue)] text-white',
            )}
          >
            {format(d, 'd')}
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold sm:brand-serif sm:text-2xl">{format(d, 'MMMM yyyy')}</div>
            <div className="hidden text-sm text-[var(--gcal-muted)] sm:block">{dayEvents.length} events</div>
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
