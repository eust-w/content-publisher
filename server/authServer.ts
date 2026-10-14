import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { loadLocalEnv, envMap } from './config/localEnv'
import {
  buildAuthorizationUrl,
  getAuthServerOrigin,
  oauthProviders,
  publicProviderConfig,
  redirectUriFor,
  type OAuthPlatform,
} from './config/platformAuth'
import { exchangeOAuthCode } from './oauth/exchange'
import { createCodeChallenge, randomUrlSafe } from './oauth/pkce'
import { loadOrCreateLocalEncryptionKey } from './security/tokenCrypto'
import { connectMongo } from './storage/mongo'
import { TokenVault } from './storage/tokenVault'

loadLocalEnv()

const env = envMap()
const port = Number(env.LOCAL_AUTH_PORT ?? 4788)
const origin = getAuthServerOrigin(env)
const { client, db } = await connectMongo(env)
const key = await loadOrCreateLocalEncryptionKey()
const vault = new TokenVault(db, key)
await vault.init()

const server = createServer(async (request, response) => {
  try {
    await route(request, response)
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Auth server: ${origin}`)
  console.log("MongoDB: connected")
  console.log(`Providers: ${Object.keys(oauthProviders).join(', ')}`)
})

async function route(request: IncomingMessage, response: ServerResponse) {
  const requestUrl = new URL(request.url ?? '/', origin)

  setCors(request, response)
  const allowedOrigin = env.LOCAL_FRONTEND_ORIGIN ?? 'http://localhost:5173'
  if (request.headers.origin && request.headers.origin !== allowedOrigin) {
    sendJson(response, 403, { error: 'Origin not allowed' })
    return
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(204)
    response.end()
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/health') {
    await db.command({ ping: 1 })
    sendJson(response, 200, { ok: true, database: "connected", origin })
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/providers') {
    sendJson(response, 200, { providers: await publicProviders() })
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/accounts') {
    sendJson(response, 200, {
      providers: await publicProviders(),
      accounts: await vault.listAccountSummaries(),
    })
    return
  }

  const appConfig = requestUrl.pathname.match(/^\/api\/provider-configs\/([^/]+)$/)
  if (request.method === 'POST' && appConfig) {
    const platform = readOAuthPlatform(appConfig[1])
    const body = await readJsonBody(request)
    await vault.upsertPlatformAppConfig(platform, {
      clientId: requiredString(body.clientId, 'clientId'),
      clientSecret: readString(body.clientSecret),
    })
    sendJson(response, 200, {
      ok: true,
      providers: await publicProviders(),
    })
    return
  }

  const authStart = requestUrl.pathname.match(/^\/auth\/([^/]+)\/start$/)
  if (request.method === 'GET' && authStart) {
    await startOAuth(authStart[1], response)
    return
  }

  const authCallback = requestUrl.pathname.match(/^\/auth\/([^/]+)\/callback$/)
  if (request.method === 'GET' && authCallback) {
    await finishOAuth(authCallback[1], requestUrl, response)
    return
  }

  const manualAccount = requestUrl.pathname.match(/^\/api\/accounts\/([^/]+)\/manual$/)
  if (request.method === 'POST' && manualAccount) {
    const platform = readPlatform(manualAccount[1])
    const body = await readJsonBody(request)
    await vault.upsertManualAccount(platform, {
      accountId: readString(body.accountId),
      label: readString(body.label),
      accessToken: readString(body.accessToken),
      uploadEndpoint: readString(body.uploadEndpoint),
      note: readString(body.note),
    })
    sendJson(response, 200, { ok: true })
    return
  }

  const deleteAccount = requestUrl.pathname.match(/^\/api\/accounts\/([^/]+)\/([^/]+)$/)
  if (request.method === 'DELETE' && deleteAccount) {
    await vault.deleteAccount(readPlatform(deleteAccount[1]), decodeURIComponent(deleteAccount[2]))
    sendJson(response, 200, { ok: true })
    return
  }

  sendJson(response, 404, { error: 'Not found' })
}

async function startOAuth(platformText: string, response: ServerResponse) {
  const platform = readOAuthPlatform(platformText)
  const provider = oauthProviders[platform]
  const providerEnv = await runtimeProviderEnv()
  const state = randomUrlSafe(24)
  const codeVerifier = provider.pkce ? randomUrlSafe(64) : undefined
  const redirectUri = redirectUriFor(platform, origin)
  const url = buildAuthorizationUrl({
    provider,
    env: providerEnv,
    state,
    redirectUri,
    codeChallenge: codeVerifier ? createCodeChallenge(codeVerifier) : undefined,
  })

  await vault.saveOAuthState({
    platform,
    state,
    codeVerifier,
    redirectUri,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  })

  response.writeHead(302, { Location: url.toString() })
  response.end()
}

async function finishOAuth(platformText: string, requestUrl: URL, response: ServerResponse) {
  const platform = readOAuthPlatform(platformText)
  const state = requestUrl.searchParams.get('state')
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')

  if (error) {
    sendHtml(response, 400, `<h1>Authorization failed</h1><p>${escapeHtml(error)}</p>`)
    return
  }

  if (!state || !code) {
    sendHtml(response, 400, '<h1>Authorization failed</h1><p>Missing state or code.</p>')
    return
  }

  const savedState = await vault.consumeOAuthState(platform, state)

  if (!savedState) {
    sendHtml(response, 400, '<h1>Authorization failed</h1><p>State expired or invalid.</p>')
    return
  }

  const token = await exchangeOAuthCode({
    provider: oauthProviders[platform],
    env: await runtimeProviderEnv(),
    code,
    redirectUri: savedState.redirectUri,
    codeVerifier: savedState.codeVerifier,
  })
  const account = await vault.upsertOAuthAccount(platform, token)

  sendHtml(
    response,
    200,
    `<h1>${oauthProviders[platform].label} connected</h1><p>Saved account ${escapeHtml(
      account.accountId,
    )} to local MongoDB.</p><p>You can close this tab.</p>`,
  )
}

async function runtimeProviderEnv() {
  return {
    ...env,
    ...(await vault.providerCredentialEnv()),
  }
}

async function publicProviders() {
  return publicProviderConfig(await runtimeProviderEnv())
}

function readOAuthPlatform(value: string): OAuthPlatform {
  if (value === 'x' || value === 'youtube' || value === 'douyin') {
    return value
  }

  throw new Error(`OAuth login is not available for ${value}.`)
}

function readPlatform(value: string) {
  if (
    value === 'xhs' ||
    value === 'douyin' ||
    value === 'bilibili' ||
    value === 'youtube' ||
    value === 'x'
  ) {
    return value
  }

  throw new Error(`Unsupported platform ${value}.`)
}

async function readJsonBody(request: IncomingMessage) {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  if (chunks.length === 0) {
    return {} as Record<string, unknown>
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function requiredString(value: unknown, field: string) {
  const text = readString(value)

  if (!text) {
    throw new Error(`${field} is required.`)
  }

  return text
}

function sendJson(response: ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(payload, null, 2))
}

function sendHtml(response: ServerResponse, status: number, html: string) {
  response.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
  })
  response.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${html}`)
}

function setCors(request: IncomingMessage, response: ServerResponse) {
  const allowedOrigin = env.LOCAL_FRONTEND_ORIGIN ?? 'http://localhost:5173'
  if (request.headers.origin === allowedOrigin) response.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  response.setHeader('Vary', 'Origin')
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

process.on('SIGINT', async () => {
  await client.close()
  process.exit(0)
})
