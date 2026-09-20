import { DEFAULT_CATEGORIES } from '@/config/constants'
import { addCategories } from '@/data/categories.repository'
import { createSpace, type Space } from '@/data/spaces.repository'

/**
 * Creates a space and seeds it with the default categories — used by
 * both `useSpaces`'s auto-bootstrap (a brand-new user's first space) and
 * `useSpaceMutations`'s user-triggered "create another space", so the
 * "new space always starts with the default categories" rule lives in
 * exactly one place.
 */
export async function createSpaceWithDefaultCategories(
  ownerId: string,
  name: string,
  position: number,
): Promise<Space> {
  const space = await createSpace(ownerId, name, position)
  await addCategories(space.id, DEFAULT_CATEGORIES)
  return space
}
