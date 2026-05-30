import { platformOrder, type PlatformId } from '../../src/domain/publishPlan'

export interface PublishArgs {
  draftId?: string
  platform?: PlatformId
  mediaRoot?: string
  json: boolean
}

export function parsePublishArgs(argv = process.argv.slice(2)): PublishArgs {
  const args: PublishArgs = { json: false }

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]
    const next = argv[index + 1]

    if (current === '--draft' && next) {
      args.draftId = next
      index += 1
      continue
    }

    if (current === '--platform' && next) {
      if (!isPlatformId(next)) {
        throw new Error(`Unsupported platform "${next}". Use one of: ${platformOrder.join(', ')}`)
      }

      args.platform = next
      index += 1
      continue
    }

    if (current === '--media-root' && next) {
      args.mediaRoot = next
      index += 1
      continue
    }

    if (current === '--json') {
      args.json = true
    }
  }

  return args
}

function isPlatformId(value: string): value is PlatformId {
  return platformOrder.includes(value as PlatformId)
}
