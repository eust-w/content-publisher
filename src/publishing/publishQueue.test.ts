import { describe, expect, it } from 'vitest'
import type { ContentDraft } from '../domain/publishPlan'
import { buildPublishQueue, runPublishQueue } from './publishQueue'

const videoDraft: ContentDraft = {
  id: 'draft-video',
  title: '低成本自动发布测试',
  body: '这是一条用于验证发布队列的短视频内容。',
  kind: 'short_video',
  assets: [
    {
      id: 'video-1',
      kind: 'video',
      name: 'demo.mp4',
      path: 'fixtures/demo.mp4',
      mimeType: 'video/mp4',
      durationSeconds: 30,
      aspectRatio: '9:16',
    },
  ],
  hashtags: ['自动化', '发布'],
  selectedPlatforms: ['youtube', 'x', 'douyin', 'bilibili', 'xhs'],
  status: 'ready',
}

describe('buildPublishQueue', () => {
  it('creates a job per selected platform with credential gating', () => {
    const jobs = buildPublishQueue(videoDraft, {
      X_USER_ACCESS_TOKEN: 'x-token',
      YOUTUBE_ACCESS_TOKEN: 'youtube-token',
    })

    expect(jobs.map((job) => [job.platform, job.status])).toEqual([
      ['youtube', 'queued'],
      ['x', 'queued'],
      ['douyin', 'blocked'],
      ['bilibili', 'blocked'],
      ['xhs', 'manual_action_required'],
    ])
    expect(jobs.find((job) => job.platform === 'douyin')?.blockingReasons).toContain(
      'Missing DOUYIN_ACCESS_TOKEN.',
    )
  })
})

describe('runPublishQueue', () => {
  it('dry-runs queued jobs without calling live platform APIs', async () => {
    const jobs = buildPublishQueue(videoDraft, {
      X_USER_ACCESS_TOKEN: 'x-token',
      YOUTUBE_ACCESS_TOKEN: 'youtube-token',
    })

    const results = await runPublishQueue(videoDraft, jobs, {
      credentials: {
        X_USER_ACCESS_TOKEN: 'x-token',
        YOUTUBE_ACCESS_TOKEN: 'youtube-token',
      },
      dryRun: true,
    })

    expect(results.filter((result) => result.status === 'dry_run')).toHaveLength(2)
    expect(results.find((result) => result.platform === 'xhs')).toMatchObject({
      status: 'manual_action_required',
    })
    expect(results.find((result) => result.platform === 'douyin')).toMatchObject({
      status: 'blocked',
    })
  })
})
