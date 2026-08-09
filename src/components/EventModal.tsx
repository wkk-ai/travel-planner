import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, ExternalLink, Receipt, Trash2, X } from 'lucide-react'
import type { EventCategory, TripEvent } from '../types'
import { CATEGORIES, eventColors } from '../data/categories'
import { useTripStore } from '../store/tripStore'
import { timeOptions30, cn } from '../lib/time'
import { EventBackupsSection } from './EventBackupsSection'
import { FormRow } from './FormRow'
import { formatUsd, eventSpentCents } from '../lib/wallet'

interface Props {
  event: TripEvent
  isDraft?: boolean
  onClose: () => void
}

export function EventModal({ event, isDraft = false, onClose }: Props) {
  const mode = useTripStore((s) => s.mode)
  const updateEvent = useTripStore((s) => s.updateEvent)
  const deleteEvent = useTripStore((s) => s.deleteEvent)
  const commitDraft = useTripStore((s) => s.commitDraft)
  const discardDraft = useTripStore((s) => s.discardDraft)
  const setToast = useTripStore((s) => s.setToast)
  const expenses = useTripStore((s) => s.expenses)
  const addExpense = useTripStore((s) => s.addExpense)
  const readOnly = mode !== 'edit'
  const fileRef = useRef<HTMLInputElement>(null)

  const [draft, setDraft] = useState(event)
  const [saving, setSaving] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const times = useMemo(() => timeOptions30(), [])

  const dirty = useMemo(
    () => !isDraft && !readOnly && JSON.stringify(draft) !== JSON.stringify(event),
    [draft, event, isDraft, readOnly],
  )

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
    if (!isDraft && dirty) {
      setConfirmDiscard(true)
      return
    }
    if (isDraft) discardDraft()
    onClose()
  }

  function confirmAndClose() {
    setConfirmDiscard(false)
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

  const headerTitle = draft.title.trim() || (isDraft ? 'New event' : 'Untitled event')
  const colors = eventColors(draft.category, draft.color)
  const onCustomColor = Boolean(draft.color)
  const spentOnEvent = !isDraft ? eventSpentCents(event.id, expenses) : 0

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={handleClose}
    >
      <div
        className="panel-enter flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative px-5 py-4"
          style={{
            background: colors.bg,
            borderBottom: `3px solid ${colors.border}`,
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-3 rounded-lg bg-white/80 p-1.5 hover:bg-white"
            aria-label="Close"
          >
            <X className="size-4 text-[var(--gcal-muted)]" />
          </button>
          <h2
            className="pr-10 text-lg font-bold"
            style={{ color: onCustomColor ? '#fff' : colors.color }}
          >
            Event details
          </h2>
          <p
            className="mt-0.5 truncate pr-10 text-xs"
            style={{ color: onCustomColor ? 'rgba(255,255,255,0.85)' : 'var(--gcal-muted)' }}
          >
            {headerTitle}
          </p>
          {isDraft ? (
            <p
              className="mt-1 text-[11px]"
              style={{ color: onCustomColor ? 'rgba(255,255,255,0.75)' : 'var(--gcal-muted)' }}
            >
              Close without saving discards this draft
            </p>
          ) : null}
        </div>

        <div className="cal-scroll flex-1 overflow-auto">
          <FormRow label="Title" hint="Name on schedule">
            <input
              disabled={readOnly}
              className="field"
              value={draft.title}
              placeholder="Event title"
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              autoFocus={isDraft}
            />
          </FormRow>

          <FormRow label="Date" hint="Day of trip">
            <input
              type="date"
              disabled={readOnly}
              className="field"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
          </FormRow>

          <FormRow label="Time" hint="Start and end">
            <div className="grid grid-cols-2 gap-2">
              <select
                disabled={readOnly}
                className="field"
                value={normalizeTimeOption(draft.startTime, times)}
                onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
                aria-label="Start time"
              >
                {times.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                disabled={readOnly}
                className="field"
                value={normalizeTimeOption(draft.endTime, times)}
                onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                aria-label="End time"
              >
                {times.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </FormRow>

          <FormRow label="Category" hint="Color on calendar">
            <div className="flex flex-wrap gap-1.5">
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
              <span className="text-[11px] text-[var(--gcal-muted)]">Custom color</span>
              <input
                type="color"
                disabled={readOnly}
                value={draft.color ?? CATEGORIES[draft.category].border}
                onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                className="h-8 w-10 cursor-pointer rounded border border-[var(--gcal-border)] bg-white"
              />
              {draft.color ? (
                <button
                  type="button"
                  disabled={readOnly}
                  className="text-[11px] font-medium text-[var(--gcal-blue)]"
                  onClick={() => setDraft({ ...draft, color: null })}
                >
                  Use category color
                </button>
              ) : null}
            </div>
          </FormRow>

          <FormRow label="Location" hint="Venue or address">
            <input
              disabled={readOnly}
              className="field"
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              placeholder="Place name"
            />
          </FormRow>

          <FormRow label="Maps" hint="Open in Google Maps">
            <div className="flex gap-2">
              <input
                disabled={readOnly}
                className="field min-w-0 flex-1"
                value={draft.mapsUrl}
                onChange={(e) => setDraft({ ...draft, mapsUrl: e.target.value })}
                placeholder="Paste URL"
              />
              {draft.mapsUrl ? (
                <a
                  href={draft.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--gcal-border)] hover:bg-[var(--gcal-bg)]"
                >
                  <ExternalLink className="size-4" />
                </a>
              ) : null}
            </div>
          </FormRow>

          {draft.category === 'flight' ? (
            <FormRow label="Flight" hint="Airline details">
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
            </FormRow>
          ) : null}

          <FormRow label="Notes" hint="Private details">
            <textarea
              disabled={readOnly}
              className="field min-h-[72px] resize-none"
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="Extra details…"
            />
          </FormRow>

          <FormRow label="Budget" hint="Estimated cost">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--gcal-muted)]">$</span>
              <input
                type="number"
                min={0}
                step={10}
                disabled={readOnly}
                className="field"
                value={Number((draft.budgetCents / 100).toFixed(2))}
                onChange={(e) => {
                  const n = Math.max(0, parseFloat(e.target.value || '0'))
                  setDraft({ ...draft, budgetCents: Math.round(n * 100) })
                }}
              />
            </div>
          </FormRow>

          {!isDraft ? (
            <FormRow label="Spent" hint="Actual cost logged">
              <div className="space-y-2">
                {spentOnEvent > 0 ? (
                  <p className="text-ui-sm font-semibold text-[#137333]">
                    Logged: {formatUsd(spentOnEvent)}
                  </p>
                ) : (
                  <p className="text-ui-sm text-[var(--gcal-muted)]">Nothing logged yet</p>
                )}
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={() => {
                      void addExpense({
                        eventId: event.id,
                        label: draft.title || 'Expense',
                        category: draft.category,
                        amountCents: draft.budgetCents > 0 ? draft.budgetCents : 1000,
                        spentOn: draft.date,
                      })
                      setToast('Expense logged — see Wallet')
                    }}
                    className="field inline-flex w-full items-center justify-center gap-2 border-dashed bg-[var(--gcal-bg)] text-sm font-semibold text-[var(--gcal-blue)] hover:border-[var(--gcal-blue)] hover:bg-[#e8f0fe]"
                  >
                    <Receipt className="size-4" />
                    Log expense for this event
                  </button>
                ) : null}
              </div>
            </FormRow>
          ) : null}

          <FormRow label="Photo" hint="Optional image">
            {draft.photoDataUrl ? (
              <img
                src={draft.photoDataUrl}
                alt=""
                className="mb-2 max-h-36 w-full rounded-xl object-cover"
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
                  className="field inline-flex w-full items-center justify-center gap-2 border-dashed bg-[var(--gcal-bg)] text-sm font-medium hover:border-[var(--gcal-blue)] hover:bg-[#e8f0fe]"
                >
                  <Camera className="size-4 text-[var(--gcal-blue)]" />
                  {draft.photoDataUrl ? 'Change photo' : 'Add photo'}
                </button>
              </>
            ) : draft.photoDataUrl ? null : (
              <p className="py-2 text-sm text-[var(--gcal-muted)]">No photo</p>
            )}
          </FormRow>

          {!isDraft ? (
            <div className="border-t border-[#eef0f2]">
              <div className="px-5 py-3.5">
                <div className="text-[13px] font-semibold text-[var(--gcal-text)]">Backups</div>
                <p className="mt-0.5 text-[11px] font-medium text-[var(--gcal-muted)]">
                  Plan B same slot · {draft.startTime}–{draft.endTime}
                </p>
              </div>
              <EventBackupsSection
                event={draft}
                backups={draft.backups ?? []}
                readOnly={readOnly}
                onBackupsChange={(backups) => setDraft({ ...draft, backups })}
                onUseBackup={async (backupId) => {
                  await useTripStore
                    .getState()
                    .swapWithBackup(event.id, backupId, { ...draft, backups: draft.backups ?? [] })
                }}
              />
            </div>
          ) : null}
        </div>

        {confirmDiscard ? (
          <div className="border-t border-[#fce8e6] bg-[#fef7f0] px-4 py-3">
            <p className="text-ui-sm font-medium text-[var(--gcal-text)]">Discard unsaved changes?</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDiscard(false)}
                className="rounded-lg px-3 py-1.5 text-ui-sm font-semibold hover:bg-white/80"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={confirmAndClose}
                className="rounded-lg bg-[#c5221f] px-3 py-1.5 text-ui-sm font-semibold text-white"
              >
                Discard
              </button>
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            'flex items-center gap-2 border-t border-[var(--gcal-border)] bg-white px-4 py-3',
            readOnly || isDraft ? 'justify-end' : 'justify-between',
          )}
        >
          {!readOnly && !isDraft ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-[#c5221f] hover:bg-[#fce8e6]"
              onClick={() => {
                void deleteEvent(event.id)
                onClose()
              }}
            >
              <Trash2 className="size-4" /> Delete event
            </button>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-[var(--gcal-muted)] hover:bg-[var(--gcal-bg)]"
            >
              {isDraft ? 'Cancel' : 'Close'}
            </button>
            {!readOnly ? (
              <button
                type="button"
                disabled={saving || !draft.title.trim() || (!isDraft && !dirty)}
                onClick={() => void save()}
                className="rounded-xl bg-[var(--gcal-blue)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--gcal-blue-hover)] disabled:opacity-40"
              >
                {isDraft ? 'Create event' : dirty ? 'Save' : 'Saved'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function normalizeTimeOption(time: string, options: string[]): string {
  const t = time.slice(0, 5)
  if (options.includes(t)) return t
  const [h, m] = t.split(':').map(Number)
  const mins = h * 60 + (m || 0)
  const snapped = Math.round(mins / 30) * 30
  const hh = String(Math.floor((snapped % (24 * 60)) / 60)).padStart(2, '0')
  const mm = String(snapped % 60).padStart(2, '0')
  const candidate = `${hh}:${mm}`
  return options.includes(candidate) ? candidate : options[0]
}
