import { useState, useCallback, useEffect, useRef } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary'
import { Sidebar } from './components/Sidebar/Sidebar'
import { SearchBar } from './components/SearchBar/SearchBar'
import type { SearchBarHandle } from './components/SearchBar/SearchBar'
import { SpellList } from './components/SpellList/SpellList'
import { SpellDetail } from './components/SpellDetail/SpellDetail'
import { SpellbookView } from './components/SpellbookView/SpellbookView'
import { CharacterModal } from './components/CharacterModal/CharacterModal'
import { UpdateModal } from './components/UpdateModal/UpdateModal'
import { ShortcutsModal } from './components/ShortcutsModal/ShortcutsModal'
import { SettingsPage } from './components/SettingsPage/SettingsPage'
import { useSpells } from './hooks/useSpells'
import { useCharacters } from './hooks/useCharacters'
import { useSpellbook } from './hooks/useSpellbook'
import { useSettings } from './hooks/useSettings'
import { useTags } from './hooks/useTags'
import type { SidebarView, Spell, SpellRow } from './types/spell'
import { parseSpell } from './types/spell'
import type { Character } from './types/character'
import styles from './App.module.css'
import errorStyles from './components/ErrorBoundary/ErrorBoundary.module.css'

function SplitViewIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="2" width="7" height="14" rx="1"/>
      <rect x="10" y="2" width="7" height="14" rx="1"/>
    </svg>
  )
}

function FullViewIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="2" width="16" height="14" rx="1"/>
    </svg>
  )
}

const appCrashFallback = (
  <div className={errorStyles.appCrash}>
    <div className={errorStyles.icon}>✦</div>
    <div className={errorStyles.title}>The Grimoire has lost its enchantment</div>
    <div className={errorStyles.message}>An unexpected error has disrupted the weave.</div>
    <button className={errorStyles.reloadBtn} onClick={() => window.location.reload()}>
      Reload App
    </button>
  </div>
)

