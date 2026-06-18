import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'

const MEMORY_DIR = '.opencode/memory-test'
const TEST_MEMORY_FILE = path.join(MEMORY_DIR, 'MEMORY.md')
const TEST_NOTES_FILE = path.join(MEMORY_DIR, 'notes.md')

async function cleanup() {
  try {
    await fs.rm(MEMORY_DIR, { recursive: true, force: true })
  } catch {}
}

async function setupTestMemory() {
  await fs.mkdir(MEMORY_DIR, { recursive: true })
  await fs.writeFile(TEST_MEMORY_FILE, `# Project Memory

## Architecture
<!-- type: architecture | tags: opencode, plugins | importance: high | updated: 2026-06-18 -->

OpenCode extension points and plugin system.

## Conventions
<!-- type: convention | tags: coding-style | importance: medium | updated: 2026-06-17 -->

Package manager: npm, config format: JSON.
`)
}

describe('Memory Metadata Parsing', () => {
  beforeEach(async () => {
    await cleanup()
    await setupTestMemory()
  })

  afterEach(async () => {
    await cleanup()
  })

  it('should parse metadata from comment', async () => {
    const content = await fs.readFile(TEST_MEMORY_FILE, 'utf-8')
    expect(content).toContain('<!-- type: architecture')
    expect(content).toContain('tags: opencode, plugins')
    expect(content).toContain('importance: high')
  })

  it('should have valid metadata format', async () => {
    const content = await fs.readFile(TEST_MEMORY_FILE, 'utf-8')
    const metaMatch = content.match(/<!--\s*type:\s*(\w+)\s*\|/)
    expect(metaMatch).toBeTruthy()
    expect(metaMatch![1]).toBe('architecture')
  })
})

describe('Memory File Operations', () => {
  beforeEach(async () => {
    await cleanup()
    await setupTestMemory()
  })

  afterEach(async () => {
    await cleanup()
  })

  it('should read memory file', async () => {
    const content = await fs.readFile(TEST_MEMORY_FILE, 'utf-8')
    expect(content).toContain('# Project Memory')
    expect(content).toContain('## Architecture')
  })

  it('should write to memory file', async () => {
    const newContent = '## Test\nTest content'
    await fs.writeFile(TEST_MEMORY_FILE, newContent)
    const content = await fs.readFile(TEST_MEMORY_FILE, 'utf-8')
    expect(content).toBe(newContent)
  })

  it('should append to memory file', async () => {
    const existing = await fs.readFile(TEST_MEMORY_FILE, 'utf-8')
    const append = '\n## New Section\nNew content'
    await fs.writeFile(TEST_MEMORY_FILE, existing + append)
    const content = await fs.readFile(TEST_MEMORY_FILE, 'utf-8')
    expect(content).toContain('## New Section')
  })
})

describe('Auto-tagging Logic', () => {
  it('should suggest backend tags for database content', () => {
    const TAG_KEYWORDS: Record<string, string[]> = {
      backend: ['node', 'express', 'prisma', 'postgresql', 'api', 'server'],
      database: ['database', 'db', 'sql', 'migration', 'schema'],
      flutter: ['flutter', 'dart', 'widget', 'riverpod', 'app'],
    }

    function suggestTags(content: string): string[] {
      const lower = content.toLowerCase()
      const suggested: Set<string> = new Set()

      for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
        for (const keyword of keywords) {
          if (lower.includes(keyword)) {
            suggested.add(tag)
            break
          }
        }
      }

      return Array.from(suggested)
    }

    expect(suggestTags('Use PostgreSQL for database')).toContain('database')
    expect(suggestTags('Use PostgreSQL for database')).toContain('backend')
    expect(suggestTags('Flutter app with widgets')).toContain('flutter')
  })

  it('should not suggest tags for unrelated content', () => {
    const TAG_KEYWORDS: Record<string, string[]> = {
      backend: ['node', 'express', 'prisma', 'postgresql', 'api', 'server'],
      database: ['database', 'db', 'sql', 'migration', 'schema'],
    }

    function suggestTags(content: string): string[] {
      const lower = content.toLowerCase()
      const suggested: Set<string> = new Set()

      for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
        for (const keyword of keywords) {
          if (lower.includes(keyword)) {
            suggested.add(tag)
            break
          }
        }
      }

      return Array.from(suggested)
    }

    expect(suggestTags('Hello world')).toHaveLength(0)
  })
})

