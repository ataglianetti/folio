import matter from 'gray-matter'

export interface ParsedNote {
  frontmatter: Record<string, unknown>
  content: string
  title: string | null
  wikilinks: string[]
  tags: string[]
}

const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g
const INLINE_TAG_RE = /(?:^|\s)#([a-zA-Z0-9_-]+)/g

export function parseNote(raw: string): ParsedNote {
  const { data: frontmatter, content } = matter(raw)

  const wikilinks = extractWikilinks(content)
  const tags = extractTags(raw, frontmatter)
  const title = extractTitle(content)

  return { frontmatter, content, title, wikilinks, tags }
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

  // Inline tags (skip code blocks)
  const withoutCodeBlocks = raw.replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    // Skip frontmatter
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
