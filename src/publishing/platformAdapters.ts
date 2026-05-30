import type { ContentAsset, PlatformId } from '../domain/publishPlan'
import type {
  AssetLoader,
  AssetPayload,
  EnvMap,
  FetchClient,
  PlatformAdapter,
  PublishAdapterInput,
  PublishResult,
} from './types'

const defaultClient: FetchClient = {
  fetch: (input, init) => fetch(input, init),
}

export function createXAdapter(client: FetchClient = defaultClient): PlatformAdapter {
  return {
    platform: 'x',
    mode: 'official_api',
    liveSupported: true,
    async publish(input) {
      if (input.dryRun) {
        return dryRunResult('x', 'X post is ready for official API publishing.')
      }

      const token = requireCredential(input.credentials, 'X_USER_ACCESS_TOKEN')
      const mediaIds = await uploadXMedia(input, client, token)
      const body = {
        text: input.package.copy,
        ...(mediaIds.length > 0 ? { media: { media_ids: mediaIds } } : {}),
      }
      const response = await client.fetch('https://api.x.com/2/tweets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      const payload = await readJsonResponse(response, 'X post create failed')
      const externalId = readNestedString(payload, ['data', 'id'])

      return {
        platform: 'x',
        status: 'published',
        message: 'Published to X.',
        externalId,
        url: externalId ? `https://x.com/i/web/status/${externalId}` : undefined,
        mediaIds,
        raw: payload,
      }
    },
  }
}

export function createYouTubeAdapter(client: FetchClient = defaultClient): PlatformAdapter {
  return {
    platform: 'youtube',
    mode: 'official_api',
    liveSupported: true,
    async publish(input) {
      if (input.dryRun) {
        return dryRunResult('youtube', 'YouTube video is ready for resumable upload.')
      }

      const token = requireCredential(input.credentials, 'YOUTUBE_ACCESS_TOKEN')
      const video = findFirstAsset(input.package.assets, 'video')

      if (!video) {
        return blockedResult('youtube', 'YouTube publishing requires a video asset.')
      }

      const payload = await input.assetLoader(video, input.mediaRoot)
      const metadata = {
        snippet: {
          title: input.package.title,
          description: input.package.copy,
          tags: input.package.tags,
          categoryId: input.credentials.YOUTUBE_CATEGORY_ID || '22',
        },
        status: {
          privacyStatus: input.credentials.YOUTUBE_PRIVACY_STATUS || 'private',
        },
      }
      const initResponse = await client.fetch(
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet%2Cstatus',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Type': payload.mimeType,
            'X-Upload-Content-Length': String(payload.bytes.byteLength),
          },
          body: JSON.stringify(metadata),
        },
      )

      if (!initResponse.ok) {
        throw new Error(await readErrorMessage(initResponse, 'YouTube upload session failed'))
      }

      const uploadUrl = initResponse.headers.get('Location')

      if (!uploadUrl) {
        throw new Error('YouTube did not return a resumable upload URL.')
      }

      const uploadResponse = await client.fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': payload.mimeType,
        },
        body: bytesAsBlob(payload),
      })
      const uploadPayload = await readJsonResponse(uploadResponse, 'YouTube video upload failed')
      const externalId = readNestedString(uploadPayload, ['id'])

      return {
        platform: 'youtube',
        status: 'published',
        message: 'Uploaded to YouTube.',
        externalId,
        url: externalId ? `https://www.youtube.com/watch?v=${externalId}` : undefined,
        raw: uploadPayload,
      }
    },
  }
}

