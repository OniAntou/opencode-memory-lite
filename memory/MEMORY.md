# Project Memory

## Architecture
<!-- type: architecture | tags: opencode, extension-points, plugins | importance: high | updated: 2026-06-17 -->
### OpenCode Extension Points
- **Agents** — `~/.config/opencode/agents/` or `.opencode/agents/` (markdown files with frontmatter)
- **Skills** — `~/.config/opencode/skills/{name}/SKILL.md` or `.opencode/skills/{name}/SKILL.md`
- **Plugins** — `~/.config/opencode/plugins/` or `.opencode/plugins/` (TypeScript/JavaScript, auto-loaded)
- **Custom Tools** — `~/.config/opencode/tools/` or `.opencode/tools/` (TypeScript, tool() helper from @opencode-ai/plugin)
- **Commands** — `~/.config/opencode/commands/` or `.opencode/commands/` (markdown with frontmatter)
- **Config** — `opencode.json` at project root or `~/.config/opencode/opencode.json`

### Plugin Events (v1.16.2 actual API)
- `chat.message` — intercept/modify incoming messages
- `chat.params` — modify LLM params (temperature, topP, etc.)
- `chat.headers` — modify LLM request headers
- `command.execute.before` — intercept commands
- `tool.execute.before` / `tool.execute.after` — hook tool calls
- `permission.ask` — override permission decisions
- `shell.env` — inject env vars into shell
- `experimental.chat.system.transform` — inject into system prompt (memory auto-load)
- `experimental.chat.messages.transform` — transform message history
- `experimental.session.compacting` — inject context before compaction
- `experimental.compaction.autocontinue` — skip synthetic continue after compaction
- `experimental.text.complete` — override text completion
- `tool.definition` — modify tool descriptions/params
- `config` / `dispose` / `event` / `provider` / `auth`

### Memory System Design
<!-- type: architecture | tags: memory, system-design | importance: high | updated: 2026-06-18 -->
- Memory files stored in `.opencode/memory/` (project-level)
- 17 custom tools: `memory_read`, `memory_write`, `memory_search`, `memory_list`, `memory_consolidate`, `memory_task_list`, `memory_task_create`, `memory_task_add_progress`, `memory_stats`, `memory_validate`, `memory_suggest_tags`, `memory_dedup`, `memory_share`, `memory_import_shared`, `memory_conflicts`, `memory_export_json`, `memory_import_json`, `memory_search_history`, `memory_analytics`, `memory_notifications`
- Plugin auto-loads memory via `experimental.chat.system.transform` (session start)
- Plugin injects memory during compaction via `experimental.session.compacting`
- `/dream` command extracts knowledge from session → MEMORY.md
- `/memory-search` searches across all memory files
- `/save-progress` saves task progress
- Structured metadata: `<!-- type: <type> | tags: <tags> | importance: <level> | updated: <date> -->`
- Memory types: architecture, decision, convention, learning, note, fix, feature
- Auto-tagging: suggests tags based on content keywords
- Auto-validation: checks metadata format on session idle
- Cross-project sharing: share memory between projects via shared/ directory
- Conflict detection: detects contradicting/superseded memory entries
- Search history: tracks queries for analytics (saved in search-history.json)
- JSON export/import: backup and restore memory data
- Memory analytics: usage patterns and health insights
- Memory notifications: warnings for large files, conflicts, old entries
- Search history recorded automatically in memory_search tool
- Auto-tagging on write: suggests tags from content if not provided
- Auto-detect duplicates on write: warns if >50% similar to existing section
- Auto-detect conflicts on write: warns if content contradicts existing entries



Dùng PostgreSQL cho user database



Sử dụng PostgreSQL database cho user authentication và data storage



Không dùng PostgreSQL, chuyển sang MySQL cho database chính



Không dùng PostgreSQL cho database, chuyển sang MySQL cho tất cả data storage



Sử dụng MongoDB thay thế PostgreSQL cho user database

## OnlineTravelAgent Project
<!-- type: feature | tags: flutter, online-travel-agent, fullstack | importance: high | updated: 2026-06-17 -->
### Location
- `D:\AndroidStudioProject\OnlineTravelAgent`

### Tech Stack
- **Frontend**: Flutter 3.10+, Dart, Riverpod v3, flutter_map
- **Backend**: Node.js, Express v5, TypeScript, Prisma ORM, PostgreSQL
- **Auth**: JWT (client) + Basic Auth (admin)
- **Admin**: Single HTML + Tailwind CSS

