import { readFile } from 'node:fs/promises'
import { basename, extname, isAbsolute, resolve } from 'node:path'
import type { AssetLoader } from '../../src/publishing/types'

const mimeByExtension: Record<string, string> = {
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
}

export const nodeAssetLoader: AssetLoader = async (asset, mediaRoot = process.cwd()) => {
  const assetPath = asset.path ?? asset.name
  const filePath = isAbsolute(assetPath) ? assetPath : resolve(mediaRoot, assetPath)
  const buffer = await readFile(filePath)
  const extension = extname(filePath).toLowerCase()

  return {
    bytes: new Uint8Array(buffer),
    filename: basename(filePath),
    mimeType: asset.mimeType ?? mimeByExtension[extension] ?? 'application/octet-stream',
  }
}
