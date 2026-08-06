import type { TripEvent } from '../types'
import { eventColors } from '../data/categories'
import { cn } from '../lib/time'
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
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
    disabled: !draggable || isDraft,
    data: { event },
  })

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
        'event-block absolute left-1 right-1 overflow-hidden rounded-md border-l-4 px-1.5 py-0.5 text-left text-[11px] leading-tight shadow-sm',
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
      title={warning ? `${event.title} — ${warning}` : event.title}
    >
      <div className="flex items-start gap-1 font-semibold">
        {event.category === 'flight' ? <Plane className="mt-0.5 size-3 shrink-0" /> : null}
        <span className="line-clamp-2">{event.title}</span>
        {warning ? <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-600" /> : null}
      </div>
      {!compact && (event.flight || event.location) ? (
        <div className="mt-0.5 flex items-center gap-1 opacity-80">
          {event.location ? <MapPin className="size-2.5" /> : null}
          <span className="truncate">
            {event.flight
              ? `${event.flight.airline ?? ''} ${event.flight.flightNumber ?? ''}`.trim()
              : event.location}
          </span>
        </div>
      ) : null}
      {!compact ? (
        <div className="mt-0.5 opacity-70">
          {event.startTime}–{event.endTime}
          {isDraft ? ' · draft' : ''}
        </div>
      ) : null}
    </button>
  )
}
