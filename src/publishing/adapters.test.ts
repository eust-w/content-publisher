import { describe, expect, it, vi } from 'vitest'
import type { ContentDraft } from '../domain/publishPlan'
import { buildPublishPackages } from '../domain/publishPlan'
import {
  createBilibiliAdapter,
  createDouyinAdapter,
  createManualXhsAdapter,
  createXAdapter,
  createYouTubeAdapter,
} from './platformAdapters'
import type { AssetLoader, FetchLike } from './types'

const textDraft: ContentDraft = {
  id: 'draft-text',
  title: '产品更新一句话',
  body: '今天发布一个自动化能力更新。',
  kind: 'text',
  assets: [],
  hashtags: ['产品更新'],
  selectedPlatforms: ['x'],
  status: 'ready',
}

const videoDraft: ContentDraft = {
  id: 'draft-video',
  title: '短视频自动发布测试',
  body: '这条视频用于验证上传和发布流程。',
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
  hashtags: ['自动化'],
  selectedPlatforms: ['youtube', 'douyin'],
  status: 'ready',
}

const assetLoader: AssetLoader = async (asset) => ({
  bytes: new Uint8Array([1, 2, 3]),
  filename: asset.name,
  mimeType: asset.mimeType ?? 'application/octet-stream',
})

function packageFor(draft: ContentDraft, platform: ContentDraft['selectedPlatforms'][number]) {
  const publishPackage = buildPublishPackages({
    ...draft,
    selectedPlatforms: [platform],
  })[0]

  if (!publishPackage) {
    throw new Error(`No package for ${platform}`)
  }

  return publishPackage
}

describe('X adapter', () => {
  it('creates a text post with the authenticated user token', async () => {
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'post-1', text: textDraft.body } }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    )
    const adapter = createXAdapter({ fetch: fetchMock })

    const result = await adapter.publish({
      draft: textDraft,
      package: packageFor(textDraft, 'x'),
      credentials: { X_USER_ACCESS_TOKEN: 'x-token' },
      assetLoader,
    })

    expect(result).toMatchObject({
      platform: 'x',
      status: 'published',
      externalId: 'post-1',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.x.com/2/tweets',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer x-token',
          'Content-Type': 'application/json',
        }),
      }),
    )
  })
})

describe('YouTube adapter', () => {
  it('starts a resumable upload and sends the video bytes', async () => {
    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: { Location: 'https://upload.youtube.test/session-1' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'yt-video-1' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
    const adapter = createYouTubeAdapter({ fetch: fetchMock })

    const result = await adapter.publish({
      draft: videoDraft,
      package: packageFor(videoDraft, 'youtube'),
      credentials: { YOUTUBE_ACCESS_TOKEN: 'youtube-token' },
      assetLoader,
    })

    expect(result).toMatchObject({
      platform: 'youtube',
      status: 'published',
      externalId: 'yt-video-1',
    })
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('https://www.googleapis.com/upload/youtube/v3/videos'),
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://upload.youtube.test/session-1',
      expect.objectContaining({ method: 'PUT' }),
    )
  })
})

describe('Douyin adapter', () => {
  it('uploads media first and then creates a video post', async () => {
    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { video: { video_id: 'douyin-video-1' } } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { item_id: 'douyin-item-1', error_code: 0 } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
    const adapter = createDouyinAdapter({ fetch: fetchMock })

    const result = await adapter.publish({
      draft: videoDraft,
      package: packageFor(videoDraft, 'douyin'),
      credentials: {
        DOUYIN_ACCESS_TOKEN: 'douyin-token',
        DOUYIN_OPEN_ID: 'open-id',
      },
      assetLoader,
    })

    expect(result).toMatchObject({
      platform: 'douyin',
      status: 'published',
      externalId: 'douyin-item-1',
      confirmationRequired: true,
    })
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/upload_video/?open_id=open-id'),
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/create_video/?open_id=open-id'),
      expect.objectContaining({ method: 'POST' }),
    )
  })
})

describe('manual and application-required adapters', () => {
  it('returns a Xiaohongshu manual action package instead of pretending to post', async () => {
    const adapter = createManualXhsAdapter()

    const result = await adapter.publish({
      draft: videoDraft,
      package: packageFor({ ...videoDraft, selectedPlatforms: ['xhs'] }, 'xhs'),
      credentials: {},
      assetLoader,
    })

    expect(result).toMatchObject({
      platform: 'xhs',
      status: 'manual_action_required',
    })
  })

  it('blocks Bilibili until official application credentials are approved', async () => {
    const adapter = createBilibiliAdapter()

    const result = await adapter.publish({
      draft: videoDraft,
      package: packageFor({ ...videoDraft, selectedPlatforms: ['bilibili'] }, 'bilibili'),
      credentials: {},
      assetLoader,
    })

    expect(result).toMatchObject({
      platform: 'bilibili',
      status: 'blocked',
    })
  })
})
