import { cn } from '../lib/time'

export function FormRow({
  label,
  hint,
  children,
  noBorder,
  inset,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  noBorder?: boolean
  /** Slightly smaller padding for nested backup rows */
  inset?: boolean
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-[110px_1fr] items-start gap-3',
        inset ? 'px-4 py-3' : 'px-5 py-3.5',
        !noBorder && 'border-b border-[#eef0f2]',
      )}
    >
      <div className="pt-2.5 text-[13px] font-semibold text-[var(--gcal-text)]">
        {label}
        {hint ? (
          <small className="mt-0.5 block text-[11px] font-medium text-[var(--gcal-muted)]">
            {hint}
          </small>
        ) : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
