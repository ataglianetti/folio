import React, { createContext, useContext, useState, useCallback } from 'react'

/**
 * Popover layer — sits above all content for portal-based dropdowns.
 * The layer itself is pointer-events:none so it doesn't block interaction.
 * Individual popovers must set pointer-events:auto on themselves.
 */

const PopoverLayerContext = createContext<HTMLDivElement | null>(null)

export function usePopoverLayer(): HTMLDivElement | null {
  return useContext(PopoverLayerContext)
}

export function PopoverLayerProvider({ children }: { children: React.ReactNode }) {
  const [layerEl, setLayerEl] = useState<HTMLDivElement | null>(null)

  const refCallback = useCallback((el: HTMLDivElement | null) => {
    setLayerEl(el)
  }, [])

  return (
    <PopoverLayerContext.Provider value={layerEl}>
      {children}
      <div
        ref={refCallback}
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      />
    </PopoverLayerContext.Provider>
  )
}
