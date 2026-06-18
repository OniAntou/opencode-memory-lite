---
name: memory
description: Persistent memory management - read, write, search, and maintain project memory across sessions
---

## What I do
- Manage persistent project memory files
- Auto-save session checkpoints
- Search memory for relevant context
- Extract knowledge from sessions (/dream)

## When to use me
Use this skill when working with project memory files, checkpoints, or when the user asks about memory, context persistence, or session state.

## Memory Files
| File | Purpose | When to update |
|------|---------|----------------|
| `MEMORY.md` | Long-lived project knowledge | /dream, or when discovering important patterns |
| `checkpoint.md` | Current session state | Auto-saved on idle, or manually |
| `notes.md` | Scratch pad | Anytime |
| `tasks/{id}/progress.md` | Task progress | /save-progress, or during task work |

## Tools Available
- `memory_read` — Read a memory file
- `memory_write` — Write/append to memory file
- `memory_search` — Search across all memory files
- `memory_list` — List all memory files

## Commands
- `/dream` — Extract knowledge from session → MEMORY.md
- `/save-progress` — Save current task progress
- `/cleanup` — Archive old sessions, trim memory files

## Auto-Features (Plugin)
- **Auto-checkpoint**: Saves checkpoint on session idle
- **Auto-archive**: Archives sessions > 7 days to archive/YYYY-MM/
- **Auto-trim**: Trims MEMORY.md when > 300 lines (keeps priority sections)
- **Auto-clear notes**: Clears notes.md older than 3 days
- **Size limits**: Injects max 3000 chars

## Best Practices
1. Read before write — always check existing content first
2. Keep MEMORY.md concise — it's a quick reference, not a log
3. Use sections in MEMORY.md: Architecture, Conventions, Decisions, Learnings
4. Timestamp important entries
5. Clean up outdated entries during /dream
6. Run /cleanup periodically to keep memory lean
