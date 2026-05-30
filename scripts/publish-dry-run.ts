import { seedDrafts } from '../src/domain/publishPlan'
import { buildPublishQueue, runPublishQueue } from '../src/publishing/publishQueue'
import { parsePublishArgs } from './lib/args'
import { envMap, loadLocalEnv } from './lib/env'

loadLocalEnv()

const args = parsePublishArgs()
const draft = seedDrafts.find((item) => item.id === args.draftId) ?? seedDrafts[0]
const credentials = envMap()
const jobs = buildPublishQueue(draft, credentials).filter(
  (job) => !args.platform || job.platform === args.platform,
)
const results = await runPublishQueue(draft, jobs, {
  credentials,
  dryRun: true,
})

if (args.json) {
  console.log(JSON.stringify({ draft: draft.id, results }, null, 2))
} else {
  console.log(`Dry run: ${draft.id} - ${draft.title}`)
  for (const result of results) {
    console.log(`- ${result.platform}: ${result.status} - ${result.message}`)
  }
}
