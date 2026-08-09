import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type {
  AccessMode,
  AppTab,
  CalendarView,
  ChecklistItem,
  Expense,
  Trip,
  TripEvent,
  TripNote,
  UndoSnapshot,
} from '../types'
import {
  SEED_CHECKLIST,
  SEED_EVENTS,
  SEED_NOTES,
  TRIP_META,
} from '../data/seed'
import {
  createTrip,
  deleteChecklistRemote,
  deleteEventRemote,
  deleteExpenseRemote,
  deleteNoteRemote,
  deleteTripRemote,
  enqueue,
  fetchTripBundle,
  fetchTripByToken,
  flushQueue,
  listTrips,
  loadQueue,
  type OfflineOp,
  supabase,
  supabaseConfigured,
  updateTripRemote,
  upsertChecklistItem,
  upsertEvent,
  upsertEvents,
  upsertExpense,
  upsertNote,
} from '../lib/supabase'
import { addDaysIso, isoDate, minutesToTime, shiftEventsFrom, SLOT_MINUTES, timeToMinutes, tripCalendarBounds } from '../lib/time'
import { swapEventWithBackup } from '../lib/eventBackups'
import type { EventCategory } from '../types'

const LOCAL_TOKEN_KEY = 'travel-planner-last-token'
const LOCAL_TAB_KEY = 'travel-planner-tab'

function loadTabForTrip(tripId: string): AppTab {
  try {
    const raw = localStorage.getItem(`${LOCAL_TAB_KEY}-${tripId}`)
    return raw === 'schedule' ? 'schedule' : 'story'
  } catch {
    return 'story'
  }
}

function saveTabForTrip(tripId: string, tab: AppTab) {
  try {
    localStorage.setItem(`${LOCAL_TAB_KEY}-${tripId}`, tab)
  } catch {
    /* ignore */
  }
}

