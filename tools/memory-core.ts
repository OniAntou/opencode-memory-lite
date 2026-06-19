import { tool } from "@opencode-ai/plugin"
import fs from "fs/promises"
import path from "path"
import { readMemoryFile, writeMemoryFile, MEMORY_DIR } from "./memory-io"
import { MemoryMetadata, ParsedSection, metadataToComment, parseSections, rebuildMemoryFile } from "./memory-utils"
import { suggestTags, calculateSimilarity, detectConflict } from "./memory-analysis-utils"

export const memory_read = tool({
  description: "Read a memory file. Files: MEMORY.md (project knowledge), checkpoint.md (session state), notes.md (scratch), tasks/{id}/progress.md (task progress)",
  args: { file: tool.schema.string().describe("Memory file path relative to .opencode/memory/") },
  async execute(args) { return await readMemoryFile(args.file) },
})

export const memory_write = tool({
  description: "Write content to a memory file. Auto-detect tags, duplicates and conflicts.",
  args: {
    file: tool.schema.string().describe("Memory file path"),
    content: tool.schema.string().describe("Content to write"),
    mode: tool.schema.enum(["append", "overwrite"]).describe("Write mode").default("append"),
    type: tool.schema.string().optional().describe("Memory type"),
    tags: tool.schema.string().optional().describe("Comma-separated tags"),
    importance: tool.schema.enum(["low", "medium", "high"]).optional().describe("Importance level"),
  },
  async execute(args) {
    const warnings: string[] = []
    if (args.file === "MEMORY.md" && args.type) {
      let finalTags = args.tags ? args.tags.split(",").map(t => t.trim()) : []
      if (!args.tags && args.content.length > 20) {
        const suggested = suggestTags(args.content)
        if (suggested.length > 0) {
          finalTags = suggested
          warnings.push(`Auto-tagged: ${suggested.join(", ")}`)
        }
      }
      const meta: MemoryMetadata = { type: args.type, tags: finalTags, importance: args.importance || "medium", updated: new Date().toISOString().split("T")[0] }
      const metaComment = metadataToComment(meta)
      const fullContent = `${metaComment}\n${args.content}`
      const existing = await readMemoryFile(args.file)
      const newHeading = `## ${args.type.charAt(0).toUpperCase() + args.type.slice(1)}`

      let existingSections: ParsedSection[] | null = null
      if (args.content.length > 30) {
        existingSections = parseSections(existing)
        for (const section of existingSections) {
          if (section.content.trim().length < 10) continue
          const similarity = calculateSimilarity(args.content, section.content)
          if (similarity > 0.5) warnings.push(`Potential duplicate of "${section.heading}" (${Math.round(similarity * 100)}% similar)`)
        }
        const newSection: ParsedSection = { heading: newHeading, metadata: meta, content: args.content }
        for (const section of existingSections) {
          if (!section.metadata) continue
          const conflict = detectConflict(newSection, section)
          if (conflict) warnings.push(`Conflict with "${section.heading}": ${conflict.reason}`)
        }
      }

      if (args.mode === "overwrite") {
        await writeMemoryFile(args.file, `# Project Memory\n\n${newHeading}\n${fullContent}\n`)
      } else {
        const sections = existingSections || parseSections(existing)
        sections.push({ heading: newHeading, metadata: meta, content: args.content })
        await writeMemoryFile(args.file, rebuildMemoryFile(sections))
      }
      const result = `Written to ${args.file} with metadata (type: ${args.type}, importance: ${meta.importance})`
      return warnings.length > 0 ? `${result}\n\nWarnings:\n${warnings.map(w => `- ${w}`).join("\n")}` : result
    }

    if (args.mode === "overwrite") {
      await writeMemoryFile(args.file, args.content)
    } else {
      const existing = await readMemoryFile(args.file)
      const separator = existing.trim() ? "\n\n" : ""
      await writeMemoryFile(args.file, existing + separator + args.content)
    }
    return `Written to ${args.file} (${args.mode} mode)`
  },
})

export const memory_list = tool({
  description: "List all memory files and their sizes",
  args: {},
  async execute() {
    const files: string[] = []
    async function walk(dir: string, prefix = "") {
      try {
        const entries = await fs.readdir(path.join(MEMORY_DIR, dir), { withFileTypes: true })
        for (const entry of entries) {
          const rel = prefix ? `${prefix}/${entry.name}` : entry.name
          if (entry.isDirectory()) {
            await walk(path.join(dir, entry.name), rel)
          } else if (entry.name.endsWith(".md")) {
            const stat = await fs.stat(path.join(MEMORY_DIR, rel))
            files.push(`${rel} (${stat.size} bytes, modified: ${stat.mtime.toISOString()})`)
          }
        }
      } catch {}
    }
    await walk("")
    return files.length > 0 ? files.join("\n") : "No memory files found."
  },
})

