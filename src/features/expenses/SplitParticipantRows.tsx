import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import type { MemberRow } from '@/data/members.repository'

/**
 * The participant picker shared by the EQUAL and EXACT split panels —
 * ported from the original app's splitEditor.js (`renderEqualRows`/
 * `renderExactRows`), which existed for the same "don't duplicate this
 * between the add form and the edit sheet" reason this component does.
 */
export function SplitParticipantRows({
  members,
  mode,
  selectedIds,
  onToggle,
  amounts,
  onAmountChange,
}: {
  members: MemberRow[]
  mode: 'equal' | 'exact'
  selectedIds: string[]
  onToggle: (id: string, checked: boolean) => void
} & (
  | { mode: 'equal'; amounts?: never; onAmountChange?: never }
  | {
      mode: 'exact'
      amounts: Record<string, string>
      onAmountChange: (id: string, value: string) => void
    }
)) {
  if (members.length === 0) {
    return <p className="text-muted-foreground text-sm">No members in this group yet.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {members.map((member) => {
        const checked = selectedIds.includes(member.id)
        return (
          <div key={member.id} className="flex items-center gap-2">
            <label className="flex flex-1 items-center gap-2 text-sm">
              <Checkbox
                checked={checked}
                onCheckedChange={(value) => onToggle(member.id, value === true)}
              />
              {member.name}
            </label>
            {mode === 'exact' && (
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-24"
                disabled={!checked}
                value={amounts?.[member.id] ?? ''}
                onChange={(event) => onAmountChange?.(member.id, event.target.value)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
