import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import type { Claim } from '@/domain/balances'
import type { NameLookup } from '@/domain/breakdown'
import { formatCurrency } from '@/domain/money'

import { useDeleteClaim } from './useClaimMutations'

/**
 * Who claimed how much of a CLAIM-split expense, newest first, with a
 * delete action per row — shared by `ClaimModal` (the "log a
 * contribution" screen) and `ExpenseForm`'s locked-claim edit view (a
 * way to remove a mistaken contribution without going through the
 * claim-logging screen; removing one naturally moves the expense back
 * into "Active claims" once anything is unclaimed again, since
 * `ExpenseList` recomputes that grouping fresh from the live data).
 */
export function ClaimsTally({
  claims,
  unitPrice,
  names,
  emptyText = 'No claims yet.',
}: {
  claims: Claim[]
  unitPrice: number | null
  names: NameLookup
  emptyText?: string
}) {
  const deleteClaim = useDeleteClaim()

  if (claims.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyText}</p>
  }

  return (
    <div className="flex flex-col gap-1">
      {[...claims].reverse().map((claim) => {
        const claimantName = names.members[claim.member] ?? claim.member
        return (
          <div key={claim.id} className="flex items-center justify-between text-sm">
            <span>
              {claimantName}
              {unitPrice && claim.qty ? ` · ${claim.qty} × ${formatCurrency(unitPrice)}` : ''}
            </span>
            <span className="flex items-center gap-2">
              <span className="font-medium">{formatCurrency(claim.amount)}</span>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Remove claim from ${claimantName}`}
                onClick={() =>
                  deleteClaim.mutate(claim.id, {
                    onError: (error) => toast.error(error.message),
                  })
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </span>
          </div>
        )
      })}
    </div>
  )
}
