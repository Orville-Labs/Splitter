import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeSupabase } from '../helpers/fakeSupabase'

const fake = createFakeSupabase()

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return fake.client
  },
}))

const { createSpace, deleteSpace, listSpaces, renameSpace } =
  await import('@/data/spaces.repository')

beforeEach(() => {
  Object.assign(fake, createFakeSupabase())
})

describe('spaces.repository', () => {
  it('creates a space owned by the given user', async () => {
    const space = await createSpace('owner-1', 'My Group', 0)
    expect(space).toEqual({ id: space.id, ownerId: 'owner-1', name: 'My Group', position: 0 })
    expect(fake.tables.spaces).toHaveLength(1)
  })

  it('lists spaces ordered by position then created_at', async () => {
    await createSpace('owner-1', 'Second', 1)
    await createSpace('owner-1', 'First', 0)
    const spaces = await listSpaces()
    expect(spaces.map((s) => s.name)).toEqual(['First', 'Second'])
  })

  it('renames a space in place', async () => {
    const space = await createSpace('owner-1', 'Old name', 0)
    await renameSpace(space.id, 'New name')
    expect(fake.tables.spaces[0].name).toBe('New name')
  })

  it('deleting a space cascades to members, categories, expenses and settlements', async () => {
    const space = await createSpace('owner-1', 'Goa Trip', 0)
    fake.tables.members.push({ id: 'm1', space_id: space.id, name: 'Kavin' })
    fake.tables.categories.push({ id: 'c1', space_id: space.id, name: 'Food', position: 0 })
    fake.tables.expenses.push({
      id: 'e1',
      space_id: space.id,
      payer_id: 'm1',
      amount: 100,
      split_type: 'EQUAL',
      unit_price: null,
      expense_date: '2026-09-01',
      note: '',
    })
    fake.tables.expense_participants.push({ expense_id: 'e1', member_id: 'm1' })
    fake.tables.claims.push({
      id: 'cl1',
      expense_id: 'e1',
      member_id: 'm1',
      amount: 10,
      qty: null,
      claim_date: '2026-09-01',
    })
    fake.tables.settlements.push({
      id: 's1',
      space_id: space.id,
      from_member_id: 'm1',
      to_member_id: 'm1',
      amount: 5,
      settlement_date: '2026-09-01',
    })

    await deleteSpace(space.id)

    expect(fake.tables.spaces).toHaveLength(0)
    expect(fake.tables.members).toHaveLength(0)
    expect(fake.tables.categories).toHaveLength(0)
    expect(fake.tables.expenses).toHaveLength(0)
    expect(fake.tables.expense_participants).toHaveLength(0)
    expect(fake.tables.claims).toHaveLength(0)
    expect(fake.tables.settlements).toHaveLength(0)
  })
})
