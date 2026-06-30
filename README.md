# OpenCode Memory Lite

[![npm version](https://img.shields.io/npm/v/opencode-memory-lite.svg)](https://www.npmjs.com/package/opencode-memory-lite)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Downloads](https://img.shields.io/npm/dm/opencode-memory-lite.svg)](https://www.npmjs.com/package/opencode-memory-lite)

**Lightweight, Markdown-based persistent memory for OpenCode AI agents. Zero database required.**

```
npm install opencode-memory-lite
```

## Why OpenCode Memory Lite?

Most memory plugins require SQLite, vector databases, or Docker. **This one doesn't.**

| Feature | OpenCode Memory Lite | opencode-mem | Mem0 |
|---------|---------------------|--------------|------|
| **Dependencies** | 0 (only @opencode-ai/plugin) | Multiple | Many |
| **Storage** | Markdown files | SQLite + USearch | Vector DB |
| **Setup** | `npm install` | Config + DB setup | Docker |
| **Size** | ~100KB | ~650KB | ~100MB |
| **Human-readable** | ✅ Open any file | ❌ Binary | ❌ Binary |
| **Portable** | ✅ Copy folder | ❌ DB migration | ❌ Export/import |
| **Tools** | 24 | 1 | Many |

**Choose OpenCode Memory Lite if you want:**
- Zero configuration
- Human-readable memory files
- No external dependencies
- Simple deployment

## Quick Start

### 1. Install

```bash
npm install opencode-memory-lite
```

### 2. Copy to OpenCode directory

```bash
cp -r node_modules/opencode-memory-lite/tools ~/.opencode/
cp -r node_modules/opencode-memory-lite/plugins ~/.opencode/
cp -r node_modules/opencode-memory-lite/agents ~/.opencode/
cp -r node_modules/opencode-memory-lite/commands ~/.opencode/
cp -r node_modules/opencode-memory-lite/skills ~/.opencode/
```

### 3. Configure permissions

Add to `opencode.json`:

```json
{
  "agent": {
    "build": {
      "permission": {
        "tool": {
          "memory_read": "allow",
          "memory_write": "allow",
          "memory_search": "allow",
          "memory_list": "allow",
          "memory_task_list": "allow",
          "memory_task_create": "allow",
          "memory_task_add_progress": "allow",
          "memory_learn": "allow",
          "memory_patterns": "allow",
          "memory_corrections": "allow",
          "memory_apply_learnings": "allow",
          "memory_learning_stats": "allow"
        }
      }
    }
  }
}
```

### 4. Restart OpenCode

Done! Memory system is now active.

## Features

### 24 Tools for Complete Memory Management

| Category | Tools |
|----------|-------|
| **Core (8)** | `memory_read`, `memory_write`, `memory_search`, `memory_list`, `memory_consolidate`, `memory_task_list`, `memory_task_create`, `memory_task_add_progress` |
| **Advanced (11)** | `memory_stats`, `memory_validate`, `memory_suggest_tags`, `memory_dedup`, `memory_share`, `memory_import_shared`, `memory_conflicts`, `memory_export_json`, `memory_import_json`, `memory_analytics`, `memory_notifications` |
| **Self-Improvement (5)** | `memory_learn`, `memory_patterns`, `memory_corrections`, `memory_apply_learnings`, `memory_learning_stats` |

### Auto Features

- **Auto-tagging**: Tags content automatically (backend, flutter, database, etc.)
- **Auto-detect duplicates**: Warns when content is >50% similar
- **Auto-detect conflicts**: Warns when content contradicts existing entries
- **Auto-checkpoint**: Saves session state on idle
- **Auto-archive**: Archives old checkpoints (>7 days)
- **Auto-trim**: Keeps MEMORY.md under 300 lines
- **Auto-validate**: Checks metadata format
- **Auto-learn from edits**: Saves corrections from code edits
- **Auto-extract patterns**: Detects coding patterns

## Usage Examples

### Write with auto-tagging

```
memory_write file="MEMORY.md" type="architecture" content="Use PostgreSQL for user database"
```

Result: Auto-tags with `backend, database`

### Search with filters

```
memory_search query="flutter" type="feature" tags="mobile"
```

### Search with relevance scoring

```
memory_search query="flutter architecture" relevance_details=true
```

Output:
```
1. [MEMORY.md] [architecture|high|flutter,mobile] (score: 85.2)
Flutter Architecture

  Scoring Breakdown:
  - TF-IDF: 42.5
  - Proximity: 30
  - Heading: 40
  - Exact Phrase: 0
  - Tag: 15
  - Metadata: 20
  - Total: 147.5
```

### Learning from corrections

```
memory_learn type="correction" wrong="var x = 1" correct="const x = 1" context="JavaScript"
```

### Pattern management

```
memory_patterns action="list"
memory_patterns action="add" name="Early Return" description="Use early returns for cleaner code"
memory_patterns action="search" query="react hooks"
```

## HTTP API

Start the API server:

```bash
npm start
# or
node dist/server/api.js
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/memory?file=MEMORY.md` | Read memory file |
| GET | `/api/memory/sections` | Get parsed sections |
| POST | `/api/memory/write` | Write to memory |
| GET | `/api/memory/search?q=query` | Search memory |
| GET | `/api/memory/stats` | Get statistics |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Server port |
| MEMORY_DIR | .opencode/memory | Memory directory |
| API_KEY | (empty) | API key for authentication |

## Memory Format

```markdown
## Section Heading
<!-- type: architecture | tags: flutter, backend | importance: high | updated: 2026-06-18 -->

Content goes here...
```

| Field | Values | Description |
|-------|--------|-------------|
| type | architecture, decision, convention, learning, note, fix, feature | Entry type |
| tags | comma-separated | Keywords for categorization |
| importance | low, medium, high | Priority level |
| date | YYYY-MM-DD | Last updated date |

## Plugin Features

The memory plugin provides:

- **Budgeted injection**: Limits memory injected into context (token budget)
- **Context reconstruction**: Rebuilds context during compaction
- **Task tracking**: Auto-saves progress when using bash/edit/write tools
- **Auto-validation**: Logs warnings for invalid metadata
- **Auto-learn from edits**: Saves corrections with deduplication
- **Auto-extract patterns**: Detects coding patterns

## Self-Improvement

### Learning from Corrections

When you edit code, the system automatically saves the correction:

```
# Automatic - happens when you use edit or write tools
# Saves: wrong → correct, increments count if duplicate
```

### Manual Learning

```
memory_learn type="correction" wrong="Using var" correct="Use const/let" context="JavaScript"
memory_learn type="insight" content="Always use early returns" context="Code style"
memory_learn type="preference" content="Prefer functional over OOP" context="Architecture"
```

### Apply Learnings

```
memory_apply_learnings context="React component with API calls"
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT