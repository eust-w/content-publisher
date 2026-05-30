import { seedDrafts } from '../src/domain/publishPlan'
import { buildPublishQueue, runPublishQueue } from '../src/publishing/publishQueue'
import { parsePublishArgs } from './lib/args'
import { envMap, loadLocalEnv } from './lib/env'
import { nodeAssetLoader } from './lib/nodeAssetLoader'

loadLocalEnv()

const args = parsePublishArgs()

if (!args.platform) {
  throw new Error('Live publishing requires --platform so one command cannot post everywhere.')
}

const draft = seedDrafts.find((item) => item.id === args.draftId) ?? seedDrafts[0]
const credentials = envMap()
const jobs = buildPublishQueue(draft, credentials).filter((job) => job.platform === args.platform)
const results = await runPublishQueue(draft, jobs, {
  credentials,
  dryRun: false,
  assetLoader: nodeAssetLoader,
  mediaRoot: args.mediaRoot,
})

if (args.json) {
  console.log(JSON.stringify({ draft: draft.id, results }, null, 2))
} else {
  console.log(`Live publish: ${draft.id} - ${draft.title}`)
  for (const result of results) {
    console.log(`- ${result.platform}: ${result.status} - ${result.message}`)

    if (result.url) {
      console.log(`  ${result.url}`)
    }
  }
}
