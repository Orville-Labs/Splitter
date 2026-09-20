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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { CategoryRow } from '@/data/categories.repository'
import type { MemberRow } from '@/data/members.repository'
import type { Expense } from '@/domain/balances'
import type { NameLookup } from '@/domain/breakdown'

import { ExpenseForm } from './ExpenseForm'
import { useDeleteExpense } from './useExpenseMutations'

/**
 * The edit sheet. Claims, categories, participants and shares all
 * cascade via their FKs — see expenses.repository.ts's deleteExpense.
 */
export function EditExpenseSheet({
  open,
  onOpenChange,
  spaceId,
  members,
  categories,
  expense,
  names,
  onManageCategories,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  spaceId: string
  members: MemberRow[]
  categories: CategoryRow[]
  expense: Expense | null
  names: NameLookup
  onManageCategories: () => void
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const deleteExpense = useDeleteExpense()

  function handleConfirmDelete() {
    if (!expense) return
    deleteExpense.mutate(expense.id, {
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
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit expense</SheetTitle>
            <SheetDescription>Update the details, or delete this entry.</SheetDescription>
          </SheetHeader>
          {expense && (
            <div className="px-4 pb-4">
              <ExpenseForm
                key={expense.id}
                mode="edit"
                spaceId={spaceId}
                members={members}
                categories={categories}
                initialExpense={expense}
                names={names}
                onSaved={() => onOpenChange(false)}
                onManageCategories={onManageCategories}
                onDelete={() => setConfirmingDelete(true)}
                onCancel={() => onOpenChange(false)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              {expense && expense.claims.length > 0
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
