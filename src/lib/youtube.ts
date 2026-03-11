/**
 * Curated YouTube video IDs used as rewards when a player clears all 10 cards.
 * Replace the placeholder IDs with real 11-character YouTube video IDs before deploying
 * (e.g. the ID in https://www.youtube.com/watch?v=dQw4w9WgXcQ is "dQw4w9WgXcQ").
 */
export const REWARD_VIDEO_IDS: string[] = [
  'Cj6ho1-G6tw',
  '_PYMhI06zQ0',
  'kqZ-h9iO-nI',
  'K_7k3fnxPq0',
  'Sv3xVOs7_No',
  'GL0rbxB9Lqg',
  'jIBldkWO9a4',
  'ulbYX-smndk',
  '-jDKJT2dDZQ',
  'UQ-F6BGQH6A',
  'i6i2er3H6LA',
  '12N6UmhCqtE',
  'H1lcNpjp0uY',
  'MdkPlK3keSA',
  'dC85QaN0hng',
  '5ud5T5I4XcA',
  '5jdDy5Kb8M8',
  'EqYgAX6D43Q',
  'DlYm_qa5RHg',
  'ZkeTM-HkqT4',
]

/** Returns a random video ID from the reward pool. */
export function pickRandomVideoId(): string {
  return REWARD_VIDEO_IDS[Math.floor(Math.random() * REWARD_VIDEO_IDS.length)]
}

/**
 * Builds a restricted YouTube embed URL.
 * Uses youtube-nocookie.com to reduce tracking.
 * Parameters limit related videos, disable annotations, and enable the IFrame API.
 */
export function buildEmbedUrl(videoId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    disablekb: '1',
    fs: '1',
    controls: '1',
    playsinline: '1',
    autoplay: '1',
    enablejsapi: '1',
    origin,
  })
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
}

/**
 * Fetches the title of a YouTube video via the public oEmbed API.
 * No API key required. Returns null on any failure.
 */
export async function fetchVideoTitle(videoId: string): Promise<string | null> {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&format=json`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json() as { title?: string }
    return data.title ?? null
  } catch {
    return null
  }
}
