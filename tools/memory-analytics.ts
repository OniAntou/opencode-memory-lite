import { tool } from "@opencode-ai/plugin"
import fs from "fs/promises"
import path from "path"
import { parseSections } from "./memory-utils"
import { readMemoryFile, MEMORY_DIR } from "./memory-io"
import { detectConflict, calculateSimilarity, ConflictPair, suggestTags } from "./memory-analysis-utils"

export interface MemoryStats {
  totalSections: number
  byType: Record<string, number>
  byImportance: Record<string, number>
  tags: Record<string, number>
  avgAgeDays: number
  oldestEntry: string
  newestEntry: string
  filesCount: number
  totalSizeBytes: number
}

export async function collectMemoryStats(): Promise<MemoryStats> {
  const stats: MemoryStats = { totalSections: 0, byType: {}, byImportance: {}, tags: {}, avgAgeDays: 0, oldestEntry: "", newestEntry: "", filesCount: 0, totalSizeBytes: 0 }
  let totalAgeDays = 0, oldestDate = Date.now(), newestDate = 0

  async function walkDir(dir: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) await walkDir(fullPath)
        else if (entry.isFile() && entry.name.endsWith(".md")) {
          const stat = await fs.stat(fullPath)
          stats.filesCount++; stats.totalSizeBytes += stat.size
          const content = await fs.readFile(fullPath, "utf-8")
          const sections = parseSections(content)

          for (const section of sections) {
            if (!section.metadata) continue
            stats.totalSections++
            const meta = section.metadata
            stats.byType[meta.type] = (stats.byType[meta.type] || 0) + 1
            stats.byImportance[meta.importance] = (stats.byImportance[meta.importance] || 0) + 1
            for (const tag of meta.tags) stats.tags[tag] = (stats.tags[tag] || 0) + 1

            const updatedTime = new Date(meta.updated).getTime()
            const ageDays = (Date.now() - updatedTime) / (1000 * 60 * 60 * 24)
            totalAgeDays += ageDays
            if (updatedTime < oldestDate) { oldestDate = updatedTime; stats.oldestEntry = `${section.heading} (${meta.updated})` }
            if (updatedTime > newestDate) { newestDate = updatedTime; stats.newestEntry = `${section.heading} (${meta.updated})` }
          }
        }
      }
    } catch {}
  }
  await walkDir(MEMORY_DIR)
  stats.avgAgeDays = stats.totalSections > 0 ? Math.round(totalAgeDays / stats.totalSections) : 0
  return stats
}

export const memory_stats = tool({
  description: "Display memory statistics: types, importance, tags, age distribution",
  args: {},
  async execute() {
    const stats = await collectMemoryStats()
    const lines: string[] = [
      "=== Memory Statistics ===", "",
      `Files: ${stats.filesCount} (${stats.totalSizeBytes} bytes)`,
      `Total entries with metadata: ${stats.totalSections}`,
      `Average age: ${stats.avgAgeDays} days`, "",
      "--- By Type ---",
    ]
    for (const [type, count] of Object.entries(stats.byType).sort((a, b) => b[1] - a[1])) lines.push(`  ${type}: ${count}`)
    lines.push("", "--- By Importance ---")
    for (const [imp, count] of Object.entries(stats.byImportance).sort((a, b) => b[1] - a[1])) lines.push(`  ${imp}: ${count}`)
    lines.push("", "--- Top Tags ---")
    const sortedTags = Object.entries(stats.tags).sort((a, b) => b[1] - a[1]).slice(0, 15)
    for (const [tag, count] of sortedTags) lines.push(`  ${tag}: ${count}`)
    if (stats.oldestEntry) lines.push("", `Oldest: ${stats.oldestEntry}`)
    if (stats.newestEntry) lines.push(`Newest: ${stats.newestEntry}`)
    return lines.join("\n")
  },
})

interface ValidationResult { file: string; section: string; issues: string[] }

