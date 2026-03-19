import matter from 'gray-matter'

export interface ParsedNote {
  frontmatter: Record<string, unknown>
  content: string
  title: string | null
  wikilinks: string[]
  tags: string[]
}

const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g
const INLINE_TAG_RE = /(?:^|\s)#([a-zA-Z0-9_/-]+)/g

export function parseNote(raw: string): ParsedNote {
  let frontmatter: Record<string, unknown> = {}
  let content = raw

  try {
    const parsed = matter(raw)
    frontmatter = parsed.data
    content = parsed.content
  } catch {
    // gray-matter fails on Obsidian's loose YAML (unquoted colons, etc.)
    // Fall back to hand-rolled parser
    const fallback = parseFrontmatterFallback(raw)
    frontmatter = fallback.frontmatter
    content = fallback.content
  }

  const wikilinks = extractWikilinks(content)
  const tags = extractTags(raw, frontmatter)
  const title = extractTitle(content)

  return { frontmatter, content, title, wikilinks, tags }
}

/** Tolerant frontmatter parser that handles Obsidian's loose YAML */
function parseFrontmatterFallback(raw: string): {
  frontmatter: Record<string, unknown>
  content: string
} {
  if (!raw.startsWith('---')) {
    return { frontmatter: {}, content: raw }
  }

  const endIdx = raw.indexOf('\n---', 3)
  if (endIdx === -1) {
    return { frontmatter: {}, content: raw }
  }

  const yamlBlock = raw.slice(4, endIdx)
  const content = raw.slice(endIdx + 4).replace(/^\n+/, '')
  const frontmatter: Record<string, unknown> = {}

  const lines = yamlBlock.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1 || line.startsWith('  ') || line.startsWith('\t')) {
      i++
      continue
    }

    const key = line.slice(0, colonIdx).trim()
    const rawValue = line.slice(colonIdx + 1).trim()

    if (!key) { i++; continue }

    // Block array
    if (rawValue === '' && i + 1 < lines.length && /^\s+-\s/.test(lines[i + 1])) {
      const arr: string[] = []
      i++
      while (i < lines.length && /^\s+-\s/.test(lines[i])) {
        arr.push(unquote(lines[i].replace(/^\s+-\s*/, '').trim()))
        i++
      }
      frontmatter[key] = arr
      continue
    }

    // Empty value
    if (rawValue === '') {
      frontmatter[key] = ''
      i++
      continue
    }

    // Inline array
    if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      const inner = rawValue.slice(1, -1).trim()
      frontmatter[key] = inner === '' ? [] : inner.split(',').map((s) => unquote(s.trim()))
      i++
      continue
    }

    // Boolean
    if (rawValue === 'true' || rawValue === 'false') {
      frontmatter[key] = rawValue === 'true'
      i++
      continue
    }

    // Scalar
    frontmatter[key] = unquote(rawValue)
    i++
  }

  return { frontmatter, content }
}

function unquote(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1)
  }
  return s
}

function extractWikilinks(content: string): string[] {
  const links = new Set<string>()
  // Skip code blocks
  const withoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')

  let match
  WIKILINK_RE.lastIndex = 0
  while ((match = WIKILINK_RE.exec(withoutCodeBlocks)) !== null) {
    links.add(match[1].trim())
  }
  return [...links].sort()
}

function extractTags(raw: string, frontmatter: Record<string, unknown>): string[] {
  const tags = new Set<string>()

  // Frontmatter tags
  if (frontmatter.tags) {
    if (Array.isArray(frontmatter.tags)) {
      frontmatter.tags.forEach((t: string) => tags.add(String(t).trim()))
    } else if (typeof frontmatter.tags === 'string') {
      frontmatter.tags.split(',').forEach((t) => tags.add(t.trim()))
    }
  }

  // Inline tags (skip code blocks and frontmatter)
  const withoutCodeBlocks = raw.replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/^---[\s\S]*?---\n?/, '')

  let match
  INLINE_TAG_RE.lastIndex = 0
  while ((match = INLINE_TAG_RE.exec(withoutCodeBlocks)) !== null) {
    tags.add(match[1])
  }

  return [...tags].sort()
}

function extractTitle(content: string): string | null {
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      return trimmed.slice(2).trim()
    }
  }
  return null
}
