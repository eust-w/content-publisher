import type { Collection, Db } from 'mongodb'
import type { PlatformId } from '../../src/domain/publishPlan'
import { decryptSecret, encryptSecret, type EncryptedSecret } from '../security/tokenCrypto'

export interface OAuthStateDoc {
  state: string
  platform: PlatformId
  codeVerifier?: string
  redirectUri: string
  createdAt: Date
  expiresAt: Date
}

export interface StoredAccountDoc {
  platform: PlatformId
  accountId: string
  label: string
  source: 'oauth' | 'manual'
  accessToken?: EncryptedSecret
  refreshToken?: EncryptedSecret
  scopes: string[]
  tokenType?: string
  expiresAt?: Date
  metadata: Record<string, string | number | boolean | undefined>
  createdAt: Date
  updatedAt: Date
}

export interface NormalizedOAuthToken {
  accountId?: string
  label?: string
  accessToken: string
  refreshToken?: string
  scopes: string[]
  tokenType?: string
  expiresInSeconds?: number
  metadata?: Record<string, string | number | boolean | undefined>
}

export interface ManualAccountInput {
  accountId?: string
  label?: string
  accessToken?: string
  uploadEndpoint?: string
  note?: string
}

export interface PlatformAppConfigDoc {
  platform: PlatformId
  clientId: string
  clientSecret?: EncryptedSecret
  createdAt: Date
  updatedAt: Date
}

export interface PlatformAppConfigInput {
  clientId: string
  clientSecret?: string
}

export class TokenVault {
  private readonly accounts: Collection<StoredAccountDoc>
  private readonly states: Collection<OAuthStateDoc>
  private readonly appConfigs: Collection<PlatformAppConfigDoc>
  private readonly key: Buffer

  constructor(db: Db, key: Buffer) {
    this.key = key
    this.accounts = db.collection<StoredAccountDoc>('platform_accounts')
    this.states = db.collection<OAuthStateDoc>('oauth_states')
    this.appConfigs = db.collection<PlatformAppConfigDoc>('platform_app_configs')
  }

  async init() {
    await Promise.all([
      this.accounts.createIndex({ platform: 1, accountId: 1 }, { unique: true }),
      this.accounts.createIndex({ updatedAt: -1 }),
      this.states.createIndex({ state: 1 }, { unique: true }),
      this.states.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      this.appConfigs.createIndex({ platform: 1 }, { unique: true }),
    ])
  }

