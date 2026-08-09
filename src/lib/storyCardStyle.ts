/** Solid blue per card — index 0 = nearest day (darkest), each step below lighter. */
const CARD_BLUES = [
  '#b4d0f8',
  '#c2dafb',
  '#d0e3fc',
  '#dce9fd',
  '#e8f0fe',
  '#edf3fe',
  '#f2f7fe',
  '#f8fbff',
] as const

export function storyDayCardStyle(proximityIndex: number, isToday: boolean): {
  background: string
  borderColor: string
  eventSurface: string
} {
  const idx = Math.min(Math.max(0, proximityIndex), CARD_BLUES.length - 1)
  const background = isToday ? '#9fc3f5' : CARD_BLUES[idx]
  const borderAlpha = Math.max(0.18, 0.5 - proximityIndex * 0.05)

  return {
    background,
    borderColor: `rgba(26, 115, 232, ${borderAlpha})`,
    eventSurface: 'rgba(255, 255, 255, 0.9)',
  }
}
