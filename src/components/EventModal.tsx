import { useEffect, useState } from 'react'
import { ExternalLink, Trash2, X } from 'lucide-react'
import type { EventCategory, TripEvent } from '../types'
import { CATEGORIES } from '../data/categories'
import { useTripStore } from '../store/tripStore'
import { tripDays, isoDate } from '../lib/time'
import { format, parseISO } from 'date-fns'

interface Props {
  event: TripEvent
  onClose: () => void
}

export function EventModal({ event, onClose }: Props) {
  const mode = useTripStore((s) => s.mode)
  const trip = useTripStore((s) => s.trip)!
  const updateEvent = useTripStore((s) => s.updateEvent)
  const deleteEvent = useTripStore((s) => s.deleteEvent)
  const duplicateDay = useTripStore((s) => s.duplicateDay)
  const setToast = useTripStore((s) => s.setToast)
  const readOnly = mode !== 'edit'

  const [draft, setDraft] = useState(event)
  const [dupTarget, setDupTarget] = useState('')

  useEffect(() => setDraft(event), [event])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function save() {
    if (readOnly) return
    await updateEvent(event.id, draft)
    setToast('Event saved')
    onClose()
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

  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="panel-enter max-h-[92vh] w-full max-w-lg overflow-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-[var(--gcal-border)] bg-white px-4 py-3">
          <div className="brand-serif text-xl">{readOnly ? 'Event' : 'Edit event'}</div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-[var(--gcal-bg)]">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <Field label="Title">
            <input
              disabled={readOnly}
              className="field"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input
                type="date"
                disabled={readOnly}
                className="field"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </Field>
            <Field label="Category">
              <select
                disabled={readOnly}
                className="field"
                value={draft.category}
                onChange={(e) =>
                  setDraft({ ...draft, category: e.target.value as EventCategory })
                }
              >
                {Object.entries(CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start">
              <input
                type="time"
                disabled={readOnly}
                className="field"
                value={draft.startTime}
                onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
              />
            </Field>
            <Field label="End">
              <input
                type="time"
                disabled={readOnly}
                className="field"
                value={draft.endTime}
                onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Custom color (optional)">
            <div className="flex items-center gap-2">
              <input
                type="color"
                disabled={readOnly}
                value={draft.color ?? CATEGORIES[draft.category].border}
                onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded border border-[var(--gcal-border)]"
              />
              <button
                type="button"
                disabled={readOnly}
                className="text-xs text-[var(--gcal-blue)]"
                onClick={() => setDraft({ ...draft, color: null })}
              >
                Use category preset
              </button>
            </div>
          </Field>

          <Field label="Location">
            <input
              disabled={readOnly}
              className="field"
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
            />
          </Field>

          <Field label="Google Maps URL">
            <div className="flex gap-2">
              <input
                disabled={readOnly}
                className="field flex-1"
                value={draft.mapsUrl}
                onChange={(e) => setDraft({ ...draft, mapsUrl: e.target.value })}
                placeholder="https://maps.google.com/?q=..."
              />
              {draft.mapsUrl ? (
                <a
                  href={draft.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--gcal-border)] hover:bg-[var(--gcal-bg)]"
                >
                  <ExternalLink className="size-4" />
                </a>
              ) : null}
            </div>
          </Field>

          {draft.category === 'flight' ? (
            <div className="rounded-xl border border-[#d2e3fc] bg-[#e8f0fe]/70 p-3">
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
                    setDraft({
                      ...draft,
                      flight: { ...draft.flight, airline: e.target.value },
                    })
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
                  placeholder="From (CGH)"
                  value={draft.flight?.from ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      flight: { ...draft.flight, from: e.target.value },
                    })
                  }
                />
                <input
                  disabled={readOnly}
                  className="field"
                  placeholder="To (MCO)"
                  value={draft.flight?.to ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      flight: { ...draft.flight, to: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          ) : null}

          <Field label="Notes">
            <textarea
              disabled={readOnly}
              className="field min-h-[80px]"
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </Field>

          <Field label="Budget (USD)">
            <input
              type="number"
              step="0.01"
              disabled={readOnly}
              className="field"
              value={(draft.budgetCents / 100).toFixed(2)}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  budgetCents: Math.round(parseFloat(e.target.value || '0') * 100),
                })
              }
            />
          </Field>

          <Field label="Photo pin">
            {draft.photoDataUrl ? (
              <img
                src={draft.photoDataUrl}
                alt=""
                className="mb-2 max-h-40 w-full rounded-lg object-cover"
              />
            ) : null}
            {!readOnly ? (
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => void onPhoto(e.target.files?.[0] ?? null)}
              />
            ) : null}
          </Field>

          {!readOnly ? (
            <div className="rounded-xl border border-[var(--gcal-border)] p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gcal-muted)]">
                Duplicate this day
              </div>
              <div className="flex gap-2">
                <select
                  className="field flex-1"
                  value={dupTarget}
                  onChange={(e) => setDupTarget(e.target.value)}
                >
                  <option value="">Copy day to…</option>
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
                  className="rounded-lg bg-[var(--gcal-bg)] px-3 text-sm font-medium disabled:opacity-40"
                  onClick={() => {
                    void duplicateDay(draft.date, dupTarget)
                    onClose()
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-[var(--gcal-border)] bg-white px-4 py-3">
          {!readOnly ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-[#c5221f] hover:bg-[#fce8e6]"
              onClick={() => {
                void deleteEvent(event.id)
                onClose()
              }}
            >
              <Trash2 className="size-4" /> Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-[var(--gcal-bg)]"
            >
              Close
            </button>
            {!readOnly ? (
              <button
                type="button"
                onClick={() => void save()}
                className="rounded-lg bg-[var(--gcal-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--gcal-blue-hover)]"
              >
                Save
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <style>{`
        .field {
          width: 100%;
          border: 1px solid var(--gcal-border);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-[var(--gcal-muted)]">{label}</div>
      {children}
    </label>
  )
}
