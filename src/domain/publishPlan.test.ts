import { describe, expect, it } from 'vitest'
import {
  buildPublishPackages,
  platformCapabilities,
  summarizeQueue,
  validateDraftForPlatform,
  type ContentDraft,
} from './publishPlan'

const baseDraft: ContentDraft = {
  id: 'draft-short-001',
  title: '机器人流程自动化周报',
  body: '本周重点：低成本内容中台、素材复用、平台差异化标题。',
  kind: 'short_video',
  assets: [
    {
      id: 'asset-video-001',
      kind: 'video',
      name: 'weekly-demo.mp4',
      durationSeconds: 42,
      aspectRatio: '9:16',
    },
    {
      id: 'asset-cover-001',
      kind: 'image',
      name: 'cover.png',
      aspectRatio: '3:4',
    },
  ],
  hashtags: ['自动化', '内容运营'],
  selectedPlatforms: ['xhs', 'douyin', 'bilibili', 'youtube', 'x'],
  status: 'ready',
}

describe('platformCapabilities', () => {
  it('marks public-api platforms separately from manual-review platforms', () => {
    expect(platformCapabilities.youtube.publishMode).toBe('official_api')
    expect(platformCapabilities.x.publishMode).toBe('official_api')
    expect(platformCapabilities.xhs.publishMode).toBe('manual_review')
    expect(platformCapabilities.douyin.publishMode).toBe('official_plus_confirm')
  })
})

describe('validateDraftForPlatform', () => {
  it('requires video assets for video-first platforms', () => {
    const textOnlyDraft: ContentDraft = {
      ...baseDraft,
      kind: 'text',
      assets: [],
      selectedPlatforms: ['youtube'],
    }

    expect(validateDraftForPlatform(textOnlyDraft, 'youtube')).toEqual({
      platform: 'youtube',
      ok: false,
      issues: ['YouTube requires a video asset.'],
    })
  })

  it('accepts a short-video draft for YouTube Shorts package generation', () => {
    expect(validateDraftForPlatform(baseDraft, 'youtube')).toEqual({
      platform: 'youtube',
      ok: true,
      issues: [],
    })
  })
})

describe('buildPublishPackages', () => {
  it('creates package steps that keep risky platforms manual and API platforms automatable', () => {
    const packages = buildPublishPackages(baseDraft)

    expect(packages.map((item) => item.platform)).toEqual([
      'xhs',
      'douyin',
      'bilibili',
      'youtube',
      'x',
    ])
    expect(packages.find((item) => item.platform === 'xhs')).toMatchObject({
      mode: 'manual_review',
      nextAction: 'Export copy, cover, tags, and media for manual posting.',
      ready: true,
    })
    expect(packages.find((item) => item.platform === 'youtube')).toMatchObject({
      mode: 'official_api',
      nextAction: 'Queue for OAuth-backed official API publishing.',
      ready: true,
    })
  })
})

describe('summarizeQueue', () => {
  it('counts publish readiness across selected platforms', () => {
    const summary = summarizeQueue([baseDraft])

    expect(summary).toEqual({
      drafts: 1,
      platformPackages: 5,
      ready: 5,
      needsReview: 2,
      automatable: 2,
    })
  })
})
