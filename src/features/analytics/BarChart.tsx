import type { SpendTotal } from '@/domain/analytics'
import { formatCurrency } from '@/domain/money'

/**
 * A horizontal magnitude chart — one sequential hue (the app's own
 * `--primary`), sorted descending, with the value directly labeled at
 * the bar's tip rather than gated behind a hover tooltip. This is a
 * "compare magnitude" job, not an "identity" one (each row already
 * carries its own label), so it deliberately doesn't reach for a
 * categorical multi-hue palette — a single hue is the correct default
 * for this chart type, not a simplification.
 */
export function BarChart({ totals, emptyText }: { totals: SpendTotal[]; emptyText: string }) {
  const max = Math.max(1, ...totals.map((total) => total.amount))

  if (totals.every((total) => total.amount === 0)) {
    return <p className="text-muted-foreground text-sm">{emptyText}</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {totals.map((total) => {
        const percent = Math.round((total.amount / max) * 100)
        return (
          <div key={total.label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{total.label}</span>
              <span className="text-muted-foreground shrink-0">{formatCurrency(total.amount)}</span>
            </div>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div className="bg-primary h-full rounded-full" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
