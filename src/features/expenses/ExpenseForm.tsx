import { zodResolver } from '@hookform/resolvers/zod'
import { Settings } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CategoryRow } from '@/data/categories.repository'
import type { MemberRow } from '@/data/members.repository'
import type { Expense } from '@/domain/balances'
import { SplitTypes, type SplitType } from '@/domain/balances'
import type { NameLookup } from '@/domain/breakdown'
import { formatCurrency } from '@/domain/money'

import { ClaimsTally } from './ClaimsTally'
import {
  buildDefaultValues,
  expenseFormSchema,
  expenseToFormValues,
  pruneParticipants,
  splitTypeLabel,
  toExpenseInput,
  type ExpenseFormValues,
} from './expenseFormSchema'
import { claimedTotal } from './formatting'
import { equalSplitHint, exactSplitHint } from './splitHints'
import { SplitParticipantRows } from './SplitParticipantRows'
import { TagRow } from './TagRow'
import { useCreateExpense, useUpdateExpense } from './useExpenseMutations'

const EMPTY_NAMES: NameLookup = { members: {}, categories: {} }

/**
 * "Other" is a catch-all, not a specific choice — it reads better
 * pinned at the end of the picker than wherever it happens to sit in
 * the space's custom category order (which `CategoriesModal` still
 * fully controls; this is display-order for this picker only). A
 * stable sort, so everything else keeps its existing relative order.
 */
function withOtherLast(categories: readonly CategoryRow[]): CategoryRow[] {
  return [...categories].sort((a, b) => {
    const aIsOther = a.name.trim().toLowerCase() === 'other'
    const bIsOther = b.name.trim().toLowerCase() === 'other'
    return aIsOther === bIsOther ? 0 : aIsOther ? 1 : -1
  })
}

/**
 * The add-expense form and the edit sheet's fields — one implementation
 * shared by both, exactly like the original app's splitEditor.js was
 * factored out for the same "a fix must land in both places" reason.
 * `AddExpenseForm`/`EditExpenseSheet` each just supply chrome (a Card, a
 * Sheet) and mode-specific props around this.
 */
