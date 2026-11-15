import { createClient } from '@supabase/supabase-js'
import type {
  ChecklistItem,
  EventBackup,
  Expense,
  Trip,
  TripEvent,
  TripNote,
  EmergencyInfo,
} from '../types'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabaseConfigured = Boolean(url && key)

// Access model: the database only returns a trip to someone who presents its edit or view token
// (sent on every request in the x-trip-tokens header) or who is signed in as an owner.
// This browser remembers the tokens of trips it has opened or created.
const KNOWN_TOKENS_KEY = 'travel-planner-known-tokens'
const LAST_TOKEN_KEY = 'travel-planner-last-token'
const pendingTokens = new Set<string>()
const TOKEN_RE = /^[0-9a-f-]{20,64}$/i

export function knownTokens(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KNOWN_TOKENS_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((t) => typeof t === 'string' && TOKEN_RE.test(t)) : []
  } catch {
    return []
  }
}

export function rememberToken(token: string | null | undefined) {
  if (!token || !TOKEN_RE.test(token)) return
  const all = knownTokens()
  if (all.includes(token)) return
  try {
    localStorage.setItem(KNOWN_TOKENS_KEY, JSON.stringify([...all, token].slice(-60)))
  } catch {
    /* storage unavailable: the token still works for this page through pendingTokens */
  }
  pendingTokens.add(token)
}

function tokensHeader(): string {
  const all = new Set<string>([...knownTokens(), ...pendingTokens])
  try {
    const last = localStorage.getItem(LAST_TOKEN_KEY)
    if (last && TOKEN_RE.test(last)) all.add(last)
  } catch {
    /* ignore */
  }
  const fromHash = window.location.hash.replace(/^#\/?/, '').split('/').find((p) => TOKEN_RE.test(p))
  if (fromHash) all.add(fromHash)
  return [...all].slice(-60).join(',')
}

export const supabase = supabaseConfigured
  ? createClient(url, key, {
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers)
          const tokens = tokensHeader()
          if (tokens) headers.set('x-trip-tokens', tokens)
          return fetch(input, { ...init, headers })
        },
      },
    })
  : (null as unknown as ReturnType<typeof createClient>)

export async function isSignedIn(): Promise<boolean> {
  if (!supabaseConfigured) return false
  const { data } = await supabase.auth.getSession()
  return Boolean(data.session)
}

export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error ? error.message : null
}

export async function signOut() {
  await supabase.auth.signOut()
}

function mapTrip(row: Record<string, unknown>): Trip {
  return {
    id: row.id as string,
    name: row.name as string,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    editToken: row.edit_token as string,
    viewToken: row.view_token as string,
    whatIfOf: (row.what_if_of as string) ?? null,
    emergency: (row.emergency_json as EmergencyInfo) ?? {},
  }
}

function mapEvent(row: Record<string, unknown>): TripEvent {
  return {
    id: row.id as string,
    tripId: row.trip_id as string,
    title: row.title as string,
    category: row.category as TripEvent['category'],
    color: (row.color as string) ?? null,
    date: row.date as string,
    startTime: String(row.start_time).slice(0, 5),
    endTime: String(row.end_time).slice(0, 5),
    notes: (row.notes as string) ?? '',
    location: (row.location as string) ?? '',
    mapsUrl: (row.maps_url as string) ?? '',
    flight: (row.flight_json as TripEvent['flight']) ?? null,
    budgetCents: (row.budget_cents as number) ?? 0,
    photoDataUrl: (row.photo_data_url as string) ?? null,
    sortOffset: (row.sort_offset as number) ?? 0,
    updatedAt: row.updated_at as string,
    backups: parseBackups(row.backups_json),
  }
}

function parseBackups(raw: unknown): EventBackup[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((b) => b && typeof b === 'object' && 'id' in b && 'title' in b) as EventBackup[]
}