interface TripState {
  trip: Trip | null
  trips: Trip[]
  events: TripEvent[]
  pendingDraft: TripEvent | null
  notes: TripNote[]
  checklist: ChecklistItem[]
  expenses: Expense[]
  mode: AccessMode
  activeTab: AppTab
  view: CalendarView
  selectedDate: string
  selectedEventId: string | null
  loading: boolean
  syncing: boolean
  online: boolean
  pendingOps: number
  undoStack: UndoSnapshot[]
  searchQuery: string
  categoryFilter: EventCategory | 'all'
  panel: 'none' | 'plan' | 'settings' | 'checklist' | 'notes' | 'budget' | 'emergency' | 'share' | 'import' | 'whatif' | 'recap' | 'trips'
  toast: string | null
  init: () => Promise<void>
  refreshTrips: () => Promise<void>
  switchTrip: (editToken: string) => Promise<void>
  createNewTrip: (input: {
    name: string
    startDate: string
    endDate: string
    seedBigBang?: boolean
  }) => Promise<void>
  deleteTrip: (tripId: string) => Promise<void>
  beginDraft: (partial: Partial<TripEvent>) => TripEvent
  commitDraft: (patch: Partial<TripEvent>) => Promise<void>
  discardDraft: () => void
  setView: (v: CalendarView) => void
  setActiveTab: (t: AppTab) => void
  setSelectedDate: (d: string) => void
  selectEvent: (id: string | null) => void
  setSearchQuery: (q: string) => void
  setCategoryFilter: (c: EventCategory | 'all') => void
  setPanel: (p: TripState['panel']) => void
  setToast: (t: string | null) => void
  pushUndo: (label: string) => void
  undo: () => Promise<void>
  addEvent: (partial?: Partial<TripEvent>) => Promise<TripEvent>
  updateEvent: (id: string, patch: Partial<TripEvent>) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
  moveEvent: (id: string, date: string, startTime: string, endTime: string) => Promise<void>
  swapWithBackup: (eventId: string, backupId: string, patch?: Partial<TripEvent>) => Promise<void>
  runningLate: (date: string, fromTime: string, minutes: number) => Promise<void>
  addNote: (partial?: Partial<TripNote>) => Promise<void>
  updateNote: (id: string, patch: Partial<TripNote>) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  addChecklist: (text: string, dayDate?: string | null) => Promise<void>
  toggleChecklist: (id: string) => Promise<void>
  deleteChecklist: (id: string) => Promise<void>
  addExpense: (partial?: Partial<Expense>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  updateTrip: (patch: Partial<Trip>) => Promise<void>
  createWhatIf: () => Promise<string | null>
  seedIfEmpty: () => Promise<void>
  flush: () => Promise<void>
}

async function syncEvent(e: TripEvent, canEdit: boolean) {
  if (!canEdit) return
  if (!supabaseConfigured || !navigator.onLine) {
    queueOp({ type: 'upsert_event', payload: e })
    return
  }
  const { error } = await upsertEvent(e)
  if (error) queueOp({ type: 'upsert_event', payload: e })
}

function queueOp(op: OfflineOp) {
  enqueue(op)
  useTripStore.setState({ pendingOps: loadQueue().length })
}

async function ensureTripCoversEvents(trip: Trip, events: TripEvent[]): Promise<Trip> {
  const bounds = tripCalendarBounds(trip.startDate, trip.endDate, events)
  if (bounds.startDate === trip.startDate && bounds.endDate === trip.endDate) return trip
  const updated = { ...trip, ...bounds }
  if (supabaseConfigured && navigator.onLine) {
    await updateTripRemote(updated)
  }
  return updated
}

let initPromise: Promise<void> | null = null

async function openTripBundle(
  set: (partial: Partial<TripState>) => void,
  get: () => TripState,
  trip: Trip,
  mode: AccessMode,
) {
  const bundle = await fetchTripBundle(trip.id)
  localStorage.setItem(LOCAL_TOKEN_KEY, trip.editToken)
  window.location.hash =
    mode === 'edit' ? `#/e/${trip.editToken}` : `#/v/${trip.viewToken}`

  const syncedTrip = await ensureTripCoversEvents(trip, bundle.events)

  set({
    trip: syncedTrip,
    mode,
    events: bundle.events,
    notes: bundle.notes,
    checklist: bundle.checklist,
    expenses: bundle.expenses,
    selectedDate: trip.startDate,
    activeTab: loadTabForTrip(trip.id),
    loading: false,
  })

  subscribeRealtime(trip.id)
  if (bundle.events.length === 0 && mode === 'edit') {
    void get().seedIfEmpty()
  }
  void get().flush()
  void get().refreshTrips()
}

function subscribeRealtime(tripId: string) {
  if (!supabaseConfigured) return
  supabase
    .channel(`trip-${tripId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'travel_events',
        filter: `trip_id=eq.${tripId}`,
      },
      async () => {
        const b = await fetchTripBundle(tripId)
        useTripStore.setState({ events: b.events })
      },
    )
    .subscribe()
}

function localFallbackTrip(): Trip {
  return {
    id: uuid(),
    name: TRIP_META.name,
    startDate: TRIP_META.startDate,
    endDate: TRIP_META.endDate,
    editToken: uuid(),
    viewToken: uuid(),
    whatIfOf: null,
    emergency: TRIP_META.emergency,
  }
}

export const useTripStore = create<TripState>((set, get) => ({
  trip: null,
  trips: [],
  events: [],
  pendingDraft: null,
  notes: [],
  checklist: [],
  expenses: [],
  mode: 'edit',
  activeTab: 'story',
  view: 'week',
  selectedDate: TRIP_META.startDate,
  selectedEventId: null,
  loading: true,
  syncing: false,
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingOps: 0,
  undoStack: [],
  searchQuery: '',
  categoryFilter: 'all',
  panel: 'none',
  toast: null,

  setView: (v) => set({ view: v }),
  setActiveTab: (t) => {
    const trip = get().trip
    if (trip) saveTabForTrip(trip.id, t)
    set({ activeTab: t })
  },
  setSelectedDate: (d) => set({ selectedDate: d }),
  selectEvent: (id) =>
    set({
      selectedEventId: id,
      pendingDraft: id ? null : get().pendingDraft,
    }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setCategoryFilter: (c) => set({ categoryFilter: c }),
  setPanel: (p) => set({ panel: p }),
  setToast: (t) => set({ toast: t }),

  beginDraft: (partial) => {
    const { trip, selectedDate, pendingDraft } = get()
    if (!trip || get().mode !== 'edit') throw new Error('Read-only')
    if (pendingDraft) get().discardDraft()
    const startTime = partial.startTime ?? '10:00'
    const defaultEnd = minutesToTime(
      Math.min(timeToMinutes(startTime) + SLOT_MINUTES, 23 * 60 + 59),
    )
    const draft: TripEvent = {
      id: `draft-${uuid()}`,
      tripId: trip.id,
      title: partial.title ?? 'New event',
      category: partial.category ?? 'other',
      color: partial.color ?? null,
      date: partial.date ?? selectedDate,
      startTime,
      endTime: partial.endTime ?? defaultEnd,
      notes: partial.notes ?? '',
      location: partial.location ?? '',
      mapsUrl: partial.mapsUrl ?? '',
      flight: partial.flight ?? null,
      budgetCents: partial.budgetCents ?? 0,
      photoDataUrl: partial.photoDataUrl ?? null,
      backups: partial.backups ?? [],
    }
    set({ pendingDraft: draft, selectedEventId: null })
    return draft
  },

  commitDraft: async (patch) => {
    const draft = get().pendingDraft
    if (!draft) return
    const { id: _draftId, ...rest } = draft
    set({ pendingDraft: null })
    await get().addEvent({ ...rest, ...patch })
    set({ selectedEventId: null })
  },

  discardDraft: () => {
    set({ pendingDraft: null })
  },

  refreshTrips: async () => {
    if (!supabaseConfigured) return
    try {
      const trips = await listTrips()
      set({ trips })
    } catch (err) {
      console.error(err)
    }
  },

  switchTrip: async (editToken) => {
    set({ loading: true, panel: 'none' })
    initPromise = null
    localStorage.setItem(LOCAL_TOKEN_KEY, editToken)
    window.location.hash = `#/e/${editToken}`
    await get().init()
  },

  createNewTrip: async ({ name, startDate, endDate, seedBigBang }) => {
    if (!supabaseConfigured) {
      set({ toast: 'Need online Supabase to create trips' })
      return
    }
    if (endDate < startDate) {
      set({ toast: 'End date cannot be before start date' })
      return
    }
    const trip = await createTrip({
      name,
      startDate,
      endDate,
      emergency: seedBigBang ? TRIP_META.emergency : {},
    })
    localStorage.setItem(LOCAL_TOKEN_KEY, trip.editToken)
    window.location.hash = `#/e/${trip.editToken}`
    initPromise = null
    set({
      trip,
      mode: 'edit',
      events: [],
      notes: [],
      checklist: [],
      expenses: [],
      selectedDate: startDate,
      activeTab: loadTabForTrip(trip.id),
      loading: false,
      panel: 'none',
      toast: `Created “${name}”`,
    })
    subscribeRealtime(trip.id)
    if (seedBigBang) await get().seedIfEmpty()
    await get().refreshTrips()
  },

  deleteTrip: async (tripId) => {
    if (get().mode !== 'edit' || !supabaseConfigured) {
      set({ toast: 'Cannot delete trip right now' })
      return
    }
    const { trip, trips } = get()
    const { error } = await deleteTripRemote(tripId)
    if (error) {
      set({ toast: 'Failed to delete trip' })
      return
    }
    const remaining = trips.filter((t) => t.id !== tripId)
    set({ trips: remaining, toast: 'Trip deleted' })
    if (trip?.id === tripId) {
      if (remaining.length) {
        await get().switchTrip(remaining[0].editToken)
      } else {
        await get().createNewTrip({
          name: 'New trip',
          startDate: TRIP_META.startDate,
          endDate: TRIP_META.endDate,
        })
      }
    }
  },

  pushUndo: (label) => {
    const { events, undoStack } = get()
    set({
      undoStack: [...undoStack.slice(-19), { label, events: structuredClone(events) }],
    })
  },

  undo: async () => {
    const { undoStack, mode } = get()
    if (!undoStack.length || mode !== 'edit') return
    const snap = undoStack[undoStack.length - 1]
    set({ events: snap.events, undoStack: undoStack.slice(0, -1) })
    if (supabaseConfigured && navigator.onLine) {
      await upsertEvents(snap.events)
    } else {
      for (const e of snap.events) queueOp({ type: 'upsert_event', payload: e })
    }
    set({ toast: `Undid: ${snap.label}` })
  },

  init: async () => {
    if (initPromise) return initPromise

    initPromise = (async () => {
      set({ loading: true, pendingOps: loadQueue().length, online: navigator.onLine })

      const hash = window.location.hash.replace(/^#\/?/, '')
      const parts = hash.split('/')
      let token: string | null = null
      let forcedMode: AccessMode | null = null

      if (parts[0] === 'e' && parts[1]) {
        token = parts[1]
        forcedMode = 'edit'
      } else if (parts[0] === 'v' && parts[1]) {
        token = parts[1]
        forcedMode = 'view'
      } else if (parts[0] && parts[0].length > 20) {
        token = parts[0]
      } else {
        token = localStorage.getItem(LOCAL_TOKEN_KEY)
      }

      const failLocal = async (msg: string) => {
        const localTrip = localFallbackTrip()
        set({
          trip: localTrip,
          mode: 'edit',
          selectedDate: localTrip.startDate,
          activeTab: loadTabForTrip(localTrip.id),
          loading: false,
          toast: msg,
        })
        void get().seedIfEmpty()
      }

      try {
        if (supabaseConfigured && token) {
          const found = await Promise.race([
            fetchTripByToken(token),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
          ])
          if (found) {
            const actualMode =
              forcedMode === 'view'
                ? 'view'
                : forcedMode === 'edit' && found.mode === 'edit'
                  ? 'edit'
                  : found.mode

            await openTripBundle(set, get, found.trip, actualMode)
            return
          }
        }

        if (supabaseConfigured) {
          const existing = await listTrips()
          if (existing.length) {
            if (token) {
              set({ toast: 'Saved link not found — opened your latest trip' })
            }
            await openTripBundle(set, get, existing[0], 'edit')
            return
          }

          const trip = await Promise.race([
            createTrip({
              name: TRIP_META.name,
              startDate: TRIP_META.startDate,
              endDate: TRIP_META.endDate,
              emergency: TRIP_META.emergency,
            }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
          ])
          if (!trip) {
            await failLocal('Cloud slow — working offline')
            return
          }
          localStorage.setItem(LOCAL_TOKEN_KEY, trip.editToken)
          window.location.hash = `#/e/${trip.editToken}`
          set({
            trip,
            mode: 'edit',
            events: [],
            notes: [],
            checklist: [],
            expenses: [],
            selectedDate: trip.startDate,
            activeTab: loadTabForTrip(trip.id),
            loading: false,
          })
          subscribeRealtime(trip.id)
          void get().seedIfEmpty()
          void get().refreshTrips()
          return
        }

        await failLocal('')
      } catch (err) {
        console.error(err)
        await failLocal('Failed to load trip — using local seed')
      }
    })()

    return initPromise
  },

  seedIfEmpty: async () => {
    const { trip, events, mode } = get()
    if (!trip || events.length > 0 || mode !== 'edit') return

    const seeded: TripEvent[] = SEED_EVENTS.map((s) => ({
      id: uuid(),
      tripId: trip.id,
      title: s.title,
      category: s.category,
      color: null,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      notes: s.notes ?? '',
      location: s.location ?? '',
      mapsUrl: s.mapsUrl ?? '',
      flight: s.flight ?? null,
      budgetCents: s.budgetCents ?? 0,
      photoDataUrl: null,
      backups: [],
    }))

    const notes: TripNote[] = SEED_NOTES.map((n) => ({
      id: uuid(),
      tripId: trip.id,
      date: n.date,
      title: n.title,
      body: n.body,
    }))

    const checklist: ChecklistItem[] = SEED_CHECKLIST.map((c, i) => ({
      id: uuid(),
      tripId: trip.id,
      text: c.text,
      done: false,
      dayDate: c.dayDate,
      sortOrder: i,
    }))

    const expenses: Expense[] = seeded
      .filter((e) => e.budgetCents > 0)
      .map((e) => ({
        id: uuid(),
        tripId: trip.id,
        eventId: e.id,
        label: e.title,
        category: e.category,
        amountCents: e.budgetCents,
        currency: 'USD',
        spentOn: e.date,
      }))

    const renamed = {
      ...trip,
      name: TRIP_META.name,
      startDate: TRIP_META.startDate,
      endDate: TRIP_META.endDate,
      emergency: TRIP_META.emergency,
    }
    set({ events: seeded, notes, checklist, expenses, trip: renamed })

    if (supabaseConfigured && navigator.onLine) {
      await updateTripRemote(renamed)
      await upsertEvents(seeded)
      await Promise.all([
        ...notes.map((n) => upsertNote(n)),
        ...checklist.map((c) => upsertChecklistItem(c)),
        ...expenses.map((e) => upsertExpense(e)),
      ])
      set({ toast: 'Trip seeded from spreadsheet' })
    }
  },

  addEvent: async (partial = {}) => {
    const { trip, mode, selectedDate } = get()
    if (!trip || mode !== 'edit') throw new Error('Read-only')
    get().pushUndo('Add event')
    const startTime = partial.startTime ?? '10:00'
    const defaultEnd = minutesToTime(
      Math.min(timeToMinutes(startTime) + SLOT_MINUTES, 23 * 60 + 59),
    )
    const ev: TripEvent = {
      id: uuid(),
      tripId: trip.id,
      title: partial.title ?? 'New event',
      category: partial.category ?? 'other',
      color: partial.color ?? null,
      date: partial.date ?? selectedDate,
      startTime,
      endTime: partial.endTime ?? defaultEnd,
      notes: partial.notes ?? '',
      location: partial.location ?? '',
      mapsUrl: partial.mapsUrl ?? '',
      flight: partial.flight ?? null,
      budgetCents: partial.budgetCents ?? 0,
      photoDataUrl: partial.photoDataUrl ?? null,
      backups: partial.backups ?? [],
    }
    set({ events: [...get().events, ev], selectedEventId: ev.id })
    await syncEvent(ev, true)
    const { trip: currentTrip, events: allEvents } = get()
    if (currentTrip) {
      const syncedTrip = await ensureTripCoversEvents(currentTrip, allEvents)
      if (syncedTrip !== currentTrip) set({ trip: syncedTrip })
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(10)
    }
    return ev
  },

  updateEvent: async (id, patch) => {
    if (get().mode !== 'edit') return
    get().pushUndo('Edit event')
    const events = get().events.map((e) => (e.id === id ? { ...e, ...patch } : e))
    set({ events })
    const updated = events.find((e) => e.id === id)
    if (updated) await syncEvent(updated, true)
    const { trip: currentTrip } = get()
    if (currentTrip) {
      const syncedTrip = await ensureTripCoversEvents(currentTrip, events)
      if (syncedTrip !== currentTrip) set({ trip: syncedTrip })
    }
  },

  deleteEvent: async (id) => {
    if (get().mode !== 'edit') return
    get().pushUndo('Delete event')
    set({ events: get().events.filter((e) => e.id !== id), selectedEventId: null })
    if (!supabaseConfigured || !navigator.onLine) {
      queueOp({ type: 'delete_event', id })
    } else {
      const { error } = await deleteEventRemote(id)
      if (error) queueOp({ type: 'delete_event', id })
    }
  },

  moveEvent: async (id, date, startTime, endTime) => {
    if (get().mode !== 'edit') return
    get().pushUndo('Move event')
    const events = get().events.map((e) =>
      e.id === id ? { ...e, date, startTime, endTime } : e,
    )
    set({ events })
    const updated = events.find((e) => e.id === id)
    if (updated) {
      await syncEvent(updated, true)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([8, 20, 8])
      }
      const { trip: currentTrip } = get()
      if (currentTrip) {
        const syncedTrip = await ensureTripCoversEvents(currentTrip, events)
        if (syncedTrip !== currentTrip) set({ trip: syncedTrip })
      }
    }
  },

  swapWithBackup: async (eventId, backupId, patch) => {
    if (get().mode !== 'edit') return
    const current = get().events.find((e) => e.id === eventId)
    if (!current) return
    const merged = patch ? { ...current, ...patch } : current
    get().pushUndo('Swap backup plan')
    const swapped = swapEventWithBackup(merged, backupId)
    const events = get().events.map((e) => (e.id === eventId ? swapped : e))
    set({ events })
    await syncEvent(swapped, true)
    set({ toast: `Now: ${swapped.title}` })
  },

  runningLate: async (date, fromTime, minutes) => {
    if (get().mode !== 'edit') return
    const before = get().events
    const events = shiftEventsFrom(before, date, fromTime, minutes)
    const shifted = before.filter((e) => {
      const next = events.find((x) => x.id === e.id)
      return next && (next.startTime !== e.startTime || next.endTime !== e.endTime)
    }).length
    if (!shifted) {
      set({
        toast:
          date === isoDate(new Date())
            ? 'No remaining events today to push'
            : 'No events left to push on this day',
      })
      return
    }
    get().pushUndo('Running late')
    set({ events })
    for (const e of events.filter((x) => x.date === date)) {
      await syncEvent(e, true)
    }
    set({ toast: `Pushed ${shifted} event${shifted === 1 ? '' : 's'} +${minutes}m` })
  },

  addNote: async (partial = {}) => {
    const { trip, mode } = get()
    if (!trip || mode !== 'edit') return
    const n: TripNote = {
      id: uuid(),
      tripId: trip.id,
      date: partial.date ?? null,
      title: partial.title ?? 'Note',
      body: partial.body ?? '',
    }
    set({ notes: [...get().notes, n] })
    if (!supabaseConfigured || !navigator.onLine) queueOp({ type: 'upsert_note', payload: n })
    else await upsertNote(n)
  },

  updateNote: async (id, patch) => {
    if (get().mode !== 'edit') return
    const notes = get().notes.map((n) => (n.id === id ? { ...n, ...patch } : n))
    set({ notes })
    const n = notes.find((x) => x.id === id)
    if (!n) return
    if (!supabaseConfigured || !navigator.onLine) queueOp({ type: 'upsert_note', payload: n })
    else await upsertNote(n)
  },

  deleteNote: async (id) => {
    if (get().mode !== 'edit') return
    set({ notes: get().notes.filter((n) => n.id !== id) })
    if (!supabaseConfigured || !navigator.onLine) queueOp({ type: 'delete_note', id })
    else await deleteNoteRemote(id)
  },

  addChecklist: async (text, dayDate = null) => {
    const { trip, mode, checklist } = get()
    if (!trip || mode !== 'edit') return
    const c: ChecklistItem = {
      id: uuid(),
      tripId: trip.id,
      text,
      done: false,
      dayDate,
      sortOrder: checklist.length,
    }
    set({ checklist: [...checklist, c] })
    if (!supabaseConfigured || !navigator.onLine)
      queueOp({ type: 'upsert_checklist', payload: c })
    else await upsertChecklistItem(c)
  },

  toggleChecklist: async (id) => {
    if (get().mode !== 'edit') return
    const checklist = get().checklist.map((c) =>
      c.id === id ? { ...c, done: !c.done } : c,
    )
    set({ checklist })
    const c = checklist.find((x) => x.id === id)
    if (!c) return
    if (!supabaseConfigured || !navigator.onLine)
      queueOp({ type: 'upsert_checklist', payload: c })
    else await upsertChecklistItem(c)
  },

  deleteChecklist: async (id) => {
    if (get().mode !== 'edit') return
    set({ checklist: get().checklist.filter((c) => c.id !== id) })
    if (!supabaseConfigured || !navigator.onLine)
      queueOp({ type: 'delete_checklist', id })
    else await deleteChecklistRemote(id)
  },

  addExpense: async (partial = {}) => {
    const { trip, mode } = get()
    if (!trip || mode !== 'edit') return
    const e: Expense = {
      id: uuid(),
      tripId: trip.id,
      eventId: partial.eventId ?? null,
      label: partial.label ?? 'Expense',
      category: partial.category ?? 'other',
      amountCents: partial.amountCents ?? 0,
      currency: partial.currency ?? 'USD',
      spentOn: partial.spentOn ?? get().selectedDate,
    }
    set({ expenses: [...get().expenses, e] })
    if (!supabaseConfigured || !navigator.onLine)
      queueOp({ type: 'upsert_expense', payload: e })
    else await upsertExpense(e)
  },

  deleteExpense: async (id) => {
    if (get().mode !== 'edit') return
    set({ expenses: get().expenses.filter((e) => e.id !== id) })
    if (!supabaseConfigured || !navigator.onLine)
      queueOp({ type: 'delete_expense', id })
    else await deleteExpenseRemote(id)
  },

  updateTrip: async (patch) => {
    const current = get().trip
    if (get().mode !== 'edit' || !current) return
    const trip: Trip = { ...current, ...patch }
    set({ trip })
    if (!supabaseConfigured || !navigator.onLine)
      queueOp({ type: 'update_trip', payload: trip })
    else await updateTripRemote(trip)
  },

  createWhatIf: async () => {
    const { trip, events, notes, checklist, expenses, mode } = get()
    if (!trip || mode !== 'edit' || !supabaseConfigured) {
      set({ toast: 'What-if needs online Supabase' })
      return null
    }
    const clone = await createTrip({
      name: `${trip.name} (what-if)`,
      startDate: trip.startDate,
      endDate: trip.endDate,
      emergency: trip.emergency,
      whatIfOf: trip.id,
    })
    const idMap = new Map<string, string>()
    const newEvents = events.map((e) => {
      const nid = uuid()
      idMap.set(e.id, nid)
      return { ...e, id: nid, tripId: clone.id }
    })
    await upsertEvents(newEvents)
    for (const n of notes) {
      await upsertNote({ ...n, id: uuid(), tripId: clone.id })
    }
    for (const c of checklist) {
      await upsertChecklistItem({ ...c, id: uuid(), tripId: clone.id })
    }
    for (const e of expenses) {
      await upsertExpense({
        ...e,
        id: uuid(),
        tripId: clone.id,
        eventId: e.eventId ? (idMap.get(e.eventId) ?? null) : null,
      })
    }
    set({
      toast: 'What-if copy saved as a new trip in the cloud — opening its edit link',
      panel: 'none',
    })
    void get().refreshTrips()
    return clone.editToken
  },

  flush: async () => {
    set({ syncing: true })
    const n = await flushQueue()
    const left = loadQueue().length
    set({
      syncing: false,
      pendingOps: left,
      toast: n
        ? left
          ? `Synced ${n} — ${left} still waiting`
          : `Synced ${n} offline change${n === 1 ? '' : 's'}`
        : left
          ? 'Still waiting to sync — try again'
          : null,
    })
  },
}))

// Online/offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useTripStore.setState({ online: true, pendingOps: loadQueue().length })
    void useTripStore.getState().flush()
  })
  window.addEventListener('offline', () => {
    useTripStore.setState({
      online: false,
      pendingOps: loadQueue().length,
      toast: 'You’re offline — edits stay on this device',
    })
  })
}

export function shareUrls(trip: Trip) {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, '')
  return {
    edit: `${base}/#/e/${trip.editToken}`,
    view: `${base}/#/v/${trip.viewToken}`,
  }
}

export { addDaysIso }
