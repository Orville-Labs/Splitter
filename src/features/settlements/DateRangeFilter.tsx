import { useId } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RANGE_PRESETS, type RangePresetKey } from '@/domain/dateRange'

import { TagRow } from '../expenses/TagRow'

/**
 * The preset-row + custom-dates picker shared by BreakdownModal (Phase
 * 8) and AnalyticsFilterModal (Phase 9) — pulled out once a second
 * consumer needed the identical UI, the same "don't duplicate a picker
 * across screens" reasoning behind TagRow/SplitParticipantRows.
 * `useId()` keeps the custom-date inputs' ids unique per instance —
 * both modals can exist in the DOM at once (AppShell always mounts
 * every modal, just closed), so a hardcoded id would collide.
 */
export function DateRangeFilter({
  preset,
  customFrom,
  customTo,
  onSelectPreset,
  onCustomFromChange,
  onCustomToChange,
}: {
  preset: RangePresetKey
  customFrom: string
  customTo: string
  onSelectPreset: (preset: RangePresetKey) => void
  onCustomFromChange: (value: string) => void
  onCustomToChange: (value: string) => void
}) {
  const fromId = useId()
  const toId = useId()

  return (
    <div className="flex flex-col gap-3">
      <TagRow
        items={RANGE_PRESETS.map((item) => ({ id: item.key, label: item.label }))}
        isActive={(id) => id === preset}
        onSelect={(id) => onSelectPreset(id as RangePresetKey)}
      />

      {preset === 'custom' && (
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor={fromId}>From</Label>
            <Input
              id={fromId}
              type="date"
              value={customFrom}
              onChange={(event) => onCustomFromChange(event.target.value)}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor={toId}>To</Label>
            <Input
              id={toId}
              type="date"
              value={customTo}
              onChange={(event) => onCustomToChange(event.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
