import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { computeBalances, type Ledger } from '@/domain/balances'
import {
  buildBreakdown,
  groupBreakdownByDay,
  sumBreakdown,
  type BreakdownRow,
  type NameLookup,
} from '@/domain/breakdown'
import { formatDayDivider, resolvePreset, today, type RangePresetKey } from '@/domain/dateRange'
import { formatCurrency } from '@/domain/money'
import { cn } from '@/lib/utils'

import { DateRangeFilter } from './DateRangeFilter'

/**
 * "What made up this balance" — ported from the original app's
 * breakdownModal.js: one member's balance, with its own independent
 * time filter. The caller keys this component by the target member's
 * id (or "none" when closed) so switching targets remounts it with a
 * fresh filter, rather than an effect that resets it.
 *
 * The row list is a grouped timeline, day by day, rather than a flat
 * list — `buildBreakdown`'s existing signed `amount` already means
 * "moved the balance in the member's favour" (positive) or "against
 * them" (negative), the same semantics `SettlementsView`'s "gets
 * back"/"owes" language already uses everywhere else, so "money in"/
 * "money out" here is that same sign, not a separate cash-flow concept.
 */
export function BreakdownModal({
  open,
  onOpenChange,
  memberId,
  ledger,
  names,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberId: string | null
  ledger: Ledger
  names: NameLookup
}) {
  const [preset, setPreset] = useState<RangePresetKey>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  if (!memberId) return null

  const memberName = names.members[memberId] ?? memberId
  const range =
    preset === 'all'
      ? {}
      : preset === 'custom'
        ? { from: customFrom, to: customTo }
        : resolvePreset(preset)
  const balance = computeBalances(ledger)[memberId] ?? 0
  const rows = buildBreakdown(ledger, memberId, names, range)
  const net = sumBreakdown(rows)

  function selectPreset(next: RangePresetKey) {
    setPreset(next)
    if (next === 'custom' && !customFrom && !customTo) setCustomTo(today())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle
            className={balance > 0 ? 'text-positive' : balance < 0 ? 'text-negative' : ''}
          >
            {formatCurrency(Math.abs(balance))}
          </DialogTitle>
          <DialogDescription>
            {balance > 0
              ? `${memberName} gets back overall`
              : balance < 0
                ? `${memberName} owes overall`
                : `${memberName} is settled up overall`}
          </DialogDescription>
        </DialogHeader>

        <DateRangeFilter
          preset={preset}
          customFrom={customFrom}
          customTo={customTo}
          onSelectPreset={selectPreset}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />

        {preset !== 'all' && (
          <p className="text-muted-foreground text-sm">
            Net change in this range: {net >= 0 ? '+' : ''}
            {formatCurrency(net)}
          </p>
        )}

        <div className="flex max-h-[50vh] flex-col gap-4 overflow-y-auto">
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">No entries in this range.</p>
          ) : (
            groupBreakdownByDay(rows).map((group) => (
              <div key={group.date} className="flex flex-col gap-2">
                <p className="text-muted-foreground border-b pb-1 text-xs font-medium tracking-wide uppercase">
                  {formatDayDivider(group.date)}
                </p>
                <div className="flex flex-col gap-2">
                  {group.rows.map((row, index) => (
                    <BreakdownTimelineRow key={index} row={row} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function BreakdownTimelineRow({ row }: { row: BreakdownRow }) {
  const isIn = row.amount > 0

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full',
            isIn ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative',
          )}
        >
          {isIn ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
        </div>
        <div>
          <p className="text-sm font-semibold">{row.title}</p>
          <p className="text-muted-foreground text-xs">{row.detail}</p>
        </div>
      </div>
      <span className={cn('text-sm font-medium', isIn ? 'text-positive' : 'text-negative')}>
        {isIn ? '+' : ''}
        {formatCurrency(row.amount)}
      </span>
    </div>
  )
}
