import { useDroppable } from '@dnd-kit/core'
import { useMemo } from 'react'
import { format, isToday, parseISO } from 'date-fns'
import { useTripStore } from '../store/tripStore'
import type { TripEvent } from '../types'
import {
  GRID_END,
  GRID_START,
  HOUR_HEIGHT,
  currentEventAt,
  eventHeightPx,
  eventTopPx,
  isoDate,
  tripDays,
} from '../lib/time'
import { EventChip } from './EventChip'
import { cn } from '../lib/time'

interface Props {
  events: TripEvent[]
  warnings: { eventId: string; message: string }[]
  onSelect: (e: TripEvent) => void
}

function DayColumn({
  date,
  events,
  warnings,
  onSelect,
  nowEventId,
}: {
  date: string
  events: TripEvent[]
  warnings: { eventId: string; message: string }[]
  onSelect: (e: TripEvent) => void
  nowEventId: string | null
}) {
  const mode = useTripStore((s) => s.mode)
  const hours = useMemo(
    () => Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i),
    [],
  )
  const d = parseISO(date)
  const today = isToday(d)

  return (
    <div className="relative min-w-[140px] flex-1 border-r border-[var(--gcal-border)]">
      {hours.map((h) => (
        <HourSlot key={h} date={date} hour={h} editable={mode === 'edit'} />
      ))}
      {today ? <NowLine /> : null}
      {events.map((ev) => {
        const warn = warnings.find((w) => w.eventId === ev.id)?.message
        return (
          <EventChip
            key={ev.id}
            event={ev}
            draggable={mode === 'edit'}
            isNow={ev.id === nowEventId}
            warning={warn}
            onClick={() => onSelect(ev)}
            style={{
              top: eventTopPx(ev.startTime),
              height: eventHeightPx(ev.startTime, ev.endTime),
            }}
          />
        )
      })}
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

function NowLine() {
  const top = eventTopPx(
    `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
  )
  return <div className="now-line" style={{ top }} />
}

export function WeekGrid({ events, warnings, onSelect }: Props) {
  const trip = useTripStore((s) => s.trip)!
  const selectedDate = useTripStore((s) => s.selectedDate)
  const setSelectedDate = useTripStore((s) => s.setSelectedDate)
  const setView = useTripStore((s) => s.setView)
  const days = tripDays(trip.startDate, trip.endDate)
  const hours = useMemo(
    () => Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i),
    [],
  )
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
        <div className="w-14 shrink-0 border-r border-[var(--gcal-border)] bg-white">
          {hours.map((h) => (
            <div
              key={h}
              className="relative border-b border-transparent text-right text-[10px] text-[var(--gcal-muted)]"
              style={{ height: HOUR_HEIGHT }}
            >
              <span className="absolute -top-2 right-2">
                {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
              </span>
            </div>
          ))}
        </div>
        {days.map((d) => {
          const iso = isoDate(d)
          const dayEvents = events.filter((e) => e.date === iso)
          return (
            <DayColumn
              key={iso}
              date={iso}
              events={dayEvents}
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
