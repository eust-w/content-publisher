import { loadLocalEnv, envMap } from '../server/config/localEnv'
import { loadOrCreateLocalEncryptionKey } from '../server/security/tokenCrypto'
import { connectMongo } from '../server/storage/mongo'
import { TokenVault } from '../server/storage/tokenVault'

loadLocalEnv()

const { client, db } = await connectMongo(envMap())

try {
  const key = await loadOrCreateLocalEncryptionKey()
  const vault = new TokenVault(db, key)
  await vault.init()
  console.log(JSON.stringify(await vault.listAccountSummaries(), null, 2))
} finally {
  await client.close()
}
