/** Application-wide constants. No logic, no imports. Ported from the original app. */

/** Seeded into every newly created space. */
export const DEFAULT_CATEGORIES = Object.freeze([
  'Petrol',
  'Egg',
  'Banana',
  'Water',
  'Outside Food',
  'Entertainment',
  'Other',
])

export const ACTIVE_SPACE_STORAGE_KEY = 'spliterActiveSpaceId'

/** Most recent entries ever loaded into the "Recent entries" card. */
export const RECENT_ENTRY_LIMIT = 25

/** How many of those show before a "Show more" toggle reveals the rest. */
export const RECENT_ENTRIES_COLLAPSED_COUNT = 3

/** How many recorded settlements show before a "Show more" toggle reveals the rest — no hard ceiling beyond that, unlike RECENT_ENTRY_LIMIT. */
export const RECORDED_SETTLEMENTS_COLLAPSED_COUNT = 3

export const MAX_SPACE_NAME_LENGTH = 24
