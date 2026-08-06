import { useMemo } from 'react'
import { format, isToday, parseISO } from 'date-fns'
import { useDroppable } from '@dnd-kit/core'
import { useTripStore } from '../store/tripStore'
import type { TripEvent } from '../types'
import {
  GRID_END,
  GRID_START,
  HOUR_HEIGHT,
  currentEventAt,
  eventHeightPx,
  eventTopPx,
  cn,
} from '../lib/time'
import { EventChip } from './EventChip'

interface Props {
  events: TripEvent[]
  warnings: { eventId: string; message: string }[]
  onSelect: (e: TripEvent) => void
}

export function DayGrid({ events, warnings, onSelect }: Props) {
  const selectedDate = useTripStore((s) => s.selectedDate)
  const mode = useTripStore((s) => s.mode)
  const hours = useMemo(
    () => Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i),
    [],
  )
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
        <div className="w-14 shrink-0 border-r border-[var(--gcal-border)]">
          {hours.map((h) => (
            <div
              key={h}
              className="relative text-right text-[10px] text-[var(--gcal-muted)]"
              style={{ height: HOUR_HEIGHT }}
            >
              <span className="absolute -top-2 right-2">
                {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
              </span>
            </div>
          ))}
        </div>
        <div className="relative min-h-0 flex-1">
          {hours.map((h) => (
            <HourSlot
              key={h}
              date={selectedDate}
              hour={h}
              editable={mode === 'edit'}
            />
          ))}
          {today ? (
            <div
              className="now-line"
              style={{
                top: eventTopPx(
                  `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
                ),
              }}
            />
          ) : null}
          {dayEvents.map((ev) => (
            <EventChip
              key={ev.id}
              event={ev}
              draggable={mode === 'edit'}
              isNow={ev.id === nowEv?.id}
              warning={warnings.find((w) => w.eventId === ev.id)?.message}
              onClick={() => onSelect(ev)}
              style={{
                top: eventTopPx(ev.startTime),
                height: eventHeightPx(ev.startTime, ev.endTime),
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function HourSlot({
  date,
  hour,
  editable,
}: {
  date: string
  hour: number
  editable: boolean
}) {
  const time = `${String(hour).padStart(2, '0')}:00`
  const { setNodeRef, isOver } = useDroppable({
    id: `slot:${date}:${time}`,
    disabled: !editable,
  })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'border-b border-[var(--gcal-border)]/70',
        isOver && 'bg-[#e8f0fe]',
      )}
      style={{ height: HOUR_HEIGHT }}
    />
  )
}
