import type { OAuthPlatform, OAuthProvider } from '../config/platformAuth'
import type { NormalizedOAuthToken } from '../storage/tokenVault'

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export interface ExchangeOAuthCodeInput {
  provider: OAuthProvider
  env: Record<string, string | undefined>
  code: string
  redirectUri: string
  codeVerifier?: string
  fetch?: FetchLike
}

export async function exchangeOAuthCode(input: ExchangeOAuthCodeInput) {
  const fetcher = input.fetch ?? fetch
  const body = new URLSearchParams()
  const clientId = requiredEnv(input.env, input.provider.clientIdEnv)
  const clientSecret = input.provider.clientSecretEnv
    ? input.env[input.provider.clientSecretEnv]
    : undefined

  body.set('code', input.code)
  body.set('grant_type', 'authorization_code')
  body.set('redirect_uri', input.redirectUri)

  if (input.provider.platform === 'douyin') {
    body.set('client_key', clientId)
  } else {
    body.set('client_id', clientId)
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  }

  if (input.provider.platform === 'x' && clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
  } else if (clientSecret) {
    body.set(input.provider.platform === 'douyin' ? 'client_secret' : 'client_secret', clientSecret)
  }

  if (input.provider.pkce && input.codeVerifier) {
    body.set('code_verifier', input.codeVerifier)
  }

  const response = await fetcher(input.provider.tokenEndpoint, {
    method: 'POST',
    headers,
    body,
  })

  if (!response.ok) {
    throw new Error(`Token exchange failed: HTTP ${response.status} ${await response.text()}`)
  }

  return normalizeTokenResponse(input.provider.platform, await response.json())
}

export function normalizeTokenResponse(
  platform: OAuthPlatform,
  payload: unknown,
): NormalizedOAuthToken {
  const tokenPayload = readRecord(readRecord(payload).data ?? payload)
  const accessToken = readString(tokenPayload.access_token)

  if (!accessToken) {
    throw new Error(`${platform} token response did not include access_token.`)
  }

  const scopeText = readString(tokenPayload.scope)
  const openId = readString(tokenPayload.open_id)
  const userId = readString(tokenPayload.user_id) ?? readString(tokenPayload.id)

  return {
    accountId: openId ?? userId,
    accessToken,
    refreshToken: readString(tokenPayload.refresh_token),
    scopes: scopeText ? scopeText.split(/\s+/).filter(Boolean) : [],
    tokenType: readString(tokenPayload.token_type),
    expiresInSeconds: readNumber(tokenPayload.expires_in),
    metadata: {
      openId,
      userId,
    },
  }
}

function requiredEnv(env: Record<string, string | undefined>, key: string) {
  const value = env[key]

  if (!value?.trim()) {
    throw new Error(`Missing ${key}.`)
  }

  return value
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function readNumber(value: unknown) {
  return typeof value === 'number' ? value : undefined
}
