import { Check, Pencil, Plus, X } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { MAX_SPACE_NAME_LENGTH } from '@/config/constants'
import type { Space } from '@/data/spaces.repository'
import { cn } from '@/lib/utils'

import { useCreateSpace, useDeleteSpace, useRenameSpace } from './useSpaceMutations'

/**
 * Create, rename, delete and switch between spaces (groups) — ported
 * from the original app's spacesSidebar.js, with shadcn AlertDialog +
 * sonner toasts standing in for its `prompt()`/`confirm()`/`alert()`
 * calls (per ROADMAP.md's decision to never use native browser dialogs).
 * Renaming uses the same inline edit pattern as MembersModal.
 */
export function SpacesSidebar({
  open,
  onOpenChange,
  spaces,
  activeSpaceId,
  onSwitch,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  spaces: Space[]
  activeSpaceId: string | null
  onSwitch: (id: string) => void
  /** Called after a new space is created and switched to — a brand-new
   * space has no members yet, so the caller can prompt for them right
   * away (mirrors the original app's create() -> openMembersModal()). */
  onCreated?: (spaceId: string) => void
}) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Space | null>(null)

  const createSpace = useCreateSpace()
  const renameSpace = useRenameSpace()
  const deleteSpace = useDeleteSpace()

  function startEditing(space: Space) {
    setEditingId(space.id)
    setEditingValue(space.name)
  }

  function cancelEditing() {
    setEditingId(null)
    setEditingValue('')
  }

  function handleCreate() {
    const name = newName.trim().slice(0, MAX_SPACE_NAME_LENGTH)
    if (!name) return
    createSpace.mutate(
      { name, position: spaces.length },
      {
        onSuccess: (space) => {
          setNewName('')
          onSwitch(space.id)
          onCreated?.(space.id)
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  function handleConfirmRename() {
    const space = spaces.find((each) => each.id === editingId)
    const name = editingValue.trim().slice(0, MAX_SPACE_NAME_LENGTH)
    if (!space || !name || name === space.name) {
      cancelEditing()
      return
    }
    renameSpace.mutate(
      { id: space.id, name },
      {
        onSuccess: cancelEditing,
        onError: (error) => toast.error(error.message),
      },
    )
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return
    if (spaces.length <= 1) {
      toast.error('You need at least one space — create a new one before deleting this.')
      setDeleteTarget(null)
      return
    }
    const wasActive = deleteTarget.id === activeSpaceId
    deleteSpace.mutate(deleteTarget.id, {
      onSuccess: () => {
        if (wasActive) {
          const remaining = spaces.find((space) => space.id !== deleteTarget.id)
          if (remaining) onSwitch(remaining.id)
        }
      },
      onError: (error) => toast.error(error.message),
    })
    setDeleteTarget(null)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Spaces</SheetTitle>
            <SheetDescription>Switch between your groups.</SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-1 px-4">
            {spaces.map((space) => {
              const isActive = space.id === activeSpaceId
              if (editingId === space.id) {
                return (
                  <div key={space.id} className="flex items-center gap-2">
                    <Input
                      autoFocus
                      value={editingValue}
                      maxLength={MAX_SPACE_NAME_LENGTH}
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
                )
              }
              return (
                <div
                  key={space.id}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted',
                    isActive && 'bg-muted font-medium',
                  )}
                >
                  <button
                    type="button"
                    className="flex flex-1 items-center gap-2 text-left"
                    onClick={() => {
                      onSwitch(space.id)
                      onOpenChange(false)
                    }}
                  >
                    {isActive && <Check className="size-4 text-primary" />}
                    {space.name}
                  </button>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => startEditing(space)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(space)}>
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
            {spaces.length === 0 && (
              <p className="text-muted-foreground px-3 py-2 text-sm">No spaces yet.</p>
            )}
          </div>

          <div className="flex items-center gap-2 px-4">
            <Input
              placeholder="e.g. Goa Trip"
              value={newName}
              maxLength={MAX_SPACE_NAME_LENGTH}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleCreate()}
            />
            <Button onClick={handleCreate} disabled={createSpace.isPending}>
              <Plus className="size-4" />
              Create
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes its members, expenses, and settlements.
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
