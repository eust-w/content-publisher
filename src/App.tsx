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
  modeLabel,
  platformCapabilities,
  seedDrafts,
  summarizeQueue,
  type ContentDraft,
  type ContentKind,
  type DraftStatus,
  type PublishMode,
} from './domain/publishPlan'
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

function App() {
  const [drafts] = useState<ContentDraft[]>(seedDrafts)
  const [selectedDraftId, setSelectedDraftId] = useState(seedDrafts[0].id)
  const [accounts, setAccounts] = useState<AccountSummary[]>([])
  const [providers, setProviders] = useState<ProviderSummary[]>([])
  const [authServerOnline, setAuthServerOnline] = useState(false)
  const [providerDrafts, setProviderDrafts] = useState<Record<string, ProviderDraft>>({})
  const [manualDrafts, setManualDrafts] = useState<Record<string, ManualAccountDraft>>({})
  const [saveStatus, setSaveStatus] = useState<Record<string, string>>({})
  const selectedDraft = drafts.find((draft) => draft.id === selectedDraftId) ?? drafts[0]
  const summary = useMemo(() => summarizeQueue(drafts), [drafts])
  const packages = useMemo(() => buildPublishPackages(selectedDraft), [selectedDraft])
  const credentialReadiness = useMemo(() => summarizeCredentialReadiness({}), [])
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
        [provider.platform]: 'Client ID is required.',
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
        [provider.platform]: 'Saved to local MongoDB.',
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
        [provider.platform]: error instanceof Error ? error.message : String(error),
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
        [platform]: 'Saved to local MongoDB.',
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
        [platform]: error instanceof Error ? error.message : String(error),
      }))
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary">
        <div className="brand">
          <div className="brand-mark">
            <Workflow size={18} aria-hidden="true" />
          </div>
          <div>
            <strong>Content Publisher</strong>
            <span>local-first</span>
          </div>
        </div>

        <nav className="nav-list">
          <a className="nav-item active" href="#dashboard">
            <LayoutDashboard size={17} aria-hidden="true" />
            Dashboard
          </a>
          <a className="nav-item" href="#content">
            <FileText size={17} aria-hidden="true" />
            Content
          </a>
          <a className="nav-item" href="#assets">
            <Boxes size={17} aria-hidden="true" />
            Assets
          </a>
          <a className="nav-item" href="#packages">
            <PackageCheck size={17} aria-hidden="true" />
            Packages
          </a>
          <a className="nav-item" href="#settings">
            <Settings size={17} aria-hidden="true" />
            Settings
          </a>
        </nav>

        <div className="sidebar-note">
          <Archive size={16} aria-hidden="true" />
          <span>Exports stay local until API credentials are configured.</span>
        </div>
      </aside>

      <main className="workspace" id="dashboard">
        <header className="topbar">
          <div>
            <h1>Content Publisher</h1>
            <p>Manage drafts, assets, and low-risk publish packages before turning on APIs.</p>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={16} aria-hidden="true" />
              <input type="search" placeholder="Search drafts" aria-label="Search drafts" />
            </label>
            <button className="ghost-button" type="button">
              <Plus size={16} aria-hidden="true" />
              New Content
            </button>
            <button className="primary-button" type="button" onClick={() => exportPackage(selectedDraft)}>
              <UploadCloud size={16} aria-hidden="true" />
              Export Package
            </button>
          </div>
        </header>

        <section className="summary-grid" aria-label="Queue summary">
          <Metric value={summary.drafts} label="drafts" />
          <Metric value={summary.platformPackages} label="platform packages" />
          <Metric value={summary.automatable} label="API-ready" />
          <Metric value={summary.needsReview} label="manual checks" />
        </section>

        <section className="content-grid">
          <div className="pipeline-panel" id="content">
            <div className="section-heading">
              <div>
                <h2>Content pipeline</h2>
                <p>Local source of truth for all captions and assets.</p>
              </div>
              <span>{drafts.length} items</span>
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
                    <StatusBadge status={draft.status} />
                    <small>{draft.selectedPlatforms.length} targets</small>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <aside className="inspector-panel" id="packages" aria-label="Selected publish package">
            <div className="section-heading">
              <div>
                <h2>{selectedDraft.title}</h2>
                <p>
                  {contentKindLabel(selectedDraft.kind)} · {selectedDraft.assets.length} assets
                </p>
              </div>
              <StatusBadge status={selectedDraft.status} />
            </div>

            <div className="copy-preview">
              <span>Copy preview</span>
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
                    <small>{asset.aspectRatio ?? 'n/a'}</small>
                  </div>
                ))
              ) : (
                <div className="empty-assets">No media attached</div>
              )}
            </div>

            <div className="package-list">
              {packages.map((item) => (
                <div className="package-row" key={item.platform}>
                  <div>
                    <strong>{item.platformLabel}</strong>
                    <span>{modeLabel(item.mode)}</span>
                  </div>
                  <PackageState ready={item.ready} mode={item.mode} />
                  <p>{item.ready ? item.nextAction : item.issues.join(' ')}</p>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="platform-boundaries" aria-label="Platform boundaries">
          {Object.values(platformCapabilities).map((capability) => (
            <div className="boundary-row" key={capability.id}>
              <strong>{capability.label}</strong>
              <span>{modeLabel(capability.publishMode)}</span>
              <p>{capability.boundary}</p>
            </div>
          ))}
        </section>

        <section className="credential-panel" id="settings" aria-label="Credential checklist">
          <div className="section-heading">
            <div>
              <h2>Credential checklist</h2>
              <p>Live posting stays locked until the matching environment variables are present.</p>
            </div>
          </div>
          <div className="credential-grid">
            {credentialReadiness.map((item) => (
              <div className="credential-row" key={item.platform}>
                <div>
                  <strong>{platformCapabilities[item.platform].label}</strong>
                  <span>{item.ready ? 'ready for local package flow' : 'missing live credentials'}</span>
                </div>
                <code>
                  {credentialRequirements[item.platform].length > 0
                    ? credentialRequirements[item.platform].map((requirement) => requirement.key).join(', ')
                    : 'no server token'}
                </code>
              </div>
            ))}
          </div>
        </section>

        <section className="account-panel" aria-label="Account connections">
          <div className="section-heading">
            <div>
              <h2>Account connections</h2>
              <p>
                {authServerOnline
                  ? 'Local MongoDB token vault is reachable.'
                  : 'Run npm run auth:server, then click Refresh to check the local token vault.'}
              </p>
            </div>
            <button className="icon-button" type="button" onClick={() => void loadAccounts()}>
              <RefreshCcw size={15} aria-hidden="true" />
              Refresh
            </button>
          </div>

          <div className="connection-grid">
            {oauthProviderCards(providers).map((provider) => (
              <div className="connection-row" key={provider.platform}>
                <div>
                  <strong>{provider.label}</strong>
                  <span>
                    {provider.configured
                      ? `${accountLabel(accounts, provider.platform)} App ${provider.clientId ?? 'configured'}.`
                      : `Missing ${provider.missing.join(', ')}`}
                  </span>
                  <div className="provider-config-form">
                    <label>
                      <span>Client ID</span>
                      <input
                        type="text"
                        value={providerDrafts[provider.platform]?.clientId ?? ''}
                        placeholder={provider.clientId ?? 'Paste client id'}
                        onChange={(event) =>
                          updateProviderDraft(provider.platform, 'clientId', event.currentTarget.value)
                        }
                      />
                    </label>
                    <label>
                      <span>Client Secret</span>
                      <input
                        type="password"
                        value={providerDrafts[provider.platform]?.clientSecret ?? ''}
                        placeholder="Secret; blank keeps saved"
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
                  <small className="callback-url">Callback: {provider.callbackUrl}</small>
                  {saveStatus[provider.platform] ? (
                    <small className="save-status">{saveStatus[provider.platform]}</small>
                  ) : null}
                </div>
                <div className="connection-actions">
                  <button
                    className="connect-button"
                    type="button"
                    onClick={() => void saveProviderConfig(provider)}
                  >
                    Save App
                  </button>
                  {provider.configured ? (
                    <a className="connect-button" href={`${authApiBase}/auth/${provider.platform}/start`}>
                      <ExternalLink size={14} aria-hidden="true" />
                      Login
                    </a>
                  ) : (
                    <button className="connect-button disabled" type="button" disabled>
                      Login
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="connection-row">
              <div>
                <strong>B站</strong>
                <span>{accountLabel(accounts, 'bilibili')}</span>
                <div className="provider-config-form">
                  <label>
                    <span>Access Token</span>
                    <input
                      type="password"
                      value={manualDrafts.bilibili?.accessToken ?? ''}
                      placeholder="Approved Bilibili token"
                      onChange={(event) =>
                        updateManualDraft('bilibili', 'accessToken', event.currentTarget.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Upload Endpoint</span>
                    <input
                      type="text"
                      value={manualDrafts.bilibili?.uploadEndpoint ?? ''}
                      placeholder="Approved upload endpoint"
                      onChange={(event) =>
                        updateManualDraft('bilibili', 'uploadEndpoint', event.currentTarget.value)
                      }
                    />
                  </label>
                </div>
                {saveStatus.bilibili ? <small className="save-status">{saveStatus.bilibili}</small> : null}
              </div>
              <div className="connection-actions">
                <button
                  className="connect-button"
                  type="button"
                  onClick={() => void saveManualAccount('bilibili')}
                >
                  Save B站
                </button>
              </div>
            </div>
            <div className="connection-row">
              <div>
                <strong>小红书</strong>
                <span>{accountLabel(accounts, 'xhs')}</span>
                <div className="provider-config-form">
                  <label>
                    <span>Account Note</span>
                    <input
                      type="text"
                      value={manualDrafts.xhs?.label ?? ''}
                      placeholder="Test account nickname"
                      onChange={(event) => updateManualDraft('xhs', 'label', event.currentTarget.value)}
                    />
                  </label>
                  <label>
                    <span>Share Path</span>
                    <input
                      type="text"
                      value={manualDrafts.xhs?.note ?? ''}
                      placeholder="Official app/share confirmation path"
                      onChange={(event) => updateManualDraft('xhs', 'note', event.currentTarget.value)}
                    />
                  </label>
                </div>
                {saveStatus.xhs ? <small className="save-status">{saveStatus.xhs}</small> : null}
              </div>
              <div className="connection-actions">
                <button
                  className="connect-button"
                  type="button"
                  onClick={() => void saveManualAccount('xhs')}
                >
                  Save 小红书
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

function StatusBadge({ status }: { status: DraftStatus }) {
  return <span className={`status-badge ${status}`}>{statusLabel(status)}</span>
}

function PackageState({ ready, mode }: { ready: boolean; mode: PublishMode }) {
  return (
    <span className={`package-state ${ready ? 'ready' : 'blocked'} ${mode}`}>
      {ready ? (
        <CheckCircle2 size={14} aria-hidden="true" />
      ) : (
        <CircleAlert size={14} aria-hidden="true" />
      )}
      {ready ? 'ready' : 'blocked'}
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

function contentKindLabel(kind: ContentKind) {
  const labels: Record<ContentKind, string> = {
    text: 'Text',
    image: 'Image',
    image_text: 'Image + text',
    short_video: 'Short video',
    long_video: 'Long video',
  }

  return labels[kind]
}

function statusLabel(status: DraftStatus) {
  const labels: Record<DraftStatus, string> = {
    draft: 'Draft',
    ready: 'Ready',
    needs_review: 'Needs Review',
    published: 'Published',
  }

  return labels[status]
}

function oauthProviderCards(providers: ProviderSummary[]) {
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
      label: '抖音',
      configured: false,
      missing: ['DOUYIN_CLIENT_KEY', 'DOUYIN_CLIENT_SECRET'],
      callbackUrl: `${authApiBase}/auth/douyin/callback`,
      scopes: [],
      clientId: undefined,
    },
  ] satisfies ProviderSummary[]
}

function accountLabel(accounts: AccountSummary[], platform: string) {
  const account = accounts.find((item) => item.platform === platform)

  if (!account) {
    return 'Ready to login; no token stored yet.'
  }

  return `${account.label} · stored ${new Date(account.updatedAt).toLocaleString()}`
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
