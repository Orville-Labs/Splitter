import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeSupabase } from '../helpers/fakeSupabase'

const fake = createFakeSupabase()

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return fake.client
  },
}))

const { createSettlement, deleteSettlement, listAllSettlements, updateSettlement } =
  await import('@/data/settlements.repository')

beforeEach(() => {
  Object.assign(fake, createFakeSupabase())
})

describe('settlements.repository', () => {
  it('creates a settlement', async () => {
    const settlement = await createSettlement('sp1', {
      from: 'kishore',
      to: 'kavin',
      amount: 100,
      date: '2026-09-03',
    })
    expect(settlement).toMatchObject({ from: 'kishore', to: 'kavin', amount: 100 })
  })

  it('updates a settlement in place', async () => {
    const settlement = await createSettlement('sp1', {
      from: 'kishore',
      to: 'kavin',
      amount: 100,
      date: '2026-09-03',
    })
    const updated = await updateSettlement(settlement.id, {
      from: 'kishore',
      to: 'kavin',
      amount: 175,
    })
    expect(updated.amount).toBe(175)
  })

  it('deletes a settlement', async () => {
    const settlement = await createSettlement('sp1', {
      from: 'kishore',
      to: 'kavin',
      amount: 100,
      date: '2026-09-03',
    })
    await deleteSettlement(settlement.id)
    expect(fake.tables.settlements).toHaveLength(0)
  })

  it('groups settlements by space_id, since the domain Settlement shape carries no space id', async () => {
    await createSettlement('sp1', { from: 'kishore', to: 'kavin', amount: 100, date: '2026-09-03' })
    await createSettlement('sp2', { from: 'anu', to: 'ravi', amount: 50, date: '2026-09-03' })

    const grouped = await listAllSettlements()
    expect(Object.keys(grouped).sort()).toEqual(['sp1', 'sp2'])
    expect(grouped.sp1).toHaveLength(1)
    expect(grouped.sp1[0].from).toBe('kishore')
    expect(grouped.sp2).toHaveLength(1)
    expect(grouped.sp2[0].from).toBe('anu')
  })
})