export function createDouyinAdapter(client: FetchClient = defaultClient): PlatformAdapter {
  return {
    platform: 'douyin',
    mode: 'official_plus_confirm',
    liveSupported: true,
    async publish(input) {
      if (input.dryRun) {
        return dryRunResult('douyin', 'Douyin video is ready for official upload and review.')
      }

      const token = requireCredential(input.credentials, 'DOUYIN_ACCESS_TOKEN')
      const openId = requireCredential(input.credentials, 'DOUYIN_OPEN_ID')
      const video = findFirstAsset(input.package.assets, 'video')

      if (!video) {
        return blockedResult('douyin', 'Douyin video publishing requires a video asset.')
      }

      const payload = await input.assetLoader(video, input.mediaRoot)
      const uploadForm = new FormData()
      uploadForm.append('video', bytesAsBlob(payload), payload.filename)

      const uploadResponse = await client.fetch(
        `https://open.douyin.com/api/douyin/v1/video/upload_video/?open_id=${encodeURIComponent(
          openId,
        )}`,
        {
          method: 'POST',
          headers: {
            'access-token': token,
          },
          body: uploadForm,
        },
      )
      const uploadPayload = await readJsonResponse(uploadResponse, 'Douyin video upload failed')
      const videoId = readNestedString(uploadPayload, ['data', 'video', 'video_id'])

      if (!videoId) {
        throw new Error('Douyin upload response did not include data.video.video_id.')
      }

      const createResponse = await client.fetch(
        `https://open.douyin.com/api/douyin/v1/video/create_video/?open_id=${encodeURIComponent(
          openId,
        )}`,
        {
          method: 'POST',
          headers: {
            'access-token': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            video_id: videoId,
            text: input.package.copy,
          }),
        },
      )
      const createPayload = await readJsonResponse(createResponse, 'Douyin video create failed')
      const externalId =
        readNestedString(createPayload, ['data', 'item_id']) ??
        readNestedString(createPayload, ['data', 'video_id']) ??
        videoId

      return {
        platform: 'douyin',
        status: 'published',
        message: 'Submitted to Douyin; platform review may still be pending.',
        externalId,
        mediaIds: [videoId],
        confirmationRequired: true,
        raw: createPayload,
      }
    },
  }
}

export function createBilibiliAdapter(client: FetchClient = defaultClient): PlatformAdapter {
  return {
    platform: 'bilibili',
    mode: 'official_application',
    liveSupported: true,
    async publish(input) {
      if (input.dryRun) {
        return dryRunResult('bilibili', 'Bilibili package is ready after official app approval.')
      }

      const token = input.credentials.BILIBILI_ACCESS_TOKEN
      const endpoint = input.credentials.BILIBILI_UPLOAD_ENDPOINT

      if (!token || !endpoint) {
        return blockedResult(
          'bilibili',
          'Bilibili live publishing needs approved Open Platform upload credentials first.',
        )
      }

      const response = await client.fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: input.package.title,
          copy: input.package.copy,
          tags: input.package.tags,
          assets: input.package.assets,
        }),
      })
      const payload = await readJsonResponse(response, 'Bilibili upload handoff failed')
      const externalId =
        readNestedString(payload, ['data', 'aid']) ??
        readNestedString(payload, ['data', 'bvid']) ??
        readNestedString(payload, ['id'])

      return {
        platform: 'bilibili',
        status: 'published',
        message: 'Submitted to Bilibili through the configured approved endpoint.',
        externalId,
        raw: payload,
      }
    },
  }
}

export function createManualXhsAdapter(): PlatformAdapter {
  return {
    platform: 'xhs',
    mode: 'manual_review',
    liveSupported: false,
    async publish(input) {
      return {
        platform: 'xhs',
        status: 'manual_action_required',
        message: 'Export this package and finish the Xiaohongshu post in the official app/share flow.',
        raw: {
          title: input.package.title,
          copy: input.package.copy,
          tags: input.package.tags,
          assets: input.package.assets,
        },
      }
    },
  }
}

export function createPlatformAdapters(client: FetchClient = defaultClient): Record<PlatformId, PlatformAdapter> {
  return {
    xhs: createManualXhsAdapter(),
    douyin: createDouyinAdapter(client),
    bilibili: createBilibiliAdapter(client),
    youtube: createYouTubeAdapter(client),
    x: createXAdapter(client),
  }
}

