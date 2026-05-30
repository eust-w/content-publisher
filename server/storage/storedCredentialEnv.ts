import { envMap } from '../config/localEnv'
import { loadOrCreateLocalEncryptionKey } from '../security/tokenCrypto'
import { connectMongo } from './mongo'
import { TokenVault } from './tokenVault'

export async function tryLoadStoredCredentialEnv(env = envMap(), cwd = process.cwd()) {
  try {
    const { client, db } = await connectMongo(env)

    try {
      const key = await loadOrCreateLocalEncryptionKey(cwd)
      const vault = new TokenVault(db, key)
      await vault.init()

      return await vault.credentialEnv()
    } finally {
      await client.close()
    }
  } catch {
    return {}
  }
}
