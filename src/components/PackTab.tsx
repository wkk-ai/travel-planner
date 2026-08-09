import { useMemo, useState } from 'react'
import { format, isToday, parseISO } from 'date-fns'
import { Check, Luggage, Plus, Trash2 } from 'lucide-react'
import { PACK_TEMPLATES } from '../lib/packTemplates'
import { cn, isoDate, tripDaysIncludingEvents } from '../lib/time'
import { useTripStore } from '../store/tripStore'
import type { ChecklistItem } from '../types'

function PackItemRow({
  item,
  readOnly,
  days,
  onToggle,
  onDelete,
  onDayChange,
}: {
  item: ChecklistItem
  readOnly: boolean
  days: Date[]
  onToggle: () => void
  onDelete: () => void
  onDayChange: (day: string | null) => void
}) {
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-[#eef0f2] px-4 py-3 last:border-0">
      <button
        type="button"
        disabled={readOnly}
        onClick={onToggle}
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-lg border transition-colors',
          item.done
            ? 'border-[#34a853] bg-[#34a853] text-white'
            : 'border-[var(--gcal-border)] bg-white hover:border-[var(--gcal-blue)]',
        )}
        aria-label={item.done ? 'Mark not done' : 'Mark done'}
      >
        {item.done ? <Check className="size-3.5" /> : null}
      </button>
      <div className="min-w-0">
        <div
          className={cn(
            'text-ui-base font-medium',
            item.done && 'text-[var(--gcal-muted)] line-through',
          )}
        >
          {item.text}
        </div>
        {!readOnly ? (
          <select
            className="mt-1 max-w-full rounded-lg border-0 bg-transparent p-0 text-ui-xs font-semibold text-[var(--gcal-blue)] outline-none"
            value={item.dayDate ?? ''}
            onChange={(e) => onDayChange(e.target.value || null)}
            aria-label="Link to day"
          >
            <option value="">Any day</option>
            {days.map((d) => {
              const iso = isoDate(d)
              return (
                <option key={iso} value={iso}>
                  {format(d, 'EEE MMM d')}
                </option>
              )
            })}
          </select>
        ) : item.dayDate ? (
          <div className="mt-0.5 text-ui-xs text-[var(--gcal-muted)]">
            {format(parseISO(item.dayDate), 'EEE MMM d')}
          </div>
        ) : null}
      </div>
      {!readOnly ? (
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg p-1.5 text-[var(--gcal-muted)] hover:bg-[#fce8e6] hover:text-[#c5221f]"
          aria-label="Remove item"
        >
          <Trash2 className="size-4" />
        </button>
      ) : null}
    </li>
  )
}

