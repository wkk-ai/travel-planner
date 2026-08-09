import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Plus, Receipt, Trash2 } from 'lucide-react'
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

type BarRow = { key: string; label: string; color: string; border: string; planned: number; spent: number }

function CompareBars({ rows }: { rows: BarRow[] }) {
  const max = Math.max(...rows.map((r) => Math.max(r.planned, r.spent)), 1)
  return (
    <div className="space-y-3.5">
      {rows.map((r) => (
        <div key={r.key}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-ui-sm font-semibold text-[var(--gcal-text)]">
              <span className="size-2 shrink-0 rounded-full" style={{ background: r.border }} />
              <span className="truncate">{r.label}</span>
            </span>
            <span className="shrink-0 text-ui-xs tabular-nums text-[var(--gcal-muted)]">
              <span className="font-bold text-[var(--gcal-text)]">{formatUsd(r.spent)}</span>
              {r.planned > 0 ? ` / ${formatUsd(r.planned)}` : ''}
            </span>
          </div>
          <div className="relative h-3 overflow-hidden rounded-full bg-[var(--gcal-bg)]">
            {r.planned > 0 ? (
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-[#dadce0]"
                style={{ width: `${(r.planned / max) * 100}%` }}
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
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: cat.border }} aria-hidden />
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
            step={10}
            className="field w-[4.5rem] text-right text-ui-sm font-bold tabular-nums"
            value={dollars}
            onChange={(e) => {
              const n = snapExpenseDollars(parseFloat(e.target.value || '0'))
              onAmountChange(dollarsToExpenseCents(n))
            }}
            aria-label="Amount in dollars"
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--gcal-muted)]">
      {children}
    </div>
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

  const byCategory = useMemo((): BarRow[] => {
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

  const byDay = useMemo((): BarRow[] => {
    return days
      .map((d) => {
        const iso = isoDate(d)
        return {
          key: iso,
          label: format(d, 'EEE, MMM d'),
          color: 'var(--gcal-text)',
          border: 'var(--gcal-blue)',
          planned: dayPlannedCents(iso, events),
          spent: daySpentCents(iso, expenses),
        }
      })
      .filter((d) => d.planned > 0 || d.spent > 0)
  }, [days, events, expenses])

  const eventTitle = (eventId: string | null) =>
    eventId ? events.find((e) => e.id === eventId)?.title : undefined

  const spentDollars = Math.round(spent / 100)
  const plannedDollars = Math.round(planned / 100)
  const diffDollars = Math.abs(Math.round(diff / 100))

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 pb-24">
      <header className="mb-4">
        <h1 className="text-ui-xl font-bold text-[var(--gcal-text)]">Wallet</h1>
        <p className="mt-0.5 text-ui-sm text-[var(--gcal-muted)]">
          Planned vs spent · linked to your events
        </p>
      </header>

      <div className="mb-5 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-[#c2d7f7] bg-[#e8f0fe] p-3 shadow-sm">
          <div className="text-ui-xs font-semibold uppercase tracking-wide text-[var(--gcal-blue)]">
            Spent
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-[#0d47a1]">{spentDollars}</div>
          <div className="text-[10px] font-medium text-[var(--gcal-muted)]">USD</div>
        </div>
        <div className="rounded-2xl border border-[var(--gcal-border)] bg-white p-3 shadow-sm">
          <div className="text-ui-xs font-semibold uppercase tracking-wide text-[var(--gcal-muted)]">
            Planned
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-[var(--gcal-text)]">
            {plannedDollars}
          </div>
          <div className="text-[10px] font-medium text-[var(--gcal-muted)]">USD</div>
        </div>
        <div
          className={cn(
            'rounded-2xl border p-3 shadow-sm',
            over ? 'border-[#f5c2c0] bg-[#fce8e6]' : 'border-[#ceead6] bg-[#e6f4ea]',
          )}
        >
          <div
            className={cn(
              'text-ui-xs font-semibold uppercase tracking-wide',
              over ? 'text-[#c5221f]' : 'text-[#137333]',
            )}
          >
            {over ? 'Over' : 'Left'}
          </div>
          <div
            className={cn(
              'mt-1 text-2xl font-bold tabular-nums',
              over ? 'text-[#c5221f]' : 'text-[#137333]',
            )}
          >
            {diffDollars}
          </div>
          <div className="text-[10px] font-medium text-[var(--gcal-muted)]">USD</div>
        </div>
      </div>

      {planned > 0 ? (
        <div className="mb-5 rounded-2xl border border-[var(--gcal-border)] bg-white px-4 py-3 shadow-sm">
          <div className="mb-2 flex justify-between text-ui-xs text-[var(--gcal-muted)]">
            <span>Trip progress</span>
            <span className="font-semibold tabular-nums">
              {Math.min(100, Math.round((spent / planned) * 100))}% of plan
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[var(--gcal-bg)]">
            <div
              className={cn('h-full rounded-full', over ? 'bg-[#ea4335]' : 'bg-[#34a853]')}
              style={{ width: `${Math.min(100, (spent / planned) * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {byCategory.length > 0 ? (
        <section className="mb-4 rounded-2xl border border-[var(--gcal-border)] bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-ui-sm font-bold uppercase tracking-wide text-[var(--gcal-muted)]">
            By category
          </h2>
          <CompareBars rows={byCategory} />
        </section>
      ) : null}

      {byDay.length > 0 ? (
        <section className="mb-5 rounded-2xl border border-[var(--gcal-border)] bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-ui-sm font-bold uppercase tracking-wide text-[var(--gcal-muted)]">
            By day
          </h2>
          <p className="mb-3 text-[10px] text-[var(--gcal-muted)]">Gray = planned · Color = spent</p>
          <CompareBars rows={byDay} />
        </section>
      ) : null}

      {!readOnly ? (
        <form
          className="mb-5 overflow-hidden rounded-2xl border border-[var(--gcal-border)] bg-white shadow-sm"
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
          <div className="border-b border-[#eef0f2] bg-[#e8f0fe] px-4 py-3">
            <h2 className="text-ui-sm font-bold text-[#0d47a1]">Log expense</h2>
            <p className="mt-0.5 text-ui-xs text-[var(--gcal-muted)]">
              {format(parseISO(selectedDate), 'EEEE, MMM d')} · round to nearest $10
            </p>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <FieldLabel>What did you buy?</FieldLabel>
              <input
                className="field"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Lunch at Pier 39"
              />
            </div>
            <div>
              <FieldLabel>Category</FieldLabel>
              <select
                className="field"
                value={category}
                onChange={(e) => setCategory(e.target.value as EventCategory)}
              >
                {Object.entries(CATEGORIES).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Amount (USD)</FieldLabel>
              <input
                className="field"
                type="number"
                min={0}
                step={10}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50"
              />
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--gcal-blue)] py-3 text-ui-sm font-semibold text-white hover:bg-[var(--gcal-blue-hover)]"
            >
              <Plus className="size-4" />
              Add expense
            </button>
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
              No expenses yet — log one above or from an event.
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
                    onSelectEvent={ex.eventId ? () => selectEvent(ex.eventId) : undefined}
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
