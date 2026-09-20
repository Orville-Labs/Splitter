import { vi } from 'vitest'

/**
 * An in-memory stand-in for the Supabase client — there is no live project
 * to test the repository layer against yet (see PROJECT_STATE.md's Phase
 * 3 notes). Implements just enough of the PostgREST builder chain
 * (select/insert/update/delete with .eq()/.order()/.single()) plus the
 * three RPCs this schema defines, including the two multi-table atomic
 * writes (create_expense/update_expense) — faked here in JS to mirror
 * exactly what their SQL bodies do, so repository logic is verified
 * without needing a real Postgres to run the actual functions.
 *
 * Adapted from the original app's tests/helpers/fakeSupabase.js for the
 * redesigned, id-based schema.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

export function createFakeSupabase(seed: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = {
    profiles: [],
    spaces: [],
    members: [],
    categories: [],
    expenses: [],
    expense_categories: [],
    expense_participants: [],
    expense_shares: [],
    claims: [],
    settlements: [],
    ...structuredClone(seed),
  }

  let nextId = 1000
  const genId = () => `id-${++nextId}`
  const rpcCalls: { name: string; args: unknown }[] = []

  const matches = (row: Row, filters: [string, unknown][]) =>
    filters.every(([column, value]) => String(row[column]) === String(value))

  function from(table: string) {
    const filters: [string, unknown][] = []
    let mode: 'select' | 'insert' | 'update' | 'delete' = 'select'
    let payload: Row[] | Row | null = null
    let single = false
    const orderCols: { col: string; ascending: boolean }[] = []

    const builder = {
      select: () => builder,
      order(col: string, opts?: { ascending?: boolean }) {
        orderCols.push({ col, ascending: opts?.ascending ?? true })
        return builder
      },
      eq(column: string, value: unknown) {
        filters.push([column, value])
        return builder
      },
      single() {
        single = true
        return builder
      },
      insert(rows: Row | Row[]) {
        mode = 'insert'
        payload = Array.isArray(rows) ? rows : [rows]
        return builder
      },
      update(columns: Row) {
        mode = 'update'
        payload = columns
        return builder
      },
      delete() {
        mode = 'delete'
        return builder
      },
      then(resolve: (result: { data: unknown; error: null }) => unknown) {
        return Promise.resolve(resolve(run()))
      },
    }

    function run() {
      let data: Row[]

      if (mode === 'insert') {
        const created = (payload as Row[]).map((row) => ({
          id: genId(),
          created_at: new Date().toISOString(),
          // Mirrors members.is_active/categories.is_active's DB default
          // (true) — the real schema defaults it so a plain
          // {space_id, name} insert (no is_active given) still comes
          // back active. Harmless for every other table, which has no
          // such column.
          ...(table === 'members' || table === 'categories' ? { is_active: true } : {}),
          ...row,
        }))
        tables[table].push(...created)
        data = created
      } else if (mode === 'update') {
        data = tables[table].filter((row) => matches(row, filters))
        data.forEach((row) => Object.assign(row, payload))
      } else if (mode === 'delete') {
        const removed = tables[table].filter((row) => matches(row, filters))
        tables[table] = tables[table].filter((row) => !matches(row, filters))
        cascadeDelete(table, removed)
        data = removed
      } else {
        data = tables[table].filter((row) => matches(row, filters))
        // Apply sorts in reverse declaration order with a stable sort, so
        // the FIRST .order() call ends up as the dominant key (a stable
        // sort applied last wins, earlier stable sorts survive as tie-breaks).
        for (const { col, ascending } of [...orderCols].reverse()) {
          data = [...data].sort((a, b) => {
            const direction = ascending ? 1 : -1
            if (a[col] === b[col]) return 0
            return a[col] > b[col] ? direction : -direction
          })
        }
      }

      return { data: single ? (data[0] ?? null) : data, error: null }
    }

    return builder
  }

  /** Mirrors the ON DELETE CASCADE chains from the real schema. */
  function cascadeDelete(table: string, removedRows: Row[]) {
    if (table === 'spaces') {
      const removedSpaceIds = new Set(removedRows.map((row) => row.id))
      tables.members = tables.members.filter((row) => !removedSpaceIds.has(row.space_id))
      tables.categories = tables.categories.filter((row) => !removedSpaceIds.has(row.space_id))
      const removedExpenseIds = new Set(
        tables.expenses.filter((row) => removedSpaceIds.has(row.space_id)).map((row) => row.id),
      )
      tables.expenses = tables.expenses.filter((row) => !removedSpaceIds.has(row.space_id))
      tables.settlements = tables.settlements.filter((row) => !removedSpaceIds.has(row.space_id))
      cascadeExpenseChildren(removedExpenseIds)
    }
    if (table === 'expenses') {
      cascadeExpenseChildren(new Set(removedRows.map((row) => row.id)))
    }
  }

  function cascadeExpenseChildren(removedExpenseIds: Set<string>) {
    tables.expense_categories = tables.expense_categories.filter(
      (row) => !removedExpenseIds.has(row.expense_id),
    )
    tables.expense_participants = tables.expense_participants.filter(
      (row) => !removedExpenseIds.has(row.expense_id),
    )
    tables.expense_shares = tables.expense_shares.filter(
      (row) => !removedExpenseIds.has(row.expense_id),
    )
    tables.claims = tables.claims.filter((row) => !removedExpenseIds.has(row.expense_id))
  }

  interface ExpenseWriteArgs {
    p_space_id?: string
    p_expense_id?: string
    p_payer_id: string
    p_amount: number
    p_split_type: 'EQUAL' | 'EXACT' | 'CLAIM'
    p_unit_price: number | null
    p_expense_date: string
    p_note: string
    p_category_ids: string[] | null
    p_participant_ids: string[] | null
    p_shares: { member_id: string; amount: number }[] | null
  }

  /** Clears only categories/participants/shares for one expense — never claims. */
  function clearExpenseSplitData(expenseId: string) {
    tables.expense_categories = tables.expense_categories.filter(
      (row) => row.expense_id !== expenseId,
    )
    tables.expense_participants = tables.expense_participants.filter(
      (row) => row.expense_id !== expenseId,
    )
    tables.expense_shares = tables.expense_shares.filter((row) => row.expense_id !== expenseId)
  }

  function writeExpenseChildren(expenseId: string, args: ExpenseWriteArgs) {
    for (const categoryId of args.p_category_ids ?? []) {
      tables.expense_categories.push({ expense_id: expenseId, category_id: categoryId })
    }
    if (args.p_split_type === 'EQUAL') {
      for (const memberId of args.p_participant_ids ?? []) {
        tables.expense_participants.push({ expense_id: expenseId, member_id: memberId })
      }
    }
    if (args.p_split_type === 'EXACT') {
      for (const share of args.p_shares ?? []) {
        tables.expense_shares.push({
          expense_id: expenseId,
          member_id: share.member_id,
          amount: share.amount,
        })
      }
    }
  }

  const rpcHandlers: Record<string, (args: never) => unknown> = {
    set_category_order: (({
      p_space_id,
      p_category_ids,
    }: {
      p_space_id: string
      p_category_ids: string[]
    }) => {
      p_category_ids.forEach((id, index) => {
        const row = tables.categories.find((c) => c.id === id && c.space_id === p_space_id)
        if (row) row.position = index
      })
      return null
    }) as (args: never) => unknown,

    create_expense: ((args: ExpenseWriteArgs) => {
      const id = genId()
      tables.expenses.push({
        id,
        space_id: args.p_space_id,
        payer_id: args.p_payer_id,
        amount: args.p_amount,
        split_type: args.p_split_type,
        unit_price: args.p_unit_price,
        expense_date: args.p_expense_date,
        note: args.p_note ?? '',
        created_at: new Date().toISOString(),
      })
      writeExpenseChildren(id, args)
      return id
    }) as (args: never) => unknown,

    update_expense: ((args: ExpenseWriteArgs) => {
      const row = tables.expenses.find((expense) => expense.id === args.p_expense_id)
      if (row) {
        Object.assign(row, {
          payer_id: args.p_payer_id,
          amount: args.p_amount,
          split_type: args.p_split_type,
          unit_price: args.p_unit_price,
          expense_date: args.p_expense_date,
          note: args.p_note ?? '',
        })
      }
      const expenseId = args.p_expense_id as string
      // Deliberately NOT cascadeExpenseChildren — that also clears claims,
      // which the real update_expense SQL never touches (an edit must not
      // mutate contributions already logged).
      clearExpenseSplitData(expenseId)
      writeExpenseChildren(expenseId, args)
      return null
    }) as (args: never) => unknown,
  }

  const client = {
    from,
    rpc: vi.fn((name: string, args: never) => {
      rpcCalls.push({ name, args })
      const result = rpcHandlers[name]?.(args)
      return Promise.resolve({ data: result ?? null, error: null })
    }),
  }

  return { client, tables, rpcCalls }
}
