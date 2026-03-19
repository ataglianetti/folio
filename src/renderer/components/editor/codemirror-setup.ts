import {
  EditorView,
  ViewPlugin,
  Decoration,
  WidgetType,
  keymap,
  drawSelection,
  highlightActiveLine,
} from '@codemirror/view'
import type { DecorationSet, ViewUpdate } from '@codemirror/view'
import { EditorState, RangeSetBuilder } from '@codemirror/state'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands'
import { syntaxTree, syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import { tags } from '@lezer/highlight'
import { Table } from '@lezer/markdown'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {
  InternalLink,
  Mark as OFMMark,
  Comment as OFMComment,
  Hashtag,
  Footnote,
  Tex,
  TaskList as OFMTaskList,
  YAMLFrontMatter,
} from 'lezer-markdown-obsidian'

// ---------- Syntax Highlighting ----------

const markdownHighlightStyle = HighlightStyle.define([
  {
    tag: tags.heading1,
    fontSize: '1.875rem',
    fontWeight: '700',
    lineHeight: '1.3',
    letterSpacing: '-0.02em',
  },
  {
    tag: tags.heading2,
    fontSize: '1.375rem',
    fontWeight: '600',
    lineHeight: '1.35',
    letterSpacing: '-0.01em',
  },
  {
    tag: tags.heading3,
    fontSize: '1.125rem',
    fontWeight: '600',
    lineHeight: '1.4',
  },
  {
    tag: [tags.heading4, tags.heading5, tags.heading6],
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  {
    tag: tags.strong,
    fontWeight: '600',
  },
  {
    tag: tags.emphasis,
    fontStyle: 'italic',
  },
  {
    tag: tags.monospace,
    fontFamily: "'SF Mono', 'JetBrains Mono', ui-monospace, monospace",
    fontSize: '0.875em',
  },
  {
    tag: tags.link,
    color: 'var(--accent)',
    textDecoration: 'none',
  },
  {
    tag: tags.url,
    color: 'var(--text-muted)',
    fontSize: '0.85em',
  },
  {
    tag: tags.strikethrough,
    textDecoration: 'line-through',
    color: 'var(--text-muted)',
  },
  {
    tag: tags.processingInstruction,
    color: 'var(--text-muted)',
  },
])

// ---------- Editor Factory ----------

export function createEditorView(
  parent: HTMLElement,
  initialDoc: string,
  onUpdate: (doc: string) => void,
  onWikilinkClick: (target: string) => void
): EditorView {
  const updateListener = EditorView.updateListener.of((update: ViewUpdate) => {
    if (update.docChanged) {
      onUpdate(update.state.doc.toString())
    }
  })

  // Use mousedown — click fires after cursor repositioning destroys widgets
  const clickHandler = EditorView.domEventHandlers({
    mousedown(event: MouseEvent) {
      const el = event.target as HTMLElement

      // Wikilink widget
      if (el.classList.contains('cm-wikilink-text')) {
        const target = el.dataset.target
        if (target) {
          event.preventDefault()
          event.stopPropagation()
          onWikilinkClick(target)
          return true
        }
      }

      // External link widget
      if (el.classList.contains('cm-link-text')) {
        const url = el.dataset.url
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
          event.preventDefault()
          event.stopPropagation()
          window.open(url, '_blank')
          return true
        }
      }

      // Hashtag click
      if (el.classList.contains('cm-hashtag-text')) {
        // Could hook into search later
        return false
      }

      return false
    },
  })

  const state = EditorState.create({
    doc: initialDoc,
    extensions: [
      markdown({
        base: markdownLanguage,
        codeLanguages: languages,
        extensions: [
          Table,
          InternalLink,
          OFMMark,
          OFMComment,
          Hashtag,
          Footnote,
          Tex,
          OFMTaskList,
          YAMLFrontMatter,
        ],
      }),
      syntaxHighlighting(markdownHighlightStyle),
      history(),
      drawSelection(),
      highlightActiveLine(),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      updateListener,
      clickHandler,
      livePreviewPlugin,
      editorTheme,
    ],
  })

  return new EditorView({ state, parent })
}

// ---------- Live Preview Plugin ----------

const livePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
)

function getCursorLines(state: EditorState): Set<number> {
  const lines = new Set<number>()
  for (const range of state.selection.ranges) {
    const startLine = state.doc.lineAt(range.from).number
    const endLine = state.doc.lineAt(range.to).number
    for (let i = startLine; i <= endLine; i++) lines.add(i)
  }
  return lines
}

