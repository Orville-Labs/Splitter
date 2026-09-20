import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'

export interface TagRowItem {
  id: string
  label: string
}

/**
 * The pill/toggle row used for payer, categories, and claimant pickers —
 * ported from the original app's tagRow.js, which existed for exactly
 * this reason: several screens were each hand-rolling the same toggle-
 * button markup.
 */
export function TagRow({
  items,
  isActive,
  onSelect,
  emptyText,
  trailing,
}: {
  items: TagRowItem[]
  isActive: (id: string) => boolean
  onSelect: (id: string) => void
  emptyText?: string
  trailing?: ReactNode
}) {
  if (items.length === 0 && emptyText) {
    return <p className="text-muted-foreground text-sm">{emptyText}</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Button
          key={item.id}
          type="button"
          size="sm"
          variant={isActive(item.id) ? 'default' : 'outline'}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </Button>
      ))}
      {trailing}
    </div>
  )
}