export async function validateMemoryFile(filePath: string): Promise<ValidationResult[]> {
  const results: ValidationResult[] = []
  const content = await readMemoryFile(filePath)
  if (!content.trim()) return results
  const sections = parseSections(content)
  const validTypes = ["architecture", "decision", "convention", "learning", "note", "fix", "feature"]
  const validImportance = ["low", "medium", "high"]

  for (const section of sections) {
    const issues: string[] = []
    if (section.metadata) {
      const meta = section.metadata
      if (!validTypes.includes(meta.type)) issues.push(`Invalid type: "${meta.type}". Valid: ${validTypes.join(", ")}`)
      if (!validImportance.includes(meta.importance)) issues.push(`Invalid importance: "${meta.importance}". Valid: ${validImportance.join(", ")}`)
      if (meta.updated && isNaN(new Date(meta.updated).getTime())) issues.push(`Invalid date: "${meta.updated}"`)
      if (meta.tags.length === 0) issues.push("No tags defined")
    } else {
      issues.push("No metadata comment found")
    }
    if (section.content.trim().length === 0) issues.push("Empty section content")
    if (issues.length > 0) results.push({ file: filePath, section: section.heading, issues })
  }
  return results
}

export const memory_validate = tool({
  description: "Validate memory files: check metadata format, types, dates, and content",
  args: { file: tool.schema.string().optional().describe("Specific file to validate") },
  async execute(args) {
    const files = args.file ? [args.file] : ["MEMORY.md", "notes.md"]
    const allResults: ValidationResult[] = []
    for (const file of files) allResults.push(...await validateMemoryFile(file))
    if (allResults.length === 0) return "All memory files are valid. No issues found."
    const lines: string[] = [`${allResults.length} issue(s) found:`]
    for (const result of allResults) {
      lines.push(`\n[${result.file}] ${result.section}:`)
      for (const issue of result.issues) lines.push(`  - ${issue}`)
    }
    return lines.join("\n")
  },
})

export const memory_suggest_tags = tool({
  description: "Suggest tags for content based on keywords",
  args: {
    content: tool.schema.string().describe("Content to analyze for tag suggestions"),
    existing_tags: tool.schema.string().optional().describe("Existing tags to exclude from suggestions (comma-separated)"),
  },
  async execute(args) {
    const existing = args.existing_tags ? args.existing_tags.split(",").map(t => t.trim()) : []
    const suggested = suggestTags(args.content, existing)
    if (suggested.length === 0) return "No tag suggestions found for this content."
    return `Suggested tags: ${suggested.join(", ")}`
  },
})

export const memory_dedup = tool({
  description: "Find duplicate or similar sections in MEMORY.md",
  args: { threshold: tool.schema.number().optional().describe("Similarity threshold (0-1, default 0.5)") },
  async execute(args) {
    const threshold = args.threshold ?? 0.5
    const content = await readMemoryFile("MEMORY.md")
    if (!content.trim()) return "MEMORY.md is empty."
    const sections = parseSections(content)
    const duplicates = []
    for (let i = 0; i < sections.length; i++) {
      for (let j = i + 1; j < sections.length; j++) {
        const similarity = calculateSimilarity(sections[i].content, sections[j].content)
        if (similarity >= threshold) {
          duplicates.push({ section1: sections[i].heading, section2: sections[j].heading, similarity: Math.round(similarity * 100) })
        }
      }
    }
    if (duplicates.length === 0) return "No duplicate sections found."
    const lines = [`${duplicates.length} potential duplicate(s) found:`]
    for (const dup of duplicates) lines.push(`  ${dup.section1} <-> ${dup.section2} (${dup.similarity}% similar)`)
    return lines.join("\n")
  },
})

export const memory_conflicts = tool({
  description: "Detect conflicting or contradictory memory entries",
  args: { file: tool.schema.string().optional().describe("File to check (default: MEMORY.md)") },
  async execute(args) {
    const content = await readMemoryFile(args.file || "MEMORY.md")
    if (!content.trim()) return "No memory to analyze."
    const sections = parseSections(content)
    const conflicts: ConflictPair[] = []
    for (let i = 0; i < sections.length; i++) {
      for (let j = i + 1; j < sections.length; j++) {
        const conflict = detectConflict(sections[i], sections[j])
        if (conflict) conflicts.push(conflict)
      }
    }
    if (conflicts.length === 0) return "No conflicts detected. All memory entries are consistent."
    const lines = [`${conflicts.length} conflict(s) detected:`]
    for (const conflict of conflicts) {
      lines.push(`\n  ${conflict.section1} <-> ${conflict.section2}`)
      lines.push(`  Type: ${conflict.type}`)
      lines.push(`  Reason: ${conflict.reason}`)
    }
    return lines.join("\n")
  },
})

