import { z } from 'zod'

import type { ExpenseInput } from '@/data/expenses.repository'
import type { Expense, SplitType } from '@/domain/balances'
import { SplitTypes } from '@/domain/balances'
import { today } from '@/domain/dateRange'
import { round2 } from '@/domain/money'

/**
 * Every numeric input in this form (amount, exact-split amounts, unit
 * price) is backed by a plain text field, exactly like the original
 * app's raw DOM inputs — never `z.coerce.number()`. Coercion would force
 * the field's *type* to double as both "what the input holds" (a string,
 * always) and "what got parsed" (a number), which don't actually agree
 * when the field is empty ('' is not a valid number to submit, but also
 * isn't NaN). Parsing stays explicit, here and in `toExpenseInput`.
 */
function parseAmount(raw: string): number {
  return parseFloat(raw) || 0
}

export const expenseFormSchema = z
  .object({
    amount: z.string().refine((raw) => parseAmount(raw) > 0, 'Enter a valid amount.'),
    payerId: z.string().min(1, 'Select who paid.'),
    categoryIds: z.array(z.string()),
    date: z.string().min(1, 'Pick a date.'),
    // Required — it's what the expense is actually about, not decoration.
    note: z.string().trim().min(1, 'Describe what this payment was for.'),
    splitType: z.enum([SplitTypes.EQUAL, SplitTypes.EXACT, SplitTypes.CLAIM]),
    /** EQUAL only: who splits the amount evenly. */
    equalParticipantIds: z.array(z.string()),
    /** EXACT only: who's in the split (amounts live in exactAmounts). */
    exactParticipantIds: z.array(z.string()),
    /** EXACT only: member id -> raw entered amount, for every member ever shown, not just selected ones. */
    exactAmounts: z.record(z.string(), z.string()),
    /** CLAIM only: optional, blank means cash-amount claims instead of quantity-based. */
    unitPrice: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.splitType === SplitTypes.EQUAL && values.equalParticipantIds.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['equalParticipantIds'],
        message: 'Select at least one person to split with.',
      })
    }

    if (values.splitType === SplitTypes.EXACT) {
      if (values.exactParticipantIds.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['exactParticipantIds'],
          message: 'Select at least one person to split with.',
        })
      } else {
        const total = parseAmount(values.amount)
        const sum = round2(
          values.exactParticipantIds.reduce(
            (sum, id) => sum + parseAmount(values.exactAmounts[id] ?? ''),
            0,
          ),
        )
        if (Math.abs(sum - total) >= 0.01) {
          // Attached to exactParticipantIds (a plain array field), not
          // exactAmounts (a record field) — react-hook-form types a
          // record field's `errors` entry as per-key sub-errors, not a
          // single FieldError, so `.message` there doesn't mean what it
          // looks like it means. exactParticipantIds has no such
          // ambiguity.
          ctx.addIssue({
            code: 'custom',
            path: ['exactParticipantIds'],
            message: 'Fix the split — amounts must add up to the total.',
          })
        }
      }
    }
  })

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>

/** Kept if any survive against the current member list, else falls back to everyone — mirrors the original app's `intersect`/`keepKnown`. */
export function pruneParticipants(
  selected: readonly string[],
  memberIds: readonly string[],
): string[] {
  const kept = selected.filter((id) => memberIds.includes(id))
  return kept.length > 0 ? kept : [...memberIds]
}

/** A fresh form for the given space's current members — payer defaults to the first, everyone splits equally. */
export function buildDefaultValues(memberIds: readonly string[]): ExpenseFormValues {
  return {
    amount: '',
    payerId: memberIds[0] ?? '',
    categoryIds: [],
    date: today(),
    note: '',
    splitType: SplitTypes.EQUAL,
    equalParticipantIds: [...memberIds],
    exactParticipantIds: [...memberIds],
    exactAmounts: {},
    unitPrice: '',
  }
}

/** Prefills the form from an existing expense, for editing. */
export function expenseToFormValues(
  expense: Expense,
  memberIds: readonly string[],
): ExpenseFormValues {
  const exactAmounts: Record<string, string> = {}
  if (expense.splitType === SplitTypes.EXACT) {
    for (const id of expense.participants) {
      exactAmounts[id] = expense.splitData[id] != null ? String(expense.splitData[id]) : ''
    }
  }

  return {
    amount: String(expense.amount),
    payerId: expense.payer,
    categoryIds: expense.categoryIds,
    date: expense.date,
    note: expense.note,
    splitType: expense.splitType,
    equalParticipantIds:
      expense.splitType === SplitTypes.EQUAL
        ? pruneParticipants(expense.participants, memberIds)
        : [...memberIds],
    exactParticipantIds:
      expense.splitType === SplitTypes.EXACT
        ? pruneParticipants(expense.participants, memberIds)
        : [...memberIds],
    exactAmounts,
    unitPrice: expense.unitPrice != null ? String(expense.unitPrice) : '',
  }
}

/** The form's output, translated into what expenses.repository.ts's create/updateExpense expect. */
export function toExpenseInput(values: ExpenseFormValues): ExpenseInput {
  const amount = parseAmount(values.amount)
  const shared = {
    payerId: values.payerId,
    amount,
    date: values.date,
    note: values.note.trim(),
    categoryIds: values.categoryIds,
  }

  if (values.splitType === SplitTypes.EQUAL) {
    return {
      ...shared,
      splitType: SplitTypes.EQUAL,
      unitPrice: null,
      participantIds: values.equalParticipantIds,
      shares: {},
    }
  }

  if (values.splitType === SplitTypes.EXACT) {
    const shares: Record<string, number> = {}
    for (const id of values.exactParticipantIds) {
      shares[id] = parseAmount(values.exactAmounts[id] ?? '')
    }
    return {
      ...shared,
      splitType: SplitTypes.EXACT,
      unitPrice: null,
      participantIds: [],
      shares,
    }
  }

  const unitPrice = parseAmount(values.unitPrice)
  return {
    ...shared,
    splitType: SplitTypes.CLAIM,
    unitPrice: unitPrice > 0 ? unitPrice : null,
    participantIds: [],
    shares: {},
  }
}

export function splitTypeLabel(type: SplitType): string {
  if (type === SplitTypes.EQUAL) return 'Equal'
  if (type === SplitTypes.EXACT) return 'Exact'
  return 'Claim'
}