function eventToRow(e: TripEvent) {
  return {
    id: e.id,
    trip_id: e.tripId,
    title: e.title,
    category: e.category,
    color: e.color ?? null,
    date: e.date,
    start_time: e.startTime,
    end_time: e.endTime,
    notes: e.notes ?? '',
    location: e.location ?? '',
    maps_url: e.mapsUrl ?? '',
    flight_json: e.flight ?? null,
    budget_cents: e.budgetCents ?? 0,
    photo_data_url: e.photoDataUrl ?? null,
    sort_offset: e.sortOffset ?? 0,
    backups_json: e.backups ?? [],
    updated_at: new Date().toISOString(),
  }
}

export async function fetchTripByToken(token: string): Promise<{
  trip: Trip
  mode: 'edit' | 'view'
} | null> {
  if (!supabaseConfigured) return null
  if (TOKEN_RE.test(token)) pendingTokens.add(token)
  const { data: editData } = await supabase
    .from('travel_trips')
    .select('*')
    .eq('edit_token', token)
    .maybeSingle()
  if (editData) {
    rememberToken(token)
    return { trip: mapTrip(editData), mode: 'edit' }
  }

  const { data: viewData } = await supabase
    .from('travel_trips')
    .select('*')
    .eq('view_token', token)
    .maybeSingle()
  if (viewData) {
    rememberToken(token)
    return { trip: mapTrip(viewData), mode: 'view' }
  }
  return null
}

export async function fetchTripBundle(tripId: string) {
  const [events, notes, checklist, expenses] = await Promise.all([
    supabase.from('travel_events').select('*').eq('trip_id', tripId),
    supabase.from('travel_notes').select('*').eq('trip_id', tripId),
    supabase.from('travel_checklist').select('*').eq('trip_id', tripId),
    supabase.from('travel_expenses').select('*').eq('trip_id', tripId),
  ])
  return {
    events: (events.data ?? []).map((r) => mapEvent(r as Record<string, unknown>)),
    notes: (notes.data ?? []).map(
      (r): TripNote => ({
        id: r.id,
        tripId: r.trip_id,
        date: r.date,
        title: r.title,
        body: r.body,
      }),
    ),
    checklist: (checklist.data ?? []).map(
      (r): ChecklistItem => ({
        id: r.id,
        tripId: r.trip_id,
        text: r.text,
        done: r.done,
        dayDate: r.day_date,
        sortOrder: r.sort_order,
      }),
    ),
    expenses: (expenses.data ?? []).map(
      (r): Expense => ({
        id: r.id,
        tripId: r.trip_id,
        eventId: r.event_id,
        label: r.label,
        category: r.category,
        amountCents: r.amount_cents,
        currency: r.currency,
        spentOn: r.spent_on,
      }),
    ),
  }
}

export async function upsertEvent(e: TripEvent) {
  return supabase.from('travel_events').upsert(eventToRow(e))
}

export async function deleteEventRemote(id: string) {
  return supabase.from('travel_events').delete().eq('id', id)
}

export async function upsertEvents(events: TripEvent[]) {
  if (!events.length) return
  return supabase.from('travel_events').upsert(events.map(eventToRow))
}

export async function deleteTripRemote(id: string) {
  return supabase.from('travel_trips').delete().eq('id', id)
}

export async function listTrips(): Promise<Trip[]> {
  if (!supabaseConfigured) return []
  const { data, error } = await supabase
    .from('travel_trips')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  const trips = (data ?? []).map((r) => mapTrip(r as Record<string, unknown>))
  for (const trip of trips) rememberToken(trip.editToken)
  return trips
}

