import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { chmod } from 'node:fs/promises'
import { resolve } from 'node:path'

export interface EncryptedSecret {
  algorithm: 'aes-256-gcm'
  iv: string
  tag: string
  ciphertext: string
}

export function encryptSecret(value: string, key: Buffer): EncryptedSecret {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', normalizeKey(key), iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])

  return {
    algorithm: 'aes-256-gcm',
    iv: iv.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url'),
    ciphertext: ciphertext.toString('base64url'),
  }
}

export function decryptSecret(secret: EncryptedSecret, key: Buffer) {
  const decipher = createDecipheriv(
    secret.algorithm,
    normalizeKey(key),
    Buffer.from(secret.iv, 'base64url'),
  )
  decipher.setAuthTag(Buffer.from(secret.tag, 'base64url'))

  return Buffer.concat([
    decipher.update(Buffer.from(secret.ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

export async function loadOrCreateLocalEncryptionKey(cwd = process.cwd()) {
  if (process.env.LOCAL_TOKEN_ENCRYPTION_KEY?.trim()) {
    return Buffer.from(process.env.LOCAL_TOKEN_ENCRYPTION_KEY.trim(), 'base64url')
  }

  const keyPath = resolve(cwd, '.content-publisher.key')

  if (existsSync(keyPath)) {
    return Buffer.from(readFileSync(keyPath, 'utf8').trim(), 'base64url')
  }

  const key = randomBytes(32)
  writeFileSync(keyPath, key.toString('base64url'), { mode: 0o600 })
  await chmod(keyPath, 0o600)

  return key
}

function normalizeKey(key: Buffer) {
  if (key.byteLength === 32) {
    return key
  }

  throw new Error('Token encryption key must be 32 bytes.')
}
