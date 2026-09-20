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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { MemberRow } from '@/data/members.repository'

import { useAddMember, useRemoveMember, useRenameMember } from './useMemberMutations'

const MAX_MEMBER_NAME_LENGTH = 18

/**
 * Add, rename and remove the people in the active space — ported from
 * the original app's membersModal.js, with shadcn AlertDialog + sonner
 * toasts standing in for its `confirm()`/`alert()` calls (per
 * ROADMAP.md's decision to never use native browser dialogs). Removing
 * a member is a soft delete server-side; the confirmation copy says so.
 */
export function MembersModal({
  open,
  onOpenChange,
  spaceId,
  members,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  spaceId: string
  members: MemberRow[]
}) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [removeTarget, setRemoveTarget] = useState<MemberRow | null>(null)

  const addMember = useAddMember()
  const renameMember = useRenameMember()
  const removeMember = useRemoveMember()

  function startEditing(member: MemberRow) {
    setEditingId(member.id)
    setEditingValue(member.name)
  }

  function cancelEditing() {
    setEditingId(null)
    setEditingValue('')
  }

  function handleAdd() {
    const name = newName.trim()
    if (!name) return
    if (members.some((member) => member.name === name)) {
      toast.error('That name is already used.')
      return
    }
    addMember.mutate(
      { spaceId, name },
      {
        onSuccess: () => setNewName(''),
        onError: (error) => toast.error(error.message),
      },
    )
  }

  function handleConfirmRename() {
    const oldMember = members.find((member) => member.id === editingId)
    const name = editingValue.trim()
    if (!oldMember || !name || name === oldMember.name) {
      cancelEditing()
      return
    }
    if (members.some((member) => member.id !== oldMember.id && member.name === name)) {
      toast.error('That name is already used.')
      return
    }
    renameMember.mutate(
      { id: oldMember.id, name },
      {
        onSuccess: cancelEditing,
        onError: (error) => toast.error(error.message),
      },
    )
  }

  function handleConfirmRemove() {
    if (!removeTarget) return
    removeMember.mutate(removeTarget.id, {
      onError: (error) => toast.error(error.message),
    })
    setRemoveTarget(null)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Group members</DialogTitle>
            <DialogDescription>Add or remove people in this group.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1">
            {members.length === 0 && (
              <p className="text-muted-foreground text-sm">No members yet.</p>
            )}
            {members.map((member) =>
              editingId === member.id ? (
                <div key={member.id} className="flex items-center gap-2">
                  <Input
                    autoFocus
                    value={editingValue}
                    maxLength={MAX_MEMBER_NAME_LENGTH}
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
                  key={member.id}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5"
                >
                  <span className="text-sm">{member.name}</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => startEditing(member)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setRemoveTarget(member)}>
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              ),
            )}
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Member name"
              value={newName}
              maxLength={MAX_MEMBER_NAME_LENGTH}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={addMember.isPending}>
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
              Remove {removeTarget?.name} from the group? Past expenses keep their history.
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
