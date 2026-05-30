import { describe, expect, it } from 'vitest'
import { normalizeTokenResponse } from './exchange'

describe('normalizeTokenResponse', () => {
  it('normalizes Douyin nested token payloads', () => {
    expect(
      normalizeTokenResponse('douyin', {
        data: {
          access_token: 'token',
          refresh_token: 'refresh',
          open_id: 'open-id',
          expires_in: 7200,
        },
      }),
    ).toMatchObject({
      accountId: 'open-id',
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresInSeconds: 7200,
      metadata: { openId: 'open-id' },
    })
  })
})
