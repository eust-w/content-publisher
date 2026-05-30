import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export function loadLocalEnv(cwd = process.cwd()) {
  for (const filename of ['.env.local', '.env']) {
    const envPath = resolve(cwd, filename)

    if (!existsSync(envPath)) {
      continue
    }

    const content = readFileSync(envPath, 'utf8')

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim()

      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }

      const separator = trimmed.indexOf('=')

      if (separator === -1) {
        continue
      }

      const key = trimmed.slice(0, separator).trim()
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')

      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  }
}

export function envMap() {
  return process.env as Record<string, string | undefined>
}
