import { useMemo, useState } from 'react'
import {
  Archive,
  Boxes,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  PackageCheck,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  UploadCloud,
  Video,
  Workflow,
} from 'lucide-react'
import {
  buildPublishPackages,
  platformCapabilities,
  seedDrafts,
  summarizeQueue,
  type ContentDraft,
  type ContentKind,
  type DraftStatus,
  type PublishMode,
} from './domain/publishPlan'
import {
  contentKindText,
  draftStatusText,
  getInitialLanguage,
  languageOptions,
  modeText,
  platformText,
  publishActionText,
  saveLanguage,
  t,
  type Language,
  type TranslationKey,
} from './i18n'
import { credentialRequirements, summarizeCredentialReadiness } from './publishing/credentials'
import './App.css'

const authApiBase = import.meta.env.VITE_AUTH_API_BASE ?? 'http://127.0.0.1:4788'

interface AccountSummary {
  platform: string
  accountId: string
  label: string
  source: string
  updatedAt: string
  hasAccessToken: boolean
}

interface ProviderSummary {
  platform: 'x' | 'youtube' | 'douyin'
  label: string
  configured: boolean
  missing: string[]
  callbackUrl: string
  scopes: string[]
  clientId?: string
}

interface ProviderDraft {
  clientId: string
  clientSecret: string
}

interface ManualAccountDraft {
  accountId: string
  label: string
  accessToken: string
  uploadEndpoint: string
  note: string
}

interface SaveStatus {
  key?: TranslationKey
  text?: string
}

