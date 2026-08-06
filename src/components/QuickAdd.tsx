import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { EventCategory } from '../types'
import { CATEGORIES } from '../data/categories'
import { useTripStore } from '../store/tripStore'

interface Props {
  onClose: () => void
}

const PRESETS: { label: string; category: EventCategory; title: string }[] = [
  { label: 'Lunch', category: 'meal', title: 'Lunch' },
  { label: 'Dinner', category: 'meal', title: 'Dinner' },
  { label: 'Flight', category: 'flight', title: 'Flight' },
  { label: 'Park', category: 'attraction', title: 'Attraction' },
  { label: 'Shop', category: 'shopping', title: 'Shopping' },
  { label: 'Show', category: 'show', title: 'Show' },
]

export function QuickAdd({ onClose }: Props) {
  const addEvent = useTripStore((s) => s.addEvent)
  const selectedDate = useTripStore((s) => s.selectedDate)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<EventCategory>('other')
  const [start, setStart] = useState('12:00')
  const [end, setEnd] = useState('13:00')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit() {
    await addEvent({
      title: title.trim() || 'New event',
      category,
      date: selectedDate,
      startTime: start,
      endTime: end,
    })
    onClose()
  }

  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center bg-black/35 sm:items-center" onClick={onClose}>
      <div
        className="panel-enter w-full max-w-md rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="brand-serif text-xl">Quick add</div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-[var(--gcal-bg)]">
            <X className="size-5" />
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setCategory(p.category)
                setTitle(p.title)
              }}
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: CATEGORIES[p.category].bg,
                color: CATEGORIES[p.category].color,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <input
          autoFocus
          className="mb-3 w-full rounded-lg border border-[var(--gcal-border)] px-3 py-2 outline-none focus:border-[var(--gcal-blue)] focus:ring-2 focus:ring-[#e8f0fe]"
          placeholder="What's the plan?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit()
          }}
        />

        <div className="mb-3 grid grid-cols-3 gap-2">
          <select
            className="rounded-lg border border-[var(--gcal-border)] px-2 py-2 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value as EventCategory)}
          >
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <input
            type="time"
            className="rounded-lg border border-[var(--gcal-border)] px-2 py-2 text-sm"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <input
            type="time"
            className="rounded-lg border border-[var(--gcal-border)] px-2 py-2 text-sm"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>

        <button
          type="button"
          onClick={() => void submit()}
          className="w-full rounded-xl bg-[var(--gcal-blue)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--gcal-blue-hover)]"
        >
          Add to {selectedDate}
        </button>
      </div>
    </div>
  )
}
