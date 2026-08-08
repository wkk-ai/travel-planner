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
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { useTripStore } from '../store/tripStore'
import { daysUntil, isoDate, timeToMinutes, cn } from '../lib/time'
import { exportCalendarImage, exportCalendarPdf, exportExpensesCsv } from '../lib/export'
import { useEffect, useRef, useState } from 'react'

interface Props {
  exportRef: RefObject<HTMLDivElement | null>
  onQuickAdd: () => void
  share: { edit: string; view: string }
}

export function TopBar({ exportRef, onQuickAdd, share }: Props) {
  const trip = useTripStore((s) => s.trip)!
  const activeTab = useTripStore((s) => s.activeTab)
  const selectedDate = useTripStore((s) => s.selectedDate)
  const mode = useTripStore((s) => s.mode)
  const undo = useTripStore((s) => s.undo)
  const undoStack = useTripStore((s) => s.undoStack)
  const searchQuery = useTripStore((s) => s.searchQuery)
  const setSearchQuery = useTripStore((s) => s.setSearchQuery)
  const setPanel = useTripStore((s) => s.setPanel)
  const panel = useTripStore((s) => s.panel)
  const runningLate = useTripStore((s) => s.runningLate)
  const setToast = useTripStore((s) => s.setToast)
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState<'none' | 'plan' | 'tools' | 'share' | 'more'>('none')
  const [searchOpen, setSearchOpen] = useState(false)

  const countdown = daysUntil(trip.startDate)
  const bigbang = daysUntil('2026-09-04')

  const tripStatus =
    countdown > 0
      ? `${countdown}d to go`
      : countdown === 0
        ? 'Starts today'
        : `Day ${Math.abs(countdown) + 1}`

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
    <header className="no-print z-40 border-b border-[var(--gcal-border)] bg-white shadow-sm">
      {/* —— Mobile —— */}
      <div className="sm:hidden">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e8f0fe] text-[var(--gcal-blue)]"
            onClick={() => {
              void useTripStore.getState().refreshTrips()
              openPanel('trips')
            }}
            aria-label="My trips"
          >
            <CalendarDays className="size-5" />
          </button>

          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => {
              void useTripStore.getState().refreshTrips()
              openPanel('trips')
            }}
          >
            <div className="truncate text-ui-lg font-semibold leading-tight">{trip.name}</div>
            <div className="truncate text-ui-sm text-[var(--gcal-muted)]">
              {tripStatus}
              {bigbang > 0 && trip.name.toLowerCase().includes('bigbang') ? ` · BB ${bigbang}d` : ''}
            </div>
          </button>

          <StatusDot compact />
          {mode === 'edit' ? (
            <IconBtn label="Undo" disabled={!undoStack.length} onClick={() => void undo()}>
              <Undo2 className="size-4" />
            </IconBtn>
          ) : null}
          <IconBtn
            label={searchOpen ? 'Close search' : 'Search'}
            onClick={() => setSearchOpen(!searchOpen)}
          >
            {searchOpen ? <X className="size-4" /> : <Search className="size-4" />}
          </IconBtn>
          <MenuButton
            open={menu === 'more'}
            label="More"
            icon={<Ellipsis className="size-5" />}
            onToggle={() => setMenu(menu === 'more' ? 'none' : 'more')}
            onClose={() => setMenu('none')}
            mobile
          >
            {mode === 'edit' ? (
              <MenuItem icon={<Plus className="size-4" />} onClick={() => { onQuickAdd(); setMenu('none') }}>
                Add event
              </MenuItem>
            ) : null}
            <div className="my-1 border-t border-[var(--gcal-border)]" />
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
            {mode === 'edit' ? (
              <>
                <div className="my-1 border-t border-[var(--gcal-border)]" />
                <MenuItem icon={<Redo2 className="size-4" />} onClick={() => {
                  const today = isoDate(new Date())
                  const nowTime = format(new Date(), 'HH:mm')
                  const state = useTripStore.getState()
                  const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
                  const todayRemaining = state.events.some(
                    (e) => e.date === today && timeToMinutes(e.startTime) >= nowMins,
                  )
                  const date = todayRemaining ? today : selectedDate
                  void runningLate(date, nowTime, 30)
                  setMenu('none')
                }}>
                  Running late (+30m)
                </MenuItem>
                <MenuItem icon={<FileDown className="size-4" />} onClick={() => openPanel('import')}>
                  Import confirmation
                </MenuItem>
                <MenuItem icon={<Sparkles className="size-4" />} onClick={() => openPanel('whatif')}>
                  What-if copy
                </MenuItem>
              </>
            ) : null}
            <div className="my-1 border-t border-[var(--gcal-border)]" />
            <MenuItem icon={<Share2 className="size-4" />} onClick={() => openPanel('share')}>
              Share links
            </MenuItem>
            <MenuItem icon={<Copy className="size-4" />} onClick={() => copy(share.view, 'View link')}>
              Copy view link
            </MenuItem>
          </MenuButton>
        </div>

        {searchOpen ? (
          <div className="border-t border-[var(--gcal-border)] px-3 py-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--gcal-muted)]" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events…"
                className="w-full rounded-xl border border-[var(--gcal-border)] bg-[var(--gcal-bg)] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[var(--gcal-blue)] focus:bg-white"
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* —— Desktop —— */}
      <div className="hidden flex-wrap items-center gap-2 px-3 py-2 sm:flex sm:px-4">
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
              <div className="truncate text-ui-lg font-semibold leading-tight tracking-tight">{trip.name}</div>
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

        {activeTab === 'schedule' ? (
          <div className="relative min-w-[120px] flex-1 max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--gcal-muted)]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search…"
              title="Search events"
              className="w-full rounded-full border border-[var(--gcal-border)] bg-white py-2 pl-8 pr-3 text-ui-sm outline-none focus:border-[var(--gcal-blue)] focus:ring-2 focus:ring-[#e8f0fe]"
            />
          </div>
        ) : null}

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

function StatusDot({ compact }: { compact?: boolean }) {
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
        'inline-flex items-center gap-1 rounded-full font-medium',
        compact ? 'size-2.5 p-0' : 'mr-1 px-2 py-0.5 text-[11px]',
        !compact && tone === 'ok' && 'bg-[#e6f4ea] text-[#137333]',
        !compact && tone === 'busy' && 'bg-[#e8f0fe] text-[var(--gcal-blue)]',
        !compact && tone === 'warn' && 'bg-[#fef7e0] text-[#b06000]',
        !compact && tone === 'bad' && 'bg-[#fce8e6] text-[#c5221f]',
      )}
      title={tip}
    >
      <span
        className={cn(
          'rounded-full',
          compact ? 'size-2.5' : 'size-1.5',
          tone === 'ok' && 'bg-[#34a853]',
          tone === 'busy' && 'animate-pulse bg-[var(--gcal-blue)]',
          tone === 'warn' && 'bg-[#f9ab00]',
          tone === 'bad' && 'bg-[#ea4335]',
        )}
      />
      {compact ? null : label}
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
  mobile,
}: {
  open: boolean
  label: string
  icon: React.ReactNode
  onToggle: () => void
  onClose: () => void
  children: React.ReactNode
  mobile?: boolean
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
          'inline-flex items-center gap-1 rounded-full font-medium hover:bg-[var(--gcal-bg)]',
          mobile ? 'size-10 justify-center' : 'px-2.5 py-1.5 text-sm',
          open && 'bg-[#e8f0fe] text-[var(--gcal-blue)]',
        )}
      >
        {icon}
        {!mobile ? <span className="hidden sm:inline">{label}</span> : null}
        {!mobile ? <Ellipsis className="size-3.5 sm:hidden" /> : null}
      </button>
      {open ? (
        <div
          className={cn(
            'absolute z-50 max-h-[70vh] overflow-auto rounded-xl border border-[var(--gcal-border)] bg-white py-1 shadow-xl',
            mobile
              ? 'right-0 top-[calc(100%+6px)] min-w-[min(100vw-1.5rem,280px)]'
              : 'right-0 top-[calc(100%+6px)] min-w-[240px] max-w-[min(100vw-1rem,320px)]',
          )}
        >
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
