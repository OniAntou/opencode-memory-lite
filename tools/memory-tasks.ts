import { tool } from "@opencode-ai/plugin"
import path from "path"
import { readMemoryFile, writeMemoryFile, getTaskIds } from "./memory-io"

export const memory_task_list = tool({
  description: "List all task IDs and their status",
  args: {},
  async execute() {
    const taskIds = await getTaskIds()
    if (taskIds.length === 0) return "No tasks found."
    const tasks: string[] = []
    for (const id of taskIds) {
      const progress = await readMemoryFile(path.join("tasks", id, "progress.md"))
      const lines = progress.split("\n").filter(l => l.trim())
      const lastUpdate = lines.filter(l => l.startsWith("###")).pop() || "No updates"
      tasks.push(`${id}: ${lastUpdate.replace("### ", "")}`)
    }
    return tasks.join("\n")
  },
})

export const memory_task_create = tool({
  description: "Create a new task with initial description",
  args: {
    id: tool.schema.string().describe("Task ID (e.g., 'T1', 'T1.1')"),
    description: tool.schema.string().describe("Initial task description"),
  },
  async execute(args) {
    const taskId = args.id.toUpperCase()
    const progressFile = path.join("tasks", taskId, "progress.md")
    const timestamp = new Date().toISOString()
    const content = `# Task Progress - ${taskId}\n\n## Created\n${timestamp}\n\n## Description\n${args.description}\n\n## Status\nin_progress\n\n### ${timestamp}\n- **Action**: task_created\n- **Details**: Task created with description\n`
    await writeMemoryFile(progressFile, content)
    return `Task ${taskId} created successfully.`
  },
})

export const memory_task_add_progress = tool({
  description: "Add progress entry to an existing task",
  args: {
    id: tool.schema.string().describe("Task ID (e.g., 'T1', 'T1.1')"),
    action: tool.schema.string().describe("Action type (e.g., 'code_change', 'test', 'review')"),
    details: tool.schema.string().describe("Progress details"),
    status: tool.schema.enum(["in_progress", "completed", "blocked", "cancelled"]).optional().describe("Update task status"),
  },
  async execute(args) {
    const taskId = args.id.toUpperCase()
    const progressFile = path.join("tasks", taskId, "progress.md")
    const timestamp = new Date().toISOString()
    const existing = await readMemoryFile(progressFile)
    let updated = existing
    if (args.status) {
      updated = updated.replace(/## Status\n.+/, `## Status\n${args.status}`)
    }
    const entry = `\n### ${timestamp}\n- **Action**: ${args.action}\n- **Details**: ${args.details}\n`
    updated += entry
    await writeMemoryFile(progressFile, updated)
    return `Progress added to task ${taskId}.`
  },
})