export default function App(): JSX.Element {
  const [sidebarView, setSidebarView] = useState<SidebarView>(() => {
    // Apply default tradition from settings on first launch
    try {
      const raw = localStorage.getItem('spellbook-settings')
      if (raw) {
        const s = JSON.parse(raw) as { defaultTradition?: string }
        if (s.defaultTradition) return { type: 'tradition', tradition: s.defaultTradition as SidebarView extends { type: 'tradition'; tradition: infer T } ? T : never }
      }
    } catch { /* ignore */ }
    return { type: 'all' }
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [appUpdateState, setAppUpdateState] = useState<null | { type: 'downloading'; percent: number } | { type: 'ready'; version: string } | { type: 'uptodate' }>(null)
  const [layout, setLayout] = useState<'split' | 'full'>(() => {
    const saved = localStorage.getItem('spellbook-layout')
    if (saved) return saved as 'split' | 'full'
    try {
      const raw = localStorage.getItem('spellbook-settings')
      if (raw) {
        const s = JSON.parse(raw) as { defaultLayout?: string }
        if (s.defaultLayout) return s.defaultLayout as 'split' | 'full'
      }
    } catch { /* ignore */ }
    return 'split'
  })
  const [splitRatio, setSplitRatio] = useState(() =>
    parseFloat(localStorage.getItem('spellbook-split') ?? '0.38')
  )
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const searchBarRef = useRef<SearchBarHandle>(null)
  const contentAreaRef = useRef<HTMLDivElement>(null)

  const { settings, updateSetting } = useSettings()
  const { tags, spellTagsById, tagCounts, createTag, updateTag, deleteTag, setSpellTag, refresh: refreshTags } = useTags()

  const toggleLayout = useCallback(() => {
    setLayout(l => {
      const next = l === 'split' ? 'full' : 'split'
      localStorage.setItem('spellbook-layout', next)
      return next
    })
  }, [])

  useEffect(() => {
    return window.api.onAppUpdate((event) => {
      if (event.type === 'downloading') {
        setAppUpdateState({ type: 'downloading', percent: event.percent })
      } else if (event.type === 'ready') {
        setAppUpdateState({ type: 'ready', version: event.version })
      } else if (event.type === 'not-available') {
        setAppUpdateState({ type: 'uptodate' })
        setTimeout(() => setAppUpdateState(null), 3000)
      }
    })
  }, [])

  const {
    characters,
    activeCharacterId,
    activeCharacter,
    setActiveCharacterId,
    createCharacter,
    updateCharacter,
    deleteCharacter,
  } = useCharacters()

  const { spells, loading, toggleFavorite } = useSpells(sidebarView, searchQuery, selectedTagIds)

  const {
    characterSpells,
    loading: spellbookLoading,
    spellbookIds,
    addSpell,
    removeSpell,
    togglePrepared,
    setFavoriteStatus,
  } = useSpellbook(activeCharacterId)

  const handleToggleFavorite = useCallback(
    async (id: number) => {
      const nowFav = await toggleFavorite(id)
      setFavoriteStatus(id, nowFav)
      if (selectedSpell?.id === id) {
        setSelectedSpell((prev) => (prev ? { ...prev, is_favorite: nowFav } : null))
      }
    },
    [toggleFavorite, selectedSpell, setFavoriteStatus]
  )

  const handleViewChange = useCallback((view: SidebarView) => {
    setSidebarView(view)
    setSelectedSpell(null)
  }, [])

  const handleSelectSpell = useCallback(async (spell: Spell) => {
    // Attach current tags from our tag map
    const spellWithTags = { ...spell, tags: spellTagsById[spell.id] ?? [] }
    setSelectedSpell(spellWithTags)
  }, [spellTagsById])

  const handleSelectSuggestion = useCallback(async (id: number) => {
    const row = await window.api.getSpellById(id)
    if (row) {
      const spell = parseSpell(row as SpellRow)
      setSelectedSpell({ ...spell, tags: spellTagsById[spell.id] ?? [] })
    }
  }, [spellTagsById])

  const handleSetSpellTag = useCallback(async (tagId: number, add: boolean) => {
    if (!selectedSpell) return
    await setSpellTag(selectedSpell.id, tagId, add)
    // Update selected spell tags immediately
    setSelectedSpell(prev => {
      if (!prev) return null
      const updated = add
        ? [...(prev.tags ?? []), tags.find(t => t.id === tagId)!].filter(Boolean)
        : (prev.tags ?? []).filter(t => t.id !== tagId)
      return { ...prev, tags: updated }
    })
  }, [selectedSpell, setSpellTag, tags])

  const handleTagToggle = useCallback((id: number) => {
    setSelectedTagIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }, [])

  const handleDeleteCharacter = useCallback(
    async (id: number) => {
      if (!window.confirm('Delete this character? Their spellbook will be lost.')) return
      await deleteCharacter(id)
    },
    [deleteCharacter]
  )

  const handleModalSave = useCallback(
    async (data: Omit<Character, 'id'>) => {
      if (modalMode === 'create') {
        await createCharacter(data)
      } else if (modalMode === 'edit' && activeCharacter) {
        await updateCharacter(activeCharacter.id, data)
      }
      setModalMode(null)
    },
    [modalMode, activeCharacter, createCharacter, updateCharacter]
  )

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const container = contentAreaRef.current
    if (!container) return
    const onMove = (ev: MouseEvent): void => {
      const rect = container.getBoundingClientRect()
      const total = rect.width
      const minList = 200
      const minDetail = 300
      const raw = (ev.clientX - rect.left) / total
      const ratio = Math.max(minList / total, Math.min((total - minDetail) / total, raw))
      setSplitRatio(ratio)
      localStorage.setItem('spellbook-split', String(ratio))
    }
    const onUp = (): void => {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  useEffect(() => {
    setFocusedIndex(-1)
  }, [spells])

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'

      if (e.key === 'Escape') {
        if (layout === 'full' && selectedSpell) setSelectedSpell(null)
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchBarRef.current?.focus()
        return
      }

      if (e.key === '?' && !inInput) {
        setShowShortcuts((s) => !s)
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        handleViewChange({ type: 'all' })
        return
      }
      const traditionMap: Record<string, 'arcane' | 'divine' | 'occult' | 'primal'> = { '1': 'arcane', '2': 'divine', '3': 'occult', '4': 'primal' }
      if ((e.ctrlKey || e.metaKey) && traditionMap[e.key]) {
        e.preventDefault()
        handleViewChange({ type: 'tradition', tradition: traditionMap[e.key] })
        return
      }

      if (inInput) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((i) => Math.min(i + 1, spells.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        if (focusedIndex >= 0 && spells[focusedIndex]) {
          handleSelectSpell(spells[focusedIndex])
        }
      } else if ((e.key === 'f' || e.key === 'F') && selectedSpell) {
        handleToggleFavorite(selectedSpell.id)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [layout, selectedSpell, spells, focusedIndex, handleViewChange, handleSelectSpell, handleToggleFavorite])

  const isSpellbookView = sidebarView.type === 'spellbook'
  const isSettingsView = sidebarView.type === 'settings'

  const renderSpellDetail = (spell: Spell, props?: { fullWidth?: boolean; onBack?: () => void; style?: React.CSSProperties }): JSX.Element => (
    <ErrorBoundary componentName="SpellDetail" onError={(err) => console.error(`[SpellDetail] spell.id=${spell.id}`, err)}>
      <SpellDetail
        spell={spell}
        onToggleFavorite={handleToggleFavorite}
        allTags={tags}
        onSetSpellTag={handleSetSpellTag}
        {...props}
      />
    </ErrorBoundary>
  )

  return (
    <ErrorBoundary componentName="App" fallback={appCrashFallback}>
      <div className={styles.appShell}>
        <Sidebar
          activeView={sidebarView}
          onViewChange={handleViewChange}
          characters={characters}
          activeCharacterId={activeCharacterId}
          onCharacterChange={setActiveCharacterId}
          onNewCharacter={() => setModalMode('create')}
          onEditCharacter={() => setModalMode('edit')}
          onDeleteCharacter={handleDeleteCharacter}
          tags={tags}
          selectedTagIds={selectedTagIds}
          tagCounts={tagCounts}
          onTagToggle={handleTagToggle}
        />
        <div className={styles.mainPane}>
          {appUpdateState && (
            <div className={styles.updateBanner}>
              <span className={styles.updateBannerText}>
                {appUpdateState.type === 'downloading'
                  ? `Downloading update… ${appUpdateState.percent}%`
                  : appUpdateState.type === 'ready'
                  ? `Update v${appUpdateState.version} ready — restart to install`
                  : 'Already up to date'}
              </span>
              {appUpdateState.type === 'ready' && (
                <button className={styles.updateBannerBtn} onClick={() => window.api.quitAndInstall()}>
                  Restart now
                </button>
              )}
              <button className={styles.updateBannerDismiss} onClick={() => setAppUpdateState(null)}>✕</button>
            </div>
          )}
          <div className={styles.toolbar}>
            <SearchBar ref={searchBarRef} value={searchQuery} onChange={setSearchQuery} onSelectSuggestion={handleSelectSuggestion} />
            <button
              className={styles.shortcutsBtn}
              onClick={() => setShowShortcuts(true)}
              title="Keyboard shortcuts (?)"
            >
              ?
            </button>
            <button
              className={styles.layoutToggle}
              onClick={toggleLayout}
              title={layout === 'split' ? 'Switch to full view' : 'Switch to split view'}
            >
              {layout === 'split' ? <FullViewIcon /> : <SplitViewIcon />}
            </button>
          </div>
          <div ref={contentAreaRef} className={styles.contentArea}>
            {isSettingsView ? (
              <ErrorBoundary componentName="SettingsPage">
                <SettingsPage
                  settings={settings}
                  onUpdateSetting={updateSetting}
                  tags={tags}
                  onCreateTag={createTag}
                  onUpdateTag={updateTag}
                  onDeleteTag={deleteTag}
                />
              </ErrorBoundary>
            ) : layout === 'split' ? (
              <>
                {isSpellbookView ? (
                  <ErrorBoundary componentName="SpellbookView">
                    <SpellbookView
                      characterSpells={characterSpells}
                      loading={spellbookLoading}
                      activeCharacter={activeCharacter}
                      selectedId={selectedSpell?.id ?? null}
                      onSelect={handleSelectSpell}
                      onToggleFavorite={handleToggleFavorite}
                      onTogglePrepared={togglePrepared}
                      onRemove={removeSpell}
                      onNewCharacter={() => setModalMode('create')}
                    />
                  </ErrorBoundary>
                ) : (
                  <ErrorBoundary componentName="SpellList">
                    <SpellList
                      spells={spells}
                      loading={loading}
                      selectedId={selectedSpell?.id ?? null}
                      onSelect={handleSelectSpell}
                      onToggleFavorite={handleToggleFavorite}
                      spellbookIds={spellbookIds}
                      hasActiveCharacter={activeCharacterId !== null}
                      onAddToSpellbook={addSpell}
                      onRemoveFromSpellbook={removeSpell}
                      focusedIndex={focusedIndex}
                      spellTagsById={spellTagsById}
                      style={selectedSpell ? { flex: 'none', width: `${splitRatio * 100}%`, minWidth: 200 } : undefined}
                    />
                  </ErrorBoundary>
                )}
                {!isSpellbookView && selectedSpell && (
                  <div
                    className={styles.dragHandle}
                    onMouseDown={handleDragStart}
                    onDoubleClick={() => {
                      setSplitRatio(0.38)
                      localStorage.setItem('spellbook-split', '0.38')
                    }}
                    title="Drag to resize · Double-click to reset"
                  >
                    <div className={styles.dragDots} />
                  </div>
                )}
                {selectedSpell && renderSpellDetail(selectedSpell, { style: { flex: 1, minWidth: 300 } })}
              </>
            ) : selectedSpell ? (
              renderSpellDetail(selectedSpell, { fullWidth: true, onBack: () => setSelectedSpell(null) })
            ) : isSpellbookView ? (
              <ErrorBoundary componentName="SpellbookView">
                <SpellbookView
                  characterSpells={characterSpells}
                  loading={spellbookLoading}
                  activeCharacter={activeCharacter}
                  selectedId={null}
                  onSelect={handleSelectSpell}
                  onToggleFavorite={handleToggleFavorite}
                  onTogglePrepared={togglePrepared}
                  onRemove={removeSpell}
                  onNewCharacter={() => setModalMode('create')}
                />
              </ErrorBoundary>
            ) : (
              <ErrorBoundary componentName="SpellList">
                <SpellList
                  spells={spells}
                  loading={loading}
                  selectedId={null}
                  onSelect={handleSelectSpell}
                  onToggleFavorite={handleToggleFavorite}
                  spellbookIds={spellbookIds}
                  hasActiveCharacter={activeCharacterId !== null}
                  onAddToSpellbook={addSpell}
                  onRemoveFromSpellbook={removeSpell}
                  spellTagsById={spellTagsById}
                />
              </ErrorBoundary>
            )}
          </div>
        </div>
        {modalMode !== null && (
          <CharacterModal
            mode={modalMode}
            character={modalMode === 'edit' ? activeCharacter : null}
            onSave={handleModalSave}
            onClose={() => setModalMode(null)}
          />
        )}
        {showUpdateModal && <UpdateModal onClose={() => setShowUpdateModal(false)} />}
        {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      </div>
    </ErrorBoundary>
  )
}
