/** Blue gradient intensity — index 0 = nearest upcoming day (darkest). */
export function storyDayCardStyle(proximityIndex: number, isToday: boolean): {
  background: string
  borderColor: string
  eventSurface: string
} {
  const intensity = isToday ? 1 : Math.max(0.15, 1 - proximityIndex * 0.14)
  const top = `rgba(26, 115, 232, ${0.1 + intensity * 0.22})`
  const mid = `rgba(210, 227, 252, ${0.25 + intensity * 0.45})`
  const bottom = `rgba(248, 251, 255, ${0.5 + intensity * 0.35})`
  return {
    background: `linear-gradient(145deg, ${top} 0%, ${mid} 42%, ${bottom} 100%)`,
    borderColor: `rgba(26, 115, 232, ${0.22 + intensity * 0.5})`,
    eventSurface: isToday ? 'rgba(255, 255, 255, 0.92)' : 'rgba(255, 255, 255, 0.78)',
  }
}
