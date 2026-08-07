import type { TripEvent } from '../types'
import { eventColors } from '../data/categories'
import { cn, eventHeightPx, timeToMinutes } from '../lib/time'
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

type Density = 'xs' | 'sm' | 'md' | 'lg'

function densityFor(mins: number, heightPx: number): Density {
  if (mins <= 30 || heightPx < 28) return 'xs'
  if (mins <= 60 || heightPx < 48) return 'sm'
  if (mins <= 90 || heightPx < 72) return 'md'
  return 'lg'
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
  const mins = durationMinutes(event)
  const heightPx =
    typeof style?.height === 'number'
      ? style.height
      : typeof style?.height === 'string'
        ? parseFloat(style.height)
        : eventHeightPx(event.startTime, event.endTime)
  const density = compact ? 'xs' : densityFor(mins, heightPx)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
    disabled: !draggable || isDraft,
    data: { event },
  })

  const secondary =
    event.flight
      ? `${event.flight.airline ?? ''} ${event.flight.flightNumber ?? ''}`.trim()
      : event.location || ''

  const tip = [
    event.title,
    `${event.startTime}–${event.endTime}`,
    secondary,
    warning,
  ]
    .filter(Boolean)
    .join(' · ')

  const showIcon = density !== 'xs' && event.category === 'flight'
  const showPlace = Boolean(secondary) && (density === 'sm' || density === 'md' || density === 'lg')
  const showTime = density === 'md' || density === 'lg' || isDraft

  return (
    <button
      type="button"
      data-event-chip
      data-density={density}
      ref={setNodeRef}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      onPointerDown={(e) => {
        e.stopPropagation()
        if (draggable && !isDraft && listeners?.onPointerDown) {
          listeners.onPointerDown(e)
        }
      }}
      className={cn(
        'event-block absolute inset-x-0.5 overflow-hidden rounded-[2px] text-left leading-tight border-l-[3px]',
        density === 'xs' ? 'px-1 py-0' : 'px-1.5 py-0.5',
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
      <div
        className={cn(
          'flex min-w-0 items-center gap-0.5 font-semibold',
          density === 'xs' ? 'h-full text-[10px]' : 'text-[10px]',
          density === 'lg' && 'text-[11px]',
        )}
      >
        {showIcon ? <Plane className="size-2.5 shrink-0 opacity-90" /> : null}
        <span className={density === 'xs' ? 'truncate' : 'line-clamp-2'}>{event.title}</span>
        {warning ? <AlertTriangle className="size-2.5 shrink-0 text-amber-600" /> : null}
      </div>

      {showPlace ? (
        <div className="mt-px flex min-w-0 items-center gap-0.5 text-[9px] leading-snug opacity-80">
          {event.location && !event.flight ? <MapPin className="size-2 shrink-0" /> : null}
          <span className="truncate">{secondary}</span>
        </div>
      ) : null}

      {showTime ? (
        <div className="mt-px text-[8px] leading-snug opacity-55">
          {event.startTime}–{event.endTime}
          {isDraft ? ' · draft' : ''}
        </div>
      ) : null}
    </button>
  )
}
