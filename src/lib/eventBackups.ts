import { v4 as uuid } from 'uuid'
import type { BackupTag, EventBackup, TripEvent } from '../types'

export const BACKUP_TAGS: { id: BackupTag; label: string }[] = [
  { id: 'rain', label: 'Rain' },
  { id: 'closed', label: 'Closed' },
  { id: 'tired', label: 'Tired' },
  { id: 'other', label: 'Other' },
]

export function backupCount(event: TripEvent): number {
  return event.backups?.length ?? 0
}

export function eventContentToBackup(
  event: Pick<
    TripEvent,
    | 'title'
    | 'category'
    | 'color'
    | 'notes'
    | 'location'
    | 'mapsUrl'
    | 'flight'
    | 'budgetCents'
    | 'photoDataUrl'
  >,
  id: string,
  tag: BackupTag | null = null,
): EventBackup {
  return {
    id,
    tag,
    title: event.title,
    category: event.category,
    color: event.color ?? null,
    notes: event.notes,
    location: event.location,
    mapsUrl: event.mapsUrl,
    flight: event.flight ?? null,
    budgetCents: event.budgetCents,
    photoDataUrl: event.photoDataUrl ?? null,
  }
}

export function newEmptyBackup(): EventBackup {
  return {
    id: uuid(),
    tag: null,
    title: 'Backup plan',
    category: 'other',
    color: null,
    notes: '',
    location: '',
    mapsUrl: '',
    flight: null,
    budgetCents: 0,
    photoDataUrl: null,
  }
}

export function swapEventWithBackup(event: TripEvent, backupId: string): TripEvent {
  const backups = event.backups ?? []
  const idx = backups.findIndex((b) => b.id === backupId)
  if (idx < 0) return event

  const backup = backups[idx]
  const formerMain = eventContentToBackup(event, backup.id, null)
  const newBackups = [...backups]
  newBackups[idx] = formerMain

  return {
    ...event,
    title: backup.title,
    category: backup.category,
    color: backup.color ?? null,
    notes: backup.notes,
    location: backup.location,
    mapsUrl: backup.mapsUrl,
    flight: backup.flight ?? null,
    budgetCents: backup.budgetCents,
    photoDataUrl: backup.photoDataUrl ?? null,
    backups: newBackups,
  }
}

export function backupTagLabel(tag: BackupTag | null): string | null {
  if (!tag) return null
  return BACKUP_TAGS.find((t) => t.id === tag)?.label ?? null
}