function buildDecorations(view: EditorView): DecorationSet {
  const decos: { from: number; to: number; deco: Decoration }[] = []
  const { state } = view
  const cursorLines = getCursorLines(state)

  syntaxTree(state).iterate({
    enter(node) {
      const lineNum = state.doc.lineAt(node.from).number
      const onCursor = cursorLines.has(lineNum)

      const type = node.type.name

      // ── YAML frontmatter: hide entirely when not on cursor ──
      if (type === 'YAMLFrontMatter') {
        if (!onCursor) {
          // Check if ANY line in the frontmatter is a cursor line
          const endLine = state.doc.lineAt(node.to).number
          let hasCursor = false
          for (let i = lineNum; i <= endLine; i++) {
            if (cursorLines.has(i)) { hasCursor = true; break }
          }
          if (!hasCursor) {
            decos.push({ from: node.from, to: node.to, deco: Decoration.replace({}) })
            return false // skip children
          }
        }
      }

      if (onCursor) return // Show raw syntax on cursor lines

      // ── Heading marks: hide # and trailing space ──
      if (type === 'ATXHeadingMark') {
        let to = node.to
        if (state.doc.sliceString(to, to + 1) === ' ') to += 1
        decos.push({ from: node.from, to, deco: Decoration.replace({}) })
      }

      // ── Emphasis marks: hide * _ ** __ ──
      if (type === 'EmphasisMark') {
        decos.push({ from: node.from, to: node.to, deco: Decoration.replace({}) })
      }

      // ── Strikethrough marks: hide ~~ ──
      if (type === 'StrikethroughMark') {
        decos.push({ from: node.from, to: node.to, deco: Decoration.replace({}) })
      }

      // ── Inline code: hide backticks ──
      if (type === 'CodeMark') {
        decos.push({ from: node.from, to: node.to, deco: Decoration.replace({}) })
      }

      // ── OFM: ==highlight== — hide markers ──
      if (type === 'MarkMarker') {
        decos.push({ from: node.from, to: node.to, deco: Decoration.replace({}) })
      }
      if (type === 'Mark') {
        // Add highlight styling to the content between markers
        decos.push({
          from: node.from,
          to: node.to,
          deco: Decoration.mark({ class: 'cm-highlight' }),
        })
      }

      // ── OFM: %%comment%% — hide entirely ──
      if (type === 'Comment') {
        decos.push({ from: node.from, to: node.to, deco: Decoration.replace({
          widget: new CommentWidget(),
        }) })
      }

      // ── OFM: #hashtag — style as tag ──
      if (type === 'Hashtag') {
        const text = state.doc.sliceString(node.from, node.to)
        decos.push({
          from: node.from,
          to: node.to,
          deco: Decoration.replace({
            widget: new HashtagWidget(text),
          }),
        })
      }

      // ── OFM: [[wikilink]] — render as clickable text ──
      if (type === 'InternalLink') {
        const text = state.doc.sliceString(node.from, node.to)
        // Parse [[target|display]] or [[target]]
        const inner = text.slice(2, -2) // strip [[ and ]]
        const pipeIdx = inner.indexOf('|')
        const target = pipeIdx >= 0 ? inner.slice(0, pipeIdx) : inner
        const display = pipeIdx >= 0 ? inner.slice(pipeIdx + 1) : inner
        // Strip heading/block refs for display
        const displayClean = display.replace(/#.*$/, '') || display

        decos.push({
          from: node.from,
          to: node.to,
          deco: Decoration.replace({
            widget: new WikilinkWidget(displayClean, target),
          }),
        })
        return false // skip children
      }

      // ── OFM: ![[embed]] — show embed placeholder ──
      if (type === 'Embed') {
        const text = state.doc.sliceString(node.from, node.to)
        const inner = text.replace(/^!\[\[/, '').replace(/\]\]$/, '')
        decos.push({
          from: node.from,
          to: node.to,
          deco: Decoration.replace({
            widget: new EmbedWidget(inner),
          }),
        })
        return false
      }

      // ── OFM: $math$ / $$math$$ — show formatted placeholder ──
      if (type === 'TexInline' || type === 'TexBlock') {
        const text = state.doc.sliceString(node.from, node.to)
        const isBlock = type === 'TexBlock'
        const content = isBlock ? text.slice(2, -2).trim() : text.slice(1, -1)
        decos.push({
          from: node.from,
          to: node.to,
          deco: Decoration.replace({
            widget: new TexWidget(content, isBlock),
          }),
        })
        return false
      }

      // ── OFM: Footnote reference [^1] ──
      if (type === 'FootnoteReference') {
        const text = state.doc.sliceString(node.from, node.to)
        const label = text.replace(/^\[\^/, '').replace(/\]$/, '')
        decos.push({
          from: node.from,
          to: node.to,
          deco: Decoration.replace({
            widget: new FootnoteRefWidget(label),
          }),
        })
        return false
      }

      // ── Standard links: [text](url) → clickable text ──
      if (type === 'Link') {
        const text = state.doc.sliceString(node.from, node.to)
        const linkMatch = text.match(/^\[([^\]]*)\]\(([^)]*)\)$/)
        if (linkMatch) {
          decos.push({
            from: node.from,
            to: node.to,
            deco: Decoration.replace({
              widget: new LinkWidget(linkMatch[1], linkMatch[2]),
            }),
          })
          return false
        }
      }

      // ── Images: ![alt](url) ──
      if (type === 'Image') {
        const text = state.doc.sliceString(node.from, node.to)
        const imgMatch = text.match(/^!\[([^\]]*)\]\(([^)]*)\)$/)
        if (imgMatch) {
          decos.push({
            from: node.from,
            to: node.to,
            deco: Decoration.replace({
              widget: new ImageWidget(imgMatch[1] || 'image', imgMatch[2]),
            }),
          })
          return false
        }
      }

      // ── Blockquotes ──
      if (type === 'Blockquote') {
        const startLine = state.doc.lineAt(node.from).number
        const endLine = state.doc.lineAt(node.to).number
        const blockText = state.doc.sliceString(node.from, node.to)

        // Check for callout syntax: > [!type]
        const calloutMatch = blockText.match(/^>\s*\[!(\w+)\]([+-]?)(?:\s+(.*))?/)
        if (calloutMatch) {
          const calloutType = calloutMatch[1].toLowerCase()
          const foldable = calloutMatch[2]
          const title = calloutMatch[3] || calloutType.charAt(0).toUpperCase() + calloutType.slice(1)

          for (let i = startLine; i <= endLine; i++) {
            if (cursorLines.has(i)) continue
            const line = state.doc.line(i)
            // Hide > mark
            const qm = line.text.match(/^(\s*>\s?)/)
            if (qm) {
              decos.push({ from: line.from, to: line.from + qm[0].length, deco: Decoration.replace({}) })
            }
            if (i === startLine) {
              // Replace the callout header line content
              const headerEnd = line.from + line.text.length
              const headerStart = line.from + (qm ? qm[0].length : 0)
              decos.push({
                from: headerStart,
                to: headerEnd,
                deco: Decoration.replace({
                  widget: new CalloutHeaderWidget(calloutType, title, foldable),
                }),
              })
            }
            decos.push({
              from: line.from,
              to: line.from,
              deco: Decoration.line({ class: `cm-callout cm-callout-${calloutType}` }),
            })
          }
          return false
        }

        // Regular blockquote
        for (let i = startLine; i <= endLine; i++) {
          if (cursorLines.has(i)) continue
          const line = state.doc.line(i)
          const qm = line.text.match(/^(\s*>\s?)/)
          if (qm) {
            decos.push({ from: line.from, to: line.from + qm[0].length, deco: Decoration.replace({}) })
          }
          decos.push({ from: line.from, to: line.from, deco: Decoration.line({ class: 'cm-blockquote' }) })
        }
        return false
      }

      // ── Horizontal rules ──
      if (type === 'HorizontalRule') {
        decos.push({
          from: node.from,
          to: node.to,
          deco: Decoration.replace({ widget: new HorizontalRuleWidget() }),
        })
      }

      // ── Task markers: [ ] [x] [/] etc ──
      if (type === 'TaskMarker') {
        const text = state.doc.sliceString(node.from, node.to)
        const inner = text.slice(1, -1) // strip [ ]
        decos.push({
          from: node.from,
          to: node.to,
          deco: Decoration.replace({ widget: new TaskCheckboxWidget(inner) }),
        })
      }

      // ── List marks: - * + → bullet ──
      if (type === 'ListMark') {
        const text = state.doc.sliceString(node.from, node.to)
        if (text === '-' || text === '*' || text === '+') {
          let to = node.to
          if (state.doc.sliceString(to, to + 1) === ' ') to += 1
          decos.push({
            from: node.from,
            to,
            deco: Decoration.replace({ widget: new BulletWidget() }),
          })
        }
      }

      // ── Tables: add styling class ──
      if (type === 'Table') {
        decos.push({
          from: node.from,
          to: node.from,
          deco: Decoration.line({ class: 'cm-table-line' }),
        })
        // Style each line of the table
        const startLine = state.doc.lineAt(node.from).number
        const endLine = state.doc.lineAt(node.to).number
        for (let i = startLine; i <= endLine; i++) {
          const line = state.doc.line(i)
          decos.push({
            from: line.from,
            to: line.from,
            deco: Decoration.line({ class: 'cm-table-line' }),
          })
        }
      }
    },
  })

  decos.sort((a, b) => a.from - b.from || a.to - b.to)

  const builder = new RangeSetBuilder<Decoration>()
  for (const { from, to, deco } of decos) {
    builder.add(from, to, deco)
  }
  return builder.finish()
}