async function uploadXMedia(input: PublishAdapterInput, client: FetchClient, token: string) {
  const mediaIds: string[] = []

  for (const asset of input.package.assets) {
    if (asset.kind === 'image') {
      mediaIds.push(await uploadXImage(asset, input.assetLoader, input.mediaRoot, client, token))
    }

    if (asset.kind === 'video') {
      mediaIds.push(await uploadXVideo(asset, input.assetLoader, input.mediaRoot, client, token))
    }
  }

  return mediaIds
}

async function uploadXImage(
  asset: ContentAsset,
  assetLoader: AssetLoader,
  mediaRoot: string | undefined,
  client: FetchClient,
  token: string,
) {
  const payload = await assetLoader(asset, mediaRoot)
  const form = new FormData()
  form.append('media', bytesAsBlob(payload), payload.filename)
  form.append('media_category', 'tweet_image')
  form.append('media_type', payload.mimeType)
  form.append('shared', 'false')

  const response = await client.fetch('https://api.x.com/2/media/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  })
  const uploadPayload = await readJsonResponse(response, 'X image upload failed')
  const mediaId = readNestedString(uploadPayload, ['data', 'id'])

  if (!mediaId) {
    throw new Error('X image upload response did not include data.id.')
  }

  return mediaId
}

async function uploadXVideo(
  asset: ContentAsset,
  assetLoader: AssetLoader,
  mediaRoot: string | undefined,
  client: FetchClient,
  token: string,
) {
  const payload = await assetLoader(asset, mediaRoot)
  const initResponse = await client.fetch('https://api.x.com/2/media/upload/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      media_category: 'tweet_video',
      media_type: payload.mimeType,
      total_bytes: payload.bytes.byteLength,
      shared: false,
    }),
  })
  const initPayload = await readJsonResponse(initResponse, 'X video upload initialize failed')
  const mediaId = readNestedString(initPayload, ['data', 'id'])

  if (!mediaId) {
    throw new Error('X video initialize response did not include data.id.')
  }

  const appendForm = new FormData()
  appendForm.append('media', bytesAsBlob(payload), payload.filename)
  appendForm.append('segment_index', '0')

  const appendResponse = await client.fetch(
    `https://api.x.com/2/media/upload/${encodeURIComponent(mediaId)}/append`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: appendForm,
    },
  )

  if (!appendResponse.ok) {
    throw new Error(await readErrorMessage(appendResponse, 'X video upload append failed'))
  }

  const finalizeResponse = await client.fetch(
    `https://api.x.com/2/media/upload/${encodeURIComponent(mediaId)}/finalize`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )
  await readJsonResponse(finalizeResponse, 'X video upload finalize failed')

  return mediaId
}

function findFirstAsset(assets: ContentAsset[], kind: ContentAsset['kind']) {
  return assets.find((asset) => asset.kind === kind)
}

function requireCredential(credentials: EnvMap, key: string) {
  const value = credentials[key]

  if (!value?.trim()) {
    throw new Error(`Missing ${key}.`)
  }

  return value
}

function dryRunResult(platform: PlatformId, message: string): PublishResult {
  return {
    platform,
    status: 'dry_run',
    message,
  }
}

function blockedResult(platform: PlatformId, message: string): PublishResult {
  return {
    platform,
    status: 'blocked',
    message,
  }
}

function bytesAsBlob(payload: AssetPayload) {
  const buffer = new ArrayBuffer(payload.bytes.byteLength)
  new Uint8Array(buffer).set(payload.bytes)

  return new Blob([buffer], { type: payload.mimeType })
}

async function readJsonResponse(response: Response, fallback: string) {
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, fallback))
  }

  const text = await response.text()

  if (!text) {
    return {}
  }

  return JSON.parse(text) as unknown
}

async function readErrorMessage(response: Response, fallback: string) {
  const text = await response.text()

  if (!text) {
    return `${fallback}: HTTP ${response.status}`
  }

  return `${fallback}: HTTP ${response.status} ${text}`
}

function readNestedString(payload: unknown, path: string[]) {
  let current = payload

  for (const key of path) {
    if (!isRecord(current)) {
      return undefined
    }

    current = current[key]
  }

  return typeof current === 'string' || typeof current === 'number' ? String(current) : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
