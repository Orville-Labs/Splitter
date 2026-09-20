import { ArrowLeftRight, BarChart3, PanelLeft, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type Tab = 'add' | 'settle' | 'analytics'

const TABS: { id: Tab; label: string; icon: typeof Plus }[] = [
  { id: 'add', label: 'Add', icon: Plus },
  { id: 'settle', label: 'Settlement', icon: ArrowLeftRight },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
]

/**
 * The bottom tab bar. "Spaces" sits in the same bar but opens the sidebar
 * rather than switching panels — same layout as the original app's
 * tabs.js, ported to React.
 */
export function TabBar({
  activeTab,
  onTabChange,
  onOpenSidebar,
}: {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  onOpenSidebar: () => void
}) {
  return (
    <nav className="bg-background/95 fixed inset-x-0 bottom-0 border-t backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-md items-center justify-between px-2 py-1">
        <Button
          variant="ghost"
          className="flex h-auto flex-col gap-0.5 px-3 py-2 text-xs"
          onClick={onOpenSidebar}
        >
          <PanelLeft className="size-5" />
          Spaces
        </Button>
        {TABS.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant="ghost"
            aria-current={activeTab === id ? 'page' : undefined}
            className={cn(
              'flex h-auto flex-col gap-0.5 px-3 py-2 text-xs',
              activeTab === id && 'text-primary',
            )}
            onClick={() => onTabChange(id)}
          >
            <Icon className="size-5" />
            {label}
          </Button>
        ))}
      </div>
    </nav>
  )
}