// ---------- Widgets ----------

class WikilinkWidget extends WidgetType {
  constructor(public display: string, public target: string) { super() }
  toDOM() {
    const span = document.createElement('span')
    span.className = 'cm-wikilink-text'
    span.textContent = this.display
    span.dataset.target = this.target
    span.title = this.target
    return span
  }
  eq(other: WikilinkWidget) { return this.display === other.display && this.target === other.target }
  ignoreEvent() { return false }
}

class LinkWidget extends WidgetType {
  constructor(public text: string, public url: string) { super() }
  toDOM() {
    const span = document.createElement('span')
    span.className = 'cm-link-text'
    span.textContent = this.text
    span.dataset.url = this.url
    span.title = this.url
    return span
  }
  eq(other: LinkWidget) { return this.text === other.text && this.url === other.url }
  ignoreEvent() { return false }
}

class ImageWidget extends WidgetType {
  constructor(public alt: string, public url: string) { super() }
  toDOM() {
    const container = document.createElement('span')
    container.className = 'cm-image-widget'
    const img = document.createElement('img')
    img.src = this.url
    img.alt = this.alt
    img.title = this.alt
    img.className = 'cm-image'
    img.onerror = () => {
      container.textContent = `[${this.alt}]`
      container.className = 'cm-image-fallback'
    }
    container.appendChild(img)
    return container
  }
  eq(other: ImageWidget) { return this.alt === other.alt && this.url === other.url }
  ignoreEvent() { return false }
}

