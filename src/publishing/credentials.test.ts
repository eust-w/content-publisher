import { describe, expect, it } from 'vitest'
import {
  checkPlatformCredentials,
  credentialRequirements,
  summarizeCredentialReadiness,
} from './credentials'

describe('credential registry', () => {
  it('keeps Xiaohongshu manual publishing free of server-side secrets', () => {
    expect(credentialRequirements.xhs).toEqual([])
    expect(checkPlatformCredentials('xhs', {})).toMatchObject({
      platform: 'xhs',
      ready: true,
      missing: [],
    })
  })

  it('reports missing OAuth credentials without exposing secret values', () => {
    const check = checkPlatformCredentials('youtube', {})

    expect(check.ready).toBe(false)
    expect(check.missing.map((item) => item.key)).toEqual(['YOUTUBE_ACCESS_TOKEN'])
    expect(check.provided).toEqual([])
  })

  it('marks configured official API platforms as ready', () => {
    const summary = summarizeCredentialReadiness({
      X_USER_ACCESS_TOKEN: 'x-token',
      YOUTUBE_ACCESS_TOKEN: 'youtube-token',
      DOUYIN_ACCESS_TOKEN: 'douyin-token',
      DOUYIN_OPEN_ID: 'open-id',
    })

    expect(summary.find((item) => item.platform === 'x')).toMatchObject({ ready: true })
    expect(summary.find((item) => item.platform === 'youtube')).toMatchObject({ ready: true })
    expect(summary.find((item) => item.platform === 'douyin')).toMatchObject({ ready: true })
    expect(summary.find((item) => item.platform === 'bilibili')).toMatchObject({ ready: false })
  })
})
