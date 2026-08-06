export type EventCategory =
  | 'flight'
  | 'meal'
  | 'attraction'
  | 'shopping'
  | 'show'
  | 'hotel'
  | 'transport'
  | 'other'

export interface FlightDetails {
  airline?: string
  flightNumber?: string
  from?: string
  to?: string
  departLocal?: string
  arriveLocal?: string
}

export interface TripEvent {
  id: string
  tripId: string
  title: string
  category: EventCategory
  color?: string | null
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  endTime: string // HH:mm
  notes: string
  location: string
  mapsUrl: string
  flight?: FlightDetails | null
  budgetCents: number
  photoDataUrl?: string | null
  sortOffset?: number
  updatedAt?: string
}

export interface TripNote {
  id: string
  tripId: string
  date: string | null
  title: string
  body: string
}

export interface ChecklistItem {
  id: string
  tripId: string
  text: string
  done: boolean
  dayDate: string | null
  sortOrder: number
}

export interface Expense {
  id: string
  tripId: string
  eventId: string | null
  label: string
  category: string
  amountCents: number
  currency: string
  spentOn: string | null
}

export interface EmergencyInfo {
  hotelName?: string
  hotelAddress?: string
  hotelConfirmation?: string
  hotelPhone?: string
  embassy?: string
  emergencyContact?: string
  notes?: string
}

export interface Trip {
  id: string
  name: string
  startDate: string
  endDate: string
  editToken: string
  viewToken: string
  whatIfOf: string | null
  emergency: EmergencyInfo
}

export type CalendarView = 'week' | 'day'
export type AccessMode = 'edit' | 'view'

export interface UndoSnapshot {
  label: string
  events: TripEvent[]
}
