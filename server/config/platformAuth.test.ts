import { describe, expect, it } from 'vitest'
import { buildAuthorizationUrl, oauthProviders, publicProviderConfig } from './platformAuth'

describe('platform OAuth config', () => {
  it('builds X OAuth URL with PKCE scopes', () => {
    const url = buildAuthorizationUrl({
      provider: oauthProviders.x,
      env: { X_CLIENT_ID: 'client-id' },
      state: 'state-1',
      redirectUri: 'http://127.0.0.1:4788/auth/x/callback',
      codeChallenge: 'challenge-1',
    })

    expect(url.origin + url.pathname).toBe('https://x.com/i/oauth2/authorize')
    expect(url.searchParams.get('client_id')).toBe('client-id')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('scope')).toContain('tweet.write')
  })

  it('marks YouTube app credentials as missing until client id and secret are configured', () => {
    expect(publicProviderConfig({}).find((item) => item.platform === 'youtube')).toMatchObject({
      configured: false,
      missing: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'],
      callbackUrl: 'http://127.0.0.1:4788/auth/youtube/callback',
    })
  })

  it('uses locally stored app credentials as a configured provider source', () => {
    expect(
      publicProviderConfig({
        YOUTUBE_CLIENT_ID: 'youtube-client-id-1234',
        YOUTUBE_CLIENT_SECRET: 'youtube-secret',
      }).find((item) => item.platform === 'youtube'),
    ).toMatchObject({
      configured: true,
      missing: [],
      clientId: 'yout...1234',
    })
  })
})
