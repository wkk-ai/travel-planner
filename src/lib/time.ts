import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  addDays,
  addMinutes,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  isWithinInterval,
  parse,
  parseISO,
} from 'date-fns'
import type { TripEvent } from '../types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const HOUR_HEIGHT = 56
export const SLOT_MINUTES = 30
/**
 * Google Calendar look: back-to-back blocks share an edge (tiny overlap)
 * so anti-alias / corner radius cannot leave a full-width white stripe.
 * Negative = overlap in px; 0 = flush; positive = white gap (avoid).
 */
export const EVENT_GAP_PX = -1
export const GRID_START = 0 // midnight
export const GRID_END = 24

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function minutesToTime(mins: number): string {
  const clamped = ((mins % (24 * 60)) + 24 * 60) % (24 * 60)
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function eventTopPx(startTime: string): number {
  // Positive gap insets from the top; negative gap expands upward slightly.
  return (timeToMinutes(startTime) / 60) * HOUR_HEIGHT + EVENT_GAP_PX / 2
}

export function eventHeightPx(startTime: string, endTime: string): number {
  let start = timeToMinutes(startTime)
  let end = timeToMinutes(endTime)
  if (end <= start) end += 24 * 60
  const h = ((end - start) / 60) * HOUR_HEIGHT
  // Subtracting a negative gap grows height so neighbors overlap by |gap|.
  return Math.max(h - EVENT_GAP_PX, 20)
}

export function tripDays(startDate: string, endDate: string): Date[] {
  return eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate),
  })
}

export function formatDayHeader(d: Date): { date: string; weekday: string } {
  return {
    date: format(d, 'dd/MM/yyyy'),
    weekday: format(d, 'EEEE').toUpperCase(),
  }
}

export function isoDate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function eventsOverlap(a: TripEvent, b: TripEvent): boolean {
  if (a.date !== b.date || a.id === b.id) return false
  const as = timeToMinutes(a.startTime)
  let ae = timeToMinutes(a.endTime)
  const bs = timeToMinutes(b.startTime)
  let be = timeToMinutes(b.endTime)
  if (ae <= as) ae += 24 * 60
  if (be <= bs) be += 24 * 60
  return as < be && bs < ae
}

export function gapMinutes(earlier: TripEvent, later: TripEvent): number | null {
  if (earlier.date !== later.date) return null
  const end = timeToMinutes(earlier.endTime)
  const start = timeToMinutes(later.startTime)
  return start - end
}

/** Warn when next event starts less than bufferMins after a flight/transport ends */
export function travelBufferWarnings(
  events: TripEvent[],
  bufferMins = 45,
): { eventId: string; message: string }[] {
  const warnings: { eventId: string; message: string }[] = []
  const byDate = new Map<string, TripEvent[]>()
  for (const e of events) {
    const list = byDate.get(e.date) ?? []
    list.push(e)
    byDate.set(e.date, list)
  }
  for (const [, list] of byDate) {
    const sorted = [...list].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
    )
    for (let i = 0; i < sorted.length - 1; i++) {
      const cur = sorted[i]
      const next = sorted[i + 1]
      if (cur.category !== 'flight' && cur.category !== 'transport') continue
      const gap = gapMinutes(cur, next)
      if (gap !== null && gap < bufferMins && gap >= 0) {
        warnings.push({
          eventId: next.id,
          message: `Only ${gap}m after ${cur.title} — tight travel buffer`,
        })
      }
    }
  }
  return warnings
}

export function currentEventAt(
  events: TripEvent[],
  now = new Date(),
): TripEvent | null {
  const date = isoDate(now)
  const mins = now.getHours() * 60 + now.getMinutes()
  return (
    events.find((e) => {
      if (e.date !== date) return false
      const s = timeToMinutes(e.startTime)
      let end = timeToMinutes(e.endTime)
      if (end <= s) end += 24 * 60
      return mins >= s && mins < end
    }) ?? null
  )
}

export function shiftEventsFrom(
  events: TripEvent[],
  date: string,
  fromTime: string,
  deltaMinutes: number,
): TripEvent[] {
  const from = timeToMinutes(fromTime)
  return events.map((e) => {
    if (e.date !== date) return e
    if (timeToMinutes(e.startTime) < from) return e
    const start = timeToMinutes(e.startTime) + deltaMinutes
    const end = timeToMinutes(e.endTime) + deltaMinutes
    return {
      ...e,
      startTime: minutesToTime(start),
      endTime: minutesToTime(Math.min(end, 23 * 60 + 59)),
    }
  })
}

export function parseConfirmationText(text: string): Partial<TripEvent> | null {
  const flightMatch = text.match(
    /(?:flight|voo)?\s*([A-Z]{2})\s*(\d{1,4}).*?([A-Z]{3}).*?(?:→|->|to|-).*?([A-Z]{3})/i,
  )
  const timeMatch = text.match(/(\d{1,2}:\d{2}).*?(\d{1,2}:\d{2})/)
  const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})|(\d{1,2}\/\d{1,2}\/\d{2,4})/)

  if (!flightMatch && !timeMatch) return null

  let date = isoDate(new Date())
  if (dateMatch) {
    if (dateMatch[1]) date = dateMatch[1]
    else if (dateMatch[2]) {
      const [d, m, y] = dateMatch[2].split('/')
      const year = y.length === 2 ? `20${y}` : y
      date = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
  }

  const startTime = timeMatch?.[1]?.padStart(5, '0') ?? '12:00'
  const endTime = timeMatch?.[2]?.padStart(5, '0') ?? '13:00'

  if (flightMatch) {
    const [, airline, num, from, to] = flightMatch
    return {
      title: `Flight ${from.toUpperCase()} → ${to.toUpperCase()}`,
      category: 'flight',
      date,
      startTime,
      endTime,
      notes: `${airline.toUpperCase()} ${num}`,
      flight: {
        airline: airline.toUpperCase(),
        flightNumber: num,
        from: from.toUpperCase(),
        to: to.toUpperCase(),
      },
    }
  }

  return {
    title: text.slice(0, 60).trim() || 'Imported event',
    category: 'other',
    date,
    startTime,
    endTime,
    notes: text.slice(0, 400),
  }
}

export function daysUntil(target: string, from = new Date()): number {
  return differenceInCalendarDays(parseISO(target), from)
}

export function isDateInTrip(date: string, start: string, end: string): boolean {
  return isWithinInterval(parseISO(date), {
    start: parseISO(start),
    end: parseISO(end),
  })
}

export function snapMinutes(mins: number, step = SLOT_MINUTES): number {
  return Math.round(mins / step) * step
}

export function timeOptions30(): string[] {
  const opts: string[] = []
  for (let m = 0; m < 24 * 60; m += SLOT_MINUTES) {
    opts.push(minutesToTime(m))
  }
  return opts
}


export function addDaysIso(date: string, days: number): string {
  return isoDate(addDays(parseISO(date), days))
}

export function combineDateTime(date: string, time: string): Date {
  return parse(`${date} ${time}`, 'yyyy-MM-dd HH:mm', new Date())
}

export function addMinutesToTime(time: string, mins: number): string {
  const base = parse(time, 'HH:mm', new Date())
  return format(addMinutes(base, mins), 'HH:mm')
}
