import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeSupabase } from '../helpers/fakeSupabase'

const fake = createFakeSupabase()

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return fake.client
  },
}))

const {
  addCategories,
  addCategory,
  listAllCategories,
  removeCategory,
  renameCategory,
  saveCategoryOrder,
} = await import('@/data/categories.repository')

beforeEach(() => {
  Object.assign(fake, createFakeSupabase())
})

describe('categories.repository', () => {
  it('seeds the default categories for a new space in one bulk insert', async () => {
    await addCategories('sp1', ['Petrol', 'Egg', 'Banana'])
    const categories = await listAllCategories()
    expect(categories.map((c) => c.name)).toEqual(['Petrol', 'Egg', 'Banana'])
    expect(categories.map((c) => c.position)).toEqual([0, 1, 2])
  })

  it('adds a single category at a given position, active by default', async () => {
    const category = await addCategory('sp1', 'Groceries', 0)
    expect(category).toEqual({
      id: category.id,
      spaceId: 'sp1',
      name: 'Groceries',
      position: 0,
      isActive: true,
    })
    expect(fake.tables.categories[0]).toMatchObject({ name: 'Groceries', position: 0 })
  })

  it('removing a category is a soft delete — the row survives, marked inactive', async () => {
    const category = await addCategory('sp1', 'Groceries', 0)
    await removeCategory(category.id)

    expect(fake.tables.categories).toHaveLength(1)
    expect(fake.tables.categories[0].is_active).toBe(false)

    const [listed] = await listAllCategories()
    expect(listed.isActive).toBe(false)
  })

  it('renames a category with a single plain update — no RPC involved', async () => {
    const category = await addCategory('sp1', 'Groceries', 0)
    await renameCategory(category.id, 'Food')
    expect(fake.tables.categories[0].name).toBe('Food')
    expect(fake.rpcCalls).toEqual([])
  })

  it('reorders categories atomically via the set_category_order RPC', async () => {
    await addCategories('sp1', ['Petrol', 'Egg', 'Other'])
    const [petrol, egg, other] = fake.tables.categories

    await saveCategoryOrder('sp1', [other.id, petrol.id, egg.id])

    const reordered = await listAllCategories()
    expect(reordered.map((c) => c.name)).toEqual(['Other', 'Petrol', 'Egg'])
    expect(fake.rpcCalls).toEqual([
      {
        name: 'set_category_order',
        args: { p_space_id: 'sp1', p_category_ids: [other.id, petrol.id, egg.id] },
      },
    ])
  })
})
