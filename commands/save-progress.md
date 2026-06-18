---
description: Save current task progress to memory
agent: build
---

Save the current task progress. Read the current todo list and session context, then write a progress summary to the appropriate task file.

Steps:
1. Check the current todo list for active tasks
2. Read existing progress files in .opencode/memory/tasks/
3. Write or update the progress file for the current task
4. Update checkpoint.md with current session state

Use memory_write tool. Format:

# Task {id}: {name}

## Status
{current status}

## Progress
- {what was done}

## Next Steps
- {what needs to be done}

## Blockers
- {any blockers}
