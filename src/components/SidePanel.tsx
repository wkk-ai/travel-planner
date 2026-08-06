import { useEffect, useMemo, useState } from 'react'
import { Check, MapPin, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { shareUrls, useTripStore } from '../store/tripStore'
import { parseConfirmationText, currentEventAt, cn } from '../lib/time'
import { CATEGORIES } from '../data/categories'

export function SidePanel() {
  const panel = useTripStore((s) => s.panel)
  const setPanel = useTripStore((s) => s.setPanel)
  if (panel === 'none') return null

  return (
    <aside className="no-print panel-enter absolute inset-y-0 right-0 z-30 flex w-full max-w-sm flex-col border-l border-[var(--gcal-border)] bg-white shadow-xl sm:relative sm:max-w-xs">
      <div className="flex items-center justify-between border-b border-[var(--gcal-border)] px-3 py-2.5">
        <div className="text-sm font-semibold capitalize">{titleFor(panel)}</div>
        <button
          type="button"
          className="rounded-full p-1 hover:bg-[var(--gcal-bg)]"
          onClick={() => setPanel('none')}
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="cal-scroll flex-1 overflow-auto p-3">
        {panel === 'checklist' ? <ChecklistPanel /> : null}
        {panel === 'notes' ? <NotesPanel /> : null}
        {panel === 'budget' ? <BudgetPanel /> : null}
        {panel === 'emergency' ? <EmergencyPanel /> : null}
        {panel === 'share' ? <SharePanel /> : null}
        {panel === 'import' ? <ImportPanel /> : null}
        {panel === 'whatif' ? <WhatIfPanel /> : null}
        {panel === 'recap' ? <RecapPanel /> : null}
        {panel === 'trips' ? <TripsPanel /> : null}
      </div>
      <WeatherFooter />
    </aside>
  )
}

function titleFor(p: string) {
  const map: Record<string, string> = {
    checklist: 'Checklist',
    notes: 'Notes',
    budget: 'Budget',
    emergency: 'Emergency card',
    share: 'Share links',
    import: 'Import confirmation',
    whatif: 'What-if mode',
    recap: 'Trip recap',
    trips: 'My trips',
  }
  return map[p] ?? p
}

function ChecklistPanel() {
  const items = useTripStore((s) => s.checklist)
  const add = useTripStore((s) => s.addChecklist)
  const toggle = useTripStore((s) => s.toggleChecklist)
  const del = useTripStore((s) => s.deleteChecklist)
  const mode = useTripStore((s) => s.mode)
  const [text, setText] = useState('')

  return (
    <div>
      {mode === 'edit' ? (
        <form
          className="mb-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!text.trim()) return
            void add(text.trim())
            setText('')
          }}
        >
          <input
            className="flex-1 rounded-lg border border-[var(--gcal-border)] px-2 py-1.5 text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add item…"
          />
          <button type="submit" className="rounded-lg bg-[var(--gcal-blue)] p-2 text-white">
            <Plus className="size-4" />
          </button>
        </form>
      ) : null}
      <ul className="space-y-1.5">
        {items.map((c) => (
          <li
            key={c.id}
            className="flex items-start gap-2 rounded-lg border border-[var(--gcal-border)] px-2 py-1.5"
          >
            <button
              type="button"
              disabled={mode !== 'edit'}
              onClick={() => void toggle(c.id)}
              className={cn(
                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border',
                c.done
                  ? 'border-[#34a853] bg-[#34a853] text-white'
                  : 'border-[var(--gcal-border)]',
              )}
            >
              {c.done ? <Check className="size-3" /> : null}
            </button>
            <div className="min-w-0 flex-1">
              <div className={cn('text-sm', c.done && 'text-[var(--gcal-muted)] line-through')}>
                {c.text}
              </div>
              {c.dayDate ? (
                <div className="text-[10px] text-[var(--gcal-muted)]">{c.dayDate}</div>
              ) : null}
            </div>
            {mode === 'edit' ? (
              <button type="button" onClick={() => void del(c.id)} className="text-[var(--gcal-muted)]">
                <Trash2 className="size-3.5" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function NotesPanel() {
  const notes = useTripStore((s) => s.notes)
  const add = useTripStore((s) => s.addNote)
  const update = useTripStore((s) => s.updateNote)
  const del = useTripStore((s) => s.deleteNote)
  const mode = useTripStore((s) => s.mode)

  return (
    <div className="space-y-3">
      {mode === 'edit' ? (
        <button
          type="button"
          className="w-full rounded-lg border border-dashed border-[var(--gcal-border)] py-2 text-sm text-[var(--gcal-blue)]"
          onClick={() => void add({ title: 'New note', body: '' })}
        >
          + Add note
        </button>
      ) : null}
      {notes.map((n) => (
        <div key={n.id} className="rounded-xl border border-[var(--gcal-border)] p-2.5">
          <input
            disabled={mode !== 'edit'}
            className="mb-1 w-full border-0 bg-transparent text-sm font-semibold outline-none"
            value={n.title}
            onChange={(e) => void update(n.id, { title: e.target.value })}
          />
          <textarea
            disabled={mode !== 'edit'}
            className="min-h-[72px] w-full resize-y border-0 bg-transparent text-sm outline-none"
            value={n.body}
            onChange={(e) => void update(n.id, { body: e.target.value })}
          />
          <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--gcal-muted)]">
            <span>{n.date ?? 'General'}</span>
            {mode === 'edit' ? (
              <button type="button" onClick={() => void del(n.id)}>
                Delete
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

function BudgetPanel() {
  const expenses = useTripStore((s) => s.expenses)
  const events = useTripStore((s) => s.events)
  const add = useTripStore((s) => s.addExpense)
  const del = useTripStore((s) => s.deleteExpense)
  const mode = useTripStore((s) => s.mode)

  const totals = useMemo(() => {
    const byCat: Record<string, number> = {}
    let sum = 0
    for (const e of expenses) {
      byCat[e.category] = (byCat[e.category] ?? 0) + e.amountCents
      sum += e.amountCents
    }
    // also roll event budgets not yet in expenses
    for (const ev of events) {
      if (ev.budgetCents > 0 && !expenses.some((x) => x.eventId === ev.id)) {
        byCat[ev.category] = (byCat[ev.category] ?? 0) + ev.budgetCents
        sum += ev.budgetCents
      }
    }
    return { byCat, sum }
  }, [expenses, events])

  return (
    <div>
      <div className="mb-3 rounded-xl bg-[#e8f0fe] p-3">
        <div className="text-xs font-semibold text-[var(--gcal-blue)]">Total planned</div>
        <div className="brand-serif text-3xl">${(totals.sum / 100).toFixed(2)}</div>
      </div>
      <div className="mb-3 space-y-1">
        {Object.entries(totals.byCat).map(([cat, cents]) => (
          <div key={cat} className="flex justify-between text-sm">
            <span style={{ color: CATEGORIES[cat as keyof typeof CATEGORIES]?.color }}>
              {CATEGORIES[cat as keyof typeof CATEGORIES]?.label ?? cat}
            </span>
            <span>${(cents / 100).toFixed(2)}</span>
          </div>
        ))}
      </div>
      {mode === 'edit' ? (
        <button
          type="button"
          className="mb-3 w-full rounded-lg bg-[var(--gcal-bg)] py-2 text-sm font-medium"
          onClick={() =>
            void add({ label: 'New expense', amountCents: 1000, category: 'other' })
          }
        >
          + Add expense
        </button>
      ) : null}
      <ul className="space-y-1.5">
        {expenses.map((e) => (
          <li
            key={e.id}
            className="flex items-center justify-between rounded-lg border border-[var(--gcal-border)] px-2 py-1.5 text-sm"
          >
            <div>
              <div className="font-medium">{e.label}</div>
              <div className="text-[10px] text-[var(--gcal-muted)]">
                {e.category} · {e.spentOn}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span>${(e.amountCents / 100).toFixed(2)}</span>
              {mode === 'edit' ? (
                <button type="button" onClick={() => void del(e.id)}>
                  <Trash2 className="size-3.5 text-[var(--gcal-muted)]" />
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function EmergencyPanel() {
  const trip = useTripStore((s) => s.trip)!
  const updateTrip = useTripStore((s) => s.updateTrip)
  const mode = useTripStore((s) => s.mode)
  const e = trip.emergency

  function patch(key: string, value: string) {
    void updateTrip({ emergency: { ...e, [key]: value } })
  }

  const fields = [
    ['hotelName', 'Hotel name'],
    ['hotelAddress', 'Hotel address'],
    ['hotelConfirmation', 'Confirmation #'],
    ['hotelPhone', 'Hotel phone'],
    ['embassy', 'Embassy / consulate'],
    ['emergencyContact', 'Emergency contact'],
    ['notes', 'Notes'],
  ] as const

  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--gcal-muted)]">
        Works offline once loaded. Keep confirmation numbers here.
      </p>
      {fields.map(([key, label]) => (
        <label key={key} className="block">
          <div className="mb-0.5 text-[11px] font-semibold text-[var(--gcal-muted)]">{label}</div>
          <textarea
            disabled={mode !== 'edit'}
            className="min-h-[40px] w-full rounded-lg border border-[var(--gcal-border)] px-2 py-1.5 text-sm"
            value={(e as Record<string, string | undefined>)[key] ?? ''}
            onChange={(ev) => patch(key, ev.target.value)}
          />
        </label>
      ))}
    </div>
  )
}

function SharePanel() {
  const trip = useTripStore((s) => s.trip)!
  const setToast = useTripStore((s) => s.setToast)
  const urls = shareUrls(trip)

  function copy(text: string, label: string) {
    void navigator.clipboard.writeText(text)
    setToast(`${label} copied`)
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 text-xs font-semibold text-[#c5221f]">Edit link (full access)</div>
        <code className="block break-all rounded-lg bg-[var(--gcal-bg)] p-2 text-[11px]">
          {urls.edit}
        </code>
        <button
          type="button"
          className="mt-1 text-sm font-medium text-[var(--gcal-blue)]"
          onClick={() => copy(urls.edit, 'Edit link')}
        >
          Copy edit link
        </button>
      </div>
      <div>
        <div className="mb-1 text-xs font-semibold text-[#137333]">View-only link</div>
        <code className="block break-all rounded-lg bg-[var(--gcal-bg)] p-2 text-[11px]">
          {urls.view}
        </code>
        <button
          type="button"
          className="mt-1 text-sm font-medium text-[var(--gcal-blue)]"
          onClick={() => copy(urls.view, 'View link')}
        >
          Copy view link
        </button>
      </div>
      <p className="text-xs text-[var(--gcal-muted)]">
        Anyone with the edit link can change the trip. Share the view link with family.
      </p>
    </div>
  )
}

function ImportPanel() {
  const addEvent = useTripStore((s) => s.addEvent)
  const setToast = useTripStore((s) => s.setToast)
  const setPanel = useTripStore((s) => s.setPanel)
  const [text, setText] = useState('')

  async function run() {
    const parsed = parseConfirmationText(text)
    if (!parsed) {
      setToast('Could not parse — try including flight code and times')
      return
    }
    await addEvent(parsed)
    setToast('Imported event')
    setPanel('none')
  }

  return (
    <div>
      <p className="mb-2 text-xs text-[var(--gcal-muted)]">
        Paste a flight or hotel confirmation. Example: AZUL 4214 CGH → CNF 07:55 09:15 2026-08-29
      </p>
      <textarea
        className="mb-2 min-h-[140px] w-full rounded-lg border border-[var(--gcal-border)] p-2 text-sm"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste confirmation text…"
      />
      <button
        type="button"
        onClick={() => void run()}
        className="w-full rounded-lg bg-[var(--gcal-blue)] py-2 text-sm font-semibold text-white"
      >
        Import as event
      </button>
    </div>
  )
}

function WhatIfPanel() {
  const createWhatIf = useTripStore((s) => s.createWhatIf)
  const setToast = useTripStore((s) => s.setToast)
  const trip = useTripStore((s) => s.trip)

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[#feefc3] bg-[#fef7e0] p-3 text-sm">
        <div className="font-semibold text-[#e37400]">Where is it saved?</div>
        <p className="mt-1 text-[var(--gcal-muted)]">
          What-if creates a <strong>brand-new trip</strong> in Supabase (cloud), separate from “{trip?.name}”.
          It gets its own edit link and shows up under <strong>My trips</strong>. Your original trip stays untouched.
        </p>
      </div>
      <p className="text-sm text-[var(--gcal-muted)]">
        Use it to shuffle days, try alternate plans, then compare both links side by side.
      </p>
      <button
        type="button"
        className="w-full rounded-xl bg-[var(--gcal-blue)] py-2.5 text-sm font-semibold text-white"
        onClick={async () => {
          const token = await createWhatIf()
          if (token) {
            const url = `${window.location.origin}${import.meta.env.BASE_URL}#/e/${token}`
            void navigator.clipboard.writeText(url)
            setToast('What-if trip saved in cloud — link copied')
            window.open(url, '_blank')
          }
        }}
      >
        Create what-if trip copy
      </button>
    </div>
  )
}

function TripsPanel() {
  const trips = useTripStore((s) => s.trips)
  const trip = useTripStore((s) => s.trip)
  const mode = useTripStore((s) => s.mode)
  const switchTrip = useTripStore((s) => s.switchTrip)
  const createNewTrip = useTripStore((s) => s.createNewTrip)
  const deleteTrip = useTripStore((s) => s.deleteTrip)
  const refreshTrips = useTripStore((s) => s.refreshTrips)
  const [name, setName] = useState('New trip')
  const [startDate, setStartDate] = useState('2026-08-29')
  const [endDate, setEndDate] = useState('2026-09-07')
  const [seed, setSeed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    void refreshTrips()
  }, [refreshTrips])

  const confirmTrip = trips.find((t) => t.id === confirmId) ?? null
  const datesOk = endDate >= startDate
  const nightCount = datesOk
    ? Math.max(0, differenceInCalendarDays(parseISO(endDate), parseISO(startDate)))
    : 0

  function onStartChange(value: string) {
    setStartDate(value)
    if (endDate < value) setEndDate(value)
  }

  function onEndChange(value: string) {
    if (value < startDate) {
      setEndDate(startDate)
      return
    }
    setEndDate(value)
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#e8f0fe] via-white to-[#e6f4ea] p-4 ring-1 ring-[var(--gcal-border)]">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--gcal-muted)]">
          Your trips
        </div>
        <div className="brand-serif mt-1 text-2xl leading-tight text-[var(--gcal-text)]">
          Pick where you plan next
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--gcal-muted)]">
          {trips.length} trip{trips.length === 1 ? '' : 's'} saved
          {trip ? ` · open: ${trip.name}` : ''}
        </p>
      </div>

      <ul className="space-y-2.5">
        {trips.map((t) => {
          const active = t.id === trip?.id
          const whatIf = Boolean(t.whatIfOf)
          const nights = Math.max(
            0,
            differenceInCalendarDays(parseISO(t.endDate), parseISO(t.startDate)),
          )
          const rangeLabel = `${format(parseISO(t.startDate), 'd MMM')} – ${format(parseISO(t.endDate), 'd MMM yyyy')}`
          return (
            <li key={t.id}>
              <div
                className={cn(
                  'group relative overflow-hidden rounded-2xl border bg-white transition-shadow',
                  active
                    ? 'border-[var(--gcal-blue)] shadow-[0_8px_24px_rgba(26,115,232,0.12)]'
                    : 'border-[var(--gcal-border)] hover:shadow-md',
                )}
              >
                <div
                  className={cn(
                    'absolute inset-y-0 left-0 w-1',
                    whatIf ? 'bg-[#f9ab00]' : active ? 'bg-[var(--gcal-blue)]' : 'bg-[#dadce0]',
                  )}
                />
                <button
                  type="button"
                  disabled={mode === 'view'}
                  onClick={() => void switchTrip(t.editToken)}
                  className="w-full py-3 pl-4 pr-3 text-left disabled:cursor-default"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate font-semibold text-[var(--gcal-text)]">{t.name}</span>
                        {active ? (
                          <span className="rounded-full bg-[#e8f0fe] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--gcal-blue)]">
                            Open
                          </span>
                        ) : null}
                        {whatIf ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-[#fef7e0] px-1.5 py-0.5 text-[10px] font-semibold text-[#b06000]">
                            <Sparkles className="size-2.5" /> What-if
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-[var(--gcal-muted)]">
                        <MapPin className="size-3 shrink-0" />
                        <span>
                          {rangeLabel}
                          {nights > 0 ? ` · ${nights} night${nights === 1 ? '' : 's'}` : ' · same day'}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
                {mode === 'edit' ? (
                  <div className="flex items-center justify-end border-t border-[var(--gcal-border)]/70 px-3 py-1.5">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-[#c5221f] hover:bg-[#fce8e6]"
                      onClick={() => setConfirmId(t.id)}
                    >
                      <Trash2 className="size-3" />
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          )
        })}
        {!trips.length ? (
          <li className="rounded-2xl border border-dashed border-[var(--gcal-border)] bg-[var(--gcal-bg)]/60 px-4 py-8 text-center">
            <MapPin className="mx-auto size-6 text-[var(--gcal-muted)]" />
            <p className="mt-2 text-sm font-medium text-[var(--gcal-text)]">No trips yet</p>
            <p className="mt-1 text-xs text-[var(--gcal-muted)]">Create one below to start planning.</p>
          </li>
        ) : null}
      </ul>

      {confirmTrip ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl">
            <div className="brand-serif text-xl">Delete trip?</div>
            <p className="mt-2 text-sm text-[var(--gcal-muted)]">
              Permanently delete <strong>{confirmTrip.name}</strong> and all its events, notes,
              checklist, and expenses. This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl px-3 py-2 text-sm font-medium hover:bg-[var(--gcal-bg)]"
                onClick={() => setConfirmId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-[#c5221f] px-3 py-2 text-sm font-semibold text-white"
                onClick={async () => {
                  const id = confirmTrip.id
                  setConfirmId(null)
                  await deleteTrip(id)
                }}
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {mode === 'edit' ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--gcal-border)] bg-white shadow-sm">
          <div className="border-b border-[var(--gcal-border)] bg-[var(--gcal-bg)]/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-[var(--gcal-blue)] text-white">
                <Plus className="size-3.5" />
              </span>
              <div>
                <div className="text-sm font-semibold text-[var(--gcal-text)]">New trip</div>
                <div className="text-[11px] text-[var(--gcal-muted)]">Name it, set dates, go</div>
              </div>
            </div>
          </div>
          <div className="space-y-3 p-4">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--gcal-muted)]">
                Trip name
              </span>
              <input
                className="w-full rounded-xl border border-[var(--gcal-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--gcal-blue)] focus:ring-2 focus:ring-[#e8f0fe]"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Japan spring 2027"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--gcal-muted)]">
                  Start
                </span>
                <input
                  type="date"
                  className="w-full rounded-xl border border-[var(--gcal-border)] px-2.5 py-2 text-sm outline-none focus:border-[var(--gcal-blue)] focus:ring-2 focus:ring-[#e8f0fe]"
                  value={startDate}
                  onChange={(e) => onStartChange(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--gcal-muted)]">
                  End
                </span>
                <input
                  type="date"
                  min={startDate}
                  className={cn(
                    'w-full rounded-xl border px-2.5 py-2 text-sm outline-none focus:ring-2',
                    datesOk
                      ? 'border-[var(--gcal-border)] focus:border-[var(--gcal-blue)] focus:ring-[#e8f0fe]'
                      : 'border-[#c5221f] focus:border-[#c5221f] focus:ring-[#fce8e6]',
                  )}
                  value={endDate}
                  onChange={(e) => onEndChange(e.target.value)}
                />
              </label>
            </div>
            {!datesOk ? (
              <p className="text-[11px] font-medium text-[#c5221f]">
                End date cannot be before start date.
              </p>
            ) : (
              <p className="text-[11px] text-[var(--gcal-muted)]">
                {nightCount === 0
                  ? 'Same-day trip'
                  : `${nightCount} night${nightCount === 1 ? '' : 's'} · ${nightCount + 1} days`}
              </p>
            )}
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[var(--gcal-border)] bg-[var(--gcal-bg)]/50 px-3 py-2.5">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={seed}
                onChange={(e) => setSeed(e.target.checked)}
              />
              <span>
                <span className="block text-xs font-medium text-[var(--gcal-text)]">
                  Prefill BigBang US Trip 2026
                </span>
                <span className="mt-0.5 block text-[11px] text-[var(--gcal-muted)]">
                  Copies the full seeded itinerary into this new trip.
                </span>
              </span>
            </label>
            <button
              type="button"
              disabled={busy || !name.trim() || !datesOk}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--gcal-blue)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--gcal-blue-hover)] disabled:opacity-40"
              onClick={async () => {
                if (!datesOk) return
                setBusy(true)
                try {
                  await createNewTrip({
                    name: name.trim(),
                    startDate,
                    endDate,
                    seedBigBang: seed,
                  })
                } finally {
                  setBusy(false)
                }
              }}
            >
              <Plus className="size-4" />
              Create trip
            </button>
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-[var(--gcal-bg)] px-3 py-2 text-xs text-[var(--gcal-muted)]">
          View-only — open an edit link to manage trips.
        </p>
      )}
    </div>
  )
}

function RecapPanel() {
  const events = useTripStore((s) => s.events)
  const trip = useTripStore((s) => s.trip)!
  const photos = events.filter((e) => e.photoDataUrl)
  const places = [...new Set(events.map((e) => e.location).filter(Boolean))]
  const shows = events.filter((e) => e.category === 'show')
  const now = currentEventAt(events)

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-gradient-to-br from-[#e8f0fe] to-[#e6f4ea] p-3">
        <div className="brand-serif text-2xl">{trip.name}</div>
        <div className="text-xs text-[var(--gcal-muted)]">
          {trip.startDate} → {trip.endDate}
        </div>
        {now ? (
          <div className="mt-2 text-sm font-semibold text-[var(--gcal-blue)]">
            Now: {now.title}
          </div>
        ) : (
          <div className="mt-2 text-sm text-[var(--gcal-muted)]">No event right now</div>
        )}
      </div>

      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--gcal-muted)]">
          Places ({places.length})
        </div>
        <div className="flex flex-wrap gap-1">
          {places.map((p) => (
            <span key={p} className="rounded-full bg-[var(--gcal-bg)] px-2 py-0.5 text-[11px]">
              {p}
            </span>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--gcal-muted)]">
          Shows
        </div>
        {shows.map((s) => (
          <div key={s.id} className="text-sm">
            {s.date}: {s.title}
          </div>
        ))}
      </div>

      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--gcal-muted)]">
          Photo pins ({photos.length})
        </div>
        <div className="grid grid-cols-2 gap-2">
          {photos.map((p) => (
            <div key={p.id}>
              <img src={p.photoDataUrl!} alt="" className="aspect-square rounded-lg object-cover" />
              <div className="mt-0.5 truncate text-[10px]">{p.title}</div>
            </div>
          ))}
          {!photos.length ? (
            <p className="col-span-2 text-xs text-[var(--gcal-muted)]">
              Attach photos on events to build your recap collage.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function WeatherFooter() {
  const [wx, setWx] = useState<{ label: string; temp: number; code: number }[] | null>(null)

  useEffect(() => {
    // Open-Meteo free API — Orlando + SF for trip cities
    const cities = [
      { label: 'Orlando', lat: 28.5383, lon: -81.3792 },
      { label: 'SF', lat: 37.7749, lon: -122.4194 },
    ]
    void Promise.all(
      cities.map(async (c) => {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`
        const res = await fetch(url)
        const data = await res.json()
        return {
          label: c.label,
          temp: data.current?.temperature_2m as number,
          code: data.current?.weather_code as number,
        }
      }),
    )
      .then(setWx)
      .catch(() => setWx(null))
  }, [])

  if (!wx) return null
  return (
    <div className="border-t border-[var(--gcal-border)] px-3 py-2 text-[11px] text-[var(--gcal-muted)]">
      <div className="mb-0.5 font-semibold text-[var(--gcal-text)]">Weather now</div>
      <div className="flex gap-3">
        {wx.map((w) => (
          <span key={w.label}>
            {w.label}: {Math.round(w.temp)}°F
          </span>
        ))}
      </div>
    </div>
  )
}
