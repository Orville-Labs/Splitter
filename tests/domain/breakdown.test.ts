import { describe, expect, it } from 'vitest'
import { computeBalances } from '@/domain/balances'
import {
  buildBreakdown,
  groupBreakdownByDay,
  sumBreakdown,
  type BreakdownRow,
} from '@/domain/breakdown'
import { round2 } from '@/domain/money'
import { MEMBERS, mixedLedger, NAMES } from '../helpers/ledgerFixtures'

describe('buildBreakdown', () => {
  it("reconciles exactly to each member's balance over all time", () => {
    const data = mixedLedger()
    const balances = computeBalances(data)

    for (const member of MEMBERS) {
      const net = sumBreakdown(buildBreakdown(data, member, NAMES))
      expect(net).toBeCloseTo(balances[member], 2)
    }
  })

  it('orders rows newest first', () => {
    const rows = buildBreakdown(mixedLedger(), 'Kavin', NAMES)
    const dates = rows.map((row) => row.date)
    expect(dates).toEqual([...dates].sort().reverse())
  })

  it('honours a date range', () => {
    const data = mixedLedger()
    const rows = buildBreakdown(data, 'Kavin', NAMES, { from: '2026-09-01', to: '2026-09-30' })
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.date >= '2026-09-01')).toBe(true)
    expect(rows.length).toBeLessThan(buildBreakdown(data, 'Kavin', NAMES).length)
  })

  it('omits expenses the member had no part in', () => {
    const data = mixedLedger()
    // Kavin is neither payer nor participant on the EXACT expense (id 2).
    const rows = buildBreakdown(data, 'Kavin', NAMES)
    expect(rows.some((row) => row.detail.includes('Kishore paid'))).toBe(false)
  })

  it('records a settlement as positive for the payer, negative for the receiver', () => {
    const data = mixedLedger()
    const paid = buildBreakdown(data, 'Mohan', NAMES).find((row) => row.title === 'Settlement')
    const received = buildBreakdown(data, 'Kavin', NAMES).find((row) => row.title === 'Settlement')

    expect(paid?.amount).toBe(250)
    expect(received?.amount).toBe(-250)
  })

  it('describes an expense the member both paid and shared in', () => {
    const rows = buildBreakdown(mixedLedger(), 'Kavin', NAMES)
    const fuel = rows.find((row) => row.title === 'Fuel')
    expect(fuel?.detail).toContain('Paid')
    expect(fuel?.detail).toContain('your share')
  })

  it('returns nothing for a range with no activity', () => {
    const rows = buildBreakdown(mixedLedger(), 'Kavin', NAMES, {
      from: '2020-01-01',
      to: '2020-12-31',
    })
    expect(rows).toEqual([])
    expect(sumBreakdown(rows)).toBe(0)
  })

  it('resolves display names through the lookup, not the raw id', () => {
    // Distinct id/display-name pair, unlike every other test in this file
    // (which use an identity NAMES map for legibility) — this is the one
    // case that actually proves the lookup is used rather than assumed.
    const data = mixedLedger()
    const names = {
      ...NAMES,
      members: { ...NAMES.members, Mohan: 'Mohan K.' },
    }
    const receivedRow = buildBreakdown(data, 'Kavin', names).find(
      (row) => row.title === 'Settlement',
    )
    expect(receivedRow?.detail).toBe('Received from Mohan K.')
  })
})

describe('sumBreakdown', () => {
  it('rounds to whole paise', () => {
    expect(
      sumBreakdown([
        { date: '2026-09-01', title: '', detail: '', amount: 0.1 },
        { date: '2026-09-01', title: '', detail: '', amount: 0.2 },
      ]),
    ).toBe(round2(0.30000000000000004))
  })
})

describe('groupBreakdownByDay', () => {
  function row(overrides: Partial<BreakdownRow>): BreakdownRow {
    return { date: '2026-09-01', title: '', detail: '', amount: 1, ...overrides }
  }

  it('is empty for no rows', () => {
    expect(groupBreakdownByDay([])).toEqual([])
  })

  it('buckets consecutive same-date rows into one group', () => {
    const rows = [
      row({ date: '2026-09-02', title: 'A' }),
      row({ date: '2026-09-02', title: 'B' }),
      row({ date: '2026-09-01', title: 'C' }),
    ]
    const groups = groupBreakdownByDay(rows)
    expect(groups).toHaveLength(2)
    expect(groups[0]).toEqual({ date: '2026-09-02', rows: [rows[0], rows[1]] })
    expect(groups[1]).toEqual({ date: '2026-09-01', rows: [rows[2]] })
  })

  it('preserves the original row order within a day', () => {
    const rows = [row({ title: 'First' }), row({ title: 'Second' })]
    expect(groupBreakdownByDay(rows)[0].rows.map((r) => r.title)).toEqual(['First', 'Second'])
  })

  it('groups the real output of buildBreakdown without re-sorting it', () => {
    const rows = buildBreakdown(mixedLedger(), 'Kavin', NAMES)
    const groups = groupBreakdownByDay(rows)
    const flattened = groups.flatMap((group) => group.rows)
    expect(flattened).toEqual(rows)
    expect(groups.map((group) => group.date)).toEqual([...new Set(rows.map((row) => row.date))])
  })
})
