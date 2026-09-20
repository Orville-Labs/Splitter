import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { RangePresetKey } from '@/domain/dateRange'

import { DateRangeFilter } from '../settlements/DateRangeFilter'

/** Date-range picker for the Analytics tab — ported from the original app's filterModal.js. */
export function AnalyticsFilterModal({
  open,
  onOpenChange,
  preset,
  customFrom,
  customTo,
  onSelectPreset,
  onCustomFromChange,
  onCustomToChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  preset: RangePresetKey
  customFrom: string
  customTo: string
  onSelectPreset: (preset: RangePresetKey) => void
  onCustomFromChange: (value: string) => void
  onCustomToChange: (value: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Filter</DialogTitle>
          <DialogDescription>Scope the totals and charts below to a date range.</DialogDescription>
        </DialogHeader>

        <DateRangeFilter
          preset={preset}
          customFrom={customFrom}
          customTo={customTo}
          onSelectPreset={onSelectPreset}
          onCustomFromChange={onCustomFromChange}
          onCustomToChange={onCustomToChange}
        />
      </DialogContent>
    </Dialog>
  )
}
