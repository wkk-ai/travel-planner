import { useDroppable } from '@dnd-kit/core'
import { useCallback, useRef, useState } from 'react'
import { isToday, parseISO } from 'date-fns'
import { useTripStore } from '../store/tripStore'
import type { TripEvent } from '../types'
import {
  GRID_END,
  GRID_START,
  HOUR_HEIGHT,
  SLOT_MINUTES,
  cn,
  eventHeightPx,
  eventTopPx,
  minutesToTime,
  snapMinutes,
} from '../lib/time'
import { EventChip } from './EventChip'

export function slotId(date: string, time: string) {
  return `slot|${date}|${time}`
}

export function parseSlotId(id: string): { date: string; time: string } | null {
  if (!id.startsWith('slot|')) return null
  const parts = id.split('|')
  if (parts.length !== 3) return null
  return { date: parts[1], time: parts[2] }
}

function yToMinutes(clientY: number, columnTop: number, scrollTop: number): number {
  const y = clientY - columnTop + scrollTop
  const mins = (y / HOUR_HEIGHT) * 60
  return snapMinutes(Math.max(0, Math.min(mins, 24 * 60 - SLOT_MINUTES)), SLOT_MINUTES)
}

interface DraftRange {
  start: number
  end: number
}

interface Props {
  date: string
  events: TripEvent[]
  warnings: { eventId: string; message: string }[]
  onSelect: (e: TripEvent) => void
  nowEventId: string | null
  className?: string
}

export function DayColumn({
  date,
  events,
  warnings,
  onSelect,
  nowEventId,
  className,
}: Props) {
  const mode = useTripStore((s) => s.mode)
  const beginDraft = useTripStore((s) => s.beginDraft)
  const pendingDraft = useTripStore((s) => s.pendingDraft)
  const colRef = useRef<HTMLDivElement>(null)
  const [rangePreview, setRangePreview] = useState<DraftRange | null>(null)
  const draftRef = useRef<DraftRange | null>(null)
  const dragRef = useRef<{ origin: number; active: boolean } | null>(null)

  const hours = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i)
  const today = isToday(parseISO(date))

  const setDraftBoth = (d: DraftRange | null) => {
    draftRef.current = d
    setRangePreview(d)
  }

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (mode !== 'edit') return
      if (pendingDraft) return
      const target = e.target as HTMLElement
      if (target.closest('[data-event-chip]')) return
      if (!colRef.current) return
      e.preventDefault()
      const rect = colRef.current.getBoundingClientRect()
      const start = yToMinutes(e.clientY, rect.top, 0)
      dragRef.current = { origin: start, active: true }
      setDraftBoth({ start, end: start + SLOT_MINUTES })
      colRef.current.setPointerCapture(e.pointerId)
    },
    [mode, pendingDraft],
  )

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current?.active || !colRef.current) return
    const rect = colRef.current.getBoundingClientRect()
    const cur = yToMinutes(e.clientY, rect.top, 0)
    const { origin } = dragRef.current
    let start = origin
    let end = origin + SLOT_MINUTES
    if (cur >= origin) {
      start = origin
      end = Math.max(origin + SLOT_MINUTES, cur)
    } else {
      start = cur
      end = origin + SLOT_MINUTES
    }
    setDraftBoth({
      start: snapMinutes(start, SLOT_MINUTES),
      end: Math.min(snapMinutes(end, SLOT_MINUTES), 24 * 60),
    })
  }, [])

  const onPointerUp = useCallback(() => {
    const range = draftRef.current
    if (!dragRef.current?.active || !range) {
      dragRef.current = null
      setDraftBoth(null)
      return
    }
    dragRef.current = null
    const startTime = minutesToTime(range.start)
    const endTime = minutesToTime(Math.min(range.end, 23 * 60 + 59))
    setDraftBoth(null)
    beginDraft({
      title: 'New event',
      date,
      startTime,
      endTime,
      category: 'other',
    })
  }, [beginDraft, date])

  return (
    <div
      ref={colRef}
      className={cn('relative flex-1 border-r border-[var(--gcal-border)]', className)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragRef.current = null
        setDraftBoth(null)
      }}
    >
      {hours.map((h) => (
        <HourBlock key={h} date={date} hour={h} editable={mode === 'edit'} />
      ))}
      {today ? <NowLine /> : null}
      {rangePreview ? (
        <div
          className="pointer-events-none absolute left-1 right-1 z-10 rounded-md border-2 border-dashed border-[var(--gcal-blue)] bg-[#e8f0fe]/80 px-1.5 py-0.5 text-[11px] font-semibold text-[var(--gcal-blue)]"
          style={{
            top: (rangePreview.start / 60) * HOUR_HEIGHT,
            height: Math.max(((rangePreview.end - rangePreview.start) / 60) * HOUR_HEIGHT, 22),
          }}
        >
          New event · {minutesToTime(rangePreview.start)}–{minutesToTime(rangePreview.end)}
        </div>
      ) : null}
      {pendingDraft && pendingDraft.date === date ? (
        <EventChip
          event={pendingDraft}
          isDraft
          onClick={() => {}}
          style={{
            top: eventTopPx(pendingDraft.startTime),
            height: eventHeightPx(pendingDraft.startTime, pendingDraft.endTime),
          }}
        />
      ) : null}
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

function HourBlock({
  date,
  hour,
  editable,
}: {
  date: string
  hour: number
  editable: boolean
}) {
  const top = `${String(hour).padStart(2, '0')}:00`
  const mid = `${String(hour).padStart(2, '0')}:30`
  const topDrop = useDroppable({ id: slotId(date, top), disabled: !editable })
  const midDrop = useDroppable({ id: slotId(date, mid), disabled: !editable })

  return (
    <div className="relative border-b border-[var(--gcal-border)]/70" style={{ height: HOUR_HEIGHT }}>
      <div
        ref={topDrop.setNodeRef}
        className={cn('absolute inset-x-0 top-0', topDrop.isOver && 'bg-[#e8f0fe]')}
        style={{ height: HOUR_HEIGHT / 2 }}
      />
      <div
        ref={midDrop.setNodeRef}
        className={cn(
          'absolute inset-x-0 bottom-0 border-t border-dashed border-[var(--gcal-border)]/40',
          midDrop.isOver && 'bg-[#e8f0fe]',
        )}
        style={{ height: HOUR_HEIGHT / 2 }}
      />
    </div>
  )
}

function NowLine() {
  const top = eventTopPx(
    `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
  )
  return <div className="now-line" style={{ top }} />
}

export function TimeGutter() {
  const hours = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i)
  return (
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
          <span className="absolute right-2 top-[calc(50%-0.5rem)] text-[9px] opacity-50">
            :30
          </span>
        </div>
      ))}
    </div>
  )
}
