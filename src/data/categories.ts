import type { EventCategory } from '../types'

export const CATEGORIES: Record<
  EventCategory,
  { label: string; color: string; bg: string; border: string }
> = {
  flight: {
    label: 'Flight',
    color: '#1967d2',
    bg: '#d2e3fc',
    border: '#1a73e8',
  },
  meal: {
    label: 'Meal',
    color: '#137333',
    bg: '#ceead6',
    border: '#34a853',
  },
  attraction: {
    label: 'Attraction',
    color: '#c5221f',
    bg: '#fad2cf',
    border: '#ea4335',
  },
  shopping: {
    label: 'Shopping',
    color: '#7627bb',
    bg: '#e9d2fd',
    border: '#a142f4',
  },
  show: {
    label: 'Show',
    color: '#e37400',
    bg: '#feefc3',
    border: '#fbbc04',
  },
  hotel: {
    label: 'Hotel',
    color: '#185abc',
    bg: '#aecbfa',
    border: '#4285f4',
  },
  transport: {
    label: 'Transport',
    color: '#007b83',
    bg: '#cbf0f8',
    border: '#24c1e0',
  },
  other: {
    label: 'Other',
    color: '#3c4043',
    bg: '#e8eaed',
    border: '#9aa0a6',
  },
}

export function eventColors(category: EventCategory, custom?: string | null) {
  if (custom) {
    return { color: '#fff', bg: custom, border: custom }
  }
  return CATEGORIES[category] ?? CATEGORIES.other
}
