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
    tag: tags.processingInstruction,
    color: 'var(--text-muted)',
  },
])

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

  const wikilinkClickHandler = EditorView.domEventHandlers({
    click(event: MouseEvent, _view: EditorView) {
      const target = event.target as HTMLElement
      if (target.classList.contains('cm-wikilink-text')) {
        const linkTarget = target.dataset.target
        if (linkTarget) {
          event.preventDefault()
          onWikilinkClick(linkTarget)
          return true
        }
      }
      return false
    },
  })

  const state = EditorState.create({
    doc: initialDoc,
    extensions: [
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      syntaxHighlighting(markdownHighlightStyle),
      history(),
      drawSelection(),
      highlightActiveLine(),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      updateListener,
      wikilinkClickHandler,
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

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const decorations: { from: number; to: number; deco: Decoration }[] = []

  const { state } = view
  const cursorLine = state.doc.lineAt(state.selection.main.head).number

  syntaxTree(state).iterate({
    enter(node) {
      const line = state.doc.lineAt(node.from).number
      const onCursorLine = line === cursorLine

      if (onCursorLine) return

      const type = node.type.name

      if (type === 'ATXHeadingMark') {
        let to = node.to
        const after = state.doc.sliceString(to, to + 1)
        if (after === ' ') to += 1
        decorations.push({
          from: node.from,
          to,
          deco: Decoration.replace({}),
        })
      }

      if (type === 'EmphasisMark') {
        decorations.push({
          from: node.from,
          to: node.to,
          deco: Decoration.replace({}),
        })
      }

      if (type === 'CodeMark') {
        decorations.push({
          from: node.from,
          to: node.to,
          deco: Decoration.replace({}),
        })
      }
    },
  })

  // Wikilinks
  const doc = state.doc
  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i)
    const onCursorLine = i === cursorLine

    const regex = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g
    let match

    while ((match = regex.exec(line.text)) !== null) {
      const from = line.from + match.index
      const to = from + match[0].length
      const target = match[1]
      const alias = match[2]
      const display = alias || target

      if (onCursorLine) {
        decorations.push({
          from,
          to,
          deco: Decoration.mark({ class: 'cm-wikilink-raw' }),
        })
      } else {
        decorations.push({
          from,
          to,
          deco: Decoration.replace({
            widget: new WikilinkWidget(display, target),
          }),
        })
      }
    }
  }

  decorations.sort((a, b) => a.from - b.from || a.to - b.to)

  for (const { from, to, deco } of decorations) {
    builder.add(from, to, deco)
  }

  return builder.finish()
}

// ---------- Wikilink Widget ----------

class WikilinkWidget extends WidgetType {
  display: string
  target: string

  constructor(display: string, target: string) {
    super()
    this.display = display
    this.target = target
  }

  toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'cm-wikilink-text'
    span.textContent = this.display
    span.dataset.target = this.target
    span.title = this.target
    return span
  }

  eq(other: WikilinkWidget): boolean {
    return this.display === other.display && this.target === other.target
  }

  ignoreEvent(): boolean {
    return false
  }
}

// ---------- Editor Theme ----------

const editorTheme = EditorView.theme({
  '&': {
    fontSize: '15px',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif",
  },
  '.cm-content': {
    fontFamily: 'inherit',
    lineHeight: '1.75',
    padding: '0',
    caretColor: 'var(--accent)',
  },
  '.cm-line': {
    padding: '0',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--accent)',
    borderLeftWidth: '1.5px',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    background: 'var(--selection) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent',
  },
  '&.cm-focused .cm-activeLine': {
    backgroundColor: 'rgba(128, 128, 128, 0.04)',
  },
  '.cm-gutters': {
    display: 'none',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-scroller': {
    overflow: 'visible',
  },
  '.cm-line .tok-monospace': {
    backgroundColor: 'var(--bg-code)',
    padding: '0.1em 0.3em',
    borderRadius: '3px',
  },
  '.cm-code-block': {
    fontFamily: "'SF Mono', 'JetBrains Mono', ui-monospace, monospace",
    fontSize: '0.8125rem',
  },
  '.cm-blockquote': {
    borderLeft: '2px solid var(--border)',
    paddingLeft: '0.875rem',
    color: 'var(--text-secondary)',
  },
  '.cm-hr': {
    color: 'var(--border)',
  },
  '.cm-formatting': {
    color: 'var(--text-muted)',
    fontFamily: "'SF Mono', 'JetBrains Mono', ui-monospace, monospace",
    fontSize: '0.85em',
  },
  '.cm-wikilink-text': {
    color: 'var(--accent)',
    cursor: 'pointer',
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
      textUnderlineOffset: '2px',
    },
  },
  '.cm-wikilink-raw': {
    color: 'var(--accent)',
  },
})