export const memory_consolidate = tool({
  description: "Consolidate MEMORY.md: merge duplicate sections, remove empty sections, reorganize by type",
  args: {},
  async execute() {
    const content = await readMemoryFile("MEMORY.md")
    if (!content.trim()) return "MEMORY.md is empty."
    const sections = parseSections(content)
    const merged = new Map<string, ParsedSection>()
    for (const section of sections) {
      const key = section.heading.toLowerCase()
      if (merged.has(key)) {
        const existing = merged.get(key)!
        existing.content += "\n\n" + section.content
        if (section.metadata && !existing.metadata) existing.metadata = section.metadata
      } else {
        merged.set(key, { ...section })
      }
    }
    const consolidated = Array.from(merged.values()).filter(s => s.content.trim())
    await writeMemoryFile("MEMORY.md", rebuildMemoryFile(consolidated))
    const removedCount = sections.length - consolidated.length
    return `Consolidated: merged ${sections.length} sections into ${consolidated.length}, removed ${removedCount} empty sections.`
  },
})

export const memory_share = tool({
  description: "Export a memory section to shared storage (cross-project)",
  args: { heading: tool.schema.string().describe("Section heading to export"), project: tool.schema.string().describe("Project name to share with") },
  async execute(args) {
    const content = await readMemoryFile("MEMORY.md")
    const sections = parseSections(content)
    const targetHeading = args.heading.startsWith("## ") ? args.heading : `## ${args.heading}`
    const section = sections.find(s => s.heading === targetHeading)
    if (!section) return `Section "${args.heading}" not found in MEMORY.md.`
    await fs.mkdir(path.join(MEMORY_DIR, "shared"), { recursive: true })
    const sharedRelativePath = path.join("shared", `${args.project}.md`)
    const existing = await readMemoryFile(sharedRelativePath)
    const metaComment = section.metadata ? metadataToComment(section.metadata) : ""
    const entry = `\n\n${section.heading}\n${metaComment}\n${section.content.trim()}\n`
    await writeMemoryFile(sharedRelativePath, existing + entry)
    return `Shared "${args.heading}" to project "${args.project}".`
  },
})

export const memory_import_shared = tool({
  description: "Import shared memory from another project",
  args: { project: tool.schema.string().describe("Project name to import from") },
  async execute(args) {
    const sharedContent = await readMemoryFile(path.join("shared", `${args.project}.md`))
    if (!sharedContent.trim()) return `No shared memory found for project "${args.project}".`
    const existing = await readMemoryFile("MEMORY.md")
    const separator = existing.trim() ? "\n\n" : ""
    await writeMemoryFile("MEMORY.md", existing + separator + `\n---\n# Imported from: ${args.project}\n` + sharedContent)
    return `Imported shared memory from project "${args.project}".`
  },
})

export const memory_export_json = tool({
  description: "Export all memory files to JSON format",
  args: { file: tool.schema.string().optional().describe("Export file path") },
  async execute(args) {
    const exportData = { version: 1, timestamp: new Date().toISOString(), files: {} as Record<string, string> }
    for (const file of ["MEMORY.md", "checkpoint.md", "notes.md"]) {
      const content = await readMemoryFile(file)
      if (content.trim()) exportData.files[file] = content
    }
    const tasksDir = path.join(MEMORY_DIR, "tasks")
    try {
      const entries = await fs.readdir(tasksDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory() && /^T[\d.]+$/.test(entry.name)) {
          const taskContent = await readMemoryFile(path.join("tasks", entry.name, "progress.md"))
          if (taskContent.trim()) exportData.files[`tasks/${entry.name}/progress.md`] = taskContent
        }
      }
    } catch {}
    const exportPath = args.file || "memory-export.json"
    if (exportPath.includes("..") || exportPath.includes("/") || exportPath.includes("\\")) return "Error: Invalid export file path"
    const fullPath = path.join(MEMORY_DIR, exportPath)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, JSON.stringify(exportData, null, 2), "utf-8")
    return `Exported ${Object.keys(exportData.files).length} files to ${exportPath}`
  },
})

export const memory_import_json = tool({
  description: "Import memory from JSON export file",
  args: { file: tool.schema.string().describe("JSON file path to import from") },
  async execute(args) {
    try {
      if (args.file.includes("..") || args.file.includes("/") || args.file.includes("\\")) return "Error: Invalid import file path"
      const raw = await fs.readFile(path.join(MEMORY_DIR, args.file), "utf-8")
      const importData = JSON.parse(raw)
      if (!importData.files || typeof importData.files !== "object") return "Invalid export format: missing 'files' object."
      let imported = 0
      for (const [file, content] of Object.entries(importData.files)) {
        if (typeof content === "string" && content.trim()) {
          await writeMemoryFile(file, content)
          imported++
        }
      }
      return `Imported ${imported} files from ${args.file} (exported: ${importData.timestamp})`
    } catch (e) {
      return `Import failed: ${e instanceof Error ? e.message : "Unknown error"}`
    }
  },
})
