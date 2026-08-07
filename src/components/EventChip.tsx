import type { TripEvent } from '../types'
import { eventColors } from '../data/categories'
import { cn, timeToMinutes } from '../lib/time'
import { useDraggable } from '@dnd-kit/core'
import { Plane, MapPin, AlertTriangle } from 'lucide-react'

interface Props {
  event: TripEvent
  style?: React.CSSProperties
  compact?: boolean
  isNow?: boolean
  warning?: string
  onClick?: () => void
  draggable?: boolean
  isDraft?: boolean
}

function durationMinutes(event: TripEvent): number {
  let start = timeToMinutes(event.startTime)
  let end = timeToMinutes(event.endTime)
  if (end <= start) end += 24 * 60
  return end - start
}

export function EventChip({
  event,
  style,
  compact,
  isNow,
  warning,
  onClick,
  draggable = false,
  isDraft = false,
}: Props) {
  const colors = eventColors(event.category, event.color)
  const short = durationMinutes(event) <= 30
  const dense = compact || short
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
    disabled: !draggable || isDraft,
    data: { event },
  })

  const tip = [
    event.title,
    `${event.startTime}–${event.endTime}`,
    event.location || event.flight
      ? event.flight
        ? `${event.flight.airline ?? ''} ${event.flight.flightNumber ?? ''}`.trim()
        : event.location
      : '',
    warning,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <button
      type="button"
      data-event-chip
      ref={setNodeRef}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      onPointerDown={(e) => {
        // Keep DayColumn from starting create-drag, but still feed dnd-kit.
        e.stopPropagation()
        if (draggable && !isDraft && listeners?.onPointerDown) {
          listeners.onPointerDown(e)
        }
      }}
      className={cn(
        'event-block absolute inset-x-0.5 overflow-hidden rounded-[1px] text-left text-[11px] leading-tight border-l-[3px]',
        short ? 'px-1 py-0' : 'px-1.5 py-0.5',
        isDragging && 'opacity-40',
        isNow && 'is-now',
        isDraft && 'border-2 border-dashed border-[var(--gcal-blue)] opacity-90',
        compact && 'relative left-0 right-0',
      )}
      style={{
        background: colors.bg,
        borderLeftColor: colors.border,
        color: colors.color,
        ...style,
      }}
      title={tip}
    >
      <div className={cn('flex items-center gap-1 font-semibold', short && 'h-full')}>
        {event.category === 'flight' && !short ? <Plane className="mt-0.5 size-3 shrink-0 self-start" /> : null}
        <span className={short ? 'truncate' : 'line-clamp-2'}>{event.title}</span>
        {warning ? <AlertTriangle className="size-3 shrink-0 text-amber-600" /> : null}
      </div>
      {!dense && (event.flight || event.location) ? (
        <div className="mt-0.5 flex items-center gap-1 opacity-80">
          {event.location ? <MapPin className="size-2.5" /> : null}
          <span className="truncate">
            {event.flight
              ? `${event.flight.airline ?? ''} ${event.flight.flightNumber ?? ''}`.trim()
              : event.location}
          </span>
        </div>
      ) : null}
      {!dense ? (
        <div className="mt-0.5 opacity-70">
          {event.startTime}–{event.endTime}
          {isDraft ? ' · draft' : ''}
        </div>
      ) : null}
    </button>
  )
}
