---
description: Clean up and archive old memory files
agent: build
---

You are running the /cleanup command. Your task is to:

1. Check the size of memory files (MEMORY.md, checkpoint.md, notes.md)
2. Archive old sessions (> 7 days) to .opencode/memory/archive/YYYY-MM/
3. Trim MEMORY.md if it exceeds 300 lines — keep only the most important entries
4. Clear notes.md if it's older than 3 days
5. Report what was cleaned up

Use memory tools (memory_read, memory_write) and bash commands.

Archive format:
- Move old checkpoint.md to archive/YYYY-MM/checkpoint-YYYY-MM-DD.md
- Keep MEMORY.md concise — remove outdated entries
- Clear scratch notes periodically
