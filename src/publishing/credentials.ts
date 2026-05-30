import { platformOrder, platformCapabilities, type PlatformId } from '../domain/publishPlan'
import type { CredentialCheck, CredentialRequirement, EnvMap } from './types'

export const credentialRequirements: Record<PlatformId, CredentialRequirement[]> = {
  xhs: [],
  douyin: [
    {
      key: 'DOUYIN_ACCESS_TOKEN',
      label: 'Douyin access token',
      sensitive: true,
      help: 'OAuth token for a Douyin account that granted video.create.bind.',
    },
    {
      key: 'DOUYIN_OPEN_ID',
      label: 'Douyin open_id',
      sensitive: false,
      help: 'The authorized account open_id returned with the Douyin access token.',
    },
  ],
  bilibili: [
    {
      key: 'BILIBILI_ACCESS_TOKEN',
      label: 'Bilibili access token',
      sensitive: true,
      help: 'Authorized account token from the approved Bilibili Open Platform app.',
    },
    {
      key: 'BILIBILI_UPLOAD_ENDPOINT',
      label: 'Bilibili upload endpoint',
      sensitive: false,
      help: 'Approved upload/create endpoint from the Bilibili app capability package.',
    },
  ],
  youtube: [
    {
      key: 'YOUTUBE_ACCESS_TOKEN',
      label: 'YouTube access token',
      sensitive: true,
      help: 'OAuth access token with the youtube.upload scope.',
    },
  ],
  x: [
    {
      key: 'X_USER_ACCESS_TOKEN',
      label: 'X user access token',
      sensitive: true,
      help: 'OAuth user token for an approved X developer app with post/media write access.',
    },
  ],
}

export function checkPlatformCredentials(platform: PlatformId, env: EnvMap): CredentialCheck {
  const requirements = credentialRequirements[platform]
  const missing = requirements.filter((item) => !env[item.key]?.trim())
  const provided = requirements.filter((item) => env[item.key]?.trim()).map((item) => item.key)
  const capability = platformCapabilities[platform]
  const notes: string[] = []

  if (platform === 'xhs') {
    notes.push('Xiaohongshu is handled as a manual/share-SDK package, not a server-side secret.')
  }

  if (capability.publishMode === 'official_application') {
    notes.push(`${capability.label} requires platform approval before live upload testing.`)
  }

  return {
    platform,
    ready: missing.length === 0,
    missing,
    provided,
    notes,
  }
}

export function summarizeCredentialReadiness(env: EnvMap): CredentialCheck[] {
  return platformOrder.map((platform) => checkPlatformCredentials(platform, env))
}
