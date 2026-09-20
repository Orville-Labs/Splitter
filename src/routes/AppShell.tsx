import { useMutation } from '@tanstack/react-query'
import { LogOut, Tag, User, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { AnalyticsView } from '@/features/analytics/AnalyticsView'
import { CategoriesModal } from '@/features/categories/CategoriesModal'
import { AddExpenseForm } from '@/features/expenses/AddExpenseForm'
import { ClaimModal } from '@/features/expenses/ClaimModal'
import { EditExpenseSheet } from '@/features/expenses/EditExpenseSheet'
import { ExpenseList } from '@/features/expenses/ExpenseList'
import { MembersModal } from '@/features/members/MembersModal'
import { TabBar, type Tab } from '@/features/navigation/TabBar'
import { BreakdownModal } from '@/features/settlements/BreakdownModal'
import { SettlementModal } from '@/features/settlements/SettlementModal'
import { SettlementsView } from '@/features/settlements/SettlementsView'
import { SpacesSidebar } from '@/features/spaces/SpacesSidebar'
import { supabase } from '@/lib/supabaseClient'
import { useLedger } from '@/queries/useLedger'
import { useSpaces } from '@/queries/useSpaces'
import { useSession } from '@/state/SessionContext'

/**
 * The app shell behind ProtectedRoute: header, tab bar, spaces sidebar.
 * All three tab panels (Add, Settlement, Analytics) are mounted at once
 * and toggled with the `hidden` attribute rather than conditionally
 * rendered — switching tabs must not reset whatever's mid-entry in
 * another tab (the original app's panels were plain CSS-hidden `<div>`s
 * for the same reason).
 */
export function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>('add')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [claimingExpenseId, setClaimingExpenseId] = useState<string | null>(null)
  const [settlementTarget, setSettlementTarget] = useState<'closed' | 'create' | string>('closed')
  const [breakdownMemberId, setBreakdownMemberId] = useState<string | null>(null)
  const { user } = useSession()
  const navigate = useNavigate()

  const {
    spaces,
    activeSpaceId,
    setActiveSpaceId,
    isLoading: spacesLoading,
    isError: spacesError,
  } = useSpaces()
  const {
    members,
    categories,
    ledger,
    names,
    isLoading: ledgerLoading,
    isError: ledgerError,
  } = useLedger(activeSpaceId)
  const activeSpace = spaces.find((space) => space.id === activeSpaceId)
  // Derived fresh from the live ledger on every render, not a snapshot
  // taken at click-time — a claim logged while this dialog is open must
  // show up in it without being closed and reopened.
  const editingExpense = ledger.expenses.find((expense) => expense.id === editingExpenseId) ?? null
  const claimingExpense =
    ledger.expenses.find((expense) => expense.id === claimingExpenseId) ?? null
  const editingSettlement =
    settlementTarget !== 'closed' && settlementTarget !== 'create'
      ? (ledger.settlements.find((settlement) => settlement.id === settlementTarget) ?? null)
      : null

  const signOut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    onSuccess: () => navigate('/login', { replace: true }),
  })

  if (spacesError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="sr-only">Spliter</h1>
        <p className="text-sm">Something went wrong loading your spaces.</p>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </main>
    )
  }

  if (spacesLoading || !activeSpaceId) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <h1 className="sr-only">Spliter</h1>
        <p className="text-muted-foreground text-sm">Setting up your space…</p>
      </main>
    )
  }

  return (
    <div className="bg-background min-h-screen pb-20">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">Spliter</h1>
          <p className="text-muted-foreground text-sm">{activeSpace?.name ?? '—'}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Account menu">
              <User className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled className="text-muted-foreground">
              {user?.email}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMembersOpen(true)}>
              <Users className="size-4" />
              Group members
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCategoriesOpen(true)}>
              <Tag className="size-4" />
              Categories
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => signOut.mutate()} disabled={signOut.isPending}>
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="mx-auto max-w-md p-4">
        <div hidden={activeTab !== 'add'} className="flex flex-col gap-4">
          <AddExpenseForm
            spaceId={activeSpaceId}
            members={members}
            categories={categories}
            onManageCategories={() => setCategoriesOpen(true)}
          />
          <ExpenseList
            key={activeSpaceId}
            ledger={ledger}
            names={names}
            onEdit={(expense) => setEditingExpenseId(expense.id)}
            onClaim={(expense) => setClaimingExpenseId(expense.id)}
          />
        </div>

        <div hidden={activeTab !== 'settle'} className="flex flex-col gap-4">
          <SettlementsView
            key={activeSpaceId}
            ledger={ledger}
            members={members}
            names={names}
            onOpenBreakdown={setBreakdownMemberId}
            onRecordNew={() => setSettlementTarget('create')}
            onEditSettlement={setSettlementTarget}
          />
        </div>

        <div hidden={activeTab !== 'analytics'} className="flex flex-col gap-4">
          <AnalyticsView
            ledger={ledger}
            members={members}
            names={names}
            spaceName={activeSpace?.name ?? 'expenses'}
          />
        </div>

        {ledgerLoading && (
          <p className="text-muted-foreground mt-4 text-center text-sm">Loading…</p>
        )}
        {ledgerError && (
          <p className="text-negative mt-4 text-center text-sm">
            Something went wrong loading your data. Try reloading the page.
          </p>
        )}
      </main>

      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSidebar={() => setSidebarOpen(true)}
      />
      <SpacesSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        spaces={spaces}
        activeSpaceId={activeSpaceId}
        onSwitch={setActiveSpaceId}
        onCreated={() => {
          setSidebarOpen(false)
          setMembersOpen(true)
        }}
      />
      <MembersModal
        open={membersOpen}
        onOpenChange={setMembersOpen}
        spaceId={activeSpaceId}
        members={members}
      />
      <CategoriesModal
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
        spaceId={activeSpaceId}
        categories={categories}
      />
      <EditExpenseSheet
        open={editingExpenseId !== null}
        onOpenChange={(open) => !open && setEditingExpenseId(null)}
        spaceId={activeSpaceId}
        members={members}
        categories={categories}
        expense={editingExpense}
        names={names}
        onManageCategories={() => setCategoriesOpen(true)}
      />
      <ClaimModal
        key={`claim-${claimingExpenseId ?? 'none'}`}
        open={claimingExpenseId !== null}
        onOpenChange={(open) => !open && setClaimingExpenseId(null)}
        expense={claimingExpense}
        members={members}
        names={names}
      />
      <SettlementModal
        key={`settlement-${settlementTarget}`}
        open={settlementTarget !== 'closed'}
        onOpenChange={(open) => !open && setSettlementTarget('closed')}
        spaceId={activeSpaceId}
        members={members}
        settlement={editingSettlement}
      />
      <BreakdownModal
        key={`breakdown-${breakdownMemberId ?? 'none'}`}
        open={breakdownMemberId !== null}
        onOpenChange={(open) => !open && setBreakdownMemberId(null)}
        memberId={breakdownMemberId}
        ledger={ledger}
        names={names}
      />
    </div>
  )
}
