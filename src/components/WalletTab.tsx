import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Plus, Receipt, Trash2, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { CATEGORIES } from '../data/categories'
import {
  dayPlannedCents,
  daySpentCents,
  formatUsd,
  totalPlannedCents,
  totalSpentCents,
} from '../lib/wallet'
import { cn, isoDate, tripDaysIncludingEvents } from '../lib/time'
import { useTripStore } from '../store/tripStore'
import type { EventCategory, Expense } from '../types'

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
          <input
            type="number"
            min={0}
            step={0.01}
            className="field w-20 text-right text-ui-sm font-bold tabular-nums"
            value={(expense.amountCents / 100).toFixed(2)}
            onChange={(e) => {
              const n = Math.max(0, parseFloat(e.target.value || '0'))
              onAmountChange(Math.round(n * 100))
            }}
            aria-label="Amount"
          />
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
    return [...map.entries()].filter(([, v]) => v.planned > 0 || v.spent > 0)
  }, [events, expenses])

  const byDay = useMemo(() => {
    return days
      .map((d) => {
        const iso = isoDate(d)
        const p = dayPlannedCents(iso, events)
        const s = daySpentCents(iso, expenses)
        return { iso, label: format(d, 'EEE MMM d'), planned: p, spent: s }
      })
      .filter((d) => d.planned > 0 || d.spent > 0)
  }, [days, events, expenses])

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

      {!readOnly ? (
        <form
          className="mb-5 rounded-2xl border border-[var(--gcal-border)] bg-white p-4 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault()
            const cents = Math.round(parseFloat(amount || '0') * 100)
            if (!label.trim() || cents <= 0) return
            void addExpense({
              label: label.trim(),
              amountCents: cents,
              spentOn: selectedDate,
              category: 'other',
            })
            setLabel('')
            setAmount('')
          }}
        >
          <h2 className="mb-1 text-ui-sm font-bold text-[var(--gcal-text)]">Log expense</h2>
          <p className="mb-3 text-ui-xs text-[var(--gcal-muted)]">
            For {format(parseISO(selectedDate), 'EEEE, MMM d')}
          </p>
          <div className="grid gap-2 sm:grid-cols-[1fr_100px_auto]">
            <input
              className="field"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="What did you buy?"
            />
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gcal-muted)]">
                $
              </span>
              <input
                className="field pl-7"
                type="number"
                min={0}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <button
              type="submit"
              className="flex items-center justify-center gap-1 rounded-xl bg-[var(--gcal-blue)] px-4 py-2.5 text-ui-sm font-semibold text-white hover:bg-[var(--gcal-blue-hover)]"
            >
              <Plus className="size-4" /> Add
            </button>
          </div>
        </form>
      ) : null}

      {byCategory.length > 0 ? (
        <section className="mb-5">
          <h2 className="mb-2 text-ui-sm font-bold uppercase tracking-wide text-[var(--gcal-muted)]">
            By category
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {byCategory.map(([cat, { planned: p, spent: s }]) => {
              const meta = CATEGORIES[cat as EventCategory] ?? CATEGORIES.other
              return (
                <div
                  key={cat}
                  className="rounded-2xl border border-[var(--gcal-border)] bg-white p-3 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: meta.border }} />
                    <span className="text-ui-sm font-bold" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between text-ui-sm">
                    <span className="text-[var(--gcal-muted)]">Spent</span>
                    <span className="font-bold">{formatUsd(s)}</span>
                  </div>
                  {p > 0 ? (
                    <div className="flex justify-between text-ui-xs text-[var(--gcal-muted)]">
                      <span>Planned</span>
                      <span>{formatUsd(p)}</span>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {byDay.length > 0 ? (
        <section className="mb-5">
          <h2 className="mb-2 text-ui-sm font-bold uppercase tracking-wide text-[var(--gcal-muted)]">
            By day
          </h2>
          <ul className="space-y-2">
            {byDay.map((d) => (
              <li
                key={d.iso}
                className="flex items-center justify-between rounded-xl border border-[var(--gcal-border)] bg-white px-4 py-3 shadow-sm"
              >
                <span className="text-ui-sm font-semibold">{d.label}</span>
                <span className="text-ui-sm tabular-nums">
                  <span className="font-bold text-[var(--gcal-text)]">{formatUsd(d.spent)}</span>
                  {d.planned > 0 ? (
                    <span className="text-[var(--gcal-muted)]"> / {formatUsd(d.planned)}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
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
