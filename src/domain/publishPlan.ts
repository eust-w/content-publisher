export type PlatformId = 'xhs' | 'douyin' | 'bilibili' | 'youtube' | 'x'

export type ContentKind = 'text' | 'image' | 'image_text' | 'short_video' | 'long_video'

export type AssetKind = 'image' | 'video'

export type DraftStatus = 'draft' | 'ready' | 'needs_review' | 'published'

export type PublishMode =
  | 'official_api'
  | 'official_plus_confirm'
  | 'official_application'
  | 'manual_review'

export interface ContentAsset {
  id: string
  kind: AssetKind
  name: string
  durationSeconds?: number
  aspectRatio?: string
}

export interface ContentDraft {
  id: string
  title: string
  body: string
  kind: ContentKind
  assets: ContentAsset[]
  hashtags: string[]
  selectedPlatforms: PlatformId[]
  status: DraftStatus
}

export interface PlatformCapability {
  id: PlatformId
  label: string
  publishMode: PublishMode
  supports: ContentKind[]
  cost: 'free_quota' | 'low' | 'review_required'
  boundary: string
}

export interface PlatformValidation {
  platform: PlatformId
  ok: boolean
  issues: string[]
}

export interface PublishPackage {
  platform: PlatformId
  platformLabel: string
  mode: PublishMode
  ready: boolean
  issues: string[]
  title: string
  copy: string
  assets: ContentAsset[]
  tags: string[]
  nextAction: string
}

export interface QueueSummary {
  drafts: number
  platformPackages: number
  ready: number
  needsReview: number
  automatable: number
}

export const platformOrder: PlatformId[] = ['xhs', 'douyin', 'bilibili', 'youtube', 'x']

export const platformCapabilities: Record<PlatformId, PlatformCapability> = {
  xhs: {
    id: 'xhs',
    label: '小红书',
    publishMode: 'manual_review',
    supports: ['text', 'image', 'image_text', 'short_video'],
    cost: 'low',
    boundary: '先生成笔记发布包，由人工或手机端确认发布。',
  },
  douyin: {
    id: 'douyin',
    label: '抖音',
    publishMode: 'official_plus_confirm',
    supports: ['image_text', 'short_video'],
    cost: 'review_required',
    boundary: '优先走官方能力申请，保留用户确认发布步骤。',
  },
  bilibili: {
    id: 'bilibili',
    label: 'B站',
    publishMode: 'official_application',
    supports: ['short_video', 'long_video'],
    cost: 'review_required',
    boundary: '需要账号授权和开放平台能力申请后再接自动投稿。',
  },
  youtube: {
    id: 'youtube',
    label: 'YouTube',
    publishMode: 'official_api',
    supports: ['short_video', 'long_video'],
    cost: 'free_quota',
    boundary: '使用 YouTube Data API，受 OAuth 和每日配额控制。',
  },
  x: {
    id: 'x',
    label: 'X',
    publishMode: 'official_api',
    supports: ['text', 'image', 'image_text', 'short_video'],
    cost: 'low',
    boundary: '使用官方 API；媒体上传和月度额度需单独控制。',
  },
}

export const seedDrafts: ContentDraft[] = [
  {
    id: 'draft-001',
    title: '机器人流程自动化周报',
    body: '本周重点：用低成本内容中台统一管理素材、标题、标签和多平台发布节奏。',
    kind: 'short_video',
    assets: [
      {
        id: 'asset-001-video',
        kind: 'video',
        name: 'weekly-demo.mp4',
        durationSeconds: 42,
        aspectRatio: '9:16',
      },
      {
        id: 'asset-001-cover',
        kind: 'image',
        name: 'cover-weekly.png',
        aspectRatio: '3:4',
      },
    ],
    hashtags: ['自动化', '内容运营', '低成本创业'],
    selectedPlatforms: ['xhs', 'douyin', 'bilibili', 'youtube', 'x'],
    status: 'ready',
  },
  {
    id: 'draft-002',
    title: 'AI 工具选型备忘',
    body: '适合今天发布成图文：用一个表格说明开源工具、官方 API、SaaS 的成本和风险。',
    kind: 'image_text',
    assets: [
      {
        id: 'asset-002-image',
        kind: 'image',
        name: 'tooling-table.png',
        aspectRatio: '4:5',
      },
    ],
    hashtags: ['AI工具', '效率工具'],
    selectedPlatforms: ['xhs', 'x'],
    status: 'needs_review',
  },
  {
    id: 'draft-003',
    title: '产品更新一句话',
    body: '新增了发布包导出和平台风险标记，先把手工流程跑通，再逐步接 API。',
    kind: 'text',
    assets: [],
    hashtags: ['产品更新'],
    selectedPlatforms: ['x'],
    status: 'draft',
  },
]

