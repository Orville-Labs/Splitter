import { describe, expect, it } from 'vitest'
import { formatCurrency, isSettled, round2 } from '@/domain/money'

/**
 * The original app never had a dedicated money test file — round2 and
 * formatCurrency were only exercised indirectly through balances tests.
 * Adding direct coverage here, since Phase 2's goal is a fully unit-tested
 * domain layer.
 */

describe('round2', () => {
  it('rounds to 2 decimal places', () => {
    expect(round2(1.005)).toBe(1.01)
    expect(round2(33.333333)).toBe(33.33)
  })

  it('corrects float drift', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3)
  })

  it('preserves the sign of negative values', () => {
    // -12.346 (not -12.345 — that's an exact tie, and Math.round breaks
    // ties toward positive infinity, i.e. -12.34, which would make this
    // assertion about sign preservation ambiguous with rounding direction).
    expect(round2(-12.346)).toBe(-12.35)
  })
})

describe('formatCurrency', () => {
  it('formats a positive amount with the ₹ prefix and en-IN grouping', () => {
    expect(formatCurrency(1234.5)).toBe('₹1,234.50')
  })

  it('puts the minus sign before the ₹, not after', () => {
    expect(formatCurrency(-1234.5)).toBe('-₹1,234.50')
  })

  it('always shows exactly 2 decimal places', () => {
    expect(formatCurrency(5)).toBe('₹5.00')
  })

  it('rounds before formatting', () => {
    expect(formatCurrency(0.1 + 0.2)).toBe('₹0.30')
  })
})

describe('isSettled', () => {
  it('treats exactly zero as settled', () => {
    expect(isSettled(0)).toBe(true)
  })

  it('treats anything under a paisa as settled', () => {
    expect(isSettled(0.009)).toBe(true)
    expect(isSettled(-0.009)).toBe(true)
  })

  it('treats a full paisa or more as not settled', () => {
    expect(isSettled(0.01)).toBe(false)
    expect(isSettled(-0.5)).toBe(false)
  })
})
