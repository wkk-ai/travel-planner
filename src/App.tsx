import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { shareUrls, useTripStore } from './store/tripStore'
import { TopBar } from './components/TopBar'
import { WeekGrid } from './components/WeekGrid'
import { DayGrid } from './components/DayGrid'
import { EventModal } from './components/EventModal'
import { SidePanel } from './components/SidePanel'
import { QuickAdd } from './components/QuickAdd'
import { EventChip } from './components/EventChip'
import { Toast } from './components/Toast'
import { minutesToTime, snapMinutes, timeToMinutes, travelBufferWarnings, SLOT_MINUTES } from './lib/time'
import { parseSlotId } from './components/DayColumn'
import type { TripEvent } from './types'

export default function App() {
  const init = useTripStore((s) => s.init)
  const loading = useTripStore((s) => s.loading)
  const view = useTripStore((s) => s.view)
  const events = useTripStore((s) => s.events)
  const mode = useTripStore((s) => s.mode)
  const selectedEventId = useTripStore((s) => s.selectedEventId)
  const selectEvent = useTripStore((s) => s.selectEvent)
  const moveEvent = useTripStore((s) => s.moveEvent)
  const searchQuery = useTripStore((s) => s.searchQuery)
  const categoryFilter = useTripStore((s) => s.categoryFilter)
  const toast = useTripStore((s) => s.toast)
  const setToast = useTripStore((s) => s.setToast)
  const trip = useTripStore((s) => s.trip)

  const [activeId, setActiveId] = useState<string | null>(null)
  const [quickOpen, setQuickOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(t)
  }, [toast, setToast])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  )

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return events.filter((e) => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false
      if (!q) return true
      return (
        e.title.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.category.includes(q)
      )
    })
  }, [events, searchQuery, categoryFilter])

  const warnings = useMemo(() => travelBufferWarnings(events), [events])
  const activeEvent = events.find((e) => e.id === activeId) ?? null
  const selected = events.find((e) => e.id === selectedEventId) ?? null

  function onDragStart(e: DragStartEvent) {
    if (mode !== 'edit') return
    setActiveId(String(e.active.id))
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    if (mode !== 'edit') return
    const { active, over } = e
    if (!over) return
    const event = events.find((x) => x.id === active.id)
    if (!event) return

    const overId = String(over.id)
    const slot = parseSlotId(overId)
    if (slot) {
      let duration =
        timeToMinutes(event.endTime) - timeToMinutes(event.startTime)
      if (duration <= 0) duration = SLOT_MINUTES
      duration = Math.max(SLOT_MINUTES, snapMinutes(duration, SLOT_MINUTES))
      const startMins = snapMinutes(timeToMinutes(slot.time), SLOT_MINUTES)
      const endMins = Math.min(startMins + duration, 23 * 60 + 30)
      await moveEvent(
        event.id,
        slot.date,
        minutesToTime(startMins),
        minutesToTime(endMins),
      )
      return
    }
    if (overId.startsWith('day|')) {
      const date = overId.slice(4)
      await moveEvent(event.id, date, event.startTime, event.endTime)
    }
  }

  if (loading || !trip) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="brand-serif text-3xl text-[var(--gcal-blue)]">Travel Planner</div>
          <p className="mt-2 text-sm text-[var(--gcal-muted)]">Loading your trip…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar
        exportRef={exportRef}
        onQuickAdd={() => setQuickOpen(true)}
        share={shareUrls(trip)}
      />

      <div className="relative flex min-h-0 flex-1">
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div ref={exportRef} className="print-area cal-scroll min-h-0 min-w-0 flex-1 overflow-auto bg-white/80 backdrop-blur-[2px]">
            {view === 'week' ? (
              <WeekGrid
                events={filtered}
                warnings={warnings}
                onSelect={(ev: TripEvent) => selectEvent(ev.id)}
              />
            ) : (
              <DayGrid
                events={filtered}
                warnings={warnings}
                onSelect={(ev: TripEvent) => selectEvent(ev.id)}
              />
            )}
          </div>
          <DragOverlay>
            {activeEvent ? (
              <div className="drag-ghost w-[160px]">
                <EventChip event={activeEvent} compact />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <SidePanel />
      </div>

      {selected ? (
        <EventModal event={selected} onClose={() => selectEvent(null)} />
      ) : null}

      {quickOpen && mode === 'edit' ? (
        <QuickAdd onClose={() => setQuickOpen(false)} />
      ) : null}

      {toast ? <Toast message={toast} /> : null}

      {mode === 'view' ? (
        <div className="no-print fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full bg-[#3c4043] px-4 py-2 text-xs font-medium text-white shadow-lg">
          View-only — ask for the edit link to make changes
        </div>
      ) : null}
    </div>
  )
}