export function validateDraftForPlatform(
  draft: ContentDraft,
  platform: PlatformId,
): PlatformValidation {
  const capability = platformCapabilities[platform]
  const issues: string[] = []
  const hasVideo = draft.assets.some((asset) => asset.kind === 'video')
  const hasImage = draft.assets.some((asset) => asset.kind === 'image')
  const videoFirstPlatform = platform === 'youtube' || platform === 'bilibili'

  if (!capability.supports.includes(draft.kind) && !(videoFirstPlatform && !hasVideo)) {
    issues.push(`${capability.label} does not support ${draft.kind} content in this workflow.`)
  }

  if (videoFirstPlatform && !hasVideo) {
    issues.push(`${capability.label === 'YouTube' ? 'YouTube' : 'Bilibili'} requires a video asset.`)
  }

  if ((platform === 'xhs' || platform === 'douyin') && draft.kind.includes('image') && !hasImage) {
    issues.push(`${capability.label} image workflows require at least one image asset.`)
  }

  if (!draft.title.trim()) {
    issues.push('Title is required.')
  }

  if (!draft.body.trim()) {
    issues.push('Body copy is required.')
  }

  return {
    platform,
    ok: issues.length === 0,
    issues,
  }
}

export function buildPublishPackages(draft: ContentDraft): PublishPackage[] {
  return draft.selectedPlatforms.map((platform) => {
    const capability = platformCapabilities[platform]
    const validation = validateDraftForPlatform(draft, platform)

    return {
      platform,
      platformLabel: capability.label,
      mode: capability.publishMode,
      ready: validation.ok,
      issues: validation.issues,
      title: formatTitle(draft, platform),
      copy: formatCopy(draft, platform),
      assets: draft.assets,
      tags: draft.hashtags,
      nextAction: nextActionForMode(capability.publishMode),
    }
  })
}

export function summarizeQueue(drafts: ContentDraft[]): QueueSummary {
  const packages = drafts.flatMap(buildPublishPackages)

  return {
    drafts: drafts.length,
    platformPackages: packages.length,
    ready: packages.filter((item) => item.ready).length,
    needsReview: packages.filter(
      (item) =>
        item.ready && (item.mode === 'manual_review' || item.mode === 'official_plus_confirm'),
    ).length,
    automatable: packages.filter((item) => item.ready && item.mode === 'official_api').length,
  }
}

export function modeLabel(mode: PublishMode): string {
  const labels: Record<PublishMode, string> = {
    official_api: '官方 API',
    official_plus_confirm: '官方 + 确认',
    official_application: '待申请',
    manual_review: '手动复核',
  }

  return labels[mode]
}

function formatTitle(draft: ContentDraft, platform: PlatformId): string {
  if (platform === 'x') {
    return draft.title.slice(0, 70)
  }

  return draft.title
}

function formatCopy(draft: ContentDraft, platform: PlatformId): string {
  const tags = draft.hashtags.map((tag) => `#${tag}`).join(' ')
  const separator = platform === 'x' ? ' ' : '\n\n'

  return [draft.body, tags].filter(Boolean).join(separator)
}

function nextActionForMode(mode: PublishMode): string {
  const actions: Record<PublishMode, string> = {
    official_api: 'Queue for OAuth-backed official API publishing.',
    official_plus_confirm: 'Prepare official upload and user confirmation step.',
    official_application: 'Prepare official account authorization before API publishing.',
    manual_review: 'Export copy, cover, tags, and media for manual posting.',
  }

  return actions[mode]
}
