import { useMemo, useState } from 'react'
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
import { formatDateBr, isoDate, tripDaysIncludingEvents } from '../lib/time'
import { useTripStore } from '../store/tripStore'
import type { EventCategory, Expense } from '../types'

type CatRow = {
  key: string
  label: string
  color: string
  bg: string
  planned: number
  spent: number
}

type DayRow = { key: string; weekday: string; dayMonth: string; planned: number; spent: number }

const RING_R = 14
const RING_C = 2 * Math.PI * RING_R

function WalletRingSummary({
  planned,
  spent,
}: {
  planned: number
  spent: number
}) {
  const over = spent > planned && planned > 0
  const pct = planned > 0 ? Math.round((spent / planned) * 100) : spent > 0 ? 100 : 0
  const overCents = Math.max(0, spent - planned)

  let blueLen = 0
  let redLen = 0
  if (spent <= 0) {
    blueLen = 0
  } else if (planned <= 0) {
    blueLen = RING_C
  } else if (!over) {
    blueLen = (spent / planned) * RING_C
  } else {
    blueLen = (planned / spent) * RING_C
    redLen = RING_C - blueLen
  }

  return (
    <div className="mb-5 grid grid-cols-[auto_1fr] items-center gap-4 rounded-2xl border border-[var(--gcal-border)] bg-white p-4 shadow-sm">
      <div className="relative size-24 shrink-0">
        <svg className="size-24 -rotate-90" viewBox="0 0 36 36" aria-hidden>
          <circle cx="18" cy="18" r={RING_R} fill="none" stroke="#e8f0fe" strokeWidth="4" />
          {blueLen > 0 ? (
            <circle
              cx="18"
              cy="18"
              r={RING_R}
              fill="none"
              stroke="var(--gcal-blue)"
              strokeWidth="4"
              strokeDasharray={`${blueLen} ${RING_C}`}
              strokeLinecap="round"
            />
          ) : null}
          {redLen > 0 ? (
            <circle
              cx="18"
              cy="18"
              r={RING_R}
              fill="none"
              stroke="#ea4335"
              strokeWidth="4"
              strokeDasharray={`${redLen} ${RING_C}`}
              strokeDashoffset={-blueLen}
              strokeLinecap="round"
            />
          ) : null}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-xl font-bold tabular-nums text-[var(--gcal-text)]">{pct}%</div>
          <div className="text-[10px] font-medium text-[var(--gcal-muted)]">of plan</div>
        </div>
      </div>
      <div className="min-w-0 space-y-1 text-ui-sm">
        <div className="text-[var(--gcal-muted)]">
          Spent <span className="font-bold text-[var(--gcal-text)]">{formatUsd(spent)}</span>
        </div>
        <div className="text-[var(--gcal-muted)]">
          Planned <span className="font-bold text-[var(--gcal-text)]">{formatUsd(planned)}</span>
        </div>
        {over ? (
          <div className="pt-0.5 font-semibold text-[#c5221f]">{formatUsd(overCents)} over plan</div>
        ) : planned > 0 ? (
          <div className="pt-0.5 font-semibold text-[#137333]">
            {formatUsd(Math.max(0, planned - spent))} left
          </div>
        ) : null}
      </div>
    </div>
  )
}

function CategoryPills({ rows }: { rows: CatRow[] }) {
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div
          key={r.key}
          className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-ui-sm font-semibold"
          style={{ background: r.bg, color: r.color }}
        >
          <span>{r.label}</span>
          <span className="shrink-0 tabular-nums">
            {formatUsd(r.spent)}
            {r.planned > 0 ? ` / ${formatUsd(r.planned)}` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

function DayColumnChart({ rows }: { rows: DayRow[] }) {
  const max = Math.max(...rows.map((r) => Math.max(r.planned, r.spent)), 1)
  return (
    <div className="flex h-28 items-end justify-between gap-1">
      {rows.map((r) => {
        const plannedH = r.planned > 0 ? Math.max(6, (r.planned / max) * 100) : 0
        const spentH = r.spent > 0 ? Math.max(6, (r.spent / max) * 100) : 0
        return (
          <div key={r.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full flex-1 items-end justify-center gap-0.5">
              {plannedH > 0 ? (
                <div
                  className="w-[42%] rounded-t-md bg-[var(--gcal-border)]"
                  style={{ height: `${plannedH}%` }}
                  title={`Planned ${formatUsd(r.planned)}`}
                />
              ) : null}
              {spentH > 0 ? (
                <div
                  className="w-[42%] rounded-t-md bg-[var(--gcal-blue)]"
                  style={{ height: `${spentH}%` }}
                  title={`Spent ${formatUsd(r.spent)}`}
                />
              ) : null}
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="w-full truncate text-center text-[9px] font-semibold capitalize text-[var(--gcal-muted)]">
                {r.weekday}
              </span>
              <span className="w-full truncate text-center text-[8px] font-medium tabular-nums text-[var(--gcal-muted)]">
                {r.dayMonth}
              </span>
            </div>
          </div>
        )
      })}
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
          {expense.spentOn ? (
            <span>{formatDateBr(expense.spentOn, "d 'de' MMM")}</span>
          ) : null}
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

  const byCategory = useMemo((): CatRow[] => {
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
        return { key, label: meta.label, color: meta.color, bg: meta.bg, ...v }
      })
      .sort((a, b) => b.spent - a.spent)
  }, [events, expenses])

  const byDay = useMemo((): DayRow[] => {
    return days.map((d) => {
      const iso = isoDate(d)
      return {
        key: iso,
        weekday: formatDateBr(d, 'EEE'),
        dayMonth: formatDateBr(d, 'd/M'),
        planned: dayPlannedCents(iso, events),
        spent: daySpentCents(iso, expenses),
      }
    })
  }, [days, events, expenses])

  const eventTitle = (eventId: string | null) =>
    eventId ? events.find((e) => e.id === eventId)?.title : undefined

  const showDayChart = byDay.some((d) => d.planned > 0 || d.spent > 0)

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 pb-24">
      <header className="mb-4">
        <h1 className="text-ui-xl font-bold text-[var(--gcal-text)]">Wallet</h1>
        <p className="mt-0.5 text-ui-sm text-[var(--gcal-muted)]">Planned vs spent</p>
      </header>

      {planned > 0 || spent > 0 ? (
        <WalletRingSummary planned={planned} spent={spent} />
      ) : null}

      {byCategory.length > 0 ? (
        <section className="mb-4 rounded-2xl border border-[var(--gcal-border)] bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-ui-sm font-bold uppercase tracking-wide text-[var(--gcal-muted)]">
            By category
          </h2>
          <CategoryPills rows={byCategory} />
        </section>
      ) : null}

      {showDayChart ? (
        <section className="mb-5 rounded-2xl border border-[var(--gcal-border)] bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-ui-sm font-bold uppercase tracking-wide text-[var(--gcal-muted)]">
            By day
          </h2>
          <p className="mb-3 text-[10px] text-[var(--gcal-muted)]">Gray = planned · Blue = spent</p>
          <DayColumnChart rows={byDay} />
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
              {formatDateBr(selectedDate, "EEEE, d 'de' MMMM")} · arredonda em US$ 10
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
