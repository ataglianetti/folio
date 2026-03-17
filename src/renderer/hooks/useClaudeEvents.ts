import { useEffect, useRef } from 'react'
import { useClaudeStore } from '../stores/claude'

/**
 * Subscribe to Claude events from main process.
 * Uses requestAnimationFrame batching for text_chunk events
 * to prevent UI thrashing at high token rates.
 */
export function useClaudeEvents(): void {
  const chunkBufferRef = useRef<string>('')
  const rafIdRef = useRef<number | null>(null)

  useEffect(() => {
    const { handleEvent, handleStatusChange } = useClaudeStore.getState()

    const flushChunks = () => {
      rafIdRef.current = null
      const text = chunkBufferRef.current
      if (text) {
        chunkBufferRef.current = ''
        handleEvent({ type: 'text_chunk', text })
      }
    }

    const unsubEvent = window.folio.claude.onEvent((event) => {
      if (event.type === 'text_chunk') {
        // Buffer text chunks and flush on RAF
        chunkBufferRef.current += (event.text as string) ?? ''
        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(flushChunks)
        }
      } else {
        // Flush any buffered text before processing other events
        if (chunkBufferRef.current) {
          if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current)
            rafIdRef.current = null
          }
          handleEvent({ type: 'text_chunk', text: chunkBufferRef.current })
          chunkBufferRef.current = ''
        }
        handleEvent(event)
      }
    })

    const unsubStatus = window.folio.claude.onStatusChange((status) => {
      handleStatusChange(status)
    })

    return () => {
      unsubEvent()
      unsubStatus()
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [])
}
