# Obsidian Flavored Markdown — Parity Tracker

## Goal
1:1 rendering and behavior parity with Obsidian for imported vaults. Users should be able to point Folio at their Obsidian vault and have everything work.

## Status Key
- [x] Shipped
- [~] Partial (renders but not fully correct)
- [ ] Not started

---

## Syntax Rendering
- [x] **Wikilinks** `[[Note]]`, `[[Note|alias]]` — Lezer InternalLink node, clickable
- [~] **Embeds** `![[Note]]`, `![[Note#heading]]` — parsed + styled placeholder, no transclusion yet
- [ ] **Image embeds** `![[image.png]]`, `![[image.png|300]]` — vault-relative path resolution + size
- [x] **Highlights** `==text==` — yellow background, markers hidden
- [x] **Comments** `%%hidden%%` — completely hidden in preview
- [x] **Tags** `#tag`, `#nested/tag` — styled pills in editor, indexed
- [x] **Footnotes** `[^1]` — superscript ref widget
- [~] **LaTeX** `$inline$`, `$$block$$` — parsed, monospace placeholder (needs KaTeX)
- [x] **Callouts** `> [!type]` — all Obsidian types, colored borders, emoji icons
- [x] **Tables** (GFM) — Lezer Table extension enabled, monospace styling
- [x] **Task lists** `- [ ]` / `- [x]` / `- [/]` / `- [-]` — extended markers
- [x] **Strikethrough** `~~text~~`
- [x] **Bold / Italic** `**text**` / `*text*`
- [x] **Headings** live preview (hide `#` marks)
- [x] **Inline code** backtick hiding
- [x] **Links** `[text](url)` — rendered as clickable widget
- [x] **Blockquotes** `>` — styled with accent border
- [x] **Horizontal rules** `---` — styled divider
- [x] **Bullet lists** — `•` widget
- [ ] **Mermaid diagrams** — needs `mermaid.js`
- [ ] **Block references** `^block-id` — parse + link resolution

## Frontmatter / Properties
- [x] Parse block arrays (`- item` notation)
- [x] Parse quoted wikilinks in YAML
- [x] Empty values as bare keys
- [x] **YAML tolerance** — gray-matter with fallback to hand-rolled parser
- [ ] **Property type inference** (text, list, number, checkbox, date, datetime)
- [ ] **Property type-specific editors** (date picker, checkbox toggle, etc.)

## Link Resolution
- [~] **Wikilink click** — searches by name, doesn't do shortest-path matching
- [ ] **Shortest-path resolution** — match Obsidian's `[[Note]]` resolution algorithm
- [ ] **Alias resolution** — resolve links using frontmatter `aliases` field
- [ ] **Heading links** `[[Note#heading]]` — open note + scroll to heading
- [ ] **Block reference links** `[[Note#^block-id]]` — open note + scroll to block

## Indexer
- [x] **YAML fallback parser** — gray-matter failures handled gracefully
- [ ] **Alias indexing** — index `aliases` field for link resolution

---

## Future Phases

### Transclusion
- [ ] `![[Note]]` renders embedded note content inline
- [ ] `![[Note#heading]]` renders specific section
- [ ] `![[Note#^block-id]]` renders specific block
- [ ] Live updates when source note changes

### LaTeX Rendering
- [ ] Install KaTeX
- [ ] Inline `$...$` renders in-place
- [ ] Block `$$...$$` renders centered

### Mermaid Diagrams
- [ ] Install `mermaid.js`
- [ ] Render fenced `mermaid` blocks as SVG

### Graph View
- [ ] Vault-wide link graph visualization
- [ ] Local graph (connections for current note)

### Advanced Properties
- [ ] Type detection from values
- [ ] Date picker, checkbox toggle, multi-select editors
- [ ] Property templates per note type
