export const COLORS = ['#FF6B6B', '#FF9A3C', '#FFD93D', '#6BCB77', '#00C9A7', '#4D96FF', '#C77DFF', '#FF6FD8', '#F72585', '#4CC9F0']
export const COLORS2 = ['#FF9A3C', '#FFD93D', '#6BCB77', '#00C9A7', '#4D96FF', '#C77DFF', '#FF6FD8', '#F72585', '#4CC9F0', '#FF6B6B']
export const EMOJIS = ['🦊', '🐸', '🦄', '🐳', '🦋', '🚀', '⭐', '🌈', '🍕', '🎮']

/** Fake email domain used for Firebase Auth (username@matte.kort). */
export const FAKE_EMAIL_DOMAIN = 'matte.kort'

/** Build a fake email from a username for Firebase Auth. */
export function fakeEmail(username: string): string {
  return `${username}@${FAKE_EMAIL_DOMAIN}`
}

/** Extract username from fake email (username@matte.kort). */
export function emailToUsername(email: string | null | undefined): string | null {
  if (!email?.endsWith(`@${FAKE_EMAIL_DOMAIN}`)) return null
  return email.slice(0, -(FAKE_EMAIL_DOMAIN.length + 1))
}

export type Operation = 'multiply' | 'add' | 'subtract'

export interface CategoryDef {
  id: number
  operation: Operation
  label: string
  emoji: string
  color: string
  color2: string
  generateEquations?: () => Array<{ a: number; b: number }>
}

export const TEN_FRIENDS_CATEGORY_ID = 12

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// --- Plus categories ---

const TIOKOMPISAR_POOL: Array<{ a: number; b: number }> = [
  { a: 1, b: 9 }, { a: 2, b: 8 }, { a: 3, b: 7 }, { a: 4, b: 6 }, { a: 5, b: 5 },
  { a: 6, b: 4 }, { a: 7, b: 3 }, { a: 8, b: 2 }, { a: 9, b: 1 }, { a: 0, b: 10 },
]

const DUBBELKOMPISAR_POOL: Array<{ a: number; b: number }> = Array.from(
  { length: 10 },
  (_, i) => ({ a: i + 1, b: i + 1 }),
)

const PLUS_TILL_20_POOL: Array<{ a: number; b: number }> = [
  { a: 3, b: 7 }, { a: 4, b: 8 }, { a: 5, b: 9 }, { a: 6, b: 7 }, { a: 7, b: 8 },
  { a: 8, b: 9 }, { a: 9, b: 9 }, { a: 6, b: 9 }, { a: 7, b: 7 }, { a: 5, b: 8 },
  { a: 4, b: 9 }, { a: 9, b: 6 }, { a: 8, b: 7 }, { a: 7, b: 6 }, { a: 6, b: 8 },
  { a: 9, b: 4 }, { a: 8, b: 5 }, { a: 7, b: 9 }, { a: 9, b: 8 }, { a: 6, b: 6 },
  { a: 5, b: 6 }, { a: 4, b: 7 }, { a: 3, b: 9 },
]

const LATT_HUNDRA_POOL: Array<{ a: number; b: number }> = [
  // Pure round hundreds
  { a: 100, b: 200 }, { a: 300, b: 400 }, { a: 200, b: 500 },
  { a: 100, b: 300 }, { a: 400, b: 500 }, { a: 200, b: 300 },
  { a: 100, b: 400 }, { a: 200, b: 400 }, { a: 100, b: 500 },
  { a: 300, b: 300 },
  // Same-base
  { a: 120, b: 120 }, { a: 150, b: 150 }, { a: 130, b: 130 },
  { a: 140, b: 140 }, { a: 110, b: 110 }, { a: 160, b: 160 },
  { a: 125, b: 125 },
  // Mixed
  { a: 100, b: 45 }, { a: 230, b: 140 }, { a: 120, b: 55 },
  { a: 150, b: 30 }, { a: 200, b: 75 }, { a: 140, b: 160 },
  { a: 110, b: 90 }, { a: 250, b: 150 }, { a: 120, b: 80 },
  { a: 300, b: 150 },
]

// --- Minus categories ---

const MINUSKOMPISAR_POOL: Array<{ a: number; b: number }> = [
  { a: 10, b: 1 }, { a: 10, b: 2 }, { a: 10, b: 3 }, { a: 10, b: 4 }, { a: 10, b: 5 },
  { a: 10, b: 6 }, { a: 10, b: 7 }, { a: 10, b: 8 }, { a: 10, b: 9 }, { a: 10, b: 10 },
]

