import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/theme.css'
import './styles/global.css'
import App from './App'

// Apply persisted theme/font settings synchronously before first paint to prevent flash
try {
  const raw = localStorage.getItem('spellbook-settings')
  if (raw) {
    const s = JSON.parse(raw) as Record<string, unknown>
    if (s.theme === 'light') document.documentElement.classList.add('theme-light')
    const fontMap: Record<string, string> = { small: '0.875', large: '1.15' }
    if (typeof s.fontSize === 'string' && fontMap[s.fontSize]) {
      document.documentElement.style.setProperty('--font-scale', fontMap[s.fontSize])
    }
    if (s.animations === false) document.documentElement.classList.add('no-animations')
  }
} catch {
  // ignore parse errors
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
