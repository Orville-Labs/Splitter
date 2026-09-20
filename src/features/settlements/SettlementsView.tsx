import { ArrowRight, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { RECORDED_SETTLEMENTS_COLLAPSED_COUNT } from '@/config/constants'
import type { MemberRow } from '@/data/members.repository'
import {
  computeBalances,
  computeSettlements,
  type Ledger,
  type Settlement,
} from '@/domain/balances'
import type { NameLookup } from '@/domain/breakdown'
import { formatCurrency } from '@/domain/money'

import { useDeleteSettlement } from './useSettlementMutations'

/**
 * The Settlement tab: balances, suggested transfers, and recorded
 * payments — ported from the original app's settlementsView.js.
 */
export function SettlementsView({
  ledger,
  members,
  names,
  onOpenBreakdown,
  onRecordNew,
  onEditSettlement,
}: {
  ledger: Ledger
  members: MemberRow[]
  names: NameLookup
  onOpenBreakdown: (memberId: string) => void
  onRecordNew: () => void
  onEditSettlement: (settlementId: string) => void
}) {
  const [deleteTarget, setDeleteTarget] = useState<Settlement | null>(null)
  const [showAllSettlements, setShowAllSettlements] = useState(false)
  const deleteSettlement = useDeleteSettlement()

  const balances = computeBalances(ledger)
  const transfers = computeSettlements(balances)
  const visibleSettlements = showAllSettlements
    ? ledger.settlements
    : ledger.settlements.slice(0, RECORDED_SETTLEMENTS_COLLAPSED_COUNT)
  const hiddenSettlementsCount = ledger.settlements.length - visibleSettlements.length

  function handleConfirmDelete() {
    if (!deleteTarget) return
    deleteSettlement.mutate(deleteTarget.id, {
      onError: (error) => toast.error(error.message),
    })
    setDeleteTarget(null)
  }

  function handleRecordNew() {
    if (members.length < 2) {
      toast.error('Need at least two group members.')
      return
    }
    onRecordNew()
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Balances</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground text-sm">No members yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {members.map((member) => {
                const value = balances[member.id] ?? 0
                const tone =
                  value > 0
                    ? 'text-positive'
                    : value < 0
                      ? 'text-negative'
                      : 'text-muted-foreground'
                const status = value > 0 ? 'gets back' : value < 0 ? 'owes' : 'settled up'
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => onOpenBreakdown(member.id)}
                    className="flex flex-col gap-0.5 rounded-lg border p-3 text-left hover:bg-muted"
                  >
                    <span className="text-sm font-medium">{member.name}</span>
                    <span className={`text-lg font-semibold ${tone}`}>
                      {formatCurrency(Math.abs(value))}
                    </span>
                    <span className="text-muted-foreground text-xs">{status}</span>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suggested settlements</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {transfers.length === 0 ? (
            <p className="text-muted-foreground text-sm">Everyone is settled up.</p>
          ) : (
            transfers.map((transfer, index) => (
              <div key={index} className="flex items-center justify-between gap-2 rounded-lg p-2">
                <div className="flex items-center gap-2 text-sm">
                  <span>{names.members[transfer.from] ?? transfer.from}</span>
                  <ArrowRight className="text-muted-foreground size-4" />
                  <span>{names.members[transfer.to] ?? transfer.to}</span>
                </div>
                <span className="text-sm font-semibold">{formatCurrency(transfer.amount)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Record a settlement</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">Already paid someone back? Log it here.</p>
          <Button variant="outline" onClick={handleRecordNew}>
            <Plus className="size-4" />
            Add settlement
          </Button>
          <div className="flex flex-col gap-2">
            {ledger.settlements.length === 0 ? (
              <p className="text-muted-foreground text-sm">No settlements recorded yet.</p>
            ) : (
              <>
                {visibleSettlements.map((settlement) => (
                  <SettlementRow
                    key={settlement.id}
                    settlement={settlement}
                    names={names}
                    onOpen={() => onEditSettlement(settlement.id)}
                    onDelete={() => setDeleteTarget(settlement)}
                  />
                ))}
                {(hiddenSettlementsCount > 0 || showAllSettlements) &&
                  ledger.settlements.length > RECORDED_SETTLEMENTS_COLLAPSED_COUNT && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="self-center"
                      onClick={() => setShowAllSettlements((prev) => !prev)}
                    >
                      {showAllSettlements ? 'Show less' : `Show ${hiddenSettlementsCount} more`}
                    </Button>
                  )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this settlement?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
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

function SettlementRow({
  settlement,
  names,
  onOpen,
  onDelete,
}: {
  settlement: Settlement
  names: NameLookup
  onOpen: () => void
  onDelete: () => void
}) {
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
      className="flex items-center justify-between gap-2 rounded-lg p-2 hover:bg-muted"
    >
      <div className="flex items-center gap-2 text-sm">
        <span>{names.members[settlement.from] ?? settlement.from}</span>
        <ArrowRight className="text-muted-foreground size-4" />
        <span>{names.members[settlement.to] ?? settlement.to}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{formatCurrency(settlement.amount)}</span>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`Edit settlement of ${formatCurrency(settlement.amount)}`}
          onClick={(event) => {
            event.stopPropagation()
            onOpen()
          }}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`Delete settlement of ${formatCurrency(settlement.amount)}`}
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}
