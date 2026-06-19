import { ParsedSection } from "./memory-utils"

export const TAG_KEYWORDS: Record<string, string[]> = {
  flutter: ["flutter", "dart", "widget", "riverpod", "app"],
  backend: ["node", "express", "prisma", "postgresql", "api", "server"],
  typescript: ["typescript", "ts", "type", "interface"],
  architecture: ["architecture", "pattern", "structure", "design"],
  ui: ["ui", "ux", "design", "theme", "style", "css", "layout"],
  testing: ["test", "jest", "vitest", "playwright", "e2e"],
  database: ["database", "db", "sql", "migration", "schema"],
  auth: ["auth", "jwt", "token", "login", "permission"],
  devops: ["docker", "ci", "cd", "deploy", "github actions"],
  memory: ["memory", "checkpoint", "session", "plugin"],
  fix: ["fix", "bug", "error", "issue", "patch"],
  performance: ["performance", "optimize", "speed", "cache", "slow"],
  security: ["security", "vulnerability", "xss", "csrf", "sanitize"],
  mobile: ["mobile", "android", "ios", "react native", "flutter"],
  api: ["api", "endpoint", "rest", "graphql", "route"],
}

export function suggestTags(content: string, existingTags: string[] = []): string[] {
  const lower = content.toLowerCase()
  const suggested: Set<string> = new Set()
  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (existingTags.includes(tag)) continue
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        suggested.add(tag)
        break
      }
    }
  }
  return Array.from(suggested)
}

export function calculateSimilarity(a: string, b: string): number {
  const wordsA = a.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  const wordsB = b.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  if (wordsA.length === 0 || wordsB.length === 0) return 0
  const setB = new Set(wordsB)
  let matches = 0
  for (const word of wordsA) {
    if (setB.has(word)) matches++
  }
  return matches / Math.max(wordsA.length, wordsB.length)
}

export const CONFLICT_KEYWORDS: Record<string, string[]> = {
  "replace": ["replace", "thay thế", "chuyển sang", "dùng lại", "upgrade", "downgrade"],
  "remove": ["remove", "xóa", "bỏ", "loại bỏ", "delete", "drop"],
  "change": ["change", "thay đổi", "sửa", "cập nhật", "modify", "update"],
  "not_use": ["không dùng", "not use", "avoid", "tránh", "không nên"],
}

export interface ConflictPair {
  section1: string
  section2: string
  type: "contradicts" | "supersedes" | "outdated"
  reason: string
}

export function detectConflict(a: ParsedSection, b: ParsedSection): ConflictPair | null {
  if (!a.metadata || !b.metadata) return null
  const contentA = a.content.toLowerCase()
  const contentB = b.content.toLowerCase()
  for (const [conflictType, keywords] of Object.entries(CONFLICT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (contentA.includes(keyword) && contentB.includes(keyword)) {
        const wordsA = contentA.split(/\s+/).filter(w => w.length > 4)
        const wordsB = contentB.split(/\s+/).filter(w => w.length > 4)
        const setB = new Set(wordsB)
        const overlap = wordsA.filter(w => setB.has(w)).length
        const similarity = overlap / Math.max(wordsA.length, wordsB.length)
        if (similarity > 0.2) {
          return {
            section1: a.heading,
            section2: b.heading,
            type: conflictType === "replace" ? "supersedes" : conflictType === "remove" ? "outdated" : "contradicts",
            reason: `Both sections contain "${keyword}" and share ${Math.round(similarity * 100)}% vocabulary overlap`,
          }
        }
      }
    }
  }
  return null
}