  async upsertPlatformAppConfig(platform: PlatformId, input: PlatformAppConfigInput) {
    const now = new Date()
    const update: Partial<PlatformAppConfigDoc> = {
      platform,
      clientId: input.clientId.trim(),
      updatedAt: now,
    }

    if (!update.clientId) {
      throw new Error('Client ID is required.')
    }

    if (input.clientSecret?.trim()) {
      update.clientSecret = encryptSecret(input.clientSecret.trim(), this.key)
    }

    await this.appConfigs.updateOne(
      { platform },
      {
        $set: update,
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    )
  }

  async providerCredentialEnv() {
    const configs = await this.appConfigs.find().toArray()
    const env: Record<string, string | undefined> = {}

    for (const config of configs) {
      const clientSecret = config.clientSecret
        ? decryptSecret(config.clientSecret, this.key)
        : undefined

      if (config.platform === 'x') {
        env.X_CLIENT_ID = config.clientId
        env.X_CLIENT_SECRET = clientSecret
      }

      if (config.platform === 'youtube') {
        env.YOUTUBE_CLIENT_ID = config.clientId
        env.YOUTUBE_CLIENT_SECRET = clientSecret
      }

      if (config.platform === 'douyin') {
        env.DOUYIN_CLIENT_KEY = config.clientId
        env.DOUYIN_CLIENT_SECRET = clientSecret
      }
    }

    return env
  }

  async saveOAuthState(state: OAuthStateDoc) {
    await this.states.insertOne(state)
  }

  async consumeOAuthState(platform: PlatformId, state: string) {
    const result = await this.states.findOneAndDelete({
      platform,
      state,
      expiresAt: { $gt: new Date() },
    })

    return result
  }

  async upsertOAuthAccount(platform: PlatformId, token: NormalizedOAuthToken) {
    const now = new Date()
    const accountId = token.accountId ?? readAccountId(platform, token.metadata)
    const doc: StoredAccountDoc = {
      platform,
      accountId,
      label: token.label ?? `${platform}:${accountId}`,
      source: 'oauth',
      accessToken: encryptSecret(token.accessToken, this.key),
      refreshToken: token.refreshToken ? encryptSecret(token.refreshToken, this.key) : undefined,
      scopes: token.scopes,
      tokenType: token.tokenType,
      expiresAt: token.expiresInSeconds
        ? new Date(now.getTime() + token.expiresInSeconds * 1000)
        : undefined,
      metadata: token.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    }

    const { createdAt, ...updateDoc } = doc

    await this.accounts.updateOne(
      { platform, accountId },
      {
        $set: updateDoc,
        $setOnInsert: {
          createdAt,
        },
      },
      { upsert: true },
    )

    return doc
  }

  async upsertManualAccount(platform: PlatformId, input: ManualAccountInput) {
    const now = new Date()
    const accountId = input.accountId ?? 'manual-default'
    const metadata: StoredAccountDoc['metadata'] = {
      uploadEndpoint: input.uploadEndpoint,
      note: input.note,
    }

    const update: Partial<StoredAccountDoc> = {
      platform,
      accountId,
      label: input.label ?? `${platform}:${accountId}`,
      source: 'manual',
      scopes: [],
      metadata,
      updatedAt: now,
    }

    if (input.accessToken) {
      update.accessToken = encryptSecret(input.accessToken, this.key)
    }

    await this.accounts.updateOne(
      { platform, accountId },
      {
        $set: update,
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    )
  }

  async deleteAccount(platform: PlatformId, accountId: string) {
    await this.accounts.deleteOne({ platform, accountId })
  }

  async listAccountSummaries() {
    const accounts = await this.accounts.find().sort({ platform: 1, updatedAt: -1 }).toArray()

    return accounts.map((account) => ({
      platform: account.platform,
      accountId: account.accountId,
      label: account.label,
      source: account.source,
      scopes: account.scopes,
      expiresAt: account.expiresAt?.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
      hasAccessToken: Boolean(account.accessToken),
      hasRefreshToken: Boolean(account.refreshToken),
      metadata: redactedMetadata(account.metadata),
    }))
  }

  async credentialEnv() {
    const accounts = await this.accounts.find().sort({ updatedAt: -1 }).toArray()
    const env: Record<string, string | undefined> = {}
    const seen = new Set<PlatformId>()

    for (const account of accounts) {
      if (seen.has(account.platform)) {
        continue
      }

      seen.add(account.platform)
      const token = account.accessToken ? decryptSecret(account.accessToken, this.key) : undefined

      if (account.platform === 'x' && token) {
        env.X_USER_ACCESS_TOKEN = token
      }

      if (account.platform === 'youtube' && token) {
        env.YOUTUBE_ACCESS_TOKEN = token
      }

      if (account.platform === 'douyin' && token) {
        env.DOUYIN_ACCESS_TOKEN = token
        env.DOUYIN_OPEN_ID = String(account.metadata.openId ?? account.accountId)
      }

      if (account.platform === 'bilibili') {
        env.BILIBILI_ACCESS_TOKEN = token
        env.BILIBILI_UPLOAD_ENDPOINT =
          typeof account.metadata.uploadEndpoint === 'string'
            ? account.metadata.uploadEndpoint
            : undefined
      }
    }

    return env
  }
}

function readAccountId(platform: PlatformId, metadata: NormalizedOAuthToken['metadata']) {
  if (typeof metadata?.openId === 'string') {
    return metadata.openId
  }

  if (typeof metadata?.userId === 'string') {
    return metadata.userId
  }

  return `${platform}-default`
}

function redactedMetadata(metadata: StoredAccountDoc['metadata']) {
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => {
      if (/token|secret|key/i.test(key)) {
        return [key, '[redacted]']
      }

      return [key, value]
    }),
  )
}
