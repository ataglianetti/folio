import { useEffect, useRef } from 'react'
import { useVaultStore } from '../../stores/vault'
import { createEditorView } from './codemirror-setup'
import type { EditorView } from '@codemirror/view'
import { extractFrontmatter } from '../../lib/markdown'
import './editor.css'

export function FolioEditor() {
  const currentNoteContent = useVaultStore((s) => s.currentNoteContent)
  const currentNotePath = useVaultStore((s) => s.currentNotePath)
  const isDirty = useVaultStore((s) => s.isDirty)
  const saveNote = useVaultStore((s) => s.saveNote)

  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const frontmatterRef = useRef<string>('')
  const suppressUpdateRef = useRef(false)
  const loadedPathRef = useRef<string | null>(null)

  // Effect 1: Create CodeMirror view (mount-only)
  useEffect(() => {
    if (!editorRef.current) return

    const onUpdate = (doc: string) => {
      if (suppressUpdateRef.current) return
      const fullContent = frontmatterRef.current
        ? frontmatterRef.current + '\n' + doc
        : doc
      useVaultStore.getState().setContent(fullContent)
    }

    const onWikilinkClick = (target: string) => {
      useVaultStore.getState().searchAndOpen(target)
    }

    viewRef.current = createEditorView(editorRef.current, '', onUpdate, onWikilinkClick)

    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
      loadedPathRef.current = null
    }
  }, [])

  // Effect 2: Load content when note changes
  useEffect(() => {
    if (!viewRef.current || !currentNotePath || currentNoteContent === null) return
    if (loadedPathRef.current === currentNotePath) return
    loadedPathRef.current = currentNotePath

    const { frontmatter, body } = extractFrontmatter(currentNoteContent)
    frontmatterRef.current = frontmatter

    suppressUpdateRef.current = true
    viewRef.current.dispatch({
      changes: {
        from: 0,
        to: viewRef.current.state.doc.length,
        insert: body,
      },
    })
    suppressUpdateRef.current = false
  }, [currentNotePath, currentNoteContent])

  // Auto-save
  useEffect(() => {
    if (!isDirty) return
    const timer = setTimeout(() => saveNote(), 2000)
    return () => clearTimeout(timer)
  }, [isDirty, saveNote])

  const hasNote = !!currentNotePath

  return (
    <div className="folio-editor">
      <div
        ref={editorRef}
        className="cm-wrapper"
        style={{ display: hasNote ? undefined : 'none' }}
      />
      {!hasNote && (
        <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
          <div className="text-center">
            <p className="text-lg">No note open</p>
            <p className="text-sm mt-1">Select a note from the sidebar or press Cmd+P</p>
          </div>
        </div>
      )}
    </div>
  )
}
