import { useCallback, useRef } from 'react'
import { useUIStore } from '../../stores/ui'

export function ResizeHandle() {
  const { setSidebarWidth } = useUIStore()
  const isDragging = useRef(false)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isDragging.current = true
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return
        const width = Math.max(180, Math.min(480, e.clientX))
        setSidebarWidth(width)
      }

      const handleMouseUp = () => {
        isDragging.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [setSidebarWidth]
  )

  return (
    <div
      onMouseDown={handleMouseDown}
      className="absolute right-0 top-0 bottom-0 w-[3px] cursor-col-resize z-10
        hover:bg-[var(--accent)] active:bg-[var(--accent)] transition-colors duration-150"
      style={{ opacity: 0.5 }}
    />
  )
}