const MINUS_INOM_20_POOL: Array<{ a: number; b: number }> = [
  { a: 15, b: 7 }, { a: 12, b: 5 }, { a: 18, b: 9 }, { a: 14, b: 6 }, { a: 16, b: 7 },
  { a: 13, b: 4 }, { a: 11, b: 5 }, { a: 17, b: 8 }, { a: 20, b: 9 }, { a: 19, b: 7 },
  { a: 15, b: 8 }, { a: 12, b: 4 }, { a: 14, b: 7 }, { a: 18, b: 6 }, { a: 16, b: 9 },
  { a: 13, b: 5 }, { a: 20, b: 6 }, { a: 17, b: 9 }, { a: 15, b: 6 }, { a: 12, b: 7 },
  { a: 14, b: 9 }, { a: 11, b: 4 }, { a: 13, b: 6 }, { a: 16, b: 8 }, { a: 18, b: 7 },
]

const LATT_HUNDRA_MINUS_POOL: Array<{ a: number; b: number }> = [
  { a: 300, b: 100 }, { a: 500, b: 200 }, { a: 400, b: 300 }, { a: 700, b: 400 },
  { a: 800, b: 500 }, { a: 600, b: 200 }, { a: 900, b: 400 }, { a: 500, b: 300 },
  { a: 700, b: 300 }, { a: 600, b: 400 }, { a: 450, b: 150 }, { a: 380, b: 130 },
  { a: 520, b: 220 }, { a: 750, b: 250 }, { a: 640, b: 240 }, { a: 300, b: 150 },
  { a: 480, b: 230 }, { a: 360, b: 160 }, { a: 550, b: 300 }, { a: 270, b: 120 },
  { a: 430, b: 180 }, { a: 350, b: 200 }, { a: 420, b: 170 },
]

export const PLUS_CATEGORIES: CategoryDef[] = [
  {
    id: TEN_FRIENDS_CATEGORY_ID,
    operation: 'add',
    label: 'Tiokompisar',
    emoji: '🔟',
    color: '#00C9A7',
    color2: '#4CC9F0',
    generateEquations: () => shuffle(TIOKOMPISAR_POOL).slice(0, 10),
  },
  {
    id: 14,
    operation: 'add',
    label: 'Dubbelkompisar',
    emoji: '🔢',
    color: '#4D96FF',
    color2: '#C77DFF',
    generateEquations: () => shuffle(DUBBELKOMPISAR_POOL).slice(0, 10),
  },
  {
    id: 13,
    operation: 'add',
    label: 'Plus till 20',
    emoji: '🌟',
    color: '#4CC9F0',
    color2: '#4D96FF',
    generateEquations: () => shuffle(PLUS_TILL_20_POOL).slice(0, 10),
  },
  {
    id: 11,
    operation: 'add',
    label: 'Lätt hundra',
    emoji: '💯',
    color: '#6BCB77',
    color2: '#00C9A7',
    generateEquations: () => shuffle(LATT_HUNDRA_POOL).slice(0, 10),
  },
]

export const MINUS_CATEGORIES: CategoryDef[] = [
  {
    id: 21,
    operation: 'subtract',
    label: 'Minuskompisar till 10',
    emoji: '🎯',
    color: '#C77DFF',
    color2: '#FF6FD8',
    generateEquations: () => shuffle(MINUSKOMPISAR_POOL).slice(0, 10),
  },
  {
    id: 22,
    operation: 'subtract',
    label: 'Minus inom 20',
    emoji: '🔮',
    color: '#FF6FD8',
    color2: '#F72585',
    generateEquations: () => shuffle(MINUS_INOM_20_POOL).slice(0, 10),
  },
  {
    id: 23,
    operation: 'subtract',
    label: 'Lätt hundra minus',
    emoji: '💫',
    color: '#F72585',
    color2: '#C77DFF',
    generateEquations: () => shuffle(LATT_HUNDRA_MINUS_POOL).slice(0, 10),
  },
]

export const MULTIPLY_CATEGORIES: CategoryDef[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  operation: 'multiply' as Operation,
  label: `${i + 1}:ans tabell`,
  emoji: EMOJIS[i],
  color: COLORS[i],
  color2: COLORS2[i],
}))

export const ALL_CATEGORIES: CategoryDef[] = [
  ...MULTIPLY_CATEGORIES,
  ...PLUS_CATEGORIES,
  ...MINUS_CATEGORIES,
]

export function getCategoryDef(id: number): CategoryDef | undefined {
  return ALL_CATEGORIES.find(c => c.id === id)
}
