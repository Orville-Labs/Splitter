/** Date-range presets shared by the analytics filter and the balance breakdown. */

/**
 * ISO `YYYY-MM-DD` from a Date's **local** calendar fields.
 *
 * Deliberately not `toISOString().slice(0, 10)`, which converts to UTC
 * first. Every date in this app is a calendar date, not a timestamp, so at
 * any UTC+ offset the UTC round-trip lands on the previous day: at IST it
 * would stamp late-night expenses with yesterday, and make the "This
 * month" preset start on the last day of the previous month.
 */
function toIso(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Today as `YYYY-MM-DD`, in the user's own timezone. */
export function today(): string {
  return toIso(new Date())
}

/**
 * Inclusive range test. Works on ISO date strings, which compare correctly
 * lexicographically. Empty bounds mean "unbounded on that side".
 */
export function isWithinRange(date: string, from: string, to: string): boolean {
  if (from && date < from) return false
  if (to && date > to) return false
  return true
}

/**
 * A human day-divider label for a grouped transaction feed — "Today"/
 * "Yesterday" for recency, otherwise a full weekday and date. `date`
 * is parsed as local calendar fields (`new Date(year, month, day)`),
 * never `new Date(isoString)` — the latter parses a bare
 * `YYYY-MM-DD` as UTC midnight, which at any positive UTC offset
 * (IST included) displays as the previous day.
 */
export function formatDayDivider(date: string): string {
  if (date === today()) return 'Today'

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (date === toIso(yesterday)) return 'Yesterday'

  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export type RangePresetKey = 'all' | 'today' | 'week' | 'month' | '30d' | 'custom'

export interface RangePreset {
  key: RangePresetKey
  label: string
}

/** The presets offered in both range pickers, in display order. */
export const RANGE_PRESETS: readonly RangePreset[] = Object.freeze([
  { key: 'all', label: 'All time' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: '7 days' },
  { key: 'month', label: 'This month' },
  { key: '30d', label: '30 days' },
  { key: 'custom', label: 'Custom' },
])

export interface DateBounds {
  from: string
  to: string
}

/**
 * Resolves a preset key to concrete bounds.
 * `all` and `custom` return empty bounds — the caller supplies those.
 */
export function resolvePreset(preset: RangePresetKey): DateBounds {
  const now = new Date()

  switch (preset) {
    case 'today':
      return { from: toIso(now), to: toIso(now) }
    case 'week': {
      const start = new Date(now)
      start.setDate(start.getDate() - 6)
      return { from: toIso(start), to: toIso(now) }
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: toIso(start), to: toIso(now) }
    }
    case '30d': {
      const start = new Date(now)
      start.setDate(start.getDate() - 29)
      return { from: toIso(start), to: toIso(now) }
    }
    default:
      return { from: '', to: '' }
  }
}
