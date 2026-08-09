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
import { TabBar } from './components/TabBar'
import { StoryTab } from './components/StoryTab'
import { MapTab } from './components/MapTab'
import { PackTab } from './components/PackTab'
import { WalletTab } from './components/WalletTab'
import { SyncBanner } from './components/SyncBanner'
import { WeekGrid } from './components/WeekGrid'
import { DayGrid } from './components/DayGrid'
import { EventModal } from './components/EventModal'
import { SidePanel } from './components/SidePanel'
import { QuickAdd } from './components/QuickAdd'
import { EventChip } from './components/EventChip'
import { Toast } from './components/Toast'
import { useIsMobile } from './lib/useMedia'
import { Plus } from 'lucide-react'
import { minutesToTime, snapMinutes, timeToMinutes, travelBufferWarnings, SLOT_MINUTES, cn } from './lib/time'
import { parseSlotId } from './components/DayColumn'
import type { TripEvent } from './types'

export default function App() {
  const init = useTripStore((s) => s.init)
  const loading = useTripStore((s) => s.loading)
  const view = useTripStore((s) => s.view)
  const events = useTripStore((s) => s.events)
  const mode = useTripStore((s) => s.mode)
  const activeTab = useTripStore((s) => s.activeTab)
  const selectedEventId = useTripStore((s) => s.selectedEventId)
  const selectEvent = useTripStore((s) => s.selectEvent)
  const pendingDraft = useTripStore((s) => s.pendingDraft)
  const discardDraft = useTripStore((s) => s.discardDraft)
  const moveEvent = useTripStore((s) => s.moveEvent)
  const searchQuery = useTripStore((s) => s.searchQuery)
  const categoryFilter = useTripStore((s) => s.categoryFilter)
  const toast = useTripStore((s) => s.toast)
  const setToast = useTripStore((s) => s.setToast)
  const trip = useTripStore((s) => s.trip)
  const setView = useTripStore((s) => s.setView)
  const setPanel = useTripStore((s) => s.setPanel)
  const panel = useTripStore((s) => s.panel)
  const isMobile = useIsMobile()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [quickOpen, setQuickOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    if (!trip || !isMobile) return
    setView('day')
  }, [trip?.id, isMobile, setView])

  useEffect(() => {
    if (isMobile && view === 'week') setView('day')
  }, [isMobile, view, setView])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(t)
  }, [toast, setToast])

  useEffect(() => {
    if (!trip || mode !== 'edit' || activeTab !== 'schedule') return
    if (localStorage.getItem('tp-drag-hint')) return
    const t = setTimeout(() => {
      setToast('Tip: long-press an event to move it')
      localStorage.setItem('tp-drag-hint', '1')
    }, 2500)
    return () => clearTimeout(t)
  }, [trip?.id, mode, activeTab, setToast])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 12 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 450, tolerance: 8 } }),
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
  const modalEvent = pendingDraft ?? selected
  const modalIsDraft = Boolean(pendingDraft)

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
          <div className="text-ui-xl font-bold text-[var(--gcal-blue)]">Travel Planner</div>
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
      <TabBar />
      <SyncBanner />

      <div className="relative flex min-h-0 flex-1">
        {panel !== 'none' ? (
          <button
            type="button"
            className="fixed inset-0 z-20 bg-black/35 sm:hidden"
            aria-label="Close panel"
            onClick={() => setPanel('none')}
          />
        ) : null}
        {activeTab === 'story' ? (
          <div className={cn(
            'cal-scroll min-h-0 min-w-0 flex-1 overflow-auto bg-[var(--gcal-bg)]',
            mode === 'view' && 'pb-16',
          )}>
            <StoryTab />
          </div>
        ) : activeTab === 'map' ? (
          <div className={cn(
            'cal-scroll min-h-0 min-w-0 flex-1 overflow-auto bg-[var(--gcal-bg)]',
            mode === 'view' && 'pb-16',
          )}>
            <MapTab />
          </div>
        ) : activeTab === 'pack' ? (
          <div className={cn(
            'cal-scroll min-h-0 min-w-0 flex-1 overflow-auto bg-[var(--gcal-bg)]',
            mode === 'view' && 'pb-16',
          )}>
            <PackTab />
          </div>
        ) : activeTab === 'wallet' ? (
          <div className={cn(
            'cal-scroll min-h-0 min-w-0 flex-1 overflow-auto bg-[var(--gcal-bg)]',
            mode === 'view' && 'pb-16',
          )}>
            <WalletTab />
          </div>
        ) : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div ref={exportRef} className={cn(
            'print-area cal-scroll min-h-0 min-w-0 flex-1 overflow-auto bg-white/80 backdrop-blur-[2px]',
            mode === 'view' && 'pb-16',
          )}>
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
        )}

        <SidePanel />
      </div>

      {modalEvent ? (
        <EventModal
          event={modalEvent}
          isDraft={modalIsDraft}
          onClose={() => {
            if (modalIsDraft) discardDraft()
            else selectEvent(null)
          }}
        />
      ) : null}

      {quickOpen && mode === 'edit' ? (
        <QuickAdd onClose={() => setQuickOpen(false)} />
      ) : null}

      {toast ? <Toast message={toast} /> : null}

      {mode === 'edit' && isMobile ? (
        <button
          type="button"
          onClick={() => setQuickOpen(true)}
          className="mobile-fab no-print fixed bottom-20 right-4 z-50 flex size-14 items-center justify-center rounded-2xl bg-[var(--gcal-blue)] text-white shadow-lg hover:bg-[var(--gcal-blue-hover)] active:scale-95 sm:bottom-5"
          aria-label="Add event"
        >
          <Plus className="size-7" />
        </button>
      ) : null}

      {mode === 'view' ? (
        <div className="no-print fixed bottom-20 left-1/2 z-40 max-w-[90vw] -translate-x-1/2 rounded-full bg-[#3c4043]/95 px-4 py-2 text-center text-xs font-medium text-white shadow-lg backdrop-blur sm:bottom-4 sm:max-w-none">
          View-only — ask for the edit link to make changes
        </div>
      ) : null}
    </div>
  )
}