describe('Similarity Calculation', () => {
  it('should return 1.0 for identical content', () => {
    function calculateSimilarity(a: string, b: string): number {
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

    expect(calculateSimilarity('hello world test', 'hello world test')).toBe(1.0)
  })

  it('should return 0.0 for completely different content', () => {
    function calculateSimilarity(a: string, b: string): number {
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

    expect(calculateSimilarity('apple banana cherry', 'xyz foo bar')).toBe(0.0)
  })

  it('should return value between 0 and 1 for partial overlap', () => {
    function calculateSimilarity(a: string, b: string): number {
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

    const result = calculateSimilarity('hello world test foo', 'hello world bar baz')
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(1)
  })
})

describe('Levenshtein Distance', () => {
  it('should return 0 for identical strings', () => {
    function levenshteinDistance(a: string, b: string): number {
      const m = a.length
      const n = b.length
      const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
      for (let i = 0; i <= m; i++) dp[i][0] = i
      for (let j = 0; j <= n; j++) dp[0][j] = j
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          if (a[i - 1] === b[j - 1]) {
            dp[i][j] = dp[i - 1][j - 1]
          } else {
            dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
          }
        }
      }
      return dp[m][n]
    }

    expect(levenshteinDistance('hello', 'hello')).toBe(0)
  })

  it('should return correct distance for different strings', () => {
    function levenshteinDistance(a: string, b: string): number {
      const m = a.length
      const n = b.length
      const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
      for (let i = 0; i <= m; i++) dp[i][0] = i
      for (let j = 0; j <= n; j++) dp[0][j] = j
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          if (a[i - 1] === b[j - 1]) {
            dp[i][j] = dp[i - 1][j - 1]
          } else {
            dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
          }
        }
      }
      return dp[m][n]
    }

    expect(levenshteinDistance('kitten', 'sitting')).toBe(3)
  })
})

describe('Conflict Detection', () => {
  it('should detect conflict with replacement keywords', () => {
    const CONFLICT_KEYWORDS: Record<string, string[]> = {
      replace: ['replace', 'thay thế', 'chuyển sang'],
      remove: ['remove', 'xóa', 'bỏ'],
    }

    function hasConflictKeywords(content: string): boolean {
      const lower = content.toLowerCase()
      for (const keywords of Object.values(CONFLICT_KEYWORDS)) {
        for (const keyword of keywords) {
          if (lower.includes(keyword)) return true
        }
      }
      return false
    }

    expect(hasConflictKeywords('Thay thế PostgreSQL bằng MongoDB')).toBe(true)
    expect(hasConflictKeywords('Chuyển sang MySQL')).toBe(true)
    expect(hasConflictKeywords('Sử dụng PostgreSQL')).toBe(false)
  })
})

describe('Token Estimation', () => {
  it('should estimate tokens correctly', () => {
    function estimateTokens(text: string): number {
      return Math.ceil(text.length / 4)
    }

    expect(estimateTokens('hello')).toBe(2)
    expect(estimateTokens('hello world test')).toBe(4)
    expect(estimateTokens('')).toBe(0)
  })
})

describe('Metadata Boost Calculation', () => {
  it('should boost high importance entries', () => {
    function calculateMetadataBoost(importance: string, ageDays: number): number {
      let boost = 0
      if (importance === 'high') boost += 20
      else if (importance === 'medium') boost += 10

      if (ageDays < 7) boost += 15
      else if (ageDays < 30) boost += 5
      else boost -= 5

      return boost
    }

    expect(calculateMetadataBoost('high', 1)).toBe(35)
    expect(calculateMetadataBoost('medium', 1)).toBe(25)
    expect(calculateMetadataBoost('low', 1)).toBe(15)
    expect(calculateMetadataBoost('high', 60)).toBe(15)
  })
})
