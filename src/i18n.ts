import type {
  ContentKind,
  DraftStatus,
  PlatformId,
  PublishMode,
} from './domain/publishPlan'

export type Language = 'en' | 'zh'

export const languageStorageKey = 'contentPublisherLanguage'

export const languageOptions = [
  { id: 'zh', label: '中文' },
  { id: 'en', label: 'EN' },
] satisfies Array<{ id: Language; label: string }>

const messages = {
  en: {
    'brand.name': 'Content Publisher',
    'brand.tagline': 'local-first',
    'nav.dashboard': 'Dashboard',
    'nav.content': 'Content',
    'nav.assets': 'Assets',
    'nav.packages': 'Packages',
    'nav.settings': 'Settings',
    'sidebar.note': 'Exports stay local until API credentials are configured.',
    'topbar.title': 'Content Publisher',
    'topbar.description':
      'Manage drafts, assets, and low-risk publish packages before turning on APIs.',
    'topbar.searchLabel': 'Search drafts',
    'topbar.searchPlaceholder': 'Search drafts',
    'action.newContent': 'New Content',
    'action.exportPackage': 'Export Package',
    'summary.aria': 'Queue summary',
    'summary.drafts': 'drafts',
    'summary.platformPackages': 'platform packages',
    'summary.apiReady': 'API-ready',
    'summary.manualChecks': 'manual checks',
    'pipeline.title': 'Content pipeline',
    'pipeline.description': 'Local source of truth for all captions and assets.',
    'pipeline.items': '{count} items',
    'pipeline.targets': '{count} targets',
    'inspector.aria': 'Selected publish package',
    'inspector.assets': '{count} assets',
    'copy.preview': 'Copy preview',
    'assets.empty': 'No media attached',
    'assets.notAvailable': 'n/a',
    'package.ready': 'ready',
    'package.blocked': 'blocked',
    'boundaries.aria': 'Platform boundaries',
    'credential.aria': 'Credential checklist',
    'credential.title': 'Credential checklist',
    'credential.description':
      'Live posting stays locked until the matching environment variables are present.',
    'credential.ready': 'ready for local package flow',
    'credential.missing': 'missing live credentials',
    'credential.noServerToken': 'no server token',
    'account.aria': 'Account connections',
    'account.title': 'Account connections',
    'account.online': 'Local MongoDB token vault is reachable.',
    'account.offline':
      'Run npm run auth:server, then click Refresh to check the local token vault.',
    'account.refresh': 'Refresh',
    'account.configured': '{account} App {clientId}.',
    'account.configuredValue': 'configured',
    'account.missing': 'Missing {missing}',
    'account.clientId': 'Client ID',
    'account.clientSecret': 'Client Secret',
    'account.clientIdPlaceholder': 'Paste client id',
    'account.clientSecretPlaceholder': 'Secret; blank keeps saved',
    'account.callback': 'Callback: {url}',
    'account.saveApp': 'Save App',
    'account.login': 'Login',
    'account.accessToken': 'Access Token',
    'account.uploadEndpoint': 'Upload Endpoint',
    'account.bilibiliTokenPlaceholder': 'Approved Bilibili token',
    'account.bilibiliEndpointPlaceholder': 'Approved upload endpoint',
    'account.saveBilibili': 'Save Bilibili',
    'account.accountNote': 'Account Note',
    'account.sharePath': 'Share Path',
    'account.xhsNotePlaceholder': 'Test account nickname',
    'account.xhsPathPlaceholder': 'Official app/share confirmation path',
    'account.saveXhs': 'Save Xiaohongshu',
    'account.saved': 'Saved to local MongoDB.',
    'account.clientIdRequired': 'Client ID is required.',
    'account.readyToLogin': 'Ready to login; no token stored yet.',
    'account.stored': '{label} stored {date}',
    'language.switcher': 'Language',
  },
  zh: {
    'brand.name': '内容发布中台',
    'brand.tagline': '本地优先',
    'nav.dashboard': '仪表盘',
    'nav.content': '内容',
    'nav.assets': '素材',
    'nav.packages': '发布包',
    'nav.settings': '设置',
    'sidebar.note': '配置 API 凭证之前，导出内容只保存在本地。',
    'topbar.title': '内容发布中台',
    'topbar.description': '统一管理草稿、素材和低风险发布包，再逐步开启平台 API。',
    'topbar.searchLabel': '搜索草稿',
    'topbar.searchPlaceholder': '搜索草稿',
    'action.newContent': '新建内容',
    'action.exportPackage': '导出发布包',
    'summary.aria': '队列概览',
    'summary.drafts': '草稿',
    'summary.platformPackages': '平台发布包',
    'summary.apiReady': '可走 API',
    'summary.manualChecks': '人工确认',
    'pipeline.title': '内容流水线',
    'pipeline.description': '本地统一维护所有标题、正文、标签和素材。',
    'pipeline.items': '{count} 条',
    'pipeline.targets': '{count} 个目标',
    'inspector.aria': '选中的发布包',
    'inspector.assets': '{count} 个素材',
    'copy.preview': '文案预览',
    'assets.empty': '暂无媒体素材',
    'assets.notAvailable': '无',
    'package.ready': '就绪',
    'package.blocked': '受阻',
    'boundaries.aria': '平台边界',
    'credential.aria': '凭证清单',
    'credential.title': '凭证清单',
    'credential.description': '只有本地环境变量齐备后，才会开放真实发布。',
    'credential.ready': '可走本地发布包流程',
    'credential.missing': '缺少真实发布凭证',
    'credential.noServerToken': '无需服务端 token',
    'account.aria': '账号连接',
    'account.title': '账号连接',
    'account.online': '本地 MongoDB token vault 已连接。',
    'account.offline': '先运行 npm run auth:server，再点击刷新检查本地 token vault。',
    'account.refresh': '刷新',
    'account.configured': '{account} App {clientId}。',
    'account.configuredValue': '已配置',
    'account.missing': '缺少 {missing}',
    'account.clientId': 'Client ID',
    'account.clientSecret': 'Client Secret',
    'account.clientIdPlaceholder': '填写 client id',
    'account.clientSecretPlaceholder': 'Secret 留空则保留已保存值',
    'account.callback': '回调地址：{url}',
    'account.saveApp': '保存应用',
    'account.login': '登录',
    'account.accessToken': 'Access Token',
    'account.uploadEndpoint': '上传 Endpoint',
    'account.bilibiliTokenPlaceholder': '已批准的 B站 token',
    'account.bilibiliEndpointPlaceholder': '已批准的上传 endpoint',
    'account.saveBilibili': '保存 B站',
    'account.accountNote': '账号备注',
    'account.sharePath': '分享路径',
    'account.xhsNotePlaceholder': '测试账号昵称',
    'account.xhsPathPlaceholder': '官方 App/分享确认路径',
    'account.saveXhs': '保存小红书',
    'account.saved': '已保存到本地 MongoDB。',
    'account.clientIdRequired': '需要填写 Client ID。',
    'account.readyToLogin': '可登录，尚未保存 token。',
    'account.stored': '{label} 已保存于 {date}',
    'language.switcher': '语言',
  },
} satisfies Record<Language, Record<string, string>>

