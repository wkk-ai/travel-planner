import type { RefObject } from 'react'
import {
  CalendarDays,
  Camera,
  CheckSquare,
  ChevronDown,
  CloudSun,
  Copy,
  Ellipsis,
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
  Wrench,
} from 'lucide-react'
import { format } from 'date-fns'
import { useTripStore } from '../store/tripStore'
import { daysUntil, tripDays, isoDate, timeToMinutes, cn } from '../lib/time'
import { exportCalendarImage, exportCalendarPdf, exportExpensesCsv } from '../lib/export'
import { CATEGORIES } from '../data/categories'
import type { EventCategory } from '../types'
import { useEffect, useRef, useState } from 'react'

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
  const searchQuery = useTripStore((s) => s.searchQuery)
  const setSearchQuery = useTripStore((s) => s.setSearchQuery)
  const categoryFilter = useTripStore((s) => s.categoryFilter)
  const setCategoryFilter = useTripStore((s) => s.setCategoryFilter)
  const setPanel = useTripStore((s) => s.setPanel)
  const panel = useTripStore((s) => s.panel)
  const runningLate = useTripStore((s) => s.runningLate)
  const setToast = useTripStore((s) => s.setToast)
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState<'none' | 'plan' | 'tools' | 'share'>('none')

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
      setMenu('none')
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
      setMenu('none')
    }
  }

  function copy(text: string, label: string) {
    void navigator.clipboard.writeText(text)
    setToast(`${label} copied`)
    setMenu('none')
  }

  function openPanel(p: typeof panel) {
    setPanel(panel === p ? 'none' : p)
    setMenu('none')
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
            openPanel('trips')
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
        </button>

        <div className="flex items-center rounded-full border border-[var(--gcal-border)] bg-[var(--gcal-bg)] p-0.5 text-sm">
          <button
            type="button"
            className={cn('rounded-full px-3 py-1.5 font-medium', view === 'day' && 'bg-white shadow-sm')}
            onClick={() => setView('day')}
            title="Day view"
          >
            Day
          </button>
          <button
            type="button"
            className={cn('rounded-full px-3 py-1.5 font-medium', view === 'week' && 'bg-white shadow-sm')}
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

        <label className="flex items-center gap-1 rounded-lg border border-[var(--gcal-border)] bg-white px-2 py-1.5 text-sm" title="Filter by category">
          <Filter className="size-3.5 text-[var(--gcal-muted)]" />
          <select
            className="max-w-[120px] bg-transparent outline-none"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as EventCategory | 'all')}
          >
            <option value="all">All categories</option>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </label>

        <div className="relative min-w-[120px] flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--gcal-muted)]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search…"
            title="Search events"
            className="w-full rounded-full border border-[var(--gcal-border)] bg-white py-1.5 pl-8 pr-3 text-sm outline-none focus:border-[var(--gcal-blue)] focus:ring-2 focus:ring-[#e8f0fe]"
          />
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1">
          <StatusDot />
          {mode === 'edit' ? (
            <>
              <IconBtn label="Undo" disabled={!undoStack.length} onClick={() => void undo()}>
                <Undo2 className="size-4" />
              </IconBtn>
              <button
                type="button"
                onClick={onQuickAdd}
                title="Quick add event"
                className="fab inline-flex items-center gap-1 rounded-full bg-[var(--gcal-blue)] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[var(--gcal-blue-hover)]"
              >
                <Plus className="size-4" /> Add
              </button>
            </>
          ) : null}

          <MenuButton
            open={menu === 'plan'}
            label="Plan"
            icon={<ListTodo className="size-4" />}
            onToggle={() => setMenu(menu === 'plan' ? 'none' : 'plan')}
            onClose={() => setMenu('none')}
          >
            <MenuItem icon={<FolderOpen className="size-4" />} onClick={() => {
              void useTripStore.getState().refreshTrips()
              openPanel('trips')
            }}>
              My trips
            </MenuItem>
            <MenuItem icon={<ListTodo className="size-4" />} onClick={() => openPanel('checklist')}>
              Checklist
            </MenuItem>
            <MenuItem icon={<FileText className="size-4" />} onClick={() => openPanel('notes')}>
              Notes
            </MenuItem>
            <MenuItem icon={<Wallet className="size-4" />} onClick={() => openPanel('budget')}>
              Budget
            </MenuItem>
            <MenuItem icon={<Shield className="size-4" />} onClick={() => openPanel('emergency')}>
              Emergency card
            </MenuItem>
            <MenuItem icon={<Camera className="size-4" />} onClick={() => openPanel('recap')}>
              Trip recap
            </MenuItem>
            <MenuItem icon={<CloudSun className="size-4" />} onClick={() => openPanel('recap')}>
              Weather (in recap)
            </MenuItem>
          </MenuButton>

          {mode === 'edit' ? (
            <MenuButton
              open={menu === 'tools'}
              label="Tools"
              icon={<Wrench className="size-4" />}
              onToggle={() => setMenu(menu === 'tools' ? 'none' : 'tools')}
              onClose={() => setMenu('none')}
            >
              <MenuItem
                icon={<Redo2 className="size-4" />}
                hint="Push remaining events later by 30 minutes (today from now, or the day you are viewing)."
                onClick={() => {
                  const today = isoDate(new Date())
                  const nowTime = format(new Date(), 'HH:mm')
                  const state = useTripStore.getState()
                  const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
                  const todayRemaining = state.events.some(
                    (e) => e.date === today && timeToMinutes(e.startTime) >= nowMins,
                  )
                  // Prefer real today; otherwise the day currently open in the calendar.
                  const date = todayRemaining ? today : selectedDate
                  void runningLate(date, nowTime, 30)
                  setMenu('none')
                }}
              >
                Running late (+30m)
              </MenuItem>
              <MenuItem
                icon={<FileDown className="size-4" />}
                hint="Paste a booking email or text — we suggest matching events to add."
                onClick={() => openPanel('import')}
              >
                Import confirmation
              </MenuItem>
              <MenuItem
                icon={<Sparkles className="size-4" />}
                hint="Clone this trip as a separate sandbox so you can try changes safely."
                onClick={() => openPanel('whatif')}
              >
                What-if copy
              </MenuItem>
            </MenuButton>
          ) : null}

          <MenuButton
            open={menu === 'share'}
            label="Share"
            icon={<Share2 className="size-4" />}
            onToggle={() => setMenu(menu === 'share' ? 'none' : 'share')}
            onClose={() => setMenu('none')}
          >
            <MenuItem icon={<Share2 className="size-4" />} onClick={() => openPanel('share')}>
              Edit & view links
            </MenuItem>
            <MenuItem icon={<Link2 className="size-4" />} onClick={() => copy(share.view, 'View link')}>
              Copy view-only link
            </MenuItem>
            <MenuItem icon={<Copy className="size-4" />} disabled={busy} onClick={() => void doExportImage()}>
              Save as image
            </MenuItem>
            <MenuItem icon={<FileDown className="size-4" />} disabled={busy} onClick={() => void doExportPdf()}>
              Export PDF
            </MenuItem>
            <MenuItem
              icon={<CheckSquare className="size-4" />}
              onClick={() => {
                exportExpensesCsv(useTripStore.getState().expenses, `${trip.name}-expenses.csv`)
                setToast('Expenses CSV downloaded')
                setMenu('none')
              }}
            >
              Expenses CSV
            </MenuItem>
          </MenuButton>
        </div>
      </div>
    </header>
  )
}

