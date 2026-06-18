---
description: Scan current session, extract persistent knowledge into MEMORY.md, and clean up outdated entries
agent: build
---

You are running the /dream command. Your task is to:

1. Read the current session context and recent changes
2. Read existing MEMORY.md to understand what's already stored
3. Extract NEW persistent knowledge from this session:
   - Architecture decisions made
   - Coding conventions discovered
   - Important patterns identified
   - Key file locations and their purposes
4. Update MEMORY.md with new knowledge (don't duplicate existing entries)
5. Remove any outdated entries from MEMORY.md
6. Clear checkpoint.md and notes.md (fresh start for next session)

Use the memory_write tool to update files. Be concise — MEMORY.md should be a quick reference, not a full transcript.