export async function createTrip(payload: {
  name: string
  startDate: string
  endDate: string
  emergency?: EmergencyInfo
  whatIfOf?: string | null
}): Promise<Trip> {
  const { data, error } = await supabase
    .from('travel_trips')
    .insert({
      name: payload.name,
      start_date: payload.startDate,
      end_date: payload.endDate,
      emergency_json: payload.emergency ?? {},
      what_if_of: payload.whatIfOf ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  const trip = mapTrip(data)
  rememberToken(trip.editToken)
  return trip
}

export async function updateTripRemote(trip: Trip) {
  return supabase
    .from('travel_trips')
    .update({
      name: trip.name,
      start_date: trip.startDate,
      end_date: trip.endDate,
      emergency_json: trip.emergency,
      updated_at: new Date().toISOString(),
    })
    .eq('id', trip.id)
}

export async function upsertNote(n: TripNote) {
  return supabase.from('travel_notes').upsert({
    id: n.id,
    trip_id: n.tripId,
    date: n.date,
    title: n.title,
    body: n.body,
    updated_at: new Date().toISOString(),
  })
}

export async function deleteNoteRemote(id: string) {
  return supabase.from('travel_notes').delete().eq('id', id)
}

export async function upsertChecklistItem(c: ChecklistItem) {
  return supabase.from('travel_checklist').upsert({
    id: c.id,
    trip_id: c.tripId,
    text: c.text,
    done: c.done,
    day_date: c.dayDate,
    sort_order: c.sortOrder,
  })
}

export async function deleteChecklistRemote(id: string) {
  return supabase.from('travel_checklist').delete().eq('id', id)
}

export async function upsertExpense(e: Expense) {
  return supabase.from('travel_expenses').upsert({
    id: e.id,
    trip_id: e.tripId,
    event_id: e.eventId,
    label: e.label,
    category: e.category,
    amount_cents: e.amountCents,
    currency: e.currency,
    spent_on: e.spentOn,
  })
}

export async function deleteExpenseRemote(id: string) {
  return supabase.from('travel_expenses').delete().eq('id', id)
}

export async function deleteEventsForTrip(tripId: string) {
  return supabase.from('travel_events').delete().eq('trip_id', tripId)
}

export type OfflineOp =
  | { type: 'upsert_event'; payload: TripEvent }
  | { type: 'delete_event'; id: string }
  | { type: 'upsert_note'; payload: TripNote }
  | { type: 'delete_note'; id: string }
  | { type: 'upsert_checklist'; payload: ChecklistItem }
  | { type: 'delete_checklist'; id: string }
  | { type: 'upsert_expense'; payload: Expense }
  | { type: 'delete_expense'; id: string }
  | { type: 'update_trip'; payload: Trip }

const QUEUE_KEY = 'travel-planner-offline-queue'

export function loadQueue(): OfflineOp[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as OfflineOp[]
  } catch {
    return []
  }
}

export function saveQueue(ops: OfflineOp[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(ops))
}

export async function flushQueue(): Promise<number> {
  if (!supabaseConfigured || !navigator.onLine) return 0
  const ops = loadQueue()
  if (!ops.length) return 0
  const remaining: OfflineOp[] = []
  for (const op of ops) {
    try {
      if (op.type === 'upsert_event') await upsertEvent(op.payload)
      else if (op.type === 'delete_event') await deleteEventRemote(op.id)
      else if (op.type === 'upsert_note') await upsertNote(op.payload)
      else if (op.type === 'delete_note') await deleteNoteRemote(op.id)
      else if (op.type === 'upsert_checklist') await upsertChecklistItem(op.payload)
      else if (op.type === 'delete_checklist') await deleteChecklistRemote(op.id)
      else if (op.type === 'upsert_expense') await upsertExpense(op.payload)
      else if (op.type === 'delete_expense') await deleteExpenseRemote(op.id)
      else if (op.type === 'update_trip') await updateTripRemote(op.payload)
    } catch {
      remaining.push(op)
    }
  }
  saveQueue(remaining)
  return ops.length - remaining.length
}

export function enqueue(op: OfflineOp) {
  const q = loadQueue()
  q.push(op)
  saveQueue(q)
}
