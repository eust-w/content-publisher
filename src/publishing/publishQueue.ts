import {
  buildPublishPackages,
  platformCapabilities,
  type ContentDraft,
  type PlatformId,
} from '../domain/publishPlan'
import { checkPlatformCredentials } from './credentials'
import { createPlatformAdapters } from './platformAdapters'
import type {
  AssetLoader,
  EnvMap,
  FetchClient,
  PlatformAdapter,
  PublishQueueJob,
  PublishResult,
} from './types'

export interface RunPublishQueueOptions {
  credentials: EnvMap
  dryRun?: boolean
  assetLoader?: AssetLoader
  mediaRoot?: string
  client?: FetchClient
  adapters?: Partial<Record<PlatformId, PlatformAdapter>>
}

export function buildPublishQueue(draft: ContentDraft, env: EnvMap): PublishQueueJob[] {
  return buildPublishPackages(draft).map((publishPackage) => {
    const credentialCheck = checkPlatformCredentials(publishPackage.platform, env)
    const capability = platformCapabilities[publishPackage.platform]
    const blockingReasons = [
      ...publishPackage.issues,
      ...credentialCheck.missing.map((item) => `Missing ${item.key}.`),
    ]

    if (!publishPackage.ready) {
      return {
        id: `${draft.id}:${publishPackage.platform}`,
        platform: publishPackage.platform,
        package: publishPackage,
        status: 'blocked',
        blockingReasons,
      }
    }

    if (publishPackage.platform === 'xhs') {
      return {
        id: `${draft.id}:${publishPackage.platform}`,
        platform: publishPackage.platform,
        package: publishPackage,
        status: 'manual_action_required',
        blockingReasons: [],
      }
    }

    if (!credentialCheck.ready) {
      return {
        id: `${draft.id}:${publishPackage.platform}`,
        platform: publishPackage.platform,
        package: publishPackage,
        status: 'blocked',
        blockingReasons,
      }
    }

    if (capability.publishMode === 'official_application' && !env.BILIBILI_UPLOAD_ENDPOINT) {
      return {
        id: `${draft.id}:${publishPackage.platform}`,
        platform: publishPackage.platform,
        package: publishPackage,
        status: 'blocked',
        blockingReasons: [
          ...blockingReasons,
          `${capability.label} requires approved Open Platform upload capability.`,
        ],
      }
    }

    return {
      id: `${draft.id}:${publishPackage.platform}`,
      platform: publishPackage.platform,
      package: publishPackage,
      status: 'queued',
      blockingReasons,
    }
  })
}

export async function runPublishQueue(
  draft: ContentDraft,
  jobs: PublishQueueJob[],
  options: RunPublishQueueOptions,
): Promise<PublishResult[]> {
  const adapters = {
    ...createPlatformAdapters(options.client),
    ...options.adapters,
  }
  const assetLoader = options.assetLoader ?? missingAssetLoader
  const results: PublishResult[] = []

  for (const job of jobs) {
    const adapter = adapters[job.platform]

    if (job.status === 'blocked') {
      results.push({
        platform: job.platform,
        status: 'blocked',
        message: job.blockingReasons.join(' '),
      })
      continue
    }

    try {
      results.push(
        await adapter.publish({
          draft,
          package: job.package,
          credentials: options.credentials,
          assetLoader,
          dryRun: options.dryRun,
          mediaRoot: options.mediaRoot,
        }),
      )
    } catch (error) {
      results.push({
        platform: job.platform,
        status: 'failed',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return results
}

const missingAssetLoader: AssetLoader = async (asset) => {
  throw new Error(`No asset loader configured for ${asset.name}.`)
}
