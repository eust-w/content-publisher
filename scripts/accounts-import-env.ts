import { loadLocalEnv, envMap } from '../server/config/localEnv'
import { loadOrCreateLocalEncryptionKey } from '../server/security/tokenCrypto'
import { connectMongo } from '../server/storage/mongo'
import { TokenVault } from '../server/storage/tokenVault'

loadLocalEnv()

const env = envMap()
const { client, db } = await connectMongo(env)

try {
  const key = await loadOrCreateLocalEncryptionKey()
  const vault = new TokenVault(db, key)
  await vault.init()

  if (env.X_USER_ACCESS_TOKEN) {
    await vault.upsertManualAccount('x', {
      accountId: 'manual-default',
      label: 'X manual token',
      accessToken: env.X_USER_ACCESS_TOKEN,
    })
  }

  if (env.YOUTUBE_ACCESS_TOKEN) {
    await vault.upsertManualAccount('youtube', {
      accountId: 'manual-default',
      label: 'YouTube manual token',
      accessToken: env.YOUTUBE_ACCESS_TOKEN,
    })
  }

  if (env.DOUYIN_ACCESS_TOKEN || env.DOUYIN_OPEN_ID) {
    await vault.upsertManualAccount('douyin', {
      accountId: env.DOUYIN_OPEN_ID || 'manual-default',
      label: 'Douyin manual token',
      accessToken: env.DOUYIN_ACCESS_TOKEN,
    })
  }

  if (env.BILIBILI_ACCESS_TOKEN || env.BILIBILI_UPLOAD_ENDPOINT) {
    await vault.upsertManualAccount('bilibili', {
      accountId: 'manual-default',
      label: 'Bilibili approved endpoint',
      accessToken: env.BILIBILI_ACCESS_TOKEN,
      uploadEndpoint: env.BILIBILI_UPLOAD_ENDPOINT,
    })
  }

  console.log(JSON.stringify(await vault.listAccountSummaries(), null, 2))
} finally {
  await client.close()
}
