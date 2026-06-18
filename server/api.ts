import http from 'http'
import fs from 'fs/promises'
import path from 'path'
import { URL } from 'url'

const MEMORY_DIR = process.env.MEMORY_DIR || '.opencode/memory'
const PORT = parseInt(process.env.PORT || '3000', 10)
const API_KEY = process.env.API_KEY || ''

interface MemoryMetadata {
  type: string
  tags: string[]
  importance: 'low' | 'medium' | 'high'
  updated: string
}

interface ParsedSection {
  heading: string
  metadata: MemoryMetadata | null
  content: string
}

function parseMetadata(comment: string): MemoryMetadata | null {
  const match = comment.match(/<!--\s*type:\s*(.+?)\s*\|/)
  if (!match) return null

  const type = match[1].trim()
  const tagsMatch = comment.match(/tags:\s*(.+?)\s*\|/)
  const importanceMatch = comment.match(/importance:\s*(low|medium|high)\s*\|/)
  const updatedMatch = comment.match(/updated:\s*(.+?)\s*-->/)

  return {
    type,
    tags: tagsMatch ? tagsMatch[1].split(',').map(t => t.trim()) : [],
    importance: importanceMatch ? (importanceMatch[1] as MemoryMetadata['importance']) : 'medium',
    updated: updatedMatch ? updatedMatch[1].trim() : new Date().toISOString().split('T')[0],
  }
}

function parseSections(content: string): ParsedSection[] {
  const sections: ParsedSection[] = []
  const lines = content.split('\n')
  let current: ParsedSection | null = null

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current) sections.push(current)
      current = { heading: line, metadata: null, content: '' }
    } else if (current) {
      const metaMatch = line.match(/<!--\s*type:\s*.+?\s*-->/)
      if (metaMatch && !current.metadata) {
        current.metadata = parseMetadata(line)
      } else {
        current.content += line + '\n'
      }
    }
  }
  if (current) sections.push(current)

  return sections
}

function metadataToComment(meta: MemoryMetadata): string {
  return `<!-- type: ${meta.type} | tags: ${meta.tags.join(', ')} | importance: ${meta.importance} | updated: ${meta.updated} -->`
}

async function readFileSafe(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8')
  } catch {
    return ''
  }
}

async function writeFileSafe(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, 'utf-8')
}

function rebuildMemoryFile(sections: ParsedSection[]): string {
  const parts: string[] = ['# Project Memory']

  for (const section of sections) {
    parts.push('')
    parts.push(section.heading)
    if (section.metadata) {
      parts.push(metadataToComment(section.metadata))
    }
    parts.push(section.content.trim())
  }

  return parts.join('\n') + '\n'
}

function jsonResponse(res: http.ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data, null, 2))
}

function parseBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch {
        resolve({})
      }
    })
  })
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`)
  const pathname = url.pathname
  const method = req.method || 'GET'

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // API Key authentication
  if (API_KEY) {
    const authHeader = req.headers.authorization
    if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
      jsonResponse(res, 401, { error: 'Unauthorized. Provide API key in Authorization header.' })
      return
    }
  }

  try {
    // GET /api/memory - Read memory file
    if (method === 'GET' && pathname === '/api/memory') {
      const file = url.searchParams.get('file') || 'MEMORY.md'
      const content = await readFileSafe(path.join(MEMORY_DIR, file))
      if (!content.trim()) {
        jsonResponse(res, 404, { error: `File not found: ${file}` })
        return
      }
      jsonResponse(res, 200, { file, content })
      return
    }

    // GET /api/memory/sections - Get parsed sections
    if (method === 'GET' && pathname === '/api/memory/sections') {
      const content = await readFileSafe(path.join(MEMORY_DIR, 'MEMORY.md'))
      const sections = parseSections(content)
      jsonResponse(res, 200, { sections })
      return
    }

    // POST /api/memory/write - Write to memory
    if (method === 'POST' && pathname === '/api/memory/write') {
      const body = await parseBody(req)
      const { file = 'MEMORY.md', content, type, tags, importance } = body

      if (!content || typeof content !== 'string') {
        jsonResponse(res, 400, { error: 'Content is required' })
        return
      }

      if (file === 'MEMORY.md' && type) {
        const meta: MemoryMetadata = {
          type: String(type),
          tags: tags ? String(tags).split(',').map((t: string) => t.trim()) : [],
          importance: (importance as MemoryMetadata['importance']) || 'medium',
          updated: new Date().toISOString().split('T')[0],
        }
        const metaComment = metadataToComment(meta)
        const fullContent = `${metaComment}\n${content}`

        const existing = await readFileSafe(path.join(MEMORY_DIR, String(file)))
        const sections = parseSections(existing)
        const newSection: ParsedSection = {
          heading: `## ${String(type).charAt(0).toUpperCase()}${String(type).slice(1)}`,
          metadata: meta,
          content: String(content),
        }
        sections.push(newSection)
        await writeFileSafe(path.join(MEMORY_DIR, String(file)), rebuildMemoryFile(sections))
        jsonResponse(res, 200, { success: true, message: `Written with metadata (type: ${type})` })
      } else {
        const existing = await readFileSafe(path.join(MEMORY_DIR, String(file)))
        const separator = existing.trim() ? '\n\n' : ''
        await writeFileSafe(path.join(MEMORY_DIR, String(file)), existing + separator + String(content))
        jsonResponse(res, 200, { success: true, message: `Written to ${file}` })
      }
      return
    }

    // GET /api/memory/search - Search memory
    if (method === 'GET' && pathname === '/api/memory/search') {
      const query = url.searchParams.get('q') || ''
      const type = url.searchParams.get('type')
      const tags = url.searchParams.get('tags')

      if (!query) {
        jsonResponse(res, 400, { error: 'Query parameter q is required' })
        return
      }

      const content = await readFileSafe(path.join(MEMORY_DIR, 'MEMORY.md'))
      const sections = parseSections(content)
      const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2)

      const results = sections.filter(section => {
        if (type && section.metadata?.type !== type) return false
        if (tags && section.metadata) {
          const filterTags = tags.split(',').map(t => t.trim())
          if (!filterTags.some(t => section.metadata!.tags.includes(t))) return false
        }

        const searchText = (section.heading + ' ' + section.content).toLowerCase()
        return terms.every(term => searchText.includes(term))
      })

      jsonResponse(res, 200, { query, results })
      return
    }

    // GET /api/memory/stats - Get memory statistics
    if (method === 'GET' && pathname === '/api/memory/stats') {
      const content = await readFileSafe(path.join(MEMORY_DIR, 'MEMORY.md'))
      const sections = parseSections(content)

      const stats = {
        totalSections: sections.length,
        byType: {} as Record<string, number>,
        byImportance: {} as Record<string, number>,
        tags: {} as Record<string, number>,
      }

      for (const section of sections) {
        if (!section.metadata) continue
        const meta = section.metadata
        stats.byType[meta.type] = (stats.byType[meta.type] || 0) + 1
        stats.byImportance[meta.importance] = (stats.byImportance[meta.importance] || 0) + 1
        for (const tag of meta.tags) {
          stats.tags[tag] = (stats.tags[tag] || 0) + 1
        }
      }

      jsonResponse(res, 200, stats)
      return
    }

    // POST /api/memory/validate - Validate memory
    if (method === 'POST' && pathname === '/api/memory/validate') {
      const content = await readFileSafe(path.join(MEMORY_DIR, 'MEMORY.md'))
      const sections = parseSections(content)
      const validTypes = ['architecture', 'decision', 'convention', 'learning', 'note', 'fix', 'feature']
      const validImportance = ['low', 'medium', 'high']

      const issues: { section: string; problems: string[] }[] = []

      for (const section of sections) {
        const problems: string[] = []
        if (section.metadata) {
          const meta = section.metadata
          if (!validTypes.includes(meta.type)) problems.push(`Invalid type: ${meta.type}`)
          if (!validImportance.includes(meta.importance)) problems.push(`Invalid importance: ${meta.importance}`)
          if (meta.updated && isNaN(new Date(meta.updated).getTime())) problems.push(`Invalid date: ${meta.updated}`)
          if (meta.tags.length === 0) problems.push('No tags defined')
        } else {
          problems.push('No metadata comment found')
        }
        if (section.content.trim().length === 0) problems.push('Empty section content')
        if (problems.length > 0) issues.push({ section: section.heading, problems })
      }

      jsonResponse(res, 200, { valid: issues.length === 0, issues })
      return
    }

    // GET /api/health - Health check
    if (method === 'GET' && pathname === '/api/health') {
      jsonResponse(res, 200, { status: 'ok', timestamp: new Date().toISOString() })
      return
    }

    // 404
    jsonResponse(res, 404, { error: 'Not found' })
  } catch (error) {
    jsonResponse(res, 500, { error: error instanceof Error ? error.message : 'Internal server error' })
  }
}

const server = http.createServer(handleRequest)

server.listen(PORT, () => {
  console.log(`Memory API Server running at http://localhost:${PORT}`)
  console.log(`API Key: ${API_KEY ? 'Enabled' : 'Disabled'}`)
  console.log(`Memory dir: ${MEMORY_DIR}`)
})

export { server }
