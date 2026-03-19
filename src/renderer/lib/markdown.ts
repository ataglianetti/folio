/** Split a note into its frontmatter block and body */
export function extractFrontmatter(content: string): {
  frontmatter: string
  body: string
} {
  if (!content.startsWith('---')) {
    return { frontmatter: '', body: content }
  }
  const endIdx = content.indexOf('\n---', 3)
  if (endIdx === -1) {
    return { frontmatter: '', body: content }
  }
  const frontmatter = content.slice(0, endIdx + 4) // includes closing ---
  const body = content.slice(endIdx + 4).replace(/^\n+/, '')
  return { frontmatter, body }
}

/**
 * Parse frontmatter YAML into a key-value record.
 * Handles Obsidian conventions: block arrays (- item), quoted wikilinks,
 * empty values, inline arrays, and scalar values.
 */
export function parseFrontmatter(content: string): Record<string, unknown> | null {
  if (!content.startsWith('---')) return null

  const endIdx = content.indexOf('\n---', 3)
  if (endIdx === -1) return null

  const yaml = content.slice(4, endIdx)
  const result: Record<string, unknown> = {}
  const lines = yaml.split('\n')

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

    // Check for block array: next lines start with "  - "
    if (rawValue === '' && i + 1 < lines.length && /^\s+-\s/.test(lines[i + 1])) {
      const arr: string[] = []
      i++
      while (i < lines.length && /^\s+-\s/.test(lines[i])) {
        const item = lines[i].replace(/^\s+-\s*/, '').trim()
        arr.push(unquote(item))
        i++
      }
      result[key] = arr
      continue
    }

    // Empty value (bare key like `modified:`)
    if (rawValue === '') {
      result[key] = ''
      i++
      continue
    }

    // Inline array [a, b, c]
    if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      const inner = rawValue.slice(1, -1).trim()
      if (inner === '') {
        result[key] = []
      } else {
        result[key] = inner.split(',').map((s) => unquote(s.trim()))
      }
      i++
      continue
    }

    // Boolean
    if (rawValue === 'true' || rawValue === 'false') {
      result[key] = rawValue === 'true'
      i++
      continue
    }

    // Scalar value
    result[key] = unquote(rawValue)
    i++
  }

  return result
}

/** Strip surrounding quotes from a string value */
function unquote(s: string): string {
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1)
  }
  return s
}

/**
 * Rebuild frontmatter YAML from a key-value record.
 * Matches Obsidian conventions:
 * - Block arrays with `- item` syntax
 * - Wikilinks quoted: `"[[Note]]"`
 * - Empty values as bare keys: `key:`
 * - Preserves field order from input
 */
export function rebuildFrontmatter(props: Record<string, unknown>): string {
  if (Object.keys(props).length === 0) return ''

  const lines: string[] = ['---']

  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) continue

    // null or empty string → bare key
    if (value === null || value === '') {
      lines.push(`${key}:`)
      continue
    }

    // Boolean
    if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`)
      continue
    }

    // Array → block notation
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}:`)
      } else {
        lines.push(`${key}:`)
        for (const item of value) {
          lines.push(`  - ${yamlQuote(String(item))}`)
        }
      }
      continue
    }

    // Scalar string
    const str = String(value)
    lines.push(`${key}: ${yamlQuote(str)}`)
  }

  lines.push('---')
  return lines.join('\n')
}

/** Quote a YAML value if needed, following Obsidian conventions */
function yamlQuote(s: string): string {
  // Wikilinks are always quoted
  if (s.includes('[[')) return `"${s}"`
  // Values containing colons, hashes, or special chars need quoting
  if (s.includes(':') || s.includes('#') || s.includes('{') || s.includes('}') ||
      s.includes('[') || s.includes(']') || s.includes(',') || s.includes('&') ||
      s.includes('*') || s.includes('!') || s.includes('|') || s.includes('>') ||
      s.includes("'") || s.includes('"') || s.includes('%') || s.includes('@') ||
      s.includes('`')) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }
  return s
}
