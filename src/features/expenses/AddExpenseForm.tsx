import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CategoryRow } from '@/data/categories.repository'
import type { MemberRow } from '@/data/members.repository'

import { ExpenseForm } from './ExpenseForm'

/**
 * `key={spaceId}` remounts the form (and its `useForm` instance) fresh on
 * every space switch — the React-idiomatic equivalent of the original
 * app's imperative `resetForSpace()`.
 */
export function AddExpenseForm({
  spaceId,
  members,
  categories,
  onManageCategories,
}: {
  spaceId: string
  members: MemberRow[]
  categories: CategoryRow[]
  onManageCategories: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add expense</CardTitle>
      </CardHeader>
      <CardContent>
        <ExpenseForm
          key={spaceId}
          mode="create"
          spaceId={spaceId}
          members={members}
          categories={categories}
          onSaved={() => {}}
          onManageCategories={onManageCategories}
        />
      </CardContent>
    </Card>
  )
}
