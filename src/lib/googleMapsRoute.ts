import type { TripEvent } from '../types'

const VALID_TABS = new Set(['story', 'schedule', 'map', 'pack', 'wallet'])

/** Best label for Google Maps from an event's place name or maps link. */
export function stopQuery(event: TripEvent): string | null {
  const loc = event.location.trim()
  if (loc) return loc
  const url = event.mapsUrl.trim()
  if (!url) return null
  try {
    const u = new URL(url)
    const q = u.searchParams.get('q') ?? u.searchParams.get('query')
    if (q) return decodeURIComponent(q.replace(/\+/g, ' '))
    const path = u.pathname
    const placeMatch = path.match(/\/place\/([^/]+)/)
    if (placeMatch) return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
  } catch {
    /* ignore */
  }
  return null
}

/** Ordered stops for a day (events with a resolvable place). */
export function dayRouteStops(events: TripEvent[]): { event: TripEvent; query: string }[] {
  return [...events]
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((event) => {
      const query = stopQuery(event)
      return query ? { event, query } : null
    })
    .filter((x): x is { event: TripEvent; query: string } => x !== null)
}

/** Open one place or a multi-stop driving route in Google Maps. */
export function buildGoogleMapsRouteUrl(stops: string[]): string | null {
  const clean = stops.map((s) => s.trim()).filter(Boolean)
  if (!clean.length) return null
  if (clean.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean[0])}`
  }
  const origin = clean[0]
  const destination = clean[clean.length - 1]
  const params = new URLSearchParams({
    api: '1',
    origin,
    destination,
    travelmode: 'driving',
  })
  const waypoints = clean.slice(1, -1)
  if (waypoints.length) params.set('waypoints', waypoints.join('|'))
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export function openGoogleMapsRoute(stops: string[]) {
  const url = buildGoogleMapsRouteUrl(stops)
  if (url) window.open(url, '_blank', 'noopener,noreferrer')
}

export function isValidAppTab(raw: string | null): raw is import('../types').AppTab {
  return raw !== null && VALID_TABS.has(raw)
}
