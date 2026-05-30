import { describe, expect, it } from 'vitest'
import { createCodeChallenge, randomUrlSafe } from './pkce'

describe('pkce helpers', () => {
  it('creates URL-safe state and verifier values', () => {
    expect(randomUrlSafe()).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('creates a deterministic S256 challenge', () => {
    expect(createCodeChallenge('abc')).toBe('ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0')
  })
})
