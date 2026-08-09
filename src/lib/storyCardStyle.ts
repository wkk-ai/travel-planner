/** Stepped blues for Story stripe + giant-date layout (07). Index 0 = nearest day. */
const STRIPE_BLUES = [
  '#9fc3f5',
  '#b4d0f8',
  '#c2dafb',
  '#d0e3fc',
  '#dce9fd',
  '#e8f0fe',
  '#edf3fe',
  '#f2f7fe',
] as const

const NUM_COLUMN_BG = [
  '#e8f4ff',
  '#eef5ff',
  '#f3f8ff',
  '#f6f9fe',
  '#f8fbff',
  '#fafcff',
  '#fcfdff',
  '#ffffff',
] as const

export function storyStripeGiantStyle(proximityIndex: number): {
  stripe: string
  numColumn: string
} {
  const idx = Math.min(Math.max(0, proximityIndex), STRIPE_BLUES.length - 1)
  return {
    stripe: STRIPE_BLUES[idx],
    numColumn: NUM_COLUMN_BG[idx],
  }
}
