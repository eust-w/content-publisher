import { useMemo, useState } from 'react'
import {
  Archive,
  Boxes,
  CheckCircle2,
  CircleAlert,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  PackageCheck,
  Plus,
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

function App() {
  const [drafts] = useState<ContentDraft[]>(seedDrafts)
  const [selectedDraftId, setSelectedDraftId] = useState(seedDrafts[0].id)
  const selectedDraft = drafts.find((draft) => draft.id === selectedDraftId) ?? drafts[0]
  const summary = useMemo(() => summarizeQueue(drafts), [drafts])
  const packages = useMemo(() => buildPublishPackages(selectedDraft), [selectedDraft])
  const credentialReadiness = useMemo(() => summarizeCredentialReadiness({}), [])

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