const IMAGE_EXTS = /\.(png|jpe?g|gif|svg|webp|bmp|ico|avif)$/i

class EmbedWidget extends WidgetType {
  constructor(public target: string) { super() }
  toDOM() {
    // Parse size: ![[image.png|300]]
    const pipeIdx = this.target.indexOf('|')
    const path = pipeIdx >= 0 ? this.target.slice(0, pipeIdx) : this.target
    const sizeStr = pipeIdx >= 0 ? this.target.slice(pipeIdx + 1) : ''
    const width = parseInt(sizeStr, 10) || undefined

    // Image embed
    if (IMAGE_EXTS.test(path)) {
      const container = document.createElement('span')
      container.className = 'cm-image-widget'
      const img = document.createElement('img')
      img.src = `vault-asset://${encodeURIComponent(path)}`
      img.alt = path
      img.className = 'cm-image'
      if (width) img.style.maxWidth = `${width}px`
      img.onerror = () => {
        container.textContent = `[${path}]`
        container.className = 'cm-image-fallback'
      }
      container.appendChild(img)
      return container
    }

    // Non-image embed (note transclusion placeholder)
    const span = document.createElement('span')
    span.className = 'cm-embed-widget'
    span.textContent = this.target
    span.title = `Embed: ${this.target}`
    return span
  }
  eq(other: EmbedWidget) { return this.target === other.target }
}

class HashtagWidget extends WidgetType {
  constructor(public tag: string) { super() }
  toDOM() {
    const span = document.createElement('span')
    span.className = 'cm-hashtag-text'
    span.textContent = this.tag
    return span
  }
  eq(other: HashtagWidget) { return this.tag === other.tag }
}

class CommentWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span')
    span.className = 'cm-comment-hidden'
    return span
  }
  eq() { return true }
}

class TexWidget extends WidgetType {
  constructor(public content: string, public isBlock: boolean) { super() }
  toDOM() {
    const el = document.createElement(this.isBlock ? 'div' : 'span')
    el.className = this.isBlock ? 'cm-tex-block' : 'cm-tex-inline'
    try {
      katex.render(this.content, el, {
        displayMode: this.isBlock,
        throwOnError: false,
        trust: true,
      })
    } catch {
      el.textContent = this.content
      el.title = 'Invalid LaTeX'
    }
    return el
  }
  eq(other: TexWidget) { return this.content === other.content && this.isBlock === other.isBlock }
}

