import { MongoClient } from 'mongodb'

export const defaultMongoUri = 'mongodb://127.0.0.1:27017/content_publisher'

export function mongoUriFromEnv(env: Record<string, string | undefined>) {
  return env.CONTENT_PUBLISHER_MONGODB_URI?.trim() || defaultMongoUri
}

export function databaseNameFromUri(uri: string) {
  const pathname = new URL(uri).pathname.replace(/^\//, '')

  return pathname || 'content_publisher'
}

export async function connectMongo(env: Record<string, string | undefined>) {
  const uri = mongoUriFromEnv(env)
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: Number(env.CONTENT_PUBLISHER_MONGODB_TIMEOUT_MS ?? 2000),
  })
  await client.connect()

  return {
    client,
    db: client.db(databaseNameFromUri(uri)),
  }
}
