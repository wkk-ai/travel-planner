import { CloudOff, Loader2, RefreshCw, WifiOff } from 'lucide-react'
import { useTripStore } from '../store/tripStore'
import { cn } from '../lib/time'

export function SyncBanner() {
  const online = useTripStore((s) => s.online)
  const syncing = useTripStore((s) => s.syncing)
  const pendingOps = useTripStore((s) => s.pendingOps)
  const flush = useTripStore((s) => s.flush)
  const mode = useTripStore((s) => s.mode)

  if (online && !syncing && pendingOps === 0) return null

  if (!online) {
    return (
      <div
        role="status"
        className="no-print flex items-start gap-3 border-b border-[#f9ab00]/40 bg-[#fef7e0] px-3 py-2.5 text-[var(--gcal-text)] sm:px-4"
      >
        <WifiOff className="mt-0.5 size-4 shrink-0 text-[#b06000]" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[#b06000]">You’re offline</div>
          <p className="mt-0.5 text-xs leading-snug text-[#8a5a00]">
            Edits are saved on this device
            {pendingOps > 0
              ? ` (${pendingOps} change${pendingOps === 1 ? '' : 's'} waiting)`
              : ''}
            . They’ll upload automatically when you’re back online.
          </p>
        </div>
      </div>
    )
  }

  if (syncing) {
    return (
      <div
        role="status"
        className="no-print flex items-center gap-3 border-b border-[#aecbfa] bg-[#e8f0fe] px-3 py-2.5 sm:px-4"
      >
        <Loader2 className="size-4 shrink-0 animate-spin text-[var(--gcal-blue)]" />
        <div className="min-w-0 flex-1 text-sm font-medium text-[var(--gcal-blue)]">
          Syncing your offline changes…
        </div>
      </div>
    )
  }

  if (pendingOps > 0 && mode === 'edit') {
    return (
      <div
        role="status"
        className="no-print flex flex-wrap items-center gap-3 border-b border-[#f9ab00]/40 bg-[#fef7e0] px-3 py-2.5 sm:px-4"
      >
        <CloudOff className="size-4 shrink-0 text-[#b06000]" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[#b06000]">
            {pendingOps} change{pendingOps === 1 ? '' : 's'} waiting to sync
          </div>
          <p className="mt-0.5 text-xs text-[#8a5a00]">
            Still on this device — tap sync if the connection looks fine.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void flush()}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold',
            'text-[#b06000] shadow-sm ring-1 ring-[#f9ab00]/50 hover:bg-[#fff8e8]',
          )}
        >
          <RefreshCw className="size-3.5" />
          Sync now
        </button>
      </div>
    )
  }

  return null
}
