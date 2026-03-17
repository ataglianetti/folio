/// <reference types="vite/client" />

import type { FolioAPI } from '../preload/index'

declare global {
  interface Window {
    folio: FolioAPI
  }
}
