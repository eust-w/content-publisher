import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { decryptSecret, encryptSecret } from './tokenCrypto'

describe('token crypto', () => {
  it('encrypts tokens without storing plaintext', () => {
    const key = randomBytes(32)
    const encrypted = encryptSecret('secret-token', key)

    expect(encrypted.ciphertext).not.toContain('secret-token')
    expect(decryptSecret(encrypted, key)).toBe('secret-token')
  })
})