export type TranslationKey = keyof (typeof messages)['en']

export const platformText = {
  en: {
    xhs: {
      label: 'Xiaohongshu',
      boundary: 'Generate a local note package first, then confirm publishing in the official app.',
    },
    douyin: {
      label: 'Douyin',
      boundary: 'Use approved official upload capability and keep a user confirmation step.',
    },
    bilibili: {
      label: 'Bilibili',
      boundary:
        'Connect automated submissions after account authorization and Open Platform approval.',
    },
    youtube: {
      label: 'YouTube',
      boundary: 'Use YouTube Data API with OAuth and daily quota controls.',
    },
    x: {
      label: 'X',
      boundary: 'Use the official API; media upload and monthly limits still need separate control.',
    },
  },
  zh: {
    xhs: {
      label: '小红书',
      boundary: '先生成笔记发布包，再通过官方 App/分享流程确认发布。',
    },
    douyin: {
      label: '抖音',
      boundary: '使用审核通过的官方上传能力，并保留用户确认发布步骤。',
    },
    bilibili: {
      label: 'B站',
      boundary: '账号授权和开放平台能力申请通过后，再接自动投稿。',
    },
    youtube: {
      label: 'YouTube',
      boundary: '使用 YouTube Data API，受 OAuth 和每日配额控制。',
    },
    x: {
      label: 'X',
      boundary: '使用官方 API；媒体上传和月度额度需单独控制。',
    },
  },
} satisfies Record<Language, Record<PlatformId, { label: string; boundary: string }>>

export const modeText = {
  en: {
    official_api: 'Official API',
    official_plus_confirm: 'Official + confirm',
    official_application: 'Application required',
    manual_review: 'Manual review',
  },
  zh: {
    official_api: '官方 API',
    official_plus_confirm: '官方 + 确认',
    official_application: '待申请',
    manual_review: '手动复核',
  },
} satisfies Record<Language, Record<PublishMode, string>>

export const draftStatusText = {
  en: {
    draft: 'Draft',
    ready: 'Ready',
    needs_review: 'Needs Review',
    published: 'Published',
  },
  zh: {
    draft: '草稿',
    ready: '就绪',
    needs_review: '待复核',
    published: '已发布',
  },
} satisfies Record<Language, Record<DraftStatus, string>>

export const contentKindText = {
  en: {
    text: 'Text',
    image: 'Image',
    image_text: 'Image + text',
    short_video: 'Short video',
    long_video: 'Long video',
  },
  zh: {
    text: '纯文字',
    image: '图片',
    image_text: '图文',
    short_video: '短视频',
    long_video: '长视频',
  },
} satisfies Record<Language, Record<ContentKind, string>>

export const publishActionText = {
  en: {
    official_api: 'Queue for OAuth-backed official API publishing.',
    official_plus_confirm: 'Prepare official upload and user confirmation step.',
    official_application: 'Prepare official account authorization before API publishing.',
    manual_review: 'Export copy, cover, tags, and media for manual posting.',
  },
  zh: {
    official_api: '进入 OAuth 授权后的官方 API 发布队列。',
    official_plus_confirm: '准备官方上传，并保留用户确认发布步骤。',
    official_application: '先完成官方账号授权和开放平台能力申请。',
    manual_review: '导出文案、封面、标签和素材，走人工发布。',
  },
} satisfies Record<Language, Record<PublishMode, string>>

export function t(
  language: Language,
  key: TranslationKey,
  values: Record<string, string | number> = {},
) {
  let template = messages[language][key] ?? messages.en[key] ?? key

  for (const [name, value] of Object.entries(values)) {
    template = template.replaceAll(`{${name}}`, String(value))
  }

  return template
}

export function getInitialLanguage(): Language {
  if (typeof window !== 'undefined') {
    try {
      const savedLanguage = window.localStorage.getItem(languageStorageKey)

      if (savedLanguage === 'en' || savedLanguage === 'zh') {
        return savedLanguage
      }
    } catch {
      // Ignore storage failures and fall back to the browser locale.
    }
  }

  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh')) {
    return 'zh'
  }

  return 'en'
}

export function saveLanguage(language: Language) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(languageStorageKey, language)
  } catch {
    // The switch should still work even when storage is unavailable.
  }
}
