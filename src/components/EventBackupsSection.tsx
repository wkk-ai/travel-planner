import { useState } from 'react'
import { ChevronDown, ExternalLink, Plus, Trash2 } from 'lucide-react'
import type { EventBackup, EventCategory, TripEvent } from '../types'
import { CATEGORIES, eventColors } from '../data/categories'
import { BACKUP_TAGS, backupTagLabel, newEmptyBackup } from '../lib/eventBackups'
import { useTripStore } from '../store/tripStore'
import { cn } from '../lib/time'
import { FormRow } from './FormRow'

interface Props {
  event: TripEvent
  backups: EventBackup[]
  readOnly: boolean
  onBackupsChange: (backups: EventBackup[]) => void
  onUseBackup?: (backupId: string) => void | Promise<void>
}

export function EventBackupsSection({
  event,
  backups,
  readOnly,
  onBackupsChange,
  onUseBackup,
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
    <div>
      {backups.length === 0 ? (
        <div className="px-5 py-4">
          <p className="text-sm text-[var(--gcal-muted)]">None yet — add a rain-day or indoor alternative.</p>
          {!readOnly ? (
            <button
              type="button"
              onClick={addBackup}
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[var(--gcal-blue)] hover:underline"
            >
              <Plus className="size-4" /> Add backup
            </button>
          ) : null}
        </div>
      ) : (
        <ul>
          {backups.map((backup, index) => (
            <BackupCard
              key={backup.id}
              backup={backup}
              expanded={expandedId === backup.id}
              readOnly={readOnly}
              isLast={index === backups.length - 1}
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
      {!readOnly && backups.length > 0 ? (
        <div className="border-t border-[#eef0f2] px-5 py-3">
          <button
            type="button"
            onClick={addBackup}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--gcal-blue)] hover:underline"
          >
            <Plus className="size-4" /> Add backup
          </button>
        </div>
      ) : null}
    </div>
  )
}

function BackupCard({
  backup,
  expanded,
  readOnly,
  isLast,
  onToggle,
  onChange,
  onDelete,
  onUse,
}: {
  backup: EventBackup
  expanded: boolean
  readOnly: boolean
  isLast: boolean
  onToggle: () => void
  onChange: (patch: Partial<EventBackup>) => void
  onDelete: () => void
  onUse: () => void
}) {
  const colors = eventColors(backup.category, backup.color)
  const tagLabel = backupTagLabel(backup.tag)
  const onCustom = Boolean(backup.color)

  return (
    <li className={cn(!isLast && 'border-b border-[#eef0f2]')}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:brightness-[0.98]"
        style={{
          background: colors.bg,
          borderBottom: expanded ? `3px solid ${colors.border}` : undefined,
        }}
      >
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ background: colors.border }}
        />
        <div className="min-w-0 flex-1">
          <div
            className="truncate text-sm font-semibold"
            style={{ color: onCustom ? '#fff' : colors.color }}
          >
            {backup.title || 'Untitled backup'}
          </div>
          {backup.location ? (
            <div
              className="truncate text-[11px]"
              style={{ color: onCustom ? 'rgba(255,255,255,0.85)' : 'var(--gcal-muted)' }}
            >
              {backup.location}
            </div>
          ) : null}
        </div>
        {tagLabel ? (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{
              background: onCustom ? 'rgba(255,255,255,0.2)' : '#fff',
              color: onCustom ? '#fff' : colors.color,
            }}
          >
            {tagLabel}
          </span>
        ) : null}
        <ChevronDown
          className={cn('size-4 shrink-0 transition-transform', expanded && 'rotate-180')}
          style={{ color: onCustom ? '#fff' : colors.color }}
        />
      </button>

      {expanded ? (
        <div className="bg-white">
          <FormRow label="Why" hint="Optional reason" inset>
            <div className="flex flex-wrap gap-1.5">
              {BACKUP_TAGS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={readOnly}
                  onClick={() => onChange({ tag: backup.tag === t.id ? null : t.id })}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold',
                    backup.tag === t.id
                      ? 'bg-[var(--gcal-blue)] text-white'
                      : 'border border-[var(--gcal-border)] bg-white text-[var(--gcal-muted)]',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </FormRow>

          <FormRow label="Title" hint="Name on schedule" inset>
            <input
              disabled={readOnly}
              className="field"
              value={backup.title}
              onChange={(e) => onChange({ title: e.target.value })}
            />
          </FormRow>

          <FormRow label="Category" hint="Color on calendar" inset>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(CATEGORIES).map(([key, meta]) => {
                const active = backup.category === key && !backup.color
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={readOnly}
                    onClick={() => onChange({ category: key as EventCategory, color: null })}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-semibold',
                      active && 'outline outline-2 outline-offset-1',
                    )}
                    style={{
                      background: meta.bg,
                      color: meta.color,
                      outlineColor: active ? meta.border : undefined,
                    }}
                  >
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </FormRow>

          <FormRow label="Location" hint="Venue or address" inset>
            <input
              disabled={readOnly}
              className="field"
              value={backup.location}
              onChange={(e) => onChange({ location: e.target.value })}
              placeholder="Place name"
            />
          </FormRow>

          <FormRow label="Maps" hint="Open in Google Maps" inset>
            <div className="flex gap-2">
              <input
                disabled={readOnly}
                className="field min-w-0 flex-1"
                value={backup.mapsUrl}
                onChange={(e) => onChange({ mapsUrl: e.target.value })}
                placeholder="Paste URL"
              />
              {backup.mapsUrl ? (
                <a
                  href={backup.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--gcal-border)] hover:bg-[var(--gcal-bg)]"
                >
                  <ExternalLink className="size-4" />
                </a>
              ) : null}
            </div>
          </FormRow>

          {backup.category === 'flight' ? (
            <FormRow label="Flight" hint="Airline details" inset>
              <div className="grid grid-cols-2 gap-2">
                <input
                  disabled={readOnly}
                  className="field"
                  placeholder="Airline"
                  value={backup.flight?.airline ?? ''}
                  onChange={(e) =>
                    onChange({ flight: { ...backup.flight, airline: e.target.value } })
                  }
                />
                <input
                  disabled={readOnly}
                  className="field"
                  placeholder="Flight #"
                  value={backup.flight?.flightNumber ?? ''}
                  onChange={(e) =>
                    onChange({ flight: { ...backup.flight, flightNumber: e.target.value } })
                  }
                />
                <input
                  disabled={readOnly}
                  className="field"
                  placeholder="From"
                  value={backup.flight?.from ?? ''}
                  onChange={(e) => onChange({ flight: { ...backup.flight, from: e.target.value } })}
                />
                <input
                  disabled={readOnly}
                  className="field"
                  placeholder="To"
                  value={backup.flight?.to ?? ''}
                  onChange={(e) => onChange({ flight: { ...backup.flight, to: e.target.value } })}
                />
              </div>
            </FormRow>
          ) : null}

          <FormRow label="Notes" hint="Private details" inset>
            <textarea
              disabled={readOnly}
              className="field min-h-[72px] resize-none"
              value={backup.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
            />
          </FormRow>

          <FormRow label="Budget" hint="Estimated cost" inset>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--gcal-muted)]">$</span>
              <input
                type="number"
                min={0}
                step={10}
                disabled={readOnly}
                className="field"
                value={Number((backup.budgetCents / 100).toFixed(2))}
                onChange={(e) => {
                  const n = Math.max(0, parseFloat(e.target.value || '0'))
                  onChange({ budgetCents: Math.round(n * 100) })
                }}
              />
            </div>
          </FormRow>

          {backup.photoDataUrl ? (
            <FormRow label="Photo" hint="Attached image" inset>
              <img src={backup.photoDataUrl} alt="" className="max-h-36 w-full rounded-xl object-cover" />
            </FormRow>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eef0f2] px-5 py-3">
            {!readOnly ? (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#c5221f] hover:underline"
              >
                <Trash2 className="size-4" /> Remove
              </button>
            ) : (
              <span />
            )}
            {!readOnly ? (
              <button
                type="button"
                onClick={onUse}
                className="rounded-xl bg-[var(--gcal-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--gcal-blue-hover)]"
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
