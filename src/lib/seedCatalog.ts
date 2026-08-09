import { SEED_EVENTS } from '../data/seed'
import type { TripEvent } from '../types'

export function seedEventKey(event: { date: string; startTime: string; title: string }): string {
  return `${event.date}|${event.startTime}|${event.title}`
}

const SEED_BY_KEY = new Map(SEED_EVENTS.map((s) => [seedEventKey(s), s]))

/** Fill missing location / Maps links from the seed catalog (does not overwrite user edits). */
export function mergeEventsWithSeedCatalog(events: TripEvent[]): TripEvent[] {
  return events.map((event) => {
    const seed = SEED_BY_KEY.get(seedEventKey(event))
    if (!seed) return event

    let next = event
    const venueFix =
      seed.location &&
      event.location === 'Chase Center' &&
      seed.location === 'Oakland Coliseum'
    const mapsFix =
      seed.mapsUrl &&
      (event.mapsUrl.includes('Chase+Center') || event.mapsUrl.includes('Chase%20Center'))

    if (seed.mapsUrl && (!event.mapsUrl.trim() || venueFix || mapsFix)) {
      next = { ...next, mapsUrl: seed.mapsUrl }
    }
    if (seed.location && (!event.location.trim() || venueFix)) {
      next = { ...next, location: seed.location }
    }
    return next
  })
}

export function seedCatalogChanged(before: TripEvent[], after: TripEvent[]): boolean {
  return after.some(
    (e, i) => e.mapsUrl !== before[i].mapsUrl || e.location !== before[i].location,
  )
}
