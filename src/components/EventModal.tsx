import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, ExternalLink, Info, Trash2, X } from 'lucide-react'
import type { EventCategory, TripEvent } from '../types'
import { CATEGORIES, eventColors } from '../data/categories'
import { useTripStore } from '../store/tripStore'
import { tripDays, isoDate, timeOptions30, cn } from '../lib/time'
import { format, parseISO } from 'date-fns'

interface Props {
  event: TripEvent
  isDraft?: boolean
  onClose: () => void
}

export function EventModal({ event, isDraft = false, onClose }: Props) {
  const mode = useTripStore((s) => s.mode)
  const trip = useTripStore((s) => s.trip)!
  const updateEvent = useTripStore((s) => s.updateEvent)
  const deleteEvent = useTripStore((s) => s.deleteEvent)
  const duplicateDay = useTripStore((s) => s.duplicateDay)
  const commitDraft = useTripStore((s) => s.commitDraft)
  const discardDraft = useTripStore((s) => s.discardDraft)
  const setToast = useTripStore((s) => s.setToast)
  const readOnly = mode !== 'edit'
  const fileRef = useRef<HTMLInputElement>(null)

  const [draft, setDraft] = useState(event)
  const [dupTarget, setDupTarget] = useState('')
  const [saving, setSaving] = useState(false)
  const times = useMemo(() => timeOptions30(), [])

  useEffect(() => setDraft(event), [event])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraft])

  function handleClose() {
    if (isDraft) discardDraft()
    onClose()
  }

  async function save() {
    if (readOnly) return
    setSaving(true)
    try {
      if (isDraft) {
        await commitDraft(draft)
        setToast('Event created')
      } else {
        await updateEvent(event.id, draft)
        setToast('Event saved')
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function onPhoto(file: File | null) {
    if (!file || readOnly) return
    const reader = new FileReader()
    reader.onload = () => {
      setDraft((d) => ({ ...d, photoDataUrl: String(reader.result) }))
    }
    reader.readAsDataURL(file)
  }

  const days = tripDays(trip.startDate, trip.endDate)
  const colors = eventColors(draft.category, draft.color)

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={handleClose}
    >
      <div
        className="panel-enter flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Colored header */}
        <div
          className="relative px-5 pb-4 pt-4"
          style={{ background: colors.bg, borderBottom: `3px solid ${colors.border}` }}
        >
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-3 rounded-full bg-white/70 p-1.5 hover:bg-white"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
          <div className="pr-10 text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.color }}>
            {isDraft ? 'New event (not saved yet)' : 'Edit event'}
          </div>
          <input
            disabled={readOnly}
            className="mt-1 w-full border-0 bg-transparent text-2xl font-semibold outline-none placeholder:opacity-50"
            style={{ color: colors.color }}
            value={draft.title}
            placeholder="Event title"
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            autoFocus={isDraft}
          />
          {isDraft ? (
            <p className="mt-1 text-xs" style={{ color: colors.color }}>
              Close without Save discards this draft
            </p>
          ) : null}
        </div>

        <div className="cal-scroll flex-1 space-y-5 overflow-auto px-5 py-4">
          {/* Category chips */}
          <section>
            <Label>Category</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {Object.entries(CATEGORIES).map(([key, meta]) => {
                const active = draft.category === key && !draft.color
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={readOnly}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        category: key as EventCategory,
                        color: null,
                      })
                    }
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-semibold transition-shadow',
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
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-[var(--gcal-muted)]">Custom color</span>
              <input
                type="color"
                disabled={readOnly}
                value={draft.color ?? colors.border}
                onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                className="h-8 w-10 cursor-pointer rounded border border-[var(--gcal-border)] bg-white"
              />
              {draft.color ? (
                <button
                  type="button"
                  disabled={readOnly}
                  className="text-xs font-medium text-[var(--gcal-blue)]"
                  onClick={() => setDraft({ ...draft, color: null })}
                >
                  Use category color
                </button>
              ) : null}
            </div>
          </section>

          {/* When */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label>Date</Label>
              <input
                type="date"
                disabled={readOnly}
                className="field mt-1"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Start</Label>
              <select
                disabled={readOnly}
                className="field mt-1"
                value={normalizeTimeOption(draft.startTime, times)}
                onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
              >
                {times.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>End</Label>
              <select
                disabled={readOnly}
                className="field mt-1"
                value={normalizeTimeOption(draft.endTime, times)}
                onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
              >
                {times.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Place */}
          <section className="space-y-2">
            <div>
              <Label>Location</Label>
              <input
                disabled={readOnly}
                className="field mt-1"
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                placeholder="Place name"
              />
            </div>
            <div>
              <Label>Google Maps link</Label>
              <div className="mt-1 flex gap-2">
                <input
                  disabled={readOnly}
                  className="field flex-1"
                  value={draft.mapsUrl}
                  onChange={(e) => setDraft({ ...draft, mapsUrl: e.target.value })}
                  placeholder="https://maps.google.com/…"
                />
                {draft.mapsUrl ? (
                  <a
                    href={draft.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--gcal-border)] hover:bg-[var(--gcal-bg)]"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                ) : null}
              </div>
            </div>
          </section>

          {draft.category === 'flight' ? (
            <section className="rounded-xl border border-[#d2e3fc] bg-[#e8f0fe]/60 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gcal-blue)]">
                Flight details
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  disabled={readOnly}
                  className="field"
                  placeholder="Airline"
                  value={draft.flight?.airline ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, flight: { ...draft.flight, airline: e.target.value } })
                  }
                />
                <input
                  disabled={readOnly}
                  className="field"
                  placeholder="Flight #"
                  value={draft.flight?.flightNumber ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      flight: { ...draft.flight, flightNumber: e.target.value },
                    })
                  }
                />
                <input
                  disabled={readOnly}
                  className="field"
                  placeholder="From"
                  value={draft.flight?.from ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, flight: { ...draft.flight, from: e.target.value } })
                  }
                />
                <input
                  disabled={readOnly}
                  className="field"
                  placeholder="To"
                  value={draft.flight?.to ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, flight: { ...draft.flight, to: e.target.value } })
                  }
                />
              </div>
            </section>
          ) : null}

          <section>
            <Label>Notes</Label>
            <textarea
              disabled={readOnly}
              className="field mt-1 min-h-[72px]"
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="Extra details…"
            />
          </section>

          <section>
            <Label>Budget (USD)</Label>
            <input
              type="number"
              min={0}
              step={10}
              disabled={readOnly}
              className="field mt-1"
              value={Number((draft.budgetCents / 100).toFixed(2))}
              onChange={(e) => {
                const n = Math.max(0, parseFloat(e.target.value || '0'))
                setDraft({ ...draft, budgetCents: Math.round(n * 100) })
              }}
            />
          </section>

          <section>
            <Label>Photo</Label>
            {draft.photoDataUrl ? (
              <img
                src={draft.photoDataUrl}
                alt=""
                className="mt-1 mb-2 max-h-40 w-full rounded-xl object-cover"
              />
            ) : null}
            {!readOnly ? (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => void onPhoto(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--gcal-border)] bg-[var(--gcal-bg)] px-4 py-3 text-sm font-medium text-[var(--gcal-text)] hover:border-[var(--gcal-blue)] hover:bg-[#e8f0fe]"
                >
                  <Camera className="size-4 text-[var(--gcal-blue)]" />
                  {draft.photoDataUrl ? 'Change photo' : 'Add photo'}
                </button>
              </>
            ) : null}
          </section>

          {!readOnly && !isDraft ? (
            <section className="rounded-xl border border-[var(--gcal-border)] bg-[var(--gcal-bg)]/50 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--gcal-muted)]">
                Duplicate this day
                <span className="group relative inline-flex">
                  <Info className="size-3.5 cursor-help text-[var(--gcal-blue)]" />
                  <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-20 hidden w-56 -translate-x-1/2 rounded-md bg-[#3c4043] px-2 py-1.5 text-[11px] font-normal normal-case tracking-normal text-white shadow-lg group-hover:block">
                    Copies every event from this day onto another day (template for similar park/shopping days).
                  </span>
                </span>
              </div>
              <div className="flex gap-2">
                <select
                  className="field flex-1"
                  value={dupTarget}
                  onChange={(e) => setDupTarget(e.target.value)}
                >
                  <option value="">Copy all events to…</option>
                  {days
                    .map((d) => isoDate(d))
                    .filter((d) => d !== draft.date)
                    .map((d) => (
                      <option key={d} value={d}>
                        {format(parseISO(d), 'EEE dd/MM')}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={!dupTarget}
                  className="rounded-xl bg-white px-3 text-sm font-medium shadow-sm disabled:opacity-40"
                  onClick={() => {
                    void duplicateDay(draft.date, dupTarget)
                    handleClose()
                  }}
                >
                  Copy
                </button>
              </div>
            </section>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[var(--gcal-border)] bg-white px-4 py-3">
          {!readOnly && !isDraft ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-[#c5221f] hover:bg-[#fce8e6]"
              onClick={() => {
                void deleteEvent(event.id)
                onClose()
              }}
            >
              <Trash2 className="size-4" /> Delete
            </button>
          ) : (
            <button
              type="button"
              className="rounded-xl px-3 py-2 text-sm font-medium text-[var(--gcal-muted)] hover:bg-[var(--gcal-bg)]"
              onClick={handleClose}
            >
              {isDraft ? 'Discard' : ' '}
            </button>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl px-4 py-2 text-sm font-medium hover:bg-[var(--gcal-bg)]"
            >
              {isDraft ? 'Cancel' : 'Close'}
            </button>
            {!readOnly ? (
              <button
                type="button"
                disabled={saving || !draft.title.trim()}
                onClick={() => void save()}
                className="rounded-xl bg-[var(--gcal-blue)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--gcal-blue-hover)] disabled:opacity-40"
              >
                {isDraft ? 'Create event' : 'Save'}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <style>{`
        .field {
          width: 100%;
          border: 1px solid var(--gcal-border);
          border-radius: 0.75rem;
          padding: 0.55rem 0.75rem;
          background: white;
          outline: none;
        }
        .field:focus {
          border-color: var(--gcal-blue);
          box-shadow: 0 0 0 3px #e8f0fe;
        }
        .field:disabled {
          background: #f8f9fa;
          color: #70757a;
        }
      `}</style>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-semibold text-[var(--gcal-muted)]">{children}</div>
}

function normalizeTimeOption(time: string, options: string[]): string {
  const t = time.slice(0, 5)
  if (options.includes(t)) return t
  // snap odd times (e.g. 13:27) to nearest listed option for the select
  const [h, m] = t.split(':').map(Number)
  const mins = h * 60 + (m || 0)
  const snapped = Math.round(mins / 30) * 30
  const hh = String(Math.floor((snapped % (24 * 60)) / 60)).padStart(2, '0')
  const mm = String(snapped % 60).padStart(2, '0')
  const candidate = `${hh}:${mm}`
  return options.includes(candidate) ? candidate : options[0]
}
