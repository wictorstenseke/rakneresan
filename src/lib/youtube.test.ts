import { describe, it, expect } from 'vitest'
import { REWARD_VIDEO_IDS, pickRandomVideoId, buildEmbedUrl } from './youtube'

describe('pickRandomVideoId', () => {
  it('returns a string from REWARD_VIDEO_IDS', () => {
    const id = pickRandomVideoId()
    expect(REWARD_VIDEO_IDS).toContain(id)
  })

  it('returns valid IDs from the array', () => {
    for (let i = 0; i < 20; i++) {
      const id = pickRandomVideoId()
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    }
  })
})

describe('buildEmbedUrl', () => {
  it('returns URL with youtube-nocookie.com and embed path', () => {
    const url = buildEmbedUrl('dQw4w9WgXcQ')
    expect(url).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
  })

  it('includes expected query params', () => {
    const url = buildEmbedUrl('abc123')
    expect(url).toContain('rel=0')
    expect(url).toContain('autoplay=1')
    expect(url).toContain('modestbranding=1')
    expect(url).toContain('enablejsapi=1')
  })

  it('includes origin from window.location.origin when in browser', () => {
    const url = buildEmbedUrl('testId')
    expect(url).toContain('origin=')
    expect(url).toContain(encodeURIComponent(window.location.origin))
  })
})
