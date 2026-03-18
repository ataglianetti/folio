import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

console.log('[Renderer] main.tsx loading...')
console.log('[Renderer] window.folio:', typeof window.folio)

try {
  const root = document.getElementById('root')
  console.log('[Renderer] root element:', root)
  if (root) {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>
    )
    console.log('[Renderer] React mounted')
  }
} catch (err) {
  console.error('[Renderer] Mount error:', err)
  document.body.innerHTML = `<pre style="color:red;padding:20px">${err}</pre>`
}
