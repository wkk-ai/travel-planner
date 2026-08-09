import type { Expense, TripEvent } from '../types'

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`
}

/** Snap to nearest $10 for expense entry. */
export function snapExpenseDollars(dollars: number): number {
  return Math.max(0, Math.round(dollars / 10) * 10)
}

export function dollarsToExpenseCents(dollars: number): number {
  return snapExpenseDollars(dollars) * 100
}

export function eventPlannedCents(event: TripEvent): number {
  return event.budgetCents
}

export function eventSpentCents(eventId: string, expenses: Expense[]): number {
  return expenses.filter((e) => e.eventId === eventId).reduce((s, e) => s + e.amountCents, 0)
}

export function daySpentCents(date: string, expenses: Expense[]): number {
  return expenses
    .filter((e) => e.spentOn === date)
    .reduce((s, e) => s + e.amountCents, 0)
}

export function dayPlannedCents(date: string, events: TripEvent[]): number {
  return events
    .filter((e) => e.date === date)
    .reduce((s, e) => s + e.budgetCents, 0)
}

export function totalPlannedCents(events: TripEvent[]): number {
  return events.reduce((s, e) => s + e.budgetCents, 0)
}

export function totalSpentCents(expenses: Expense[]): number {
  return expenses.reduce((s, e) => s + e.amountCents, 0)
}
