import type {
  ContentAsset,
  ContentDraft,
  PlatformId,
  PublishMode,
  PublishPackage,
} from '../domain/publishPlan'

export type EnvMap = Record<string, string | undefined>

export interface CredentialRequirement {
  key: string
  label: string
  sensitive: boolean
  help: string
}

export interface CredentialCheck {
  platform: PlatformId
  ready: boolean
  missing: CredentialRequirement[]
  provided: string[]
  notes: string[]
}

export interface AssetPayload {
  bytes: Uint8Array
  filename: string
  mimeType: string
}

export type AssetLoader = (asset: ContentAsset, mediaRoot?: string) => Promise<AssetPayload>

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export interface FetchClient {
  fetch: FetchLike
}

export type PublishResultStatus =
  | 'published'
  | 'queued'
  | 'manual_action_required'
  | 'blocked'
  | 'failed'
  | 'dry_run'

export interface PublishResult {
  platform: PlatformId
  status: PublishResultStatus
  message: string
  externalId?: string
  url?: string
  mediaIds?: string[]
  confirmationRequired?: boolean
  raw?: unknown
}

export interface PublishAdapterInput {
  draft: ContentDraft
  package: PublishPackage
  credentials: EnvMap
  assetLoader: AssetLoader
  dryRun?: boolean
  mediaRoot?: string
}

export interface PlatformAdapter {
  platform: PlatformId
  mode: PublishMode
  liveSupported: boolean
  publish(input: PublishAdapterInput): Promise<PublishResult>
}

export type PublishJobStatus = 'queued' | 'blocked' | 'manual_action_required'

export interface PublishQueueJob {
  id: string
  platform: PlatformId
  package: PublishPackage
  status: PublishJobStatus
  blockingReasons: string[]
}