function App() {
  const [drafts] = useState<ContentDraft[]>(seedDrafts)
  const [selectedDraftId, setSelectedDraftId] = useState(seedDrafts[0].id)
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage())
  const [accounts, setAccounts] = useState<AccountSummary[]>([])
  const [providers, setProviders] = useState<ProviderSummary[]>([])
  const [authServerOnline, setAuthServerOnline] = useState(false)
  const [providerDrafts, setProviderDrafts] = useState<Record<string, ProviderDraft>>({})
  const [manualDrafts, setManualDrafts] = useState<Record<string, ManualAccountDraft>>({})
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({})
  const selectedDraft = drafts.find((draft) => draft.id === selectedDraftId) ?? drafts[0]
  const summary = useMemo(() => summarizeQueue(drafts), [drafts])
  const packages = useMemo(() => buildPublishPackages(selectedDraft), [selectedDraft])
  const credentialReadiness = useMemo(() => summarizeCredentialReadiness({}), [])
  const copy = (key: Parameters<typeof t>[1], values?: Record<string, string | number>) =>
    t(language, key, values)
  const setLanguageChoice = (nextLanguage: Language) => {
    setLanguage(nextLanguage)
    saveLanguage(nextLanguage)
  }
  const loadAccounts = async () => {
    try {
      const response = await fetch(`${authApiBase}/api/accounts`)
      const payload = (await response.json()) as {
        accounts: AccountSummary[]
        providers: ProviderSummary[]
      }

      setAccounts(payload.accounts)
      setProviders(payload.providers)
      setAuthServerOnline(true)
    } catch {
      setAuthServerOnline(false)
    }
  }
  const updateProviderDraft = (
    platform: ProviderSummary['platform'],
    field: keyof ProviderDraft,
    value: string,
  ) => {
    setProviderDrafts((current) => ({
      ...current,
      [platform]: {
        clientId: current[platform]?.clientId ?? '',
        clientSecret: current[platform]?.clientSecret ?? '',
        [field]: value,
      },
    }))
  }
  const saveProviderConfig = async (provider: ProviderSummary) => {
    const draft = providerDrafts[provider.platform]

    if (!draft?.clientId.trim()) {
      setSaveStatus((current) => ({
        ...current,
        [provider.platform]: { key: 'account.clientIdRequired' },
      }))
      return
    }

    try {
      const response = await fetch(`${authApiBase}/api/provider-configs/${provider.platform}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draft),
      })
      const payload = (await response.json()) as {
        providers?: ProviderSummary[]
        error?: string
      }

      if (!response.ok) {
        throw new Error(payload.error ?? `HTTP ${response.status}`)
      }

      if (payload.providers) {
        setProviders(payload.providers)
      }

      setAuthServerOnline(true)
      setSaveStatus((current) => ({
        ...current,
        [provider.platform]: { key: 'account.saved' },
      }))
      setProviderDrafts((current) => ({
        ...current,
        [provider.platform]: {
          clientId: '',
          clientSecret: '',
        },
      }))
    } catch (error) {
      setAuthServerOnline(false)
      setSaveStatus((current) => ({
        ...current,
        [provider.platform]: { text: error instanceof Error ? error.message : String(error) },
      }))
    }
  }
  const updateManualDraft = (
    platform: string,
    field: keyof ManualAccountDraft,
    value: string,
  ) => {
    setManualDrafts((current) => ({
      ...current,
      [platform]: {
        accountId: current[platform]?.accountId ?? '',
        label: current[platform]?.label ?? '',
        accessToken: current[platform]?.accessToken ?? '',
        uploadEndpoint: current[platform]?.uploadEndpoint ?? '',
        note: current[platform]?.note ?? '',
        [field]: value,
      },
    }))
  }
  const saveManualAccount = async (platform: 'bilibili' | 'xhs') => {
    const draft = manualDrafts[platform]

    try {
      const response = await fetch(`${authApiBase}/api/accounts/${platform}/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draft ?? {}),
      })
      const payload = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? `HTTP ${response.status}`)
      }

      setAuthServerOnline(true)
      setSaveStatus((current) => ({
        ...current,
        [platform]: { key: 'account.saved' },
      }))
      setManualDrafts((current) => ({
        ...current,
        [platform]: {
          accountId: '',
          label: '',
          accessToken: '',
          uploadEndpoint: '',
          note: '',
        },
      }))
      await loadAccounts()
    } catch (error) {
      setAuthServerOnline(false)
      setSaveStatus((current) => ({
        ...current,
        [platform]: { text: error instanceof Error ? error.message : String(error) },
      }))
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label={copy('nav.dashboard')}>
        <div className="brand">
          <div className="brand-mark">
            <Workflow size={18} aria-hidden="true" />
          </div>
          <div>
            <strong>{copy('brand.name')}</strong>
            <span>{copy('brand.tagline')}</span>
          </div>
        </div>

        <nav className="nav-list">
          <a className="nav-item active" href="#dashboard">
            <LayoutDashboard size={17} aria-hidden="true" />
            {copy('nav.dashboard')}
          </a>
          <a className="nav-item" href="#content">
            <FileText size={17} aria-hidden="true" />
            {copy('nav.content')}
          </a>
          <a className="nav-item" href="#assets">
            <Boxes size={17} aria-hidden="true" />
            {copy('nav.assets')}
          </a>
          <a className="nav-item" href="#packages">
            <PackageCheck size={17} aria-hidden="true" />
            {copy('nav.packages')}
          </a>
          <a className="nav-item" href="#settings">
            <Settings size={17} aria-hidden="true" />
            {copy('nav.settings')}
          </a>
        </nav>

        <div className="sidebar-note">
          <Archive size={16} aria-hidden="true" />
          <span>{copy('sidebar.note')}</span>
        </div>
      </aside>

      <main className="workspace" id="dashboard">
        <header className="topbar">
          <div>
            <h1>{copy('topbar.title')}</h1>
            <p>{copy('topbar.description')}</p>
          </div>
          <div className="topbar-actions">
            <div className="language-switch" aria-label={copy('language.switcher')}>
              {languageOptions.map((option) => (
                <button
                  aria-pressed={language === option.id}
                  className={language === option.id ? 'active' : ''}
                  key={option.id}
                  type="button"
                  onClick={() => setLanguageChoice(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="search-box">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                placeholder={copy('topbar.searchPlaceholder')}
                aria-label={copy('topbar.searchLabel')}
              />
            </label>
            <button className="ghost-button" type="button">
              <Plus size={16} aria-hidden="true" />
              {copy('action.newContent')}
            </button>
            <button className="primary-button" type="button" onClick={() => exportPackage(selectedDraft)}>
              <UploadCloud size={16} aria-hidden="true" />
              {copy('action.exportPackage')}
            </button>
          </div>
        </header>

        <section className="summary-grid" aria-label={copy('summary.aria')}>
          <Metric value={summary.drafts} label={copy('summary.drafts')} />
          <Metric value={summary.platformPackages} label={copy('summary.platformPackages')} />
          <Metric value={summary.automatable} label={copy('summary.apiReady')} />
          <Metric value={summary.needsReview} label={copy('summary.manualChecks')} />
        </section>

        <section className="content-grid">
          <div className="pipeline-panel" id="content">
            <div className="section-heading">
              <div>
                <h2>{copy('pipeline.title')}</h2>
                <p>{copy('pipeline.description')}</p>
              </div>
              <span>{copy('pipeline.items', { count: drafts.length })}</span>
            </div>

            <div className="draft-list">
              {drafts.map((draft) => (
                <button
                  className={`draft-row ${draft.id === selectedDraft.id ? 'selected' : ''}`}
                  type="button"
                  key={draft.id}
                  onClick={() => setSelectedDraftId(draft.id)}
                >
                  <span className="kind-icon">{kindIcon(draft.kind)}</span>
                  <span className="draft-main">
                    <strong>{draft.title}</strong>
                    <span>{draft.body}</span>
                  </span>
                  <span className="draft-meta">
                    <StatusBadge language={language} status={draft.status} />
                    <small>{copy('pipeline.targets', { count: draft.selectedPlatforms.length })}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <aside className="inspector-panel" id="packages" aria-label={copy('inspector.aria')}>
            <div className="section-heading">
              <div>
                <h2>{selectedDraft.title}</h2>
                <p>
                  {contentKindText[language][selectedDraft.kind]} ·{' '}
                  {copy('inspector.assets', { count: selectedDraft.assets.length })}
                </p>
              </div>
              <StatusBadge language={language} status={selectedDraft.status} />
            </div>

            <div className="copy-preview">
              <span>{copy('copy.preview')}</span>
              <p>{selectedDraft.body}</p>
              <div className="tag-row">
                {selectedDraft.hashtags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
            </div>

            <div className="asset-strip" id="assets">
              {selectedDraft.assets.length > 0 ? (
                selectedDraft.assets.map((asset) => (
                  <div className="asset-tile" key={asset.id}>
                    {asset.kind === 'video' ? (
                      <Video size={18} aria-hidden="true" />
                    ) : (
                      <ImageIcon size={18} aria-hidden="true" />
                    )}
                    <span>{asset.name}</span>
                    <small>{asset.aspectRatio ?? copy('assets.notAvailable')}</small>
                  </div>
                ))
              ) : (
                <div className="empty-assets">{copy('assets.empty')}</div>
              )}
            </div>

            <div className="package-list">
              {packages.map((item) => (
                <div className="package-row" key={item.platform}>
                  <div>
                    <strong>{platformText[language][item.platform].label}</strong>
                    <span>{modeText[language][item.mode]}</span>
                  </div>
                  <PackageState language={language} ready={item.ready} mode={item.mode} />
                  <p>{item.ready ? publishActionText[language][item.mode] : item.issues.join(' ')}</p>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="platform-boundaries" aria-label={copy('boundaries.aria')}>
          {Object.values(platformCapabilities).map((capability) => (
            <div className="boundary-row" key={capability.id}>
              <strong>{platformText[language][capability.id].label}</strong>
              <span>{modeText[language][capability.publishMode]}</span>
              <p>{platformText[language][capability.id].boundary}</p>
            </div>
          ))}
        </section>

        <section className="credential-panel" id="settings" aria-label={copy('credential.aria')}>
          <div className="section-heading">
            <div>
              <h2>{copy('credential.title')}</h2>
              <p>{copy('credential.description')}</p>
            </div>
          </div>
          <div className="credential-grid">
            {credentialReadiness.map((item) => (
              <div className="credential-row" key={item.platform}>
                <div>
                  <strong>{platformText[language][item.platform].label}</strong>
                  <span>{item.ready ? copy('credential.ready') : copy('credential.missing')}</span>
                </div>
                <code>
                  {credentialRequirements[item.platform].length > 0
                    ? credentialRequirements[item.platform].map((requirement) => requirement.key).join(', ')
                    : copy('credential.noServerToken')}
                </code>
              </div>
            ))}
          </div>
        </section>

        <section className="account-panel" aria-label={copy('account.aria')}>
          <div className="section-heading">
            <div>
              <h2>{copy('account.title')}</h2>
              <p>
                {authServerOnline ? copy('account.online') : copy('account.offline')}
              </p>
            </div>
            <button className="icon-button" type="button" onClick={() => void loadAccounts()}>
              <RefreshCcw size={15} aria-hidden="true" />
              {copy('account.refresh')}
            </button>
          </div>

          <div className="connection-grid">
            {oauthProviderCards(providers, language).map((provider) => (
              <div className="connection-row" key={provider.platform}>
                <div>
                  <strong>{providerLabel(provider, language)}</strong>
                  <span>
                    {provider.configured
                      ? copy('account.configured', {
                          account: accountLabel(accounts, provider.platform, language),
                          clientId: provider.clientId ?? copy('account.configuredValue'),
                        })
                      : copy('account.missing', { missing: provider.missing.join(', ') })}
                  </span>
                  <div className="provider-config-form">
                    <label>
                      <span>{copy('account.clientId')}</span>
                      <input
                        type="text"
                        value={providerDrafts[provider.platform]?.clientId ?? ''}
                        placeholder={provider.clientId ?? copy('account.clientIdPlaceholder')}
                        onChange={(event) =>
                          updateProviderDraft(provider.platform, 'clientId', event.currentTarget.value)
                        }
                      />
                    </label>
                    <label>
                      <span>{copy('account.clientSecret')}</span>
                      <input
                        type="password"
                        value={providerDrafts[provider.platform]?.clientSecret ?? ''}
                        placeholder={copy('account.clientSecretPlaceholder')}
                        onChange={(event) =>
                          updateProviderDraft(
                            provider.platform,
                            'clientSecret',
                            event.currentTarget.value,
                          )
                        }
                      />
                    </label>
                  </div>
                  <small className="callback-url">
                    {copy('account.callback', { url: provider.callbackUrl })}
                  </small>
                  {saveStatus[provider.platform] ? (
                    <small className="save-status">
                      {saveStatusLabel(saveStatus[provider.platform], language)}
                    </small>
                  ) : null}
                </div>
                <div className="connection-actions">
                  <button
                    className="connect-button"
                    type="button"
                    onClick={() => void saveProviderConfig(provider)}
                  >
                    {copy('account.saveApp')}
                  </button>
                  {provider.configured ? (
                    <a className="connect-button" href={`${authApiBase}/auth/${provider.platform}/start`}>
                      <ExternalLink size={14} aria-hidden="true" />
                      {copy('account.login')}
                    </a>
                  ) : (
                    <button className="connect-button disabled" type="button" disabled>
                      {copy('account.login')}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="connection-row">
              <div>
                <strong>{platformText[language].bilibili.label}</strong>
                <span>{accountLabel(accounts, 'bilibili', language)}</span>
                <div className="provider-config-form">
                  <label>
                    <span>{copy('account.accessToken')}</span>
                    <input
                      type="password"
                      value={manualDrafts.bilibili?.accessToken ?? ''}
                      placeholder={copy('account.bilibiliTokenPlaceholder')}
                      onChange={(event) =>
                        updateManualDraft('bilibili', 'accessToken', event.currentTarget.value)
                      }
                    />
                  </label>
                  <label>
                    <span>{copy('account.uploadEndpoint')}</span>
                    <input
                      type="text"
                      value={manualDrafts.bilibili?.uploadEndpoint ?? ''}
                      placeholder={copy('account.bilibiliEndpointPlaceholder')}
                      onChange={(event) =>
                        updateManualDraft('bilibili', 'uploadEndpoint', event.currentTarget.value)
                      }
                    />
                  </label>
                </div>
                {saveStatus.bilibili ? (
                  <small className="save-status">{saveStatusLabel(saveStatus.bilibili, language)}</small>
                ) : null}
              </div>
              <div className="connection-actions">
                <button
                  className="connect-button"
                  type="button"
                  onClick={() => void saveManualAccount('bilibili')}
                >
                  {copy('account.saveBilibili')}
                </button>
              </div>
            </div>
            <div className="connection-row">
              <div>
                <strong>{platformText[language].xhs.label}</strong>
                <span>{accountLabel(accounts, 'xhs', language)}</span>
                <div className="provider-config-form">
                  <label>
                    <span>{copy('account.accountNote')}</span>
                    <input
                      type="text"
                      value={manualDrafts.xhs?.label ?? ''}
                      placeholder={copy('account.xhsNotePlaceholder')}
                      onChange={(event) => updateManualDraft('xhs', 'label', event.currentTarget.value)}
                    />
                  </label>
                  <label>
                    <span>{copy('account.sharePath')}</span>
                    <input
                      type="text"
                      value={manualDrafts.xhs?.note ?? ''}
                      placeholder={copy('account.xhsPathPlaceholder')}
                      onChange={(event) => updateManualDraft('xhs', 'note', event.currentTarget.value)}
                    />
                  </label>
                </div>
                {saveStatus.xhs ? (
                  <small className="save-status">{saveStatusLabel(saveStatus.xhs, language)}</small>
                ) : null}
              </div>
              <div className="connection-actions">
                <button
                  className="connect-button"
                  type="button"
                  onClick={() => void saveManualAccount('xhs')}
                >
                  {copy('account.saveXhs')}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function StatusBadge({ language, status }: { language: Language; status: DraftStatus }) {
  return <span className={`status-badge ${status}`}>{draftStatusText[language][status]}</span>
}

function PackageState({
  language,
  ready,
  mode,
}: {
  language: Language
  ready: boolean
  mode: PublishMode
}) {
  return (
    <span className={`package-state ${ready ? 'ready' : 'blocked'} ${mode}`}>
      {ready ? (
        <CheckCircle2 size={14} aria-hidden="true" />
      ) : (
        <CircleAlert size={14} aria-hidden="true" />
      )}
      {ready ? t(language, 'package.ready') : t(language, 'package.blocked')}
    </span>
  )
}

function kindIcon(kind: ContentKind) {
  if (kind.includes('video')) {
    return <Video size={18} aria-hidden="true" />
  }

  if (kind.includes('image')) {
    return <ImageIcon size={18} aria-hidden="true" />
  }

  return <FileText size={18} aria-hidden="true" />
}

function oauthProviderCards(providers: ProviderSummary[], language: Language) {
  if (providers.length > 0) {
    return providers
  }

  return [
    {
      platform: 'x',
      label: 'X',
      configured: false,
      missing: ['X_CLIENT_ID'],
      callbackUrl: `${authApiBase}/auth/x/callback`,
      scopes: [],
      clientId: undefined,
    },
    {
      platform: 'youtube',
      label: 'YouTube',
      configured: false,
      missing: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'],
      callbackUrl: `${authApiBase}/auth/youtube/callback`,
      scopes: [],
      clientId: undefined,
    },
    {
      platform: 'douyin',
      label: platformText[language].douyin.label,
      configured: false,
      missing: ['DOUYIN_CLIENT_KEY', 'DOUYIN_CLIENT_SECRET'],
      callbackUrl: `${authApiBase}/auth/douyin/callback`,
      scopes: [],
      clientId: undefined,
    },
  ] satisfies ProviderSummary[]
}

function saveStatusLabel(status: SaveStatus, language: Language) {
  if (status.key) {
    return t(language, status.key)
  }

  return status.text ?? ''
}

function providerLabel(provider: ProviderSummary, language: Language) {
  return platformText[language][provider.platform].label
}

function accountLabel(accounts: AccountSummary[], platform: string, language: Language) {
  const account = accounts.find((item) => item.platform === platform)

  if (!account) {
    return t(language, 'account.readyToLogin')
  }

  return t(language, 'account.stored', {
    label: account.label,
    date: new Date(account.updatedAt).toLocaleString(),
  })
}

function exportPackage(draft: ContentDraft) {
  const payload = {
    draft,
    packages: buildPublishPackages(draft),
    exportedAt: new Date().toISOString(),
  }

  if (typeof window === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${draft.id}-publish-package.json`
  link.click()
  URL.revokeObjectURL(url)
}

export default App
