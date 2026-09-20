import { describe, expect, it } from 'vitest'
import { computeBalances, computeSettlements, expenseShareMap, SplitTypes } from '@/domain/balances'
import { round2 } from '@/domain/money'
import { expense, ledger, MEMBERS, mixedLedger, settlement } from '../helpers/ledgerFixtures'

describe('expenseShareMap', () => {
  it('divides an EQUAL split across its participants', () => {
    const { share } = expenseShareMap(expense({ amount: 100, participants: ['A', 'B', 'C', 'D'] }))
    expect(share).toEqual({ A: 25, B: 25, C: 25, D: 25 })
  })

  it('only charges the listed participants, not the whole group', () => {
    const { share, participants } = expenseShareMap(
      expense({ amount: 60, participants: ['A', 'B'] }),
    )
    expect(participants).toEqual(['A', 'B'])
    expect(share).toEqual({ A: 30, B: 30 })
  })

  it('uses the stated amounts for an EXACT split', () => {
    const { share } = expenseShareMap(
      expense({
        amount: 90,
        splitType: SplitTypes.EXACT,
        participants: ['A', 'B'],
        splitData: { A: 30, B: 60 },
      }),
    )
    expect(share).toEqual({ A: 30, B: 60 })
  })

  it('leaves the unclaimed remainder of a CLAIM on the payer', () => {
    const { share } = expenseShareMap(
      expense({
        amount: 700,
        payer: 'Mohan',
        splitType: SplitTypes.CLAIM,
        participants: [],
        claims: [
          { id: '1', member: 'Kavin', amount: 210, qty: 30, date: '2026-09-02' },
          { id: '2', member: 'Karthick', amount: 140, qty: 20, date: '2026-09-03' },
        ],
      }),
    )
    expect(share.Mohan).toBe(350) // 700 - 210 - 140
    expect(share.Kavin).toBe(210)
    expect(share.Karthick).toBe(140)
  })

  it('always distributes the full expense amount', () => {
    for (const each of mixedLedger().expenses) {
      const { share } = expenseShareMap(each)
      const total = Object.values(share).reduce((sum, n) => sum + n, 0)
      expect(round2(total)).toBeCloseTo(each.amount, 2)
    }
  })

  it("adds the payer's own claim to their remainder", () => {
    const { share } = expenseShareMap(
      expense({
        amount: 100,
        payer: 'A',
        splitType: SplitTypes.CLAIM,
        participants: [],
        claims: [
          { id: '1', member: 'A', amount: 30, qty: null, date: '2026-09-01' },
          { id: '2', member: 'B', amount: 20, qty: null, date: '2026-09-01' },
        ],
      }),
    )
    // A claimed 30, and the 50 nobody claimed also falls to A.
    expect(share.A).toBe(80)
    expect(share.B).toBe(20)
  })
})

describe('computeBalances', () => {
  it('credits the payer and debits each participant', () => {
    const balances = computeBalances(
      ledger({
        members: ['A', 'B'],
        expenses: [expense({ amount: 100, payer: 'A', participants: ['A', 'B'] })],
      }),
    )
    expect(balances).toEqual({ A: 50, B: -50 })
  })

  it('always sums to zero', () => {
    const balances = computeBalances(mixedLedger())
    const total = Object.values(balances).reduce((sum, n) => sum + n, 0)
    expect(round2(total)).toBe(0)
  })

  it('lets a recorded settlement pay down a debt', () => {
    const base = ledger({
      members: ['A', 'B'],
      expenses: [expense({ amount: 100, payer: 'A', participants: ['A', 'B'] })],
    })
    const settled = {
      ...base,
      settlements: [settlement({ from: 'B', to: 'A', amount: 50 })],
    }
    expect(computeBalances(settled)).toEqual({ A: 0, B: 0 })
  })

  it('leaves at most a paisa of rounding residue on an indivisible split', () => {
    // 100/3 = 33.333…, which rounds to 33.33 each. Documenting the known
    // limitation rather than asserting a zero-sum that cannot hold: the
    // leftover paisa is not reassigned to anyone. Carried over unchanged
    // from the original app — not something this rebuild fixes.
    const balances = computeBalances(
      ledger({
        members: ['A', 'B', 'C'],
        expenses: [expense({ amount: 100, payer: 'A', participants: ['A', 'B', 'C'] })],
      }),
    )

    expect(balances).toEqual({ A: 66.67, B: -33.33, C: -33.33 })

    const residue = round2(Object.values(balances).reduce((s, n) => s + n, 0))
    expect(Math.abs(residue)).toBeLessThanOrEqual(0.01)
  })

  it('includes people who appear only in an expense, not the member list', () => {
    const balances = computeBalances(
      ledger({
        members: ['A'],
        expenses: [expense({ amount: 50, payer: 'A', participants: ['A', 'Ghost'] })],
      }),
    )
    expect(balances.Ghost).toBe(-25)
  })

  it('returns all zeroes for an empty ledger', () => {
    expect(computeBalances(ledger())).toEqual(Object.fromEntries(MEMBERS.map((m) => [m, 0])))
  })
})

describe('computeSettlements', () => {
  it('clears every balance', () => {
    const balances = computeBalances(mixedLedger())
    const remaining = { ...balances }

    for (const { from, to, amount } of computeSettlements(balances)) {
      remaining[from] += amount
      remaining[to] -= amount
    }
    for (const person of Object.keys(remaining)) {
      expect(round2(remaining[person])).toBe(0)
    }
  })

  it('suggests nothing when everyone is square', () => {
    expect(computeSettlements({ A: 0, B: 0 })).toEqual([])
  })

  it('pairs a single debtor with a single creditor', () => {
    expect(computeSettlements({ A: 50, B: -50 })).toEqual([{ from: 'B', to: 'A', amount: 50 }])
  })

  it('collapses a pass-through hop into one transfer', () => {
    // B owes A 50 and C owes B 50 — B should not have to touch the money.
    const transfers = computeSettlements({ A: 50, B: 0, C: -50 })
    expect(transfers).toEqual([{ from: 'C', to: 'A', amount: 50 }])
  })

  it('never suggests more transfers than there are people', () => {
    const balances = computeBalances(mixedLedger())
    expect(computeSettlements(balances).length).toBeLessThan(MEMBERS.length)
  })

  it('handles an id containing a space without corrupting the from/to split', () => {
    // A regression guard: the original app joined "from to" with a plain
    // space to dedupe transfer pairs, which would misparse an id/name
    // containing a space (e.g. "Kavin R"). This port joins with a NUL
    // separator instead — see balances.ts's mergeDuplicatePairs.
    const transfers = computeSettlements({ 'Kavin R': 50, Kishore: -50 })
    expect(transfers).toEqual([{ from: 'Kishore', to: 'Kavin R', amount: 50 }])
  })
})
