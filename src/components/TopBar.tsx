import type { RefObject } from 'react'
import {
  CalendarDays,
  Camera,
  CheckSquare,
  ChevronDown,
  CloudSun,
  Copy,
  FileDown,
  FileText,
  Filter,
  FolderOpen,
  Link2,
  ListTodo,
  Plus,
  Redo2,
  Search,
  Share2,
  Shield,
  Sparkles,
  Undo2,
  Wallet,
} from 'lucide-react'
import { format } from 'date-fns'
import { useTripStore } from '../store/tripStore'
import { daysUntil, tripDays, isoDate, cn } from '../lib/time'
import { exportCalendarImage, exportCalendarPdf, exportExpensesCsv } from '../lib/export'
import { CATEGORIES } from '../data/categories'
import type { EventCategory } from '../types'
import { useState } from 'react'

interface Props {
  exportRef: RefObject<HTMLDivElement | null>
  onQuickAdd: () => void
  share: { edit: string; view: string }
}

export function TopBar({ exportRef, onQuickAdd, share }: Props) {
  const trip = useTripStore((s) => s.trip)!
  const view = useTripStore((s) => s.view)
  const setView = useTripStore((s) => s.setView)
  const selectedDate = useTripStore((s) => s.selectedDate)
  const setSelectedDate = useTripStore((s) => s.setSelectedDate)
  const mode = useTripStore((s) => s.mode)
  const undo = useTripStore((s) => s.undo)
  const undoStack = useTripStore((s) => s.undoStack)
  const online = useTripStore((s) => s.online)
  const searchQuery = useTripStore((s) => s.searchQuery)
  const setSearchQuery = useTripStore((s) => s.setSearchQuery)
  const categoryFilter = useTripStore((s) => s.categoryFilter)
  const setCategoryFilter = useTripStore((s) => s.setCategoryFilter)
  const setPanel = useTripStore((s) => s.setPanel)
  const panel = useTripStore((s) => s.panel)
  const runningLate = useTripStore((s) => s.runningLate)
  const setToast = useTripStore((s) => s.setToast)
  const [busy, setBusy] = useState(false)

  const days = tripDays(trip.startDate, trip.endDate)
  const countdown = daysUntil(trip.startDate)
  const bigbang = daysUntil('2026-09-04')

  async function doExportImage() {
    if (!exportRef.current) return
    setBusy(true)
    try {
      await exportCalendarImage(exportRef.current, `${trip.name}-calendar.png`)
      setToast('Calendar image saved')
    } catch {
      setToast('Image export failed')
    } finally {
      setBusy(false)
    }
  }

  async function doExportPdf() {
    if (!exportRef.current) return
    setBusy(true)
    try {
      await exportCalendarPdf(exportRef.current, `${trip.name}.pdf`)
      setToast('PDF saved')
    } catch {
      setToast('PDF export failed')
    } finally {
      setBusy(false)
    }
  }

  function copy(text: string, label: string) {
    void navigator.clipboard.writeText(text)
    setToast(`${label} copied`)
  }

  return (
    <header className="no-print z-40 border-b border-[var(--gcal-border)] bg-white/90 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 sm:px-4">
        <button
          type="button"
          className="group relative mr-1 flex items-center gap-2 rounded-lg px-1 py-0.5 text-left hover:bg-[var(--gcal-bg)]"
          title="Open trips menu"
          onClick={() => {
            void useTripStore.getState().refreshTrips()
            setPanel(panel === 'trips' ? 'none' : 'trips')
          }}
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--gcal-blue)] text-white">
            <CalendarDays className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <div className="brand-serif truncate text-xl leading-none">{trip.name}</div>
              <ChevronDown className="size-4 shrink-0 text-[var(--gcal-muted)]" />
            </div>
            <div className="text-[11px] text-[var(--gcal-muted)]">
              {countdown > 0
                ? `${countdown} days until departure`
                : countdown === 0
                  ? 'Trip starts today'
                  : `Day ${Math.abs(countdown) + 1} of trip`}
              {bigbang > 0 && trip.name.toLowerCase().includes('bigbang')
                ? ` · BigBang in ${bigbang}d`
                : ''}
            </div>
          </div>
          <Tip>My trips — switch or create</Tip>
        </button>

        <div className="flex items-center rounded-full border border-[var(--gcal-border)] bg-[var(--gcal-bg)] p-0.5 text-sm">
          <button
            type="button"
            className={cn(
              'rounded-full px-3 py-1.5 font-medium',
              view === 'day' && 'bg-white shadow-sm',
            )}
            onClick={() => setView('day')}
            title="Day view"
          >
            Day
          </button>
          <button
            type="button"
            className={cn(
              'rounded-full px-3 py-1.5 font-medium',
              view === 'week' && 'bg-white shadow-sm',
            )}
            onClick={() => setView('week')}
            title="Week view"
          >
            Week
          </button>
        </div>

        <select
          className="rounded-lg border border-[var(--gcal-border)] bg-white px-2 py-1.5 text-sm"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          title="Jump to day"
        >
          {days.map((d) => (
            <option key={isoDate(d)} value={isoDate(d)}>
              {format(d, 'EEE dd/MM')}
            </option>
          ))}
        </select>

        <label className="group relative flex items-center gap-1 rounded-lg border border-[var(--gcal-border)] bg-white px-2 py-1.5 text-sm">
          <Filter className="size-3.5 text-[var(--gcal-muted)]" />
          <select
            className="max-w-[120px] bg-transparent outline-none"
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as EventCategory | 'all')
            }
            title="Filter by category"
          >
            <option value="all">All categories</option>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <Tip>Filter by category</Tip>
        </label>

        <div className="relative min-w-[140px] flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--gcal-muted)]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events…"
            title="Search events"
            className="w-full rounded-full border border-[var(--gcal-border)] bg-white py-1.5 pl-8 pr-3 text-sm outline-none focus:border-[var(--gcal-blue)] focus:ring-2 focus:ring-[#e8f0fe]"
          />
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1">
          <StatusDot online={online} />
          {mode === 'edit' ? (
            <>
              <IconBtn label="Undo last change" disabled={!undoStack.length} onClick={() => void undo()}>
                <Undo2 className="size-4" />
              </IconBtn>
              <IconBtn
                label="Running late — shift rest of day +30 min"
                onClick={() =>
                  void runningLate(selectedDate, format(new Date(), 'HH:mm'), 30)
                }
              >
                <Redo2 className="size-4" />
              </IconBtn>
              <button
                type="button"
                onClick={onQuickAdd}
                title="Quick add event"
                className="fab group relative inline-flex items-center gap-1 rounded-full bg-[var(--gcal-blue)] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[var(--gcal-blue-hover)]"
              >
                <Plus className="size-4" /> Add
                <Tip light>Quick add event</Tip>
              </button>
            </>
          ) : null}

          <IconBtn label="Trips list" active={panel === 'trips'} onClick={() => {
            void useTripStore.getState().refreshTrips()
            setPanel(panel === 'trips' ? 'none' : 'trips')
          }}>
            <FolderOpen className="size-4" />
          </IconBtn>
          <IconBtn label="Checklist" active={panel === 'checklist'} onClick={() => setPanel(panel === 'checklist' ? 'none' : 'checklist')}>
            <ListTodo className="size-4" />
          </IconBtn>
          <IconBtn label="Day notes" active={panel === 'notes'} onClick={() => setPanel(panel === 'notes' ? 'none' : 'notes')}>
            <FileText className="size-4" />
          </IconBtn>
          <IconBtn label="Budget & expenses" active={panel === 'budget'} onClick={() => setPanel(panel === 'budget' ? 'none' : 'budget')}>
            <Wallet className="size-4" />
          </IconBtn>
          <IconBtn label="Weather & trip recap" active={panel === 'recap'} onClick={() => setPanel(panel === 'recap' ? 'none' : 'recap')}>
            <CloudSun className="size-4" />
          </IconBtn>
          <IconBtn label="Emergency card" active={panel === 'emergency'} onClick={() => setPanel(panel === 'emergency' ? 'none' : 'emergency')}>
            <Shield className="size-4" />
          </IconBtn>
          <IconBtn label="Share edit & view links" active={panel === 'share'} onClick={() => setPanel(panel === 'share' ? 'none' : 'share')}>
            <Share2 className="size-4" />
          </IconBtn>
          {mode === 'edit' ? (
            <>
              <IconBtn label="Import flight/hotel confirmation" active={panel === 'import'} onClick={() => setPanel(panel === 'import' ? 'none' : 'import')}>
                <FileDown className="size-4" />
              </IconBtn>
              <IconBtn label="What-if — save a sandbox copy as a new trip" active={panel === 'whatif'} onClick={() => setPanel(panel === 'whatif' ? 'none' : 'whatif')}>
                <Sparkles className="size-4" />
              </IconBtn>
            </>
          ) : null}
          <IconBtn label="Trip recap photos & places" active={panel === 'recap'} onClick={() => setPanel(panel === 'recap' ? 'none' : 'recap')}>
            <Camera className="size-4" />
          </IconBtn>
          <IconBtn label="Save calendar as image (PNG)" disabled={busy} onClick={() => void doExportImage()}>
            <Copy className="size-4" />
          </IconBtn>
          <IconBtn label="Export calendar as PDF" disabled={busy} onClick={() => void doExportPdf()}>
            <FileDown className="size-4" />
          </IconBtn>
          <IconBtn
            label="Download expenses CSV"
            onClick={() => {
              exportExpensesCsv(useTripStore.getState().expenses, `${trip.name}-expenses.csv`)
              setToast('Expenses CSV downloaded')
            }}
          >
            <CheckSquare className="size-4" />
          </IconBtn>
          <IconBtn label="Copy view-only link" onClick={() => copy(share.view, 'View link')}>
            <Link2 className="size-4" />
          </IconBtn>
        </div>
      </div>
    </header>
  )
}

function Tip({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <span
      className={cn(
        'pointer-events-none absolute left-1/2 top-[calc(100%+6px)] z-50 hidden -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium shadow-lg group-hover:block',
        light
          ? 'bg-white text-[var(--gcal-text)]'
          : 'bg-[#3c4043] text-white',
      )}
      role="tooltip"
    >
      {children}
    </span>
  )
}

function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      className={cn(
        'group relative mr-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        online ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#fce8e6] text-[#c5221f]',
      )}
    >
      <span className={cn('size-1.5 rounded-full', online ? 'bg-[#34a853]' : 'bg-[#ea4335]')} />
      {online ? 'Live' : 'Offline'}
      <Tip>{online ? 'Synced live' : 'Offline — edits queued'}</Tip>
    </span>
  )
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'group relative inline-flex size-8 items-center justify-center rounded-full text-[var(--gcal-text)] hover:bg-[var(--gcal-bg)] disabled:opacity-40',
        active && 'bg-[#e8f0fe] text-[var(--gcal-blue)]',
      )}
    >
      {children}
      <Tip>{label}</Tip>
    </button>
  )
}
