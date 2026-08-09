import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Plus, Receipt, Trash2, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { CATEGORIES } from '../data/categories'
import {
  dayPlannedCents,
  daySpentCents,
  dollarsToExpenseCents,
  formatUsd,
  snapExpenseDollars,
  totalPlannedCents,
  totalSpentCents,
} from '../lib/wallet'
import { cn, isoDate, tripDaysIncludingEvents } from '../lib/time'
import { useTripStore } from '../store/tripStore'
import type { EventCategory, Expense } from '../types'

function CategoryChart({
  rows,
}: {
  rows: { key: string; label: string; color: string; border: string; planned: number; spent: number }[]
}) {
  const max = Math.max(...rows.map((r) => Math.max(r.planned, r.spent)), 1)
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.key}>
          <div className="mb-1 flex items-center justify-between gap-2 text-ui-xs">
            <span className="flex items-center gap-1.5 font-semibold" style={{ color: r.color }}>
              <span className="size-2 rounded-full" style={{ background: r.border }} />
              {r.label}
            </span>
            <span className="tabular-nums text-[var(--gcal-muted)]">
              {formatUsd(r.spent)}
              {r.planned > 0 ? ` / ${formatUsd(r.planned)}` : ''}
            </span>
          </div>
          <div className="relative h-2.5 overflow-hidden rounded-full bg-[var(--gcal-bg)]">
            {r.planned > 0 ? (
              <div
                className="absolute inset-y-0 left-0 rounded-full opacity-25"
                style={{ width: `${(r.planned / max) * 100}%`, background: r.border }}
              />
            ) : null}
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${(r.spent / max) * 100}%`, background: r.border }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function DailySpendChart({
  days,
}: {
  days: { iso: string; shortLabel: string; spent: number; planned: number }[]
}) {
  const max = Math.max(...days.map((d) => Math.max(d.spent, d.planned)), 1)
  return (
    <div className="flex h-36 items-end gap-1.5">
      {days.map((d) => (
        <div key={d.iso} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end justify-center gap-0.5">
            {d.planned > 0 ? (
              <div
                className="w-[42%] rounded-t-sm bg-[var(--gcal-border)]"
                style={{
                  height: `${Math.max(4, (d.planned / max) * 100)}%`,
                }}
                title={`Planned ${formatUsd(d.planned)}`}
              />
            ) : null}
            <div
              className="w-[42%] rounded-t-sm bg-[var(--gcal-blue)]"
              style={{
                height: `${Math.max(d.spent > 0 ? 4 : 0, (d.spent / max) * 100)}%`,
              }}
              title={`Spent ${formatUsd(d.spent)}`}
            />
          </div>
          <span className="w-full truncate text-center text-[9px] font-semibold text-[var(--gcal-muted)]">
            {d.shortLabel}
          </span>
        </div>
      ))}
    </div>
  )
}

function ExpenseRow({
  expense,
  eventTitle,
  readOnly,
  onSelectEvent,
  onDelete,
  onAmountChange,
}: {
  expense: Expense
  eventTitle?: string
  readOnly: boolean
  onSelectEvent?: () => void
  onDelete: () => void
  onAmountChange: (cents: number) => void
}) {
  const cat = CATEGORIES[expense.category as EventCategory] ?? CATEGORIES.other
  const dollars = expense.amountCents / 100
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-[#eef0f2] px-4 py-3 last:border-0">
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ background: cat.border }}
        aria-hidden
      />
      <div className="min-w-0">
        <div className="text-ui-base font-semibold text-[var(--gcal-text)]">{expense.label}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-ui-xs text-[var(--gcal-muted)]">
          <span style={{ color: cat.color }}>{cat.label}</span>
          {expense.spentOn ? <span>{format(parseISO(expense.spentOn), 'MMM d')}</span> : null}
          {eventTitle ? (
            <button
              type="button"
              onClick={onSelectEvent}
              className="font-semibold text-[var(--gcal-blue)] hover:underline"
            >
              → {eventTitle}
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {readOnly ? (
          <span className="text-ui-base font-bold tabular-nums">{formatUsd(expense.amountCents)}</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 text-sm text-[var(--gcal-muted)]">$</span>
            <input
              type="number"
              min={0}
              step={10}
              className="field w-20 text-right text-ui-sm font-bold tabular-nums"
              value={dollars}
              onChange={(e) => {
                const n = snapExpenseDollars(parseFloat(e.target.value || '0'))
                onAmountChange(dollarsToExpenseCents(n))
              }}
              aria-label="Amount in dollars"
            />
          </div>
        )}
        {!readOnly ? (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-1.5 text-[var(--gcal-muted)] hover:bg-[#fce8e6] hover:text-[#c5221f]"
            aria-label="Delete expense"
          >
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </div>
    </li>
  )
}

export function WalletTab() {
  const trip = useTripStore((s) => s.trip)!
  const events = useTripStore((s) => s.events)
  const expenses = useTripStore((s) => s.expenses)
  const mode = useTripStore((s) => s.mode)
  const selectedDate = useTripStore((s) => s.selectedDate)
  const addExpense = useTripStore((s) => s.addExpense)
  const updateExpense = useTripStore((s) => s.updateExpense)
  const deleteExpense = useTripStore((s) => s.deleteExpense)
  const selectEvent = useTripStore((s) => s.selectEvent)
  const readOnly = mode !== 'edit'

  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<EventCategory>('other')

  const days = tripDaysIncludingEvents(trip.startDate, trip.endDate, events)

  const planned = useMemo(() => totalPlannedCents(events), [events])
  const spent = useMemo(() => totalSpentCents(expenses), [expenses])
  const diff = planned - spent
  const over = spent > planned && planned > 0

  const byCategory = useMemo(() => {
    const map = new Map<string, { planned: number; spent: number }>()
    for (const e of events) {
      const cur = map.get(e.category) ?? { planned: 0, spent: 0 }
      cur.planned += e.budgetCents
      map.set(e.category, cur)
    }
    for (const ex of expenses) {
      const cur = map.get(ex.category) ?? { planned: 0, spent: 0 }
      cur.spent += ex.amountCents
      map.set(ex.category, cur)
    }
    return [...map.entries()]
      .filter(([, v]) => v.planned > 0 || v.spent > 0)
      .map(([key, v]) => {
        const meta = CATEGORIES[key as EventCategory] ?? CATEGORIES.other
        return { key, label: meta.label, color: meta.color, border: meta.border, ...v }
      })
      .sort((a, b) => b.spent - a.spent)
  }, [events, expenses])

  const byDay = useMemo(() => {
    return days
      .map((d) => {
        const iso = isoDate(d)
        const p = dayPlannedCents(iso, events)
        const s = daySpentCents(iso, expenses)
        return {
          iso,
          label: format(d, 'EEE MMM d'),
          shortLabel: format(d, 'EEE'),
          planned: p,
          spent: s,
        }
      })
      .filter((d) => d.planned > 0 || d.spent > 0)
  }, [days, events, expenses])

  const spentShare = useMemo(() => {
    const total = spent || 1
    return byCategory.map((c) => ({
      ...c,
      pct: Math.round((c.spent / total) * 100),
    }))
  }, [byCategory, spent])

  const eventTitle = (eventId: string | null) =>
    eventId ? events.find((e) => e.id === eventId)?.title : undefined

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 pb-24">
      <header className="mb-4">
        <h1 className="text-ui-xl font-bold text-[var(--gcal-text)]">Wallet</h1>
        <p className="mt-0.5 text-ui-sm text-[var(--gcal-muted)]">
          Planned vs spent · linked to your events
        </p>
      </header>

      <div className="mb-5 overflow-hidden rounded-2xl border border-[var(--gcal-border)] bg-white shadow-sm">
        <div className="bg-gradient-to-br from-[#e8f0fe] to-[#e6f4ea] px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-ui-xs font-bold uppercase tracking-wide text-[var(--gcal-muted)]">
                Trip total
              </div>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-3xl font-bold text-[var(--gcal-text)]">{formatUsd(spent)}</span>
                <span className="text-ui-sm text-[var(--gcal-muted)]">of {formatUsd(planned)} planned</span>
              </div>
            </div>
            <Wallet className="size-8 text-[var(--gcal-blue)]/60" />
          </div>
          {planned > 0 ? (
            <div className="mt-4">
              <div className="h-2.5 overflow-hidden rounded-full bg-white/70">
                <div
                  className={cn('h-full rounded-full transition-all', over ? 'bg-[#ea4335]' : 'bg-[#34a853]')}
                  style={{ width: `${Math.min(100, (spent / planned) * 100)}%` }}
                />
              </div>
              <div
                className={cn(
                  'mt-2 flex items-center gap-1 text-ui-sm font-semibold',
                  over ? 'text-[#c5221f]' : 'text-[#137333]',
                )}
              >
                {over ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                {over
                  ? `${formatUsd(spent - planned)} over plan`
                  : diff >= 0
                    ? `${formatUsd(diff)} under plan`
                    : 'On plan'}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {(byCategory.length > 0 || byDay.length > 0) ? (
        <section className="mb-5 grid gap-3 sm:grid-cols-2">
          {byCategory.length > 0 ? (
            <div className="rounded-2xl border border-[var(--gcal-border)] bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-ui-sm font-bold uppercase tracking-wide text-[var(--gcal-muted)]">
                By category
              </h2>
              <CategoryChart rows={byCategory} />
              {spentShare.length > 0 ? (
                <div className="mt-4 flex h-3 overflow-hidden rounded-full">
                  {spentShare.map((s) => (
                    <div
                      key={s.key}
                      style={{ width: `${s.pct}%`, background: s.border, minWidth: s.pct > 0 ? 4 : 0 }}
                      title={`${s.label} ${s.pct}%`}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {byDay.length > 0 ? (
            <div className="rounded-2xl border border-[var(--gcal-border)] bg-white p-4 shadow-sm">
              <h2 className="mb-1 text-ui-sm font-bold uppercase tracking-wide text-[var(--gcal-muted)]">
                By day
              </h2>
              <p className="mb-3 text-[10px] text-[var(--gcal-muted)]">Gray = planned · Blue = spent</p>
              <DailySpendChart days={byDay} />
            </div>
          ) : null}
        </section>
      ) : null}

      {!readOnly ? (
        <form
          className="mb-5 rounded-2xl border border-[var(--gcal-border)] bg-white p-4 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault()
            const cents = dollarsToExpenseCents(parseFloat(amount || '0'))
            if (!label.trim() || cents <= 0) return
            void addExpense({
              label: label.trim(),
              amountCents: cents,
              spentOn: selectedDate,
              category,
            })
            setLabel('')
            setAmount('')
          }}
        >
          <h2 className="mb-1 text-ui-sm font-bold text-[var(--gcal-text)]">Log expense</h2>
          <p className="mb-3 text-ui-xs text-[var(--gcal-muted)]">
            For {format(parseISO(selectedDate), 'EEEE, MMM d')} · amounts in $10 steps
          </p>
          <div className="flex flex-col gap-2">
            <input
              className="field"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="What did you buy?"
            />
            <select
              className="field"
              value={category}
              onChange={(e) => setCategory(e.target.value as EventCategory)}
              aria-label="Expense category"
            >
              {Object.entries(CATEGORIES).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="shrink-0 text-sm font-medium text-[var(--gcal-muted)]">$</span>
                <input
                  className="field min-w-0 flex-1"
                  type="number"
                  min={0}
                  step={10}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <button
                type="submit"
                className="field inline-flex shrink-0 items-center justify-center gap-1 border-dashed bg-[var(--gcal-bg)] px-4 text-ui-sm font-semibold text-[var(--gcal-blue)] hover:border-[var(--gcal-blue)] hover:bg-[#e8f0fe]"
              >
                <Plus className="size-4" /> Add
              </button>
            </div>
          </div>
        </form>
      ) : null}

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-ui-sm font-bold uppercase tracking-wide text-[var(--gcal-muted)]">
          <Receipt className="size-4" /> All expenses
        </h2>
        {expenses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--gcal-border)] bg-white px-6 py-10 text-center">
            <p className="text-ui-sm text-[var(--gcal-muted)]">
              No expenses logged yet. Add from here or from an event.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--gcal-border)] bg-white shadow-sm">
            <ul>
              {[...expenses]
                .sort((a, b) => (b.spentOn ?? '').localeCompare(a.spentOn ?? ''))
                .map((ex) => (
                  <ExpenseRow
                    key={ex.id}
                    expense={ex}
                    eventTitle={eventTitle(ex.eventId)}
                    readOnly={readOnly}
                    onSelectEvent={
                      ex.eventId ? () => selectEvent(ex.eventId) : undefined
                    }
                    onDelete={() => void deleteExpense(ex.id)}
                    onAmountChange={(cents) => void updateExpense(ex.id, { amountCents: cents })}
                  />
                ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}
