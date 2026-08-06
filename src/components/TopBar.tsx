import type { RefObject } from 'react'
import {
  CalendarDays,
  Camera,
  CheckSquare,
  CloudSun,
  Copy,
  FileDown,
  FileText,
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
        <div className="mr-1 flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--gcal-blue)] text-white">
            <CalendarDays className="size-5" />
          </div>
          <div>
            <div className="brand-serif text-xl leading-none">{trip.name}</div>
            <div className="text-[11px] text-[var(--gcal-muted)]">
              {countdown > 0
                ? `${countdown} days until departure`
                : countdown === 0
                  ? 'Trip starts today'
                  : `Day ${Math.abs(countdown) + 1} of trip`}
              {bigbang > 0 ? ` · BigBang in ${bigbang}d` : ''}
            </div>
          </div>
        </div>

        <div className="flex items-center rounded-full border border-[var(--gcal-border)] bg-[var(--gcal-bg)] p-0.5 text-sm">
          <button
            type="button"
            className={cn(
              'rounded-full px-3 py-1.5 font-medium',
              view === 'day' && 'bg-white shadow-sm',
            )}
            onClick={() => setView('day')}
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
          >
            Week
          </button>
        </div>

        <select
          className="rounded-lg border border-[var(--gcal-border)] bg-white px-2 py-1.5 text-sm"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        >
          {days.map((d) => (
            <option key={isoDate(d)} value={isoDate(d)}>
              {format(d, 'EEE dd/MM')}
            </option>
          ))}
        </select>

        <div className="relative min-w-[140px] flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--gcal-muted)]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events…"
            className="w-full rounded-full border border-[var(--gcal-border)] bg-white py-1.5 pl-8 pr-3 text-sm outline-none focus:border-[var(--gcal-blue)] focus:ring-2 focus:ring-[#e8f0fe]"
          />
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1">
          <StatusDot online={online} />
          {mode === 'edit' ? (
            <>
              <IconBtn title="Undo" disabled={!undoStack.length} onClick={() => void undo()}>
                <Undo2 className="size-4" />
              </IconBtn>
              <IconBtn
                title="Running late +30m"
                onClick={() =>
                  void runningLate(
                    selectedDate,
                    format(new Date(), 'HH:mm'),
                    30,
                  )
                }
              >
                <Redo2 className="size-4" />
              </IconBtn>
              <button
                type="button"
                onClick={onQuickAdd}
                className="fab inline-flex items-center gap-1 rounded-full bg-[var(--gcal-blue)] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[var(--gcal-blue-hover)]"
              >
                <Plus className="size-4" /> Add
              </button>
            </>
          ) : null}

          <IconBtn title="Checklist" active={panel === 'checklist'} onClick={() => setPanel(panel === 'checklist' ? 'none' : 'checklist')}>
            <ListTodo className="size-4" />
          </IconBtn>
          <IconBtn title="Notes" active={panel === 'notes'} onClick={() => setPanel(panel === 'notes' ? 'none' : 'notes')}>
            <FileText className="size-4" />
          </IconBtn>
          <IconBtn title="Budget" active={panel === 'budget'} onClick={() => setPanel(panel === 'budget' ? 'none' : 'budget')}>
            <Wallet className="size-4" />
          </IconBtn>
          <IconBtn title="Weather / recap" active={panel === 'recap'} onClick={() => setPanel(panel === 'recap' ? 'none' : 'recap')}>
            <CloudSun className="size-4" />
          </IconBtn>
          <IconBtn title="Emergency" active={panel === 'emergency'} onClick={() => setPanel(panel === 'emergency' ? 'none' : 'emergency')}>
            <Shield className="size-4" />
          </IconBtn>
          <IconBtn title="Share links" active={panel === 'share'} onClick={() => setPanel(panel === 'share' ? 'none' : 'share')}>
            <Share2 className="size-4" />
          </IconBtn>
          {mode === 'edit' ? (
            <>
              <IconBtn title="Import confirmation" active={panel === 'import'} onClick={() => setPanel(panel === 'import' ? 'none' : 'import')}>
                <FileDown className="size-4" />
              </IconBtn>
              <IconBtn title="What-if copy" active={panel === 'whatif'} onClick={() => setPanel(panel === 'whatif' ? 'none' : 'whatif')}>
                <Sparkles className="size-4" />
              </IconBtn>
            </>
          ) : null}
          <IconBtn title="Trip recap" active={panel === 'recap'} onClick={() => setPanel(panel === 'recap' ? 'none' : 'recap')}>
            <Camera className="size-4" />
          </IconBtn>
          <IconBtn title="Save as image" disabled={busy} onClick={() => void doExportImage()}>
            <Copy className="size-4" />
          </IconBtn>
          <IconBtn title="Export PDF" disabled={busy} onClick={() => void doExportPdf()}>
            <FileDown className="size-4" />
          </IconBtn>
          <IconBtn
            title="Export expenses CSV"
            onClick={() => {
              exportExpensesCsv(useTripStore.getState().expenses, `${trip.name}-expenses.csv`)
              setToast('Expenses CSV downloaded')
            }}
          >
            <CheckSquare className="size-4" />
          </IconBtn>
          <IconBtn
            title="Copy view link"
            onClick={() => copy(share.view, 'View link')}
          >
            <Link2 className="size-4" />
          </IconBtn>
        </div>
      </div>
    </header>
  )
}

function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      className={cn(
        'mr-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        online ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#fce8e6] text-[#c5221f]',
      )}
      title={online ? 'Online' : 'Offline — queueing edits'}
    >
      <span className={cn('size-1.5 rounded-full', online ? 'bg-[#34a853]' : 'bg-[#ea4335]')} />
      {online ? 'Live' : 'Offline'}
    </span>
  )
}

function IconBtn({
  children,
  title,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode
  title: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-full text-[var(--gcal-text)] hover:bg-[var(--gcal-bg)] disabled:opacity-40',
        active && 'bg-[#e8f0fe] text-[var(--gcal-blue)]',
      )}
    >
      {children}
    </button>
  )
}
