import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatDayDivider,
  isWithinRange,
  RANGE_PRESETS,
  resolvePreset,
  today,
} from '@/domain/dateRange'

afterEach(() => vi.useRealTimers())

/** Freezes the clock at a known, unambiguous UTC instant. */
function freezeAt(iso: string) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

describe('isWithinRange', () => {
  it('includes both bounds', () => {
    expect(isWithinRange('2026-09-01', '2026-09-01', '2026-09-30')).toBe(true)
    expect(isWithinRange('2026-09-30', '2026-09-01', '2026-09-30')).toBe(true)
  })

  it('excludes dates outside the bounds', () => {
    expect(isWithinRange('2026-08-31', '2026-09-01', '2026-09-30')).toBe(false)
    expect(isWithinRange('2026-10-01', '2026-09-01', '2026-09-30')).toBe(false)
  })

  it('treats an empty bound as unbounded', () => {
    expect(isWithinRange('1999-01-01', '', '2026-09-30')).toBe(true)
    expect(isWithinRange('2999-01-01', '2026-09-01', '')).toBe(true)
    expect(isWithinRange('2026-09-15', '', '')).toBe(true)
  })
})

describe('resolvePreset', () => {
  it("spans exactly today for 'today'", () => {
    freezeAt('2026-09-15T10:00:00Z')
    expect(resolvePreset('today')).toEqual({ from: '2026-09-15', to: '2026-09-15' })
  })

  it("spans 7 days inclusive for 'week'", () => {
    freezeAt('2026-09-15T10:00:00Z')
    expect(resolvePreset('week')).toEqual({ from: '2026-09-09', to: '2026-09-15' })
  })

  it("starts on the 1st for 'month'", () => {
    freezeAt('2026-09-15T10:00:00Z')
    expect(resolvePreset('month')).toEqual({ from: '2026-09-01', to: '2026-09-15' })
  })

  it("spans 30 days inclusive for '30d'", () => {
    freezeAt('2026-09-15T10:00:00Z')
    expect(resolvePreset('30d')).toEqual({ from: '2026-08-17', to: '2026-09-15' })
  })

  it('crosses a month boundary correctly', () => {
    freezeAt('2026-03-02T10:00:00Z')
    expect(resolvePreset('week').from).toBe('2026-02-24')
  })

  it("returns unbounded for 'all' and 'custom'", () => {
    expect(resolvePreset('all')).toEqual({ from: '', to: '' })
    expect(resolvePreset('custom')).toEqual({ from: '', to: '' })
  })
})

describe('RANGE_PRESETS', () => {
  it('every preset key resolves', () => {
    for (const { key } of RANGE_PRESETS) {
      expect(resolvePreset(key)).toHaveProperty('from')
    }
  })
})

describe('timezone handling', () => {
  // Regression: a UTC round-trip (toISOString()) converts to UTC and lands
  // on the previous day at any UTC+ offset (e.g. IST).
  it('uses the local calendar date late at night, not the UTC one', () => {
    // 01:00 on the 15th in IST is still 19:30 on the 14th in UTC.
    freezeAt('2026-09-14T19:30:00Z')
    const localDay = new Date().getDate()
    expect(today()).toBe(`2026-09-${String(localDay).padStart(2, '0')}`)
  })

  it("starts 'month' on the 1st regardless of offset", () => {
    freezeAt('2026-09-15T10:00:00Z')
    expect(resolvePreset('month').from.endsWith('-01')).toBe(true)
  })
})

describe('today', () => {
  it('returns an ISO date', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('formatDayDivider', () => {
  it('labels the current day "Today"', () => {
    freezeAt('2026-09-15T10:00:00Z')
    expect(formatDayDivider('2026-09-15')).toBe('Today')
  })

  it('labels the day before "Yesterday"', () => {
    freezeAt('2026-09-15T10:00:00Z')
    expect(formatDayDivider('2026-09-14')).toBe('Yesterday')
  })

  it('spells out anything older as a full weekday and date', () => {
    freezeAt('2026-09-15T10:00:00Z')
    expect(formatDayDivider('2026-09-01')).toBe('Tuesday, 1 Sept 2026')
  })

  it('crosses a month/year boundary for "Yesterday" correctly', () => {
    freezeAt('2026-01-01T10:00:00Z')
    expect(formatDayDivider('2025-12-31')).toBe('Yesterday')
  })
})