### Architecture Patterns
- **State Management**: Riverpod (Notifier, NotifierProvider, FutureProvider, Provider)
- **Data Flow**: API Service → Providers → Screens
- **Bootstrap Pattern**: `bootstrapProvider` loads all data via `/api/bootstrap`, cached in providers
- **Backend**: Controller → Store/Service → Prisma (3-layer)
- **Validation**: Zod schemas for mutation endpoints
- **Schedule System**: Template-based (copy template to trip on booking)

### Key Files
- `lib/utils/app_utils.dart` — Shared utilities including `formatVND()`, `parsePrice()`, `getTimeAgo()`
- `lib/core/theme/app_theme.dart` — Colors, spacing, shadows, font sizes
- `lib/core/constants/app_constants.dart` — Categories, trip status constants
- `lib/providers/app_state_provider.dart` — `bootstrapProvider`, `categoriesProvider`
- `backend/src/store.ts` — Data access layer (Prisma queries)
- `backend/prisma/schema.prisma` — 15 database models

### UI/UX Fixes Applied (2026-06-17)
<!-- type: fix | tags: ui-ux, flutter | importance: medium | updated: 2026-06-17 -->
1. **USD → VND**: `formatVND()` function, replaced 30+ `$xxx` patterns globally
2. **Date Pickers**: Hotel detail (check-in/out), tour detail, custom tour — replaced hardcoded dates
3. **Pull-to-Refresh**: Added to destinations, hotels, tours, favorites, my_trips screens
4. **Loading States**: Added CircularProgressIndicator to checkout/flight checkout buttons
5. **Navigation Flow**: Payment success dialog now has "Xem Chuyến Đi" + "Về Trang Chủ" buttons

### Known Issues (Not Fixed)
- Mock data: TrendingSection, TravelStoriesSection, Notifications, Contact form, Custom Tour flights
- Payment is fake (no real gateway integration)
- Trip actions (Support/Receipt/Share/Cancel) are placeholders
- No backend tests
- Dark theme defined but not used

## Conventions
<!-- type: convention | tags: general, coding-style | importance: medium | updated: 2026-06-17 -->
- Package manager: npm (user preference)
- Config format: JSON with $schema
- Agent definitions: Markdown with YAML frontmatter
- Plugin format: TypeScript/JavaScript modules with hook exports
- Tool format: `tool()` helper from @opencode-ai/plugin, Zod schema for args

## Decisions
<!-- type: decision | tags: architecture, memory-system | importance: high | updated: 2026-06-18 -->
- Used grep-based search instead of SQLite FTS5 (simpler, no native deps)
- Memory stored as markdown files (human-readable, git-friendly)
- Plugin hooks into `experimental.chat.system.transform` + `experimental.session.compacting`
- Memory agent has restricted permissions (no bash except ls/cat)
- `session.created` / `session.idle` hooks don't exist in v1.16.2 — use `experimental.chat.system.transform` instead
- Structured metadata format: `<!-- type: <type> | tags: <tags> | importance: <level> | updated: <date> -->`
- Memory consolidation via `memory_consolidate` tool (merge duplicates, remove empty sections)

## Learnings
<!-- type: learning | tags: opencode, plugins, development | importance: high | updated: 2026-06-18 -->
- OpenCode plugins receive: `{ project, client, $, directory, worktree }`
- Plugin can use `client.app.log()` for structured logging
- Custom tools use `tool.schema` which is Zod for arg validation
- `experimental.session.compacting` hook can push to `output.context` array
- `experimental.chat.system.transform` can push to `output.system` array (injected into system prompt on every LLM call, not just compaction)
- Agent permissions support glob patterns for fine-grained control
- Plugin files in `~/.opencode/plugins/` are auto-discovered — no registration needed in config
- Always verify hooks against actual `@opencode-ai/plugin` types before using them
- `event` hook receives all events, filter by `event.type` (e.g., `session.idle`)
- `session.idle` is deprecated but still works — prefer `session.status` for new code
- Memory plugin v2: structured metadata, budgeted injection, context reconstruction, auto-consolidation
- Fuzzy search uses Levenshtein distance with typo tolerance (<=2 edits for words >=3 chars)
- Metadata boost: high importance +20, medium +10, recent (<7 days) +15, old (>30 days) -5
- Flutter import paths: use `../../../` for 3 levels up (e.g., from `checkout/widgets/` to `utils/`)
- `RefreshIndicator` requires a scrollable child (use `CustomScrollView` + `SliverFillRemaining` for TabBarView)

## Decision
<!-- type: decision | tags: backend, database | importance: medium | updated: 2026-06-18 -->
Thay đổi từ PostgreSQL sang MongoDB cho database



Thay thế PostgreSQL bằng MongoDB cho user database

## Learning
<!-- type: learning | tags: backend, database, auth | importance: medium | updated: 2026-06-18 -->
Sử dụng MongoDB thay thế PostgreSQL cho user database authentication