function StatusDot() {
  const online = useTripStore((s) => s.online)
  const syncing = useTripStore((s) => s.syncing)
  const pendingOps = useTripStore((s) => s.pendingOps)

  let label = 'Live'
  let tip = 'Connected — changes sync to the cloud'
  let tone: 'ok' | 'warn' | 'bad' | 'busy' = 'ok'

  if (!online) {
    label = 'Offline'
    tip =
      pendingOps > 0
        ? `Offline — ${pendingOps} change${pendingOps === 1 ? '' : 's'} saved on this device`
        : 'Offline — edits stay on this device until you’re back online'
    tone = 'bad'
  } else if (syncing) {
    label = 'Syncing'
    tip = 'Uploading offline changes…'
    tone = 'busy'
  } else if (pendingOps > 0) {
    label = `${pendingOps} pending`
    tip = `${pendingOps} change${pendingOps === 1 ? '' : 's'} waiting to sync`
    tone = 'warn'
  }

  return (
    <span
      className={cn(
        'mr-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        tone === 'ok' && 'bg-[#e6f4ea] text-[#137333]',
        tone === 'busy' && 'bg-[#e8f0fe] text-[var(--gcal-blue)]',
        tone === 'warn' && 'bg-[#fef7e0] text-[#b06000]',
        tone === 'bad' && 'bg-[#fce8e6] text-[#c5221f]',
      )}
      title={tip}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          tone === 'ok' && 'bg-[#34a853]',
          tone === 'busy' && 'animate-pulse bg-[var(--gcal-blue)]',
          tone === 'warn' && 'bg-[#f9ab00]',
          tone === 'bad' && 'bg-[#ea4335]',
        )}
      />
      {label}
    </span>
  )
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-full text-[var(--gcal-text)] hover:bg-[var(--gcal-bg)] disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function MenuButton({
  open,
  label,
  icon,
  onToggle,
  onClose,
  children,
}: {
  open: boolean
  label: string
  icon: React.ReactNode
  onToggle: () => void
  onClose: () => void
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, onClose])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title={label}
        onClick={onToggle}
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm font-medium hover:bg-[var(--gcal-bg)]',
          open && 'bg-[#e8f0fe] text-[var(--gcal-blue)]',
        )}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
        <Ellipsis className="size-3.5 sm:hidden" />
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[240px] max-w-[min(100vw-1rem,320px)] rounded-xl border border-[var(--gcal-border)] bg-white py-1 shadow-xl">
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--gcal-muted)]">
            {label}
          </div>
          {children}
        </div>
      ) : null}
    </div>
  )
}

function MenuItem({
  children,
  icon,
  onClick,
  disabled,
  hint,
}: {
  children: React.ReactNode
  icon: React.ReactNode
  onClick: () => void
  disabled?: boolean
  hint?: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={hint}
      onClick={onClick}
      className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-[var(--gcal-bg)] disabled:opacity-40"
    >
      <span className="mt-0.5 shrink-0 text-[var(--gcal-muted)]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-[var(--gcal-text)]">{children}</span>
        {hint ? (
          <span className="mt-0.5 block text-[11px] leading-snug text-[var(--gcal-muted)]">{hint}</span>
        ) : null}
      </span>
    </button>
  )
}
