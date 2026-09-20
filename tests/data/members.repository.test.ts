import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeSupabase } from '../helpers/fakeSupabase'

const fake = createFakeSupabase()

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return fake.client
  },
}))

const { addMember, listAllMembers, removeMember, renameMember } =
  await import('@/data/members.repository')

beforeEach(() => {
  Object.assign(fake, createFakeSupabase())
})

describe('members.repository', () => {
  it('adds a member to a space, active by default', async () => {
    const member = await addMember('sp1', 'Kavin')
    expect(member).toEqual({ id: member.id, spaceId: 'sp1', name: 'Kavin', isActive: true })
  })

  it('lists members across every space (RLS scopes this to the caller in production)', async () => {
    await addMember('sp1', 'Kavin')
    await addMember('sp2', 'Mohan')
    const members = await listAllMembers()
    expect(members.map((m) => m.name).sort()).toEqual(['Kavin', 'Mohan'])
  })

  it('removing a member is a soft delete — the row survives, marked inactive', async () => {
    const member = await addMember('sp1', 'Kavin')
    await removeMember(member.id)

    expect(fake.tables.members).toHaveLength(1)
    expect(fake.tables.members[0].is_active).toBe(false)

    const [listed] = await listAllMembers()
    expect(listed.isActive).toBe(false)
  })

  it('renames a member with a single plain update — no RPC involved', async () => {
    const member = await addMember('sp1', 'Kavin')
    await renameMember(member.id, 'Kavin R')

    expect(fake.tables.members[0].name).toBe('Kavin R')
    // The whole point of the id-based redesign: no rename_member RPC call.
    expect(fake.rpcCalls).toEqual([])
  })
})