class FootnoteRefWidget extends WidgetType {
  constructor(public label: string) { super() }
  toDOM() {
    const sup = document.createElement('sup')
    sup.className = 'cm-footnote-ref'
    sup.textContent = this.label
    return sup
  }
  eq(other: FootnoteRefWidget) { return this.label === other.label }
}

class CalloutHeaderWidget extends WidgetType {
  constructor(public type: string, public title: string, public foldable: string) { super() }
  toDOM() {
    const span = document.createElement('span')
    span.className = 'cm-callout-header'
    const icon = CALLOUT_ICONS[this.type] || CALLOUT_ICONS['note']
    span.innerHTML = `<span class="cm-callout-icon">${icon}</span><span class="cm-callout-title">${this.title}</span>`
    return span
  }
  eq(other: CalloutHeaderWidget) {
    return this.type === other.type && this.title === other.title && this.foldable === other.foldable
  }
}

class HorizontalRuleWidget extends WidgetType {
  toDOM() {
    const hr = document.createElement('div')
    hr.className = 'cm-hr-widget'
    return hr
  }
  eq() { return true }
}

class TaskCheckboxWidget extends WidgetType {
  constructor(public marker: string) { super() }
  toDOM() {
    const span = document.createElement('span')
    const checked = this.marker === 'x' || this.marker === 'X'
    const partial = this.marker === '/'
    const cancelled = this.marker === '-'
    span.className = `cm-task-checkbox ${checked ? 'cm-task-checked' : ''} ${partial ? 'cm-task-partial' : ''} ${cancelled ? 'cm-task-cancelled' : ''}`
    if (checked) span.textContent = '\u2611'
    else if (partial) span.textContent = '\u25D2'
    else if (cancelled) span.textContent = '\u2612'
    else span.textContent = '\u2610'
    return span
  }
  eq(other: TaskCheckboxWidget) { return this.marker === other.marker }
}

class BulletWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span')
    span.className = 'cm-bullet'
    span.textContent = '\u2022 '
    return span
  }
  eq() { return true }
}

// ---------- Callout Icons (simple text/emoji for now) ----------

const CALLOUT_ICONS: Record<string, string> = {
  note: '\u{1F4DD}',
  abstract: '\u{1F4CB}',
  summary: '\u{1F4CB}',
  tldr: '\u{1F4CB}',
  info: '\u{2139}\uFE0F',
  todo: '\u{2705}',
  tip: '\u{1F4A1}',
  hint: '\u{1F4A1}',
  important: '\u{1F4A1}',
  success: '\u{2705}',
  check: '\u{2705}',
  done: '\u{2705}',
  question: '\u{2753}',
  help: '\u{2753}',
  faq: '\u{2753}',
  warning: '\u{26A0}\uFE0F',
  caution: '\u{26A0}\uFE0F',
  attention: '\u{26A0}\uFE0F',
  failure: '\u{274C}',
  fail: '\u{274C}',
  missing: '\u{274C}',
  danger: '\u{26D4}',
  error: '\u{26D4}',
  bug: '\u{1F41B}',
  example: '\u{1F4D6}',
  quote: '\u{275D}',
  cite: '\u{275D}',
}

// ---------- Editor Theme ----------