export function PackTab() {
  const trip = useTripStore((s) => s.trip)!
  const checklist = useTripStore((s) => s.checklist)
  const mode = useTripStore((s) => s.mode)
  const events = useTripStore((s) => s.events)
  const addChecklist = useTripStore((s) => s.addChecklist)
  const updateChecklist = useTripStore((s) => s.updateChecklist)
  const toggleChecklist = useTripStore((s) => s.toggleChecklist)
  const deleteChecklist = useTripStore((s) => s.deleteChecklist)
  const readOnly = mode !== 'edit'

  const [text, setText] = useState('')
  const [newDay, setNewDay] = useState<string>('')

  const today = isoDate(new Date())
  const days = tripDaysIncludingEvents(trip.startDate, trip.endDate, events)

  const stats = useMemo(() => {
    const total = checklist.length
    const done = checklist.filter((c) => c.done).length
    const todayItems = checklist.filter((c) => c.dayDate === today && !c.done)
    return { total, done, left: total - done, todayCount: todayItems.length }
  }, [checklist, today])

  const grouped = useMemo(() => {
    const general = checklist.filter((c) => !c.dayDate)
    const byDay = new Map<string, ChecklistItem[]>()
    for (const c of checklist) {
      if (!c.dayDate) continue
      const list = byDay.get(c.dayDate) ?? []
      list.push(c)
      byDay.set(c.dayDate, list)
    }
    const dayOrder = days.map(isoDate).filter((d) => byDay.has(d))
    return { general, byDay, dayOrder }
  }, [checklist, days])

  async function addTemplate(templateId: string) {
    const t = PACK_TEMPLATES.find((x) => x.id === templateId)
    if (!t || readOnly) return
    for (const item of t.items) {
      await addChecklist(item, newDay || null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 pb-24">
      <header className="mb-4">
        <h1 className="text-ui-xl font-bold text-[var(--gcal-text)]">Pack</h1>
        <p className="mt-0.5 text-ui-sm text-[var(--gcal-muted)]">
          What to bring · link items to trip days
        </p>
      </header>

      <div className="mb-5 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-[var(--gcal-border)] bg-white p-3 shadow-sm">
          <div className="text-ui-xs font-semibold uppercase tracking-wide text-[var(--gcal-muted)]">Total</div>
          <div className="mt-1 text-2xl font-bold text-[var(--gcal-text)]">{stats.total}</div>
        </div>
        <div className="rounded-2xl border border-[#ceead6] bg-[#e6f4ea] p-3 shadow-sm">
          <div className="text-ui-xs font-semibold uppercase tracking-wide text-[#137333]">Packed</div>
          <div className="mt-1 text-2xl font-bold text-[#137333]">{stats.done}</div>
        </div>
        <div className="rounded-2xl border border-[#c2d7f7] bg-[#e8f0fe] p-3 shadow-sm">
          <div className="text-ui-xs font-semibold uppercase tracking-wide text-[var(--gcal-blue)]">Today</div>
          <div className="mt-1 text-2xl font-bold text-[var(--gcal-blue)]">{stats.todayCount}</div>
        </div>
      </div>

      {stats.left > 0 ? (
        <div className="mb-5 h-2 overflow-hidden rounded-full bg-[var(--gcal-bg)]">
          <div
            className="h-full rounded-full bg-[#34a853] transition-all"
            style={{ width: `${stats.total ? (stats.done / stats.total) * 100 : 0}%` }}
          />
        </div>
      ) : stats.total > 0 ? (
        <div className="mb-5 rounded-2xl bg-[#e6f4ea] px-4 py-3 text-center text-ui-sm font-semibold text-[#137333]">
          All packed — you&apos;re ready!
        </div>
      ) : null}

      {!readOnly ? (
        <section className="mb-5">
          <h2 className="mb-2 text-ui-sm font-bold uppercase tracking-wide text-[var(--gcal-muted)]">
            Quick add templates
          </h2>
          <div className="mb-2">
            <label className="mb-1 block text-ui-xs font-semibold text-[var(--gcal-muted)]">
              Link template to day (optional)
            </label>
            <select
              className="field"
              value={newDay}
              onChange={(e) => setNewDay(e.target.value)}
            >
              <option value="">Any day</option>
              {days.map((d) => {
                const iso = isoDate(d)
                return (
                  <option key={iso} value={iso}>
                    {format(d, 'EEE MMM d')}
                  </option>
                )
              })}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PACK_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => void addTemplate(t.id)}
                className="rounded-2xl border border-[var(--gcal-border)] bg-white px-3 py-3 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <Luggage className="mb-1 size-4 text-[var(--gcal-blue)]" />
                <div className="text-ui-sm font-bold">{t.label}</div>
                <div className="text-[10px] text-[var(--gcal-muted)]">{t.desc}</div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {!readOnly ? (
        <form
          className="mb-5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!text.trim()) return
            void addChecklist(text.trim(), newDay || null)
            setText('')
          }}
        >
          <input
            className="field flex-1"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add packing item…"
          />
          <button
            type="submit"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--gcal-blue)] text-white hover:bg-[var(--gcal-blue-hover)]"
            aria-label="Add item"
          >
            <Plus className="size-5" />
          </button>
        </form>
      ) : null}

      {checklist.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--gcal-border)] bg-white px-6 py-12 text-center">
          <Luggage className="mx-auto size-10 text-[var(--gcal-muted)]/40" />
          <p className="mt-3 text-ui-base font-semibold">Nothing to pack yet</p>
          <p className="mt-1 text-ui-sm text-[var(--gcal-muted)]">
            Add items above or tap a template to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {stats.todayCount > 0 ? (
            <section className="overflow-hidden rounded-2xl border border-[var(--gcal-border)] bg-white shadow-sm">
              <div className="border-b border-[#eef0f2] bg-[#e8f0fe] px-4 py-2.5">
                <h2 className="text-ui-sm font-bold text-[#0d47a1]">Due today</h2>
              </div>
              <ul>
                {checklist
                  .filter((c) => c.dayDate === today)
                  .map((item) => (
                    <PackItemRow
                      key={item.id}
                      item={item}
                      readOnly={readOnly}
                      days={days}
                      onToggle={() => void toggleChecklist(item.id)}
                      onDelete={() => void deleteChecklist(item.id)}
                      onDayChange={(day) => void updateChecklist(item.id, { dayDate: day })}
                    />
                  ))}
              </ul>
            </section>
          ) : null}

          {grouped.dayOrder.map((date) => {
            const items = grouped.byDay.get(date) ?? []
            if (date === today) return null
            const d = parseISO(date)
            return (
              <section
                key={date}
                className="overflow-hidden rounded-2xl border border-[var(--gcal-border)] bg-white shadow-sm"
              >
                <div className="border-b border-[#eef0f2] px-4 py-2.5">
                  <h2 className="text-ui-sm font-bold text-[var(--gcal-text)]">
                    {format(d, 'EEEE, MMM d')}
                    {isToday(d) ? (
                      <span className="ml-1.5 text-[var(--gcal-blue)]">· Today</span>
                    ) : null}
                  </h2>
                </div>
                <ul>
                  {items.map((item) => (
                    <PackItemRow
                      key={item.id}
                      item={item}
                      readOnly={readOnly}
                      days={days}
                      onToggle={() => void toggleChecklist(item.id)}
                      onDelete={() => void deleteChecklist(item.id)}
                      onDayChange={(day) => void updateChecklist(item.id, { dayDate: day })}
                    />
                  ))}
                </ul>
              </section>
            )
          })}

          {grouped.general.length > 0 ? (
            <section className="overflow-hidden rounded-2xl border border-[var(--gcal-border)] bg-white shadow-sm">
              <div className="border-b border-[#eef0f2] px-4 py-2.5">
                <h2 className="text-ui-sm font-bold text-[var(--gcal-muted)]">Any day</h2>
              </div>
              <ul>
                {grouped.general.map((item) => (
                  <PackItemRow
                    key={item.id}
                    item={item}
                    readOnly={readOnly}
                    days={days}
                    onToggle={() => void toggleChecklist(item.id)}
                    onDelete={() => void deleteChecklist(item.id)}
                    onDayChange={(day) => void updateChecklist(item.id, { dayDate: day })}
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}
