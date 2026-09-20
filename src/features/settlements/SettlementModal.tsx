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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MemberRow } from '@/data/members.repository'
import type { Settlement } from '@/domain/balances'
import { today } from '@/domain/dateRange'

import { TagRow } from '../expenses/TagRow'
import {
  useCreateSettlement,
  useDeleteSettlement,
  useUpdateSettlement,
} from './useSettlementMutations'

/**
 * One dialog serving both "Record a settlement" and "Edit settlement" —
 * ported from the original app's settlementModal.js, which used a
 * single sheet the same way. `settlement === null` means create mode.
 *
 * The caller keys this component by the target (a settlement id, or
 * "create") so switching targets remounts it with fresh local state,
 * the same pattern Phase 7 settled on for ClaimModal/ExpenseForm rather
 * than an effect that calls setState.
 */
export function SettlementModal({
  open,
  onOpenChange,
  spaceId,
  members,
  settlement,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  spaceId: string
  members: MemberRow[]
  settlement: Settlement | null
}) {
  const [fromId, setFromId] = useState<string | null>(
    () => settlement?.from ?? members[0]?.id ?? null,
  )
  const [toId, setToId] = useState<string | null>(
    () => settlement?.to ?? members.find((member) => member.id !== members[0]?.id)?.id ?? null,
  )
  const [amountValue, setAmountValue] = useState(() =>
    settlement ? String(settlement.amount) : '',
  )
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const createSettlement = useCreateSettlement()
  const updateSettlement = useUpdateSettlement()
  const deleteSettlement = useDeleteSettlement()
  const isPending = createSettlement.isPending || updateSettlement.isPending

  function selectFrom(id: string) {
    setFromId(id)
    // "to" can never be the same person as "from".
    if (toId === id) setToId(members.find((member) => member.id !== id)?.id ?? null)
  }

  function handleSave() {
    const amount = parseFloat(amountValue)
    if (!(amount > 0)) {
      toast.error('Enter a valid amount.')
      return
    }
    if (!fromId || !toId || fromId === toId) {
      toast.error('Choose two different people.')
      return
    }

    if (settlement) {
      updateSettlement.mutate(
        { id: settlement.id, params: { from: fromId, to: toId, amount } },
        {
          onSuccess: () => onOpenChange(false),
          onError: (error) => toast.error(error.message),
        },
      )
      return
    }

    createSettlement.mutate(
      { spaceId, params: { from: fromId, to: toId, amount, date: today() } },
      {
        onSuccess: () => onOpenChange(false),
        onError: (error) => toast.error(error.message),
      },
    )
  }

  function handleConfirmDelete() {
    if (!settlement) return
    deleteSettlement.mutate(settlement.id, {
      onSuccess: () => {
        setConfirmingDelete(false)
        onOpenChange(false)
      },
      onError: (error) => {
        toast.error(error.message)
        setConfirmingDelete(false)
      },
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{settlement ? 'Edit settlement' : 'Record a settlement'}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label>From</Label>
            <TagRow
              items={members.map((member) => ({ id: member.id, label: member.name }))}
              isActive={(id) => id === fromId}
              onSelect={selectFrom}
              emptyText="Need at least two group members."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>To</Label>
            <TagRow
              items={members
                .filter((member) => member.id !== fromId)
                .map((member) => ({ id: member.id, label: member.name }))}
              isActive={(id) => id === toId}
              onSelect={setToId}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settlement-amount">Amount</Label>
            <Input
              id="settlement-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amountValue}
              onChange={(event) => setAmountValue(event.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleSave} disabled={isPending}>
              {settlement ? 'Save changes' : 'Record settlement'}
            </Button>
            {settlement && (
              <Button variant="destructive" onClick={() => setConfirmingDelete(true)}>
                Delete
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
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