const editorTheme = EditorView.theme({
  '&': {
    fontSize: '15px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif",
  },
  '.cm-content': {
    fontFamily: 'inherit',
    lineHeight: '1.75',
    padding: '0',
    caretColor: 'var(--accent)',
  },
  '.cm-line': { padding: '0' },
  '.cm-cursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '1.5px' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    background: 'var(--selection) !important',
  },
  '.cm-activeLine': { backgroundColor: 'transparent' },
  '&.cm-focused .cm-activeLine': { backgroundColor: 'rgba(128, 128, 128, 0.04)' },
  '.cm-gutters': { display: 'none' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { overflow: 'visible' },

  // Inline code
  '.cm-line .tok-monospace': {
    backgroundColor: 'var(--bg-code)',
    padding: '0.1em 0.3em',
    borderRadius: '3px',
  },

  // Blockquotes
  '.cm-blockquote': {
    borderLeft: '3px solid var(--accent)',
    paddingLeft: '1rem',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
  },

  // Callouts
  '.cm-callout': {
    borderLeft: '3px solid var(--accent)',
    paddingLeft: '1rem',
    backgroundColor: 'rgba(var(--accent-rgb, 99, 102, 241), 0.05)',
    borderRadius: '0 4px 4px 0',
  },
  '.cm-callout-note': { borderLeftColor: 'var(--accent)' },
  '.cm-callout-warning, .cm-callout-caution, .cm-callout-attention': { borderLeftColor: 'var(--warning)' },
  '.cm-callout-danger, .cm-callout-error': { borderLeftColor: 'var(--error)' },
  '.cm-callout-success, .cm-callout-check, .cm-callout-done': { borderLeftColor: 'var(--success)' },
  '.cm-callout-tip, .cm-callout-hint, .cm-callout-important': { borderLeftColor: '#10b981' },
  '.cm-callout-question, .cm-callout-help, .cm-callout-faq': { borderLeftColor: '#f59e0b' },
  '.cm-callout-bug': { borderLeftColor: '#ef4444' },
  '.cm-callout-example': { borderLeftColor: '#8b5cf6' },
  '.cm-callout-quote, .cm-callout-cite': { borderLeftColor: 'var(--text-muted)' },
  '.cm-callout-header': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4em',
    fontWeight: '600',
    fontSize: '0.95em',
  },
  '.cm-callout-icon': { fontSize: '1em' },
  '.cm-callout-title': { color: 'var(--text-primary)' },

  // Horizontal rules
  '.cm-hr-widget': { borderTop: '1px solid var(--border)', margin: '0.75rem 0', height: '0' },

  // Wikilinks
  '.cm-wikilink-text': {
    color: 'var(--accent)',
    cursor: 'pointer',
    textDecoration: 'none',
    '&:hover': { textDecoration: 'underline', textUnderlineOffset: '2px' },
  },
  '.cm-wikilink-raw': { color: 'var(--accent)' },

  // External links
  '.cm-link-text': {
    color: 'var(--accent)',
    cursor: 'pointer',
    textDecoration: 'underline',
    textDecorationColor: 'color-mix(in srgb, var(--accent) 40%, transparent)',
    textUnderlineOffset: '2px',
    '&:hover': { textDecorationColor: 'var(--accent)' },
  },

  // ==highlights==
  '.cm-highlight': {
    backgroundColor: 'rgba(250, 204, 21, 0.25)',
    borderRadius: '2px',
    padding: '0 1px',
  },

  // #hashtags
  '.cm-hashtag-text': {
    color: 'var(--accent)',
    backgroundColor: 'var(--accent-light)',
    borderRadius: '3px',
    padding: '0 4px',
    fontSize: '0.9em',
  },

  // %%comments%% — hidden
  '.cm-comment-hidden': { display: 'none' },

  // Embeds
  '.cm-embed-widget': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3em',
    color: 'var(--accent)',
    backgroundColor: 'var(--accent-light)',
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '0.85em',
    fontStyle: 'italic',
    '&::before': { content: '"⊞ "' },
  },

  // LaTeX
  '.cm-tex-inline': {
    display: 'inline-block',
    verticalAlign: 'middle',
  },
  '.cm-tex-block': {
    display: 'block',
    textAlign: 'center',
    margin: '8px 0',
    padding: '4px 0',
  },
  '.cm-tex-inline .katex, .cm-tex-block .katex': {
    color: 'var(--text-primary)',
  },

  // Footnote refs
  '.cm-footnote-ref': {
    color: 'var(--accent)',
    fontSize: '0.75em',
    verticalAlign: 'super',
    cursor: 'pointer',
  },

  // Images
  '.cm-image-widget': { display: 'block', margin: '0.5rem 0' },
  '.cm-image': { maxWidth: '100%', borderRadius: '6px', border: '1px solid var(--border)' },
  '.cm-image-fallback': { color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.875em' },

  // Task checkboxes
  '.cm-task-checkbox': { fontSize: '1.1em', marginRight: '0.25em', color: 'var(--text-tertiary)', cursor: 'default' },
  '.cm-task-checked': { color: 'var(--accent)' },
  '.cm-task-partial': { color: 'var(--warning)' },
  '.cm-task-cancelled': { color: 'var(--text-muted)' },

  // Bullets
  '.cm-bullet': { color: 'var(--text-tertiary)', fontSize: '0.9em' },

  // Tables
  '.cm-table-line': {
    fontFamily: "'SF Mono', 'JetBrains Mono', ui-monospace, monospace",
    fontSize: '0.85em',
  },
})
