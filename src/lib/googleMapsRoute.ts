import type { TripEvent } from '../types'

const VALID_TABS = new Set(['story', 'schedule', 'map', 'pack', 'wallet'])

export interface ParsedMapsUrl {
  label: string | null
  routeQuery: string
  coords: { lat: number; lng: number } | null
  placeId: string | null
}

function decodeSegment(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '))
  } catch {
    return s.replace(/\+/g, ' ')
  }
}

function cleanPlaceLabel(raw: string): string {
  return decodeSegment(raw).replace(/\s+/g, ' ').trim()
}

/** Parse a Google Maps share/search URL — no API key, no cost. */
export function parseGoogleMapsUrl(raw: string): ParsedMapsUrl | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const href = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
    const u = new URL(href)

    const q = u.searchParams.get('q') ?? u.searchParams.get('query')
    const placeIdFromQ = q?.match(/^place_id:(.+)$/i)?.[1] ?? null
    const placeId =
      placeIdFromQ ??
      u.searchParams.get('query_place_id') ??
      u.searchParams.get('place_id')

    const placePath = u.pathname.match(/\/place\/([^/@?]+)/)
    let label: string | null = null
    if (placePath?.[1] && placePath[1] !== '') {
      label = cleanPlaceLabel(placePath[1])
    } else if (q && !/^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(q) && !q.startsWith('place_id:')) {
      label = cleanPlaceLabel(q)
    }

    const d3 = href.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
    const at = href.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
    const qCoords = q?.match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/)

    let lat: number | null = null
    let lng: number | null = null
    if (d3) {
      lat = parseFloat(d3[1])
      lng = parseFloat(d3[2])
    } else if (at) {
      lat = parseFloat(at[1])
      lng = parseFloat(at[2])
    } else if (qCoords) {
      lat = parseFloat(qCoords[1])
      lng = parseFloat(qCoords[2])
    }

    let routeQuery: string | null = null
    if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      routeQuery = `${lat},${lng}`
    } else if (placeId) {
      routeQuery = `place_id:${placeId}`
    } else if (label) {
      routeQuery = label
    } else if (q) {
      routeQuery = cleanPlaceLabel(q)
    }

    if (!routeQuery) return null

    return {
      label,
      routeQuery,
      coords: lat != null && lng != null ? { lat, lng } : null,
      placeId,
    }
  } catch {
    return null
  }
}

/** Apply pasted maps URL; auto-fill location when empty (free, from URL only). */
export function mapsUrlPatch(
  mapsUrl: string,
  currentLocation: string,
): { mapsUrl: string; location?: string } {
  const parsed = parseGoogleMapsUrl(mapsUrl)
  if (parsed?.label && !currentLocation.trim()) {
    return { mapsUrl, location: parsed.label }
  }
  return { mapsUrl }
}

/** Best routing target — prefers Google Maps link over plain text name. */
export function stopQuery(event: TripEvent): string | null {
  const mapsUrl = event.mapsUrl.trim()
  if (mapsUrl) {
    const parsed = parseGoogleMapsUrl(mapsUrl)
    if (parsed) return parsed.routeQuery
  }
  const loc = event.location.trim()
  return loc || null
}

export function stopDisplayLabel(event: TripEvent): string {
  const mapsUrl = event.mapsUrl.trim()
  if (mapsUrl) {
    const parsed = parseGoogleMapsUrl(mapsUrl)
    if (parsed?.label) return parsed.label
  }
  if (event.location.trim()) return event.location.trim()
  if (mapsUrl) return 'Google Maps pin'
  return 'No place set'
}

export function stopUsesMapsPin(event: TripEvent): boolean {
  return Boolean(event.mapsUrl.trim() && parseGoogleMapsUrl(event.mapsUrl.trim()))
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
    const s = clean[0]
    if (s.startsWith('place_id:')) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s)}`
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s)}`
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
