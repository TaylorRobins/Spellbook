import { useCallback, useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import styles from './SearchBar.module.css'

interface Suggestion {
  id: number
  name: string
}

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSelectSuggestion: (id: number) => void
}

export interface SearchBarHandle {
  focus: () => void
  isFocused: () => boolean
}

function HighlightedName({ name, query }: { name: string; query: string }): JSX.Element {
  const idx = name.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{name}</>
  return (
    <>
      {name.slice(0, idx)}
      <strong>{name.slice(idx, idx + query.length)}</strong>
      {name.slice(idx + query.length)}
    </>
  )
}

export const SearchBar = forwardRef<SearchBarHandle, SearchBarProps>(function SearchBar({ value, onChange, onSelectSuggestion }, ref) {
  const inputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    isFocused: () => document.activeElement === inputRef.current,
  }))
  const containerRef = useRef<HTMLDivElement>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!value.trim()) {
      setSuggestions([])
      setOpen(false)
      return
    }
    window.api.getSpellSuggestions(value.trim()).then((results) => {
      setSuggestions(results)
      setOpen(results.length > 0)
      setActiveIndex(-1)
    })
  }, [value])

  useEffect(() => {
    function handleMouseDown(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        if (open) {
          setOpen(false)
        } else {
          onChange('')
          inputRef.current?.blur()
        }
        return
      }
      if (!open || suggestions.length === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, -1))
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault()
        const s = suggestions[activeIndex]
        setOpen(false)
        onChange('')
        onSelectSuggestion(s.id)
      }
    },
    [open, suggestions, activeIndex, onChange, onSelectSuggestion]
  )

  const handleSelect = useCallback(
    (s: Suggestion) => {
      setOpen(false)
      onChange('')
      onSelectSuggestion(s.id)
    },
    [onChange, onSelectSuggestion]
  )

  return (
    <div ref={containerRef} className={styles.searchBar}>
      <svg
        className={styles.icon}
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        ref={inputRef}
        className={styles.input}
        type="text"
        placeholder="Search spells by name or description..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
        spellCheck={false}
        autoComplete="off"
      />
      {value && (
        <button className={styles.clearButton} onClick={() => onChange('')} title="Clear (Esc)">
          ✕
        </button>
      )}
      {open && (
        <ul className={styles.dropdown}>
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              className={`${styles.suggestion} ${i === activeIndex ? styles.active : ''}`}
              onMouseDown={() => handleSelect(s)}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <HighlightedName name={s.name} query={value} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
})
