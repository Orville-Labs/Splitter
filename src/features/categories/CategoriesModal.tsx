import { ArrowDown, ArrowUp, Check, Pencil, Plus, X } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { CategoryRow } from '@/data/categories.repository'

import {
  useAddCategory,
  useRemoveCategory,
  useRenameCategory,
  useReorderCategories,
} from './useCategoryMutations'

const MAX_CATEGORY_NAME_LENGTH = 18

/**
 * Add, rename, remove and reorder the active space's expense categories —
 * ported from the original app's categoriesModal.js, with shadcn
 * AlertDialog + sonner toasts standing in for its `confirm()`/`alert()`
 * calls. Removing a category is a soft delete server-side (see
 * categories.repository.ts); the confirmation copy says so.
 *
 * Reorder is up/down buttons rather than the original's drag-and-drop:
 * drag alone has no keyboard equivalent, and this project already
 * treats a11y gaps in generated/ported UI as real bugs worth fixing (see
 * PROJECT_STATE.md's Phase 4/5 notes) rather than something to
 * reproduce as-is.
 */
export function CategoriesModal({
  open,
  onOpenChange,
  spaceId,
  categories,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  spaceId: string
  categories: CategoryRow[]
}) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [removeTarget, setRemoveTarget] = useState<CategoryRow | null>(null)

  const addCategory = useAddCategory()
  const renameCategory = useRenameCategory()
  const removeCategory = useRemoveCategory()
  const reorderCategories = useReorderCategories()

  function startEditing(category: CategoryRow) {
    setEditingId(category.id)
    setEditingValue(category.name)
  }

  function cancelEditing() {
    setEditingId(null)
    setEditingValue('')
  }

  function handleAdd() {
    const name = newName.trim()
    if (!name) return
    if (categories.some((category) => category.name === name)) {
      toast.error('That category already exists.')
      return
    }
    addCategory.mutate(
      { spaceId, name, position: categories.length },
      {
        onSuccess: () => setNewName(''),
        onError: (error) => toast.error(error.message),
      },
    )
  }

  function handleConfirmRename() {
    const oldCategory = categories.find((category) => category.id === editingId)
    const name = editingValue.trim()
    if (!oldCategory || !name || name === oldCategory.name) {
      cancelEditing()
      return
    }
    if (categories.some((category) => category.id !== oldCategory.id && category.name === name)) {
      toast.error('That category already exists.')
      return
    }
    renameCategory.mutate(
      { id: oldCategory.id, name },
      {
        onSuccess: cancelEditing,
        onError: (error) => toast.error(error.message),
      },
    )
  }

  function handleConfirmRemove() {
    if (!removeTarget) return
    removeCategory.mutate(removeTarget.id, {
      onError: (error) => toast.error(error.message),
    })
    setRemoveTarget(null)
  }

  function move(index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= categories.length) return
    const next = [...categories]
    ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
    reorderCategories.mutate({
      spaceId,
      orderedIds: next.map((category) => category.id),
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Categories</DialogTitle>
            <DialogDescription>Manage this group's expense categories.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1">
            {categories.length === 0 && (
              <p className="text-muted-foreground text-sm">No categories yet.</p>
            )}
            {categories.map((category, index) =>
              editingId === category.id ? (
                <div key={category.id} className="flex items-center gap-2">
                  <Input
                    autoFocus
                    value={editingValue}
                    maxLength={MAX_CATEGORY_NAME_LENGTH}
                    onChange={(event) => setEditingValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleConfirmRename()
                      if (event.key === 'Escape') cancelEditing()
                    }}
                  />
                  <Button size="icon" variant="ghost" onClick={handleConfirmRename}>
                    <Check className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={cancelEditing}>
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5"
                >
                  <span className="text-sm">{category.name}</span>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Move ${category.name} up`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Move ${category.name} down`}
                      disabled={index === categories.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => startEditing(category)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setRemoveTarget(category)}>
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              ),
            )}
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Category name"
              value={newName}
              maxLength={MAX_CATEGORY_NAME_LENGTH}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={addCategory.isPending}>
              <Plus className="size-4" />
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {removeTarget?.name} from this group's categories? Past expenses keep their
              history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
