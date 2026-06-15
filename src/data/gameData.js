export const POINT_VALUES = [200, 400, 600, 800, 1000]

const CATEGORY_COUNT = 6
const CLUE_COUNT = 5

const EMPTY_CLUE = { answer: '', question: '', mediaUrl: '', imageUrl: '', used: false }

export const DEFAULT_CATEGORIES = Array.from({ length: CATEGORY_COUNT }, (_, i) => ({
  name: `Category ${i + 1}`,
  clues: Array.from({ length: CLUE_COUNT }, () => ({ ...EMPTY_CLUE })),
}))

export function cloneDefaultCategories() {
  return JSON.parse(JSON.stringify(DEFAULT_CATEGORIES))
}