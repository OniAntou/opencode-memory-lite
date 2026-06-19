import fs from "fs/promises"
import path from "path"
import { getMemoryDir } from "./memory-utils"

export const MEMORY_DIR = getMemoryDir()

interface CacheEntry {
  content: string
  timestamp: number
}

const fileCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 5000

type InvalidateCallback = (filePath: string) => void;
const invalidateCallbacks: InvalidateCallback[] = [];

export function onCacheInvalidated(cb: InvalidateCallback) {
  invalidateCallbacks.push(cb);
}

export function invalidateCache(filePath: string) {
  fileCache.delete(filePath)
  invalidateCallbacks.forEach(cb => cb(filePath));
}

export async function readMemoryFile(relativePath: string): Promise<string> {
  const fullPath = path.join(MEMORY_DIR, relativePath)
  const cached = fileCache.get(fullPath)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.content
  }
  try {
    const content = await fs.readFile(fullPath, "utf-8")
    fileCache.set(fullPath, { content, timestamp: Date.now() })
    return content
  } catch {
    return ""
  }
}

export async function writeMemoryFile(relativePath: string, content: string): Promise<void> {
  const fullPath = path.join(MEMORY_DIR, relativePath)
  await fs.mkdir(path.dirname(fullPath), { recursive: true })
  await fs.writeFile(fullPath, content, "utf-8")
  invalidateCache(fullPath)
}

export async function getTaskIds(): Promise<string[]> {
  const tasksDir = path.join(MEMORY_DIR, "tasks")
  const taskIds: string[] = []
  try {
    const entries = await fs.readdir(tasksDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory() && /^T[\d.]+$/.test(entry.name)) {
        taskIds.push(entry.name)
      }
    }
  } catch {}
  return taskIds.sort()
}
