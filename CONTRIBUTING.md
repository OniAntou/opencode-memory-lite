# Contributing to OpenCode Memory Lite

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Adding Features](#adding-features)
- [Bug Reports](#bug-reports)
- [Pull Requests](#pull-requests)
- [Style Guidelines](#style-guidelines)

## Code of Conduct

Please be respectful and inclusive in all interactions. We're here to build great software together.

## How to Contribute

### Reporting Bugs

1. Check [existing issues](https://github.com/OniAntou/opencode-memory-lite/issues) first
2. Create a new issue with:
   - Clear title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, OpenCode version)

### Suggesting Features

1. Open an issue with the `feature-request` label
2. Describe the use case
3. Explain why existing features don't solve it
4. Mockups/examples welcome

### Contributing Code

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Add tests if applicable
5. Run tests: `npm test`
6. Run lint: `npm run lint`
7. Commit with clear message
8. Push and create PR

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/opencode-memory-lite.git
cd opencode-memory-lite

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode
npm run test:watch
```

## Project Structure

```
opencode-memory-lite/
├── tools/              # Memory tool implementations
│   ├── memory.ts       # Main tool definitions
│   ├── memory-io.ts    # File read/write
│   ├── memory-search.ts # Search algorithms
│   ├── memory-tasks.ts # Task tracking
│   ├── memory-analytics.ts # Statistics
│   ├── memory-utils.ts # Utilities
│   └── memory-learning.ts # Self-improvement
├── plugins/            # OpenCode plugin hooks
│   └── memory-plugin.ts
├── server/             # HTTP API server
│   └── api.ts
├── agents/             # Agent configurations
├── commands/           # Custom commands
├── skills/             # Skill definitions
└── tests/              # Test files
```

## Adding Features

### Adding a New Tool

1. Create tool in `tools/` directory
2. Export from `tools/memory.ts`
3. Add to `MEMORY_TOOLS` array in `tools/memory.ts`
4. Add tests in `tests/`
5. Update README.md

### Adding a New Command

1. Create markdown file in `commands/`
2. Add frontmatter with command metadata
3. Update README.md

### Plugin Hooks

The plugin (`plugins/memory-plugin.ts`) supports:
- `experimental.chat.system.transform` - Inject memory into context
- `experimental.session.compacting` - Context reconstruction
- `tool.execute.before/after` - Auto-track tasks

## Pull Requests

### PR Checklist

- [ ] Code builds without errors (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Documentation updated if needed
- [ ] No console.log in production code
- [ ] TypeScript strict mode compliant

### PR Title Format

- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `refactor: improve code structure`
- `test: add missing tests`

### What We Look For

- Clear description of changes
- Related tests
- No breaking changes (or clear migration path)
- Follows existing code style
- Adds value to users

## Style Guidelines

### TypeScript

- Strict mode enabled
- Use explicit types (no `any`)
- Prefer `readonly` for immutable data
- Use `const` over `let`
- Early returns over nested ifs

### Naming

- camelCase for variables/functions
- PascalCase for classes/types
- UPPER_SNAKE_CASE for constants
- Descriptive names over abbreviations

### Comments

- Explain "why" not "what"
- No commented-out code
- Use JSDoc for public APIs

### File Organization

- One export per file when possible
- Group related functionality
- Keep files under 300 lines

## Questions?

Open an issue with the `question` label or start a discussion.

Thank you for contributing!