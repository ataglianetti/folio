import { useCallback, useRef } from 'react'
import { PanelRightClose } from 'lucide-react'
import { useUIStore } from '../../stores/ui'
import { useVaultStore } from '../../stores/vault'
import { PropertyFields } from './PropertyFields'
import { BacklinksSection } from './BacklinksSection'

export function PropertiesPanel() {
  const { propertiesWidth, setPropertiesWidth, toggleProperties } = useUIStore()
  const currentNotePath = useVaultStore((s) => s.currentNotePath)
  const currentNoteContent = useVaultStore((s) => s.currentNoteContent)

  return (
    <div
      className="properties-panel relative flex flex-col h-full flex-shrink-0"
      style={{
        width: propertiesWidth,
        background: 'var(--bg-sidebar)',
        borderLeft: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 h-10 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          Properties
        </span>
        <button
          onClick={toggleProperties}
          className="p-1 rounded cursor-pointer transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          title="Close properties"
        >
          <PanelRightClose size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {currentNotePath ? (
          <>
            <PropertyFields content={currentNoteContent ?? ''} />
            <BacklinksSection notePath={currentNotePath} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full px-4 text-center">
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              Open a note to view properties
            </p>
          </div>
        )}
      </div>

      {/* Left-edge resize handle */}
      <PropertiesResizeHandle
        width={propertiesWidth}
        onResize={setPropertiesWidth}
      />
    </div>
  )
}

function PropertiesResizeHandle({
  width,
  onResize,
}: {
  width: number
  onResize: (w: number) => void
}) {
  const isDragging = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isDragging.current = true
      startXRef.current = e.clientX
      startWidthRef.current = width
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return
        // Dragging left increases width, dragging right decreases
        const delta = startXRef.current - e.clientX
        const newWidth = Math.max(200, Math.min(500, startWidthRef.current + delta))
        onResize(newWidth)
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
    [width, onResize]
  )

  return (
    <div
      onMouseDown={handleMouseDown}
      className="absolute left-0 top-0 bottom-0 w-[3px] cursor-col-resize z-10
        hover:bg-[var(--accent)] active:bg-[var(--accent)] transition-colors duration-150"
      style={{ opacity: 0.5 }}
    />
  )
}
