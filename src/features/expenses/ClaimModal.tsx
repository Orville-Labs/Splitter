import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MemberRow } from '@/data/members.repository'
import type { Expense } from '@/domain/balances'
import { today } from '@/domain/dateRange'
import { categoryLabel, type NameLookup } from '@/domain/breakdown'
import { formatCurrency, round2 } from '@/domain/money'

import { ClaimsTally } from './ClaimsTally'
import { claimedTotal } from './formatting'
import { TagRow } from './TagRow'
import { useCreateClaim } from './useClaimMutations'

/** Trims a quantity's trailing decimal zeros for display, e.g. 1.50 -> "1.5". */
function formatQty(qty: number): string {
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

/**
 * The claim sheet: who has claimed how much of a shared purchase, and a
 * form to add your own share — by quantity when the expense has a unit
 * price, otherwise by cash amount. Ported from the original app's
 * claimModal.js, with a hard-block toast in place of its overclaim
 * `confirm()` — claiming more than what's left is rejected outright
 * rather than offered as an override, and the toast names exactly how
 * much (or how many units) remain.
 *
 * The caller keys this component by the target expense's id (see
 * AppShell.tsx) so switching to a *different* expense remounts it with
 * fresh local state, rather than syncing that reset through an effect.
 * Members added/removed while claiming the *same* expense are handled
 * by deriving the effective claimant during render instead — the
 * react-hooks/set-state-in-effect rule flags exactly this "sync state
 * via setState-in-effect" pattern as unnecessary re-render churn when a
 * derived value would do.
 */
export function ClaimModal({
  open,
  onOpenChange,
  expense,
  members,
  names,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: Expense | null
  members: MemberRow[]
  names: NameLookup
}) {
  const [selectedClaimantId, setSelectedClaimantId] = useState<string | null>(
    () => members[0]?.id ?? null,
  )
  const [inputValue, setInputValue] = useState('')

  const createClaim = useCreateClaim()

  const claimantId =
    selectedClaimantId && members.some((member) => member.id === selectedClaimantId)
      ? selectedClaimantId
      : (members[0]?.id ?? null)

  if (!expense) return null

  const claims = expense.claims
  const claimed = claimedTotal(claims)
  const remaining = round2(expense.amount - claimed)
  const stillOpen = remaining > 0.01
  const percent = expense.amount > 0 ? Math.min(100, (claimed / expense.amount) * 100) : 0
  const canClaim = stillOpen && members.length > 0

  function submitClaim(amount: number, qty: number | null) {
    if (!claimantId) return
    createClaim.mutate(
      { expenseId: expense!.id, memberId: claimantId, amount, qty, date: today() },
      {
        onSuccess: () => setInputValue(''),
        onError: (error) => toast.error(error.message),
      },
    )
  }

  function handleSave() {
    if (!claimantId) {
      toast.error('Select who is claiming.')
      return
    }
    const entered = parseFloat(inputValue)
    if (!(entered > 0)) {
      toast.error(expense!.unitPrice ? 'Enter a valid quantity.' : 'Enter a valid amount.')
      return
    }

    const amount = expense!.unitPrice ? round2(entered * expense!.unitPrice) : round2(entered)
    const qty = expense!.unitPrice ? entered : null

    if (amount > remaining + 0.009) {
      if (expense!.unitPrice) {
        const remainingQty = Math.max(0, remaining / expense!.unitPrice)
        toast.error(
          remainingQty > 0.009
            ? `Only ${formatQty(remainingQty)} unit${remainingQty === 1 ? '' : 's'} remaining — enter ${formatQty(remainingQty)} or fewer.`
            : 'Nothing left to claim on this expense.',
        )
      } else {
        toast.error(
          `Only ${formatCurrency(Math.max(remaining, 0))} remaining — enter that amount or less.`,
        )
      }
      return
    }
    submitClaim(amount, qty)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {formatCurrency(expense.amount)} · {expense.note || categoryLabel(expense, names)}
          </DialogTitle>
          <DialogDescription>
            {names.members[expense.payer] ?? expense.payer} paid · {expense.date}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1">
          <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
            <div className="bg-primary h-full" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-muted-foreground text-xs">
            {formatCurrency(claimed)} claimed / {formatCurrency(Math.max(remaining, 0))} remaining
          </p>
        </div>

        <ClaimsTally
          claims={claims}
          unitPrice={expense.unitPrice}
          names={names}
          emptyText="No claims yet — be the first to log your share."
        />

        {stillOpen && (
          <div className="flex flex-col gap-1.5">
            <Label>Claimed by</Label>
            <TagRow
              items={members.map((member) => ({ id: member.id, label: member.name }))}
              isActive={(id) => id === claimantId}
              onSelect={setSelectedClaimantId}
              emptyText="Add group members first."
            />
          </div>
        )}

        {canClaim && (
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="claim-input">
                {expense.unitPrice
                  ? `Quantity (${formatCurrency(expense.unitPrice)} each)`
                  : 'Amount'}
              </Label>
              <Input
                id="claim-input"
                type="number"
                inputMode="decimal"
                min="0"
                step={expense.unitPrice ? '1' : '0.01'}
                placeholder={expense.unitPrice ? '0' : '0.00'}
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
              />
            </div>
            <Button onClick={handleSave} disabled={createClaim.isPending}>
              Save
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
