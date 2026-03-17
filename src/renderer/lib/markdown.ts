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
