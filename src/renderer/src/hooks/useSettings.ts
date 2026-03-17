import { useState, useCallback, useEffect, useRef } from 'react'
import type { Tradition } from '../types/spell'

export interface AppSettings {
  theme: 'dark' | 'light'
  fontSize: 'small' | 'medium' | 'large'
  animations: boolean
  defaultTradition: Tradition | ''
  defaultLayout: 'split' | 'full'
}

const DEFAULTS: AppSettings = {
  theme: 'dark',
  fontSize: 'medium',
  animations: true,
  defaultTradition: '',
  defaultLayout: 'split',
}

const FONT_SCALE: Record<string, string> = {
  small: '0.875',
  medium: '1',
  large: '1.15',
}

function load(): AppSettings {
  try {
    const raw = localStorage.getItem('spellbook-settings')
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AppSettings>) }
  } catch { /* ignore */ }
  return { ...DEFAULTS }
}

function applyTheme(theme: 'dark' | 'light'): void {
  if (theme === 'light') {
    document.documentElement.classList.add('theme-light')
  } else {
    document.documentElement.classList.remove('theme-light')
  }
}

function applyFontSize(size: 'small' | 'medium' | 'large'): void {
  document.documentElement.style.setProperty('--font-scale', FONT_SCALE[size] ?? '1')
}

function applyAnimations(enabled: boolean): void {
  if (enabled) {
    document.documentElement.classList.remove('no-animations')
  } else {
    document.documentElement.classList.add('no-animations')
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(load)
  const isMount = useRef(true)

  // Apply visual effects on changes (skip initial mount — main.tsx handled it)
  useEffect(() => {
    if (isMount.current) { isMount.current = false; return }
    applyTheme(settings.theme)
  }, [settings.theme])

  useEffect(() => {
    if (isMount.current) return
    applyFontSize(settings.fontSize)
  }, [settings.fontSize])

  useEffect(() => {
    if (isMount.current) return
    applyAnimations(settings.animations)
  }, [settings.animations])

  const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      try { localStorage.setItem('spellbook-settings', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  return { settings, updateSetting }
}
