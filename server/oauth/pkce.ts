import { createHash, randomBytes } from 'node:crypto'

export function randomUrlSafe(size = 32) {
  return randomBytes(size).toString('base64url')
}

export function createCodeChallenge(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url')
}