export const memory_analytics = tool({
  description: "Analyze memory usage patterns and provide insights",
  args: {},
  async execute() {
    const stats = await collectMemoryStats()
    const lines: string[] = ["=== Memory Analytics ===", ""]
    lines.push("--- Type Distribution ---")
    const totalEntries = Object.values(stats.byType).reduce((a, b) => a + b, 0)
    for (const [type, count] of Object.entries(stats.byType).sort((a, b) => b[1] - a[1])) {
      const pct = Math.round((count / totalEntries) * 100); const bar = "█".repeat(Math.round(pct / 5))
      lines.push(`  ${type.padEnd(15)} ${bar} ${pct}% (${count})`)
    }
    lines.push("", "--- Importance Distribution ---")
    for (const [imp, count] of Object.entries(stats.byImportance).sort((a, b) => b[1] - a[1])) {
      const pct = Math.round((count / totalEntries) * 100); const bar = "█".repeat(Math.round(pct / 5))
      lines.push(`  ${imp.padEnd(10)} ${bar} ${pct}% (${count})`)
    }
    lines.push("", "--- Most Used Tags ---")
    const sortedTags = Object.entries(stats.tags).sort((a, b) => b[1] - a[1]).slice(0, 10)
    for (const [tag, count] of sortedTags) lines.push(`  #${tag}: ${count}`)
    
    lines.push("", "--- Health Insights ---")
    if (stats.avgAgeDays > 30) lines.push("  ⚠ Memory is getting old. Consider reviewing outdated entries.")
    if (Object.keys(stats.tags).length < 5) lines.push("  ⚠ Few tags used. Add more tags for better organization.")
    if (stats.totalSections > 50) lines.push("  ⚠ Many entries. Consider consolidating similar sections.")
    if (stats.byImportance["high"] > stats.byImportance["low"] * 3) lines.push("  ⚠ Too many high-importance entries. Consider downgrading some.")
    const hasWarnings = lines.some(line => line.includes("⚠"))
    if (!hasWarnings) lines.push("  ✓ Memory looks healthy!")
    return lines.join("\n")
  },
})

const MEMORY_SIZE_WARNING_THRESHOLD = 50000
const MEMORY_ENTRIES_WARNING_THRESHOLD = 100

export const memory_notifications = tool({
  description: "Check memory health and show notifications/warnings",
  args: {},
  async execute() {
    const notifications: { level: "info" | "warning" | "critical"; message: string }[] = []
    const files = ["MEMORY.md", "checkpoint.md", "notes.md"]
    for (const file of files) {
      const content = await readMemoryFile(file)
      if (content.length > MEMORY_SIZE_WARNING_THRESHOLD) {
        notifications.push({ level: "warning", message: `${file} is large (${Math.round(content.length / 1024)}KB). Consider trimming.` })
      }
    }
    const stats = await collectMemoryStats()
    if (stats.totalSections > MEMORY_ENTRIES_WARNING_THRESHOLD) {
      notifications.push({ level: "warning", message: `${stats.totalSections} entries found. Consider consolidating.` })
    }
    if (stats.avgAgeDays > 60) {
      notifications.push({ level: "info", message: `Average entry age is ${stats.avgAgeDays} days. Review old entries.` })
    }
    const content = await readMemoryFile("MEMORY.md")
    const sections = parseSections(content)
    const noTagSections = sections.filter(s => s.metadata && s.metadata.tags.length === 0)
    if (noTagSections.length > 0) {
      notifications.push({ level: "info", message: `${noTagSections.length} entries have no tags.` })
    }
    const conflicts: ConflictPair[] = []
    for (let i = 0; i < sections.length; i++) {
      for (let j = i + 1; j < sections.length; j++) {
        const conflict = detectConflict(sections[i], sections[j])
        if (conflict) conflicts.push(conflict)
      }
    }
    if (conflicts.length > 0) notifications.push({ level: "warning", message: `${conflicts.length} potential conflict(s) detected.` })

    if (notifications.length === 0) return "✓ No notifications. Memory is healthy!"
    const lines = [`${notifications.length} notification(s):`]
    for (const notif of notifications) {
      const icon = notif.level === "critical" ? "🔴" : notif.level === "warning" ? "🟡" : "🔵"
      lines.push(`  ${icon} ${notif.message}`)
    }
    return lines.join("\n")
  },
})
