/// <reference types="vite/client" />
import type { SpellbookAPI } from '../../preload/index'

declare global {
  interface Window {
    api: SpellbookAPI
  }
}