export function ExpenseForm({
  mode,
  spaceId,
  members,
  categories,
  initialExpense,
  names = EMPTY_NAMES,
  onSaved,
  onManageCategories,
  onDelete,
  onCancel,
}: {
  mode: 'create' | 'edit'
  spaceId: string
  members: MemberRow[]
  categories: CategoryRow[]
  initialExpense?: Expense
  /** Only needed to resolve claimant names when editing a CLAIM expense — AddExpenseForm never passes it. */
  names?: NameLookup
  onSaved: () => void
  onManageCategories: () => void
  onDelete?: () => void
  onCancel?: () => void
}) {
  const memberIds = members.map((member) => member.id)
  // An existing CLAIM expense's shares come from contributions people have
  // already logged, not a participant picker — the split mechanism is
  // locked, only the unit price is still editable. Matches the original
  // app's edit sheet exactly (it never offered a way to convert a CLAIM
  // expense to EQUAL/EXACT, or vice versa).
  const isLockedClaim = mode === 'edit' && initialExpense?.splitType === SplitTypes.CLAIM

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues:
      mode === 'edit' && initialExpense
        ? expenseToFormValues(initialExpense, memberIds)
        : buildDefaultValues(memberIds),
  })

  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense()
  const isPending = createExpense.isPending || updateExpense.isPending

  // Members added/removed while the form is open (not a full space
  // switch, which remounts this component via `key`) — keep selections
  // consistent, mirroring the original app's `syncMembers`.
  useEffect(() => {
    const ids = members.map((member) => member.id)
    setValue('equalParticipantIds', pruneParticipants(getValues('equalParticipantIds'), ids))
    setValue('exactParticipantIds', pruneParticipants(getValues('exactParticipantIds'), ids))
    const payerId = getValues('payerId')
    if (!ids.includes(payerId)) setValue('payerId', ids[0] ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members])

  const amount = watch('amount')
  const payerId = watch('payerId')
  const categoryIds = watch('categoryIds')
  const splitType = watch('splitType')
  const equalParticipantIds = watch('equalParticipantIds')
  const exactParticipantIds = watch('exactParticipantIds')
  const exactAmounts = watch('exactAmounts')

  const availableSplitTypes: SplitType[] = isLockedClaim
    ? []
    : mode === 'create'
      ? [SplitTypes.EQUAL, SplitTypes.EXACT, SplitTypes.CLAIM]
      : [SplitTypes.EQUAL, SplitTypes.EXACT]

  const totalAmount = parseFloat(amount) || 0
  const exactSum =
    Math.round(
      exactParticipantIds.reduce((sum, id) => sum + (parseFloat(exactAmounts[id] ?? '') || 0), 0) *
        100,
    ) / 100

  function toggleEqualParticipant(id: string, checked: boolean) {
    const current = getValues('equalParticipantIds')
    setValue(
      'equalParticipantIds',
      checked ? [...current, id] : current.filter((each) => each !== id),
      { shouldValidate: true },
    )
  }

  function toggleExactParticipant(id: string, checked: boolean) {
    const current = getValues('exactParticipantIds')
    setValue(
      'exactParticipantIds',
      checked ? [...current, id] : current.filter((each) => each !== id),
      { shouldValidate: true },
    )
  }

  function setExactAmount(id: string, value: string) {
    setValue(
      'exactAmounts',
      { ...getValues('exactAmounts'), [id]: value },
      { shouldValidate: true },
    )
  }

  function toggleCategory(id: string) {
    const current = getValues('categoryIds')
    setValue(
      'categoryIds',
      current.includes(id) ? current.filter((each) => each !== id) : [...current, id],
    )
  }

  function onSubmit(values: ExpenseFormValues) {
    const input = toExpenseInput(values)

    if (mode === 'create') {
      createExpense.mutate(
        { spaceId, input },
        {
          onSuccess: () => {
            reset(buildDefaultValues(memberIds))
            onSaved()
          },
          onError: (error) => toast.error(error.message),
        },
      )
      return
    }

    updateExpense.mutate(
      { expenseId: initialExpense!.id, input },
      {
        onSuccess: onSaved,
        onError: (error) => toast.error(error.message),
      },
    )
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expense-amount">Amount</Label>
        <Input
          id="expense-amount"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="0.00"
          {...register('amount')}
        />
        {errors.amount && <p className="text-negative text-sm">{errors.amount.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Paid by</Label>
        <TagRow
          items={members.map((member) => ({ id: member.id, label: member.name }))}
          isActive={(id) => id === payerId}
          onSelect={(id) => setValue('payerId', id, { shouldValidate: true })}
          emptyText="Add group members first."
        />
        {errors.payerId && <p className="text-negative text-sm">{errors.payerId.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Category</Label>
        <TagRow
          items={withOtherLast(categories).map((category) => ({
            id: category.id,
            label: category.name,
          }))}
          isActive={(id) => categoryIds.includes(id)}
          onSelect={toggleCategory}
          trailing={
            <>
              <span aria-hidden="true" className="bg-border mx-1 h-7 w-px self-center" />
              <Button type="button" size="sm" variant="secondary" onClick={onManageCategories}>
                <Settings className="size-3.5" />
                Manage
              </Button>
            </>
          }
        />
      </div>

      {isLockedClaim ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-unit-price">Unit price (optional)</Label>
            <Input
              id="expense-unit-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="e.g. 7.00 per egg"
              {...register('unitPrice')}
            />
            <p className="text-muted-foreground text-sm">
              This is a claim expense — new contributions are logged from the expense list, not
              here.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Contributions</Label>
            <p className="text-muted-foreground text-xs">
              {formatCurrency(claimedTotal(initialExpense!.claims))} of{' '}
              {formatCurrency(initialExpense!.amount)} claimed. Remove one below if it was logged by
              mistake — the expense goes back to "Active claims" once anything is unclaimed again.
            </p>
            <ClaimsTally
              claims={initialExpense!.claims}
              unitPrice={initialExpense!.unitPrice}
              names={names}
              emptyText="No contributions logged yet."
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Label>Split type</Label>
          <div className="flex gap-2">
            {availableSplitTypes.map((type) => (
              <Button
                key={type}
                type="button"
                size="sm"
                variant={splitType === type ? 'default' : 'outline'}
                onClick={() => setValue('splitType', type, { shouldValidate: true })}
              >
                {splitTypeLabel(type)}
              </Button>
            ))}
          </div>

          {splitType === SplitTypes.EQUAL && (
            <div className="flex flex-col gap-2">
              <SplitParticipantRows
                mode="equal"
                members={members}
                selectedIds={equalParticipantIds}
                onToggle={toggleEqualParticipant}
              />
              <p
                className={
                  equalParticipantIds.length === 0
                    ? 'text-negative text-sm'
                    : 'text-muted-foreground text-sm'
                }
              >
                {errors.equalParticipantIds?.message ??
                  equalSplitHint(equalParticipantIds.length, members.length, totalAmount)}
              </p>
            </div>
          )}

          {splitType === SplitTypes.EXACT && (
            <div className="flex flex-col gap-2">
              <SplitParticipantRows
                mode="exact"
                members={members}
                selectedIds={exactParticipantIds}
                onToggle={toggleExactParticipant}
                amounts={exactAmounts}
                onAmountChange={setExactAmount}
              />
              <p
                className={
                  Math.abs(exactSum - totalAmount) < 0.01 && totalAmount > 0
                    ? 'text-positive text-sm'
                    : 'text-negative text-sm'
                }
              >
                {exactSplitHint(exactSum, totalAmount)}
              </p>
              {errors.exactParticipantIds && (
                <p className="text-negative text-sm">{errors.exactParticipantIds.message}</p>
              )}
            </div>
          )}

          {splitType === SplitTypes.CLAIM && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expense-unit-price">Unit price (optional)</Label>
              <Input
                id="expense-unit-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="e.g. 7.00 per egg"
                {...register('unitPrice')}
              />
              <p className="text-muted-foreground text-sm">
                Set a unit price for quantity-based claims, or leave blank for cash amounts.
                Roommates claim their share later.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expense-date">Date</Label>
        <Input id="expense-date" type="date" {...register('date')} />
        {errors.date && <p className="text-negative text-sm">{errors.date.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expense-note">Note</Label>
        <Input id="expense-note" placeholder="e.g. Dinner at Cafe Blue" {...register('note')} />
        {errors.note && <p className="text-negative text-sm">{errors.note.message}</p>}
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={isPending || isSubmitting}>
          {mode === 'create' ? 'Add expense' : 'Save changes'}
        </Button>
        {mode === 'edit' && (
          <>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={onDelete}>
              Delete
            </Button>
          </>
        )}
      </div>
    </form>
  )
}
