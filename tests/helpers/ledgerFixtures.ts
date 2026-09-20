import {
  SplitTypes,
  type Claim,
  type Expense,
  type Ledger,
  type Settlement,
} from '@/domain/balances'
import type { NameLookup } from '@/domain/breakdown'

/**
 * Builders for ledger data, so tests read as intent rather than object
 * soup. Member ids here are plain readable strings ("Kavin") rather than
 * UUIDs — the domain layer doesn't care what shape an id has, and using
 * a readable string keeps assertions legible. `NAMES` below is an
 * identity map (id -> same string) so ported assertions that check
 * rendered text keep working unchanged; `breakdown.test.ts` also has one
 * dedicated case with a genuinely different id/display-name pair, to
 * prove the lookup is actually used rather than assumed to be identity.
 */

export const MEMBERS = ['Kavin', 'Kishore', 'Mohan', 'Karthick']

export const NAMES: NameLookup = {
  members: Object.fromEntries(MEMBERS.map((name) => [name, name])),
  categories: {
    Petrol: 'Petrol',
    Egg: 'Egg',
  },
}

export function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: String(Math.floor(Math.random() * 1e9)),
    amount: 100,
    payer: MEMBERS[0],
    categoryIds: [],
    splitType: SplitTypes.EQUAL,
    participants: MEMBERS,
    splitData: {},
    date: '2026-09-01',
    note: '',
    unitPrice: null,
    claims: [],
    ...overrides,
  }
}

export function settlement(overrides: Partial<Settlement> = {}): Settlement {
  return {
    id: String(Math.floor(Math.random() * 1e9)),
    from: MEMBERS[0],
    to: MEMBERS[1],
    amount: 50,
    date: '2026-09-01',
    ...overrides,
  }
}

export function ledger(overrides: Partial<Ledger> = {}): Ledger {
  return {
    members: MEMBERS,
    expenses: [],
    settlements: [],
    ...overrides,
  }
}

/** A ledger exercising all three split types plus a settlement. */
export function mixedLedger(): Ledger {
  return ledger({
    expenses: [
      expense({
        id: '1',
        amount: 1200,
        payer: 'Kavin',
        categoryIds: ['Petrol'],
        splitType: SplitTypes.EQUAL,
        participants: MEMBERS,
        date: '2026-08-10',
        note: 'Fuel',
      }),
      expense({
        id: '2',
        amount: 900,
        payer: 'Kishore',
        splitType: SplitTypes.EXACT,
        participants: ['Kishore', 'Mohan'],
        splitData: { Kishore: 300, Mohan: 600 },
        date: '2026-08-20',
      }),
      expense({
        id: '3',
        amount: 700,
        payer: 'Mohan',
        categoryIds: ['Egg'],
        splitType: SplitTypes.CLAIM,
        participants: [],
        unitPrice: 7,
        date: '2026-09-01',
        note: 'Eggs',
        claims: claimsFor([
          ['11', 'Kavin', 210, 30, '2026-09-02'],
          ['12', 'Karthick', 140, 20, '2026-09-03'],
        ]),
      }),
      expense({
        id: '4',
        amount: 500,
        payer: 'Karthick',
        splitType: SplitTypes.EQUAL,
        participants: ['Karthick', 'Kavin'],
        date: '2026-09-04',
        note: 'Cab',
      }),
    ],
    settlements: [
      settlement({
        id: '21',
        from: 'Mohan',
        to: 'Kavin',
        amount: 250,
        date: '2026-09-02',
      }),
    ],
  })
}

function claimsFor(rows: [string, string, number, number, string][]): Claim[] {
  return rows.map(([id, member, amount, qty, date]) => ({ id, member, amount, qty, date }))
}
