import type { PlatformId } from '../../src/domain/publishPlan'

export type OAuthPlatform = Extract<PlatformId, 'x' | 'youtube' | 'douyin'>

export interface OAuthProvider {
  platform: OAuthPlatform
  label: string
  clientIdEnv: string
  clientSecretEnv?: string
  clientSecretRequired?: boolean
  authorizationEndpoint: string
  tokenEndpoint: string
  scopes: string[]
  pkce: boolean
  clientIdParam: 'client_id' | 'client_key'
  extraAuthParams?: Record<string, string>
}

export const authServerDefaultOrigin = 'http://127.0.0.1:4788'

export const oauthProviders: Record<OAuthPlatform, OAuthProvider> = {
  x: {
    platform: 'x',
    label: 'X',
    clientIdEnv: 'X_CLIENT_ID',
    clientSecretEnv: 'X_CLIENT_SECRET',
    clientSecretRequired: false,
    authorizationEndpoint: 'https://x.com/i/oauth2/authorize',
    tokenEndpoint: 'https://api.x.com/2/oauth2/token',
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'media.write', 'offline.access'],
    pkce: true,
    clientIdParam: 'client_id',
  },
  youtube: {
    platform: 'youtube',
    label: 'YouTube',
    clientIdEnv: 'YOUTUBE_CLIENT_ID',
    clientSecretEnv: 'YOUTUBE_CLIENT_SECRET',
    clientSecretRequired: true,
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/youtube.upload'],
    pkce: false,
    clientIdParam: 'client_id',
    extraAuthParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
  douyin: {
    platform: 'douyin',
    label: '抖音',
    clientIdEnv: 'DOUYIN_CLIENT_KEY',
    clientSecretEnv: 'DOUYIN_CLIENT_SECRET',
    clientSecretRequired: true,
    authorizationEndpoint: 'https://open.douyin.com/platform/oauth/connect/',
    tokenEndpoint: 'https://open.douyin.com/oauth/access_token/',
    scopes: ['video.create.bind'],
    pkce: false,
    clientIdParam: 'client_key',
  },
}

export function getAuthServerOrigin(env: Record<string, string | undefined>) {
  return env.LOCAL_AUTH_BASE_URL?.trim() || authServerDefaultOrigin
}

export function redirectUriFor(platform: OAuthPlatform, origin: string) {
  return `${origin.replace(/\/$/, '')}/auth/${platform}/callback`
}

export function buildAuthorizationUrl(input: {
  provider: OAuthProvider
  env: Record<string, string | undefined>
  state: string
  redirectUri: string
  codeChallenge?: string
}) {
  const clientId = input.env[input.provider.clientIdEnv]

  if (!clientId?.trim()) {
    throw new Error(`Missing ${input.provider.clientIdEnv}.`)
  }

  const url = new URL(input.provider.authorizationEndpoint)
  url.searchParams.set(input.provider.clientIdParam, clientId)
  url.searchParams.set('redirect_uri', input.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', input.provider.scopes.join(' '))
  url.searchParams.set('state', input.state)

  if (input.provider.pkce) {
    if (!input.codeChallenge) {
      throw new Error(`${input.provider.label} OAuth requires a PKCE code challenge.`)
    }

    url.searchParams.set('code_challenge', input.codeChallenge)
    url.searchParams.set('code_challenge_method', 'S256')
  }

  for (const [key, value] of Object.entries(input.provider.extraAuthParams ?? {})) {
    url.searchParams.set(key, value)
  }

  return url
}

export function publicProviderConfig(env: Record<string, string | undefined>) {
  return Object.values(oauthProviders).map((provider) => ({
    platform: provider.platform,
    label: provider.label,
    configured: missingProviderKeys(provider, env).length === 0,
    missing: missingProviderKeys(provider, env),
    callbackUrl: redirectUriFor(provider.platform, getAuthServerOrigin(env)),
    scopes: provider.scopes,
    clientId: maskClientId(env[provider.clientIdEnv]),
  }))
}

function missingProviderKeys(provider: OAuthProvider, env: Record<string, string | undefined>) {
  return [
    provider.clientIdEnv,
    provider.clientSecretRequired === false ? undefined : provider.clientSecretEnv,
  ]
    .filter((key): key is string => Boolean(key))
    .filter((key) => !env[key]?.trim())
}

function maskClientId(clientId?: string) {
  if (!clientId?.trim()) {
    return undefined
  }

  if (clientId.length <= 8) {
    return clientId
  }

  return `${clientId.slice(0, 4)}...${clientId.slice(-4)}`
}
