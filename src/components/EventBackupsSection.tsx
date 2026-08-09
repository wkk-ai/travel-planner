import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Plus, Trash2 } from 'lucide-react'
import type { EventBackup, EventCategory, TripEvent } from '../types'
import { CATEGORIES, eventColors } from '../data/categories'
import { BACKUP_TAGS, backupTagLabel, newEmptyBackup } from '../lib/eventBackups'
import { useTripStore } from '../store/tripStore'
import { cn } from '../lib/time'

interface Props {
  event: TripEvent
  backups: EventBackup[]
  readOnly: boolean
  onBackupsChange: (backups: EventBackup[]) => void
  onUseBackup?: (backupId: string) => void | Promise<void>
  compact?: boolean
}

export function EventBackupsSection({
  event,
  backups,
  readOnly,
  onBackupsChange,
  onUseBackup,
  compact = false,
}: Props) {
  const swapWithBackup = useTripStore((s) => s.swapWithBackup)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function updateBackup(id: string, patch: Partial<EventBackup>) {
    onBackupsChange(backups.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }

  function removeBackup(id: string) {
    onBackupsChange(backups.filter((b) => b.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  function addBackup() {
    const b = newEmptyBackup()
    onBackupsChange([...backups, b])
    setExpandedId(b.id)
  }

  return (
    <section
      className={cn(
        compact
          ? 'rounded-xl border border-dashed border-[var(--gcal-border)] bg-[var(--gcal-bg)] p-3'
          : 'rounded-xl border border-[#dadce0] bg-[#f8f9fa]/80 p-3',
      )}
    >
      {!compact ? (
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--gcal-muted)]">
              Backup plans
            </div>
            <p className="mt-0.5 text-[11px] text-[var(--gcal-muted)]">
              Same time slot ({event.startTime}–{event.endTime}). Swap on trip day if plans change.
            </p>
          </div>
          {!readOnly ? (
            <button
              type="button"
              onClick={addBackup}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[var(--gcal-blue)] shadow-sm ring-1 ring-[var(--gcal-border)] hover:bg-[#e8f0fe]"
            >
              <Plus className="size-3.5" /> Add backup
            </button>
          ) : null}
        </div>
      ) : null}

      {backups.length === 0 ? (
        <div className={compact ? 'space-y-2' : undefined}>
          <p className={cn('text-xs text-[var(--gcal-muted)]', !compact && 'rounded-lg bg-white px-3 py-2')}>
            {compact ? 'None yet' : 'No backups yet — add an indoor option, shorter plan, or rain-day alternative.'}
          </p>
          {!readOnly ? (
            <button
              type="button"
              onClick={addBackup}
              className="text-xs font-semibold text-[var(--gcal-blue)] hover:underline"
            >
              + Add backup
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-2">
          {backups.map((backup) => (
            <BackupCard
              key={backup.id}
              backup={backup}
              expanded={expandedId === backup.id}
              readOnly={readOnly}
              onToggle={() => setExpandedId(expandedId === backup.id ? null : backup.id)}
              onChange={(patch) => updateBackup(backup.id, patch)}
              onDelete={() => removeBackup(backup.id)}
              onUse={() => {
                if (onUseBackup) void onUseBackup(backup.id)
                else void swapWithBackup(event.id, backup.id)
              }}
            />
          ))}
        </ul>
      )}
      {compact && !readOnly && backups.length > 0 ? (
        <button
          type="button"
          onClick={addBackup}
          className="mt-2 text-xs font-semibold text-[var(--gcal-blue)] hover:underline"
        >
          + Add backup
        </button>
      ) : null}
    </section>
  )
}

function BackupCard({
  backup,
  expanded,
  readOnly,
  onToggle,
  onChange,
  onDelete,
  onUse,
}: {
  backup: EventBackup
  expanded: boolean
  readOnly: boolean
  onToggle: () => void
  onChange: (patch: Partial<EventBackup>) => void
  onDelete: () => void
  onUse: () => void
}) {
  const colors = eventColors(backup.category, backup.color)
  const tagLabel = backupTagLabel(backup.tag)

  return (
    <li className="overflow-hidden rounded-xl border border-[var(--gcal-border)] bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--gcal-bg)]"
      >
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ background: colors.border }}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{backup.title || 'Untitled backup'}</div>
          {backup.location ? (
            <div className="truncate text-[11px] text-[var(--gcal-muted)]">{backup.location}</div>
          ) : null}
        </div>
        {tagLabel ? (
          <span className="rounded-full bg-[#e8f0fe] px-2 py-0.5 text-[10px] font-semibold text-[var(--gcal-blue)]">
            {tagLabel}
          </span>
        ) : null}
        {expanded ? <ChevronUp className="size-4 shrink-0" /> : <ChevronDown className="size-4 shrink-0" />}
      </button>

      {expanded ? (
        <div className="space-y-3 border-t border-[var(--gcal-border)] px-3 py-3">
          <div>
            <FieldLabel>Why (optional)</FieldLabel>
            <div className="mt-1 flex flex-wrap gap-1">
              {BACKUP_TAGS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={readOnly}
                  onClick={() => onChange({ tag: backup.tag === t.id ? null : t.id })}
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                    backup.tag === t.id
                      ? 'bg-[var(--gcal-blue)] text-white'
                      : 'bg-[var(--gcal-bg)] text-[var(--gcal-muted)]',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Title</FieldLabel>
            <input
              disabled={readOnly}
              className="mt-1 w-full rounded-xl border border-[var(--gcal-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--gcal-blue)] focus:ring-2 focus:ring-[#e8f0fe] disabled:bg-[#f8f9fa]"
              value={backup.title}
              onChange={(e) => onChange({ title: e.target.value })}
            />
          </div>

          <div>
            <FieldLabel>Category</FieldLabel>
            <div className="mt-1 flex flex-wrap gap-1">
              {Object.entries(CATEGORIES).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  disabled={readOnly}
                  onClick={() => onChange({ category: key as EventCategory, color: null })}
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    backup.category === key && !backup.color && 'ring-2 ring-offset-1',
                  )}
                  style={{
                    background: meta.bg,
                    color: meta.color,
                    outlineColor: meta.border,
                  }}
                >
                  {meta.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Location</FieldLabel>
            <input
              disabled={readOnly}
              className="mt-1 w-full rounded-xl border border-[var(--gcal-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--gcal-blue)] focus:ring-2 focus:ring-[#e8f0fe] disabled:bg-[#f8f9fa]"
              value={backup.location}
              onChange={(e) => onChange({ location: e.target.value })}
            />
          </div>

          <div>
            <FieldLabel>Maps link</FieldLabel>
            <div className="mt-1 flex gap-2">
              <input
                disabled={readOnly}
                className="mt-1 w-full flex-1 rounded-xl border border-[var(--gcal-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--gcal-blue)] focus:ring-2 focus:ring-[#e8f0fe] disabled:bg-[#f8f9fa]"
                value={backup.mapsUrl}
                onChange={(e) => onChange({ mapsUrl: e.target.value })}
              />
              {backup.mapsUrl ? (
                <a
                  href={backup.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--gcal-border)]"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              ) : null}
            </div>
          </div>

          {backup.category === 'flight' ? (
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-[#d2e3fc] bg-[#e8f0fe]/50 p-2">
              <input
                disabled={readOnly}
                className="rounded-lg border border-[var(--gcal-border)] bg-white px-2 py-1.5 text-xs"
                placeholder="Airline"
                value={backup.flight?.airline ?? ''}
                onChange={(e) =>
                  onChange({ flight: { ...backup.flight, airline: e.target.value } })
                }
              />
              <input
                disabled={readOnly}
                className="rounded-lg border border-[var(--gcal-border)] bg-white px-2 py-1.5 text-xs"
                placeholder="Flight #"
                value={backup.flight?.flightNumber ?? ''}
                onChange={(e) =>
                  onChange({ flight: { ...backup.flight, flightNumber: e.target.value } })
                }
              />
              <input
                disabled={readOnly}
                className="rounded-lg border border-[var(--gcal-border)] bg-white px-2 py-1.5 text-xs"
                placeholder="From"
                value={backup.flight?.from ?? ''}
                onChange={(e) => onChange({ flight: { ...backup.flight, from: e.target.value } })}
              />
              <input
                disabled={readOnly}
                className="rounded-lg border border-[var(--gcal-border)] bg-white px-2 py-1.5 text-xs"
                placeholder="To"
                value={backup.flight?.to ?? ''}
                onChange={(e) => onChange({ flight: { ...backup.flight, to: e.target.value } })}
              />
            </div>
          ) : null}

          <div>
            <FieldLabel>Notes</FieldLabel>
            <textarea
              disabled={readOnly}
              className="mt-1 min-h-[56px] w-full rounded-xl border border-[var(--gcal-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--gcal-blue)] focus:ring-2 focus:ring-[#e8f0fe] disabled:bg-[#f8f9fa]"
              value={backup.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
            />
          </div>

          <div>
            <FieldLabel>Budget (USD)</FieldLabel>
            <input
              type="number"
              min={0}
              step={10}
              disabled={readOnly}
              className="mt-1 w-full rounded-xl border border-[var(--gcal-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--gcal-blue)] focus:ring-2 focus:ring-[#e8f0fe] disabled:bg-[#f8f9fa]"
              value={Number((backup.budgetCents / 100).toFixed(2))}
              onChange={(e) => {
                const n = Math.max(0, parseFloat(e.target.value || '0'))
                onChange({ budgetCents: Math.round(n * 100) })
              }}
            />
          </div>

          {backup.photoDataUrl ? (
            <img src={backup.photoDataUrl} alt="" className="max-h-28 w-full rounded-lg object-cover" />
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {!readOnly ? (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#c5221f]"
              >
                <Trash2 className="size-3.5" /> Remove
              </button>
            ) : (
              <span />
            )}
            {!readOnly ? (
              <button
                type="button"
                onClick={onUse}
                className="rounded-lg bg-[var(--gcal-blue)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--gcal-blue-hover)]"
              >
                Use this instead
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gcal-muted)]">{children}</div>
}
