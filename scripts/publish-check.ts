import { seedDrafts } from '../src/domain/publishPlan'
import { summarizeCredentialReadiness } from '../src/publishing/credentials'
import { buildPublishQueue } from '../src/publishing/publishQueue'
import { tryLoadStoredCredentialEnv } from '../server/storage/storedCredentialEnv'
import { parsePublishArgs } from './lib/args'
import { envMap, loadLocalEnv } from './lib/env'

loadLocalEnv()

const args = parsePublishArgs()
const draft = seedDrafts.find((item) => item.id === args.draftId) ?? seedDrafts[0]
const runtimeEnv = envMap()
const credentials = {
  ...(await tryLoadStoredCredentialEnv(runtimeEnv)),
  ...runtimeEnv,
}
const readiness = summarizeCredentialReadiness(credentials)
const queue = buildPublishQueue(draft, credentials).filter(
  (job) => !args.platform || job.platform === args.platform,
)

if (args.json) {
  console.log(JSON.stringify({ draft: draft.id, readiness, queue }, null, 2))
} else {
  console.log(`Draft: ${draft.id} - ${draft.title}`)
  console.log('\nCredential readiness:')
  for (const item of readiness) {
    const missing = item.missing.map((requirement) => requirement.key).join(', ') || 'none'
    console.log(`- ${item.platform}: ${item.ready ? 'ready' : 'missing'} (${missing})`)
  }

  console.log('\nPublish queue:')
  for (const job of queue) {
    console.log(`- ${job.platform}: ${job.status}`)

    if (job.blockingReasons.length > 0) {
      console.log(`  ${job.blockingReasons.join(' ')}`)
    }
  }
}
