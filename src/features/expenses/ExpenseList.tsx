import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RECENT_ENTRIES_COLLAPSED_COUNT, RECENT_ENTRY_LIMIT } from '@/config/constants'
import type { Expense, Ledger } from '@/domain/balances'
import { SplitTypes } from '@/domain/balances'
import { categoryLabel, type NameLookup } from '@/domain/breakdown'
import { formatCurrency } from '@/domain/money'

import { claimedTotal, initials, unclaimed } from './formatting'
import { useDeleteExpense } from './useExpenseMutations'

/**
 * "Active claims" and "Recent entries" — ported from the original app's
 * expenseList.js. A claim expense stays in Active claims until it's
 * fully claimed, then joins the recent list; that split is the only
 * reason both cards exist.
 *
 * "Recent entries" is progressively disclosed: only
 * `RECENT_ENTRIES_COLLAPSED_COUNT` show at first, with a "Show more"
 * toggle revealing the rest of what's loaded (still capped at
 * `RECENT_ENTRY_LIMIT`, same as before) — the original app showed all
 * of them at once.
 */
export function ExpenseList({
  ledger,
  names,
  onEdit,
  onClaim,
}: {
  ledger: Ledger
  names: NameLookup
  onEdit: (expense: Expense) => void
  onClaim: (expense: Expense) => void
}) {
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
  const [showAllRecent, setShowAllRecent] = useState(false)
  const deleteExpense = useDeleteExpense()

  const openClaims: Expense[] = []
  const recent: Expense[] = []
  for (const expense of ledger.expenses) {
    if (expense.splitType === SplitTypes.CLAIM && unclaimed(expense) > 0.01) {
      openClaims.push(expense)
    } else {
      recent.push(expense)
    }
  }

  const loadedRecent = recent.slice(0, RECENT_ENTRY_LIMIT)
  const visibleRecent = showAllRecent
    ? loadedRecent
    : loadedRecent.slice(0, RECENT_ENTRIES_COLLAPSED_COUNT)
  const hiddenRecentCount = loadedRecent.length - visibleRecent.length

  function handleConfirmDelete() {
    if (!deleteTarget) return
    deleteExpense.mutate(deleteTarget.id, {
      onError: (error) => toast.error(error.message),
    })
    setDeleteTarget(null)
  }

  return (
    <>
      {openClaims.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active claims</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {openClaims.map((expense) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                names={names}
                onOpen={() => onClaim(expense)}
                onEdit={() => onEdit(expense)}
                onDelete={() => setDeleteTarget(expense)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent entries</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {recent.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No expenses yet — add your first one above.
            </p>
          ) : (
            <>
              {visibleRecent.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  names={names}
                  onOpen={() => onEdit(expense)}
                  onEdit={() => onEdit(expense)}
                  onDelete={() => setDeleteTarget(expense)}
                />
              ))}
              {(hiddenRecentCount > 0 || showAllRecent) &&
                loadedRecent.length > RECENT_ENTRIES_COLLAPSED_COUNT && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="self-center"
                    onClick={() => setShowAllRecent((prev) => !prev)}
                  >
                    {showAllRecent ? 'Show less' : `Show ${hiddenRecentCount} more`}
                  </Button>
                )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && deleteTarget.claims.length > 0
                ? 'This claim already has contributions logged. Delete it and lose that history?'
                : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function ExpenseRow({
  expense,
  names,
  onOpen,
  onEdit,
  onDelete,
}: {
  expense: Expense
  names: NameLookup
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const label = categoryLabel(expense, names)
  const title = expense.note || label
  const payerName = names.members[expense.payer] ?? expense.payer
  const isClaim = expense.splitType === SplitTypes.CLAIM
  const claimed = claimedTotal(expense.claims)
  const remaining = unclaimed(expense)
  const claimDone = remaining <= 0.01
  const percent = expense.amount > 0 ? Math.min(100, (claimed / expense.amount) * 100) : 0

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      className="flex items-start justify-between gap-3 rounded-lg p-2 text-left hover:bg-muted"
    >
      <div className="flex items-start gap-3">
        <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-medium">
          {initials(payerName)}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            {title}
            {isClaim && (
              <span
                className={
                  claimDone
                    ? 'rounded bg-positive/10 px-1.5 py-0.5 text-xs font-medium text-positive'
                    : 'rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground'
                }
              >
                {claimDone ? 'Claimed' : 'Claim'}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            {payerName} paid · {label} · {expense.date}
          </p>
          {isClaim && !claimDone && (
            <div className="flex flex-col gap-1">
              <div className="bg-muted h-1.5 w-32 overflow-hidden rounded-full">
                <div className="bg-primary h-full" style={{ width: `${percent}%` }} />
              </div>
              <p className="text-muted-foreground text-xs">
                {formatCurrency(claimed)} claimed · {formatCurrency(remaining)} remaining
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-sm font-semibold">{formatCurrency(expense.amount)}</span>
        <div className="flex gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Edit ${title}`}
            onClick={(event) => {
              event.stopPropagation()
              onEdit()
            }}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Delete ${title}`}
            onClick={(event) => {
              event.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
