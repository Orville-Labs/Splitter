import { Download, Filter, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MemberRow } from '@/data/members.repository'
import { spendByCategory, spendByPayer } from '@/domain/analytics'
import type { Ledger } from '@/domain/balances'
import type { NameLookup } from '@/domain/breakdown'
import { buildExpensesCsv, slugify } from '@/domain/csvExport'
import { isWithinRange, resolvePreset, today, type RangePresetKey } from '@/domain/dateRange'
import { formatCurrency, round2 } from '@/domain/money'

import { AnalyticsFilterModal } from './AnalyticsFilterModal'
import { BarChart } from './BarChart'

/**
 * The Analytics tab — ported from the original app's analyticsView.js.
 * The filter row sits above both charts (it scopes the stats AND both
 * charts below it), not nested inside one chart's card header the way
 * the original placed it — a chart card should never own a filter that
 * affects its siblings too.
 */
export function AnalyticsView({
  ledger,
  members,
  names,
  spaceName,
}: {
  ledger: Ledger
  members: MemberRow[]
  names: NameLookup
  spaceName: string
}) {
  const [filterOpen, setFilterOpen] = useState(false)
  const [preset, setPreset] = useState<RangePresetKey>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const range =
    preset === 'all'
      ? { from: '', to: '' }
      : preset === 'custom'
        ? { from: customFrom, to: customTo }
        : resolvePreset(preset)
  const filteredExpenses = ledger.expenses.filter((expense) =>
    isWithinRange(expense.date, range.from, range.to),
  )

  const totalSpent = round2(filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0))
  const categoryTotals = spendByCategory(filteredExpenses, names)
  const payerTotals = spendByPayer(
    filteredExpenses,
    members.map((member) => member.id),
    names,
  )

  function selectPreset(next: RangePresetKey) {
    setPreset(next)
    if (next === 'custom') {
      // Reveals the date fields and waits for the user to finish
      // picking them — closing now would hide the very fields they
      // just asked for.
      if (!customFrom && !customTo) setCustomTo(today())
    } else {
      // Every other preset is a complete choice on its own — apply and close.
      setFilterOpen(false)
    }
  }

  function clearFilter() {
    setPreset('all')
    setCustomFrom('')
    setCustomTo('')
  }

  function handleExportCsv() {
    // Always the full, unfiltered history — matches the original app's
    // export, which was never scoped to the on-screen date filter.
    const csv = buildExpensesCsv(ledger.expenses, names)
    // BOM so Excel reads the ₹ sign and any non-ASCII names as UTF-8.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `spliter-${slugify(spaceName)}-${today()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">Total spent</span>
            <span className="text-2xl font-semibold">{formatCurrency(totalSpent)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">Entries logged</span>
            <span className="text-2xl font-semibold">{filteredExpenses.length}</span>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setFilterOpen(true)}>
          <Filter className="size-4" />
          Filter
        </Button>
        {preset !== 'all' && (
          <button
            type="button"
            onClick={clearFilter}
            className="text-muted-foreground flex items-center gap-1 rounded-full border px-2 py-1 text-xs hover:bg-muted"
          >
            {range.from || '…'} → {range.to || '…'}
            <X className="size-3" />
          </button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Spending by category</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart totals={categoryTotals} emptyText="No data yet." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spending by member</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart totals={payerTotals} emptyText="No data yet." />
        </CardContent>
      </Card>

      <Button variant="outline" onClick={handleExportCsv}>
        <Download className="size-4" />
        Export CSV
      </Button>

      <AnalyticsFilterModal
        open={filterOpen}
        onOpenChange={setFilterOpen}
        preset={preset}
        customFrom={customFrom}
        customTo={customTo}
        onSelectPreset={selectPreset}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
      />
    </>
  )
}
