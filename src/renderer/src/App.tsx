import { useState, useCallback, useEffect } from 'react'
import { Sidebar } from './components/Sidebar/Sidebar'
import { SearchBar } from './components/SearchBar/SearchBar'
import { SpellList } from './components/SpellList/SpellList'
import { SpellDetail } from './components/SpellDetail/SpellDetail'
import { SpellbookView } from './components/SpellbookView/SpellbookView'
import { CharacterModal } from './components/CharacterModal/CharacterModal'
import { UpdateModal } from './components/UpdateModal/UpdateModal'
import { useSpells } from './hooks/useSpells'
import { useCharacters } from './hooks/useCharacters'
import { useSpellbook } from './hooks/useSpellbook'
import type { SidebarView, Spell, SpellRow } from './types/spell'
import { parseSpell } from './types/spell'
import type { Character } from './types/character'
import styles from './App.module.css'

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

export default function App(): JSX.Element {
  const [sidebarView, setSidebarView] = useState<SidebarView>({ type: 'all' })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [appUpdateState, setAppUpdateState] = useState<null | { type: 'downloading'; percent: number } | { type: 'ready'; version: string } | { type: 'uptodate' }>(null)
  const [layout, setLayout] = useState<'split' | 'full'>(() =>
    (localStorage.getItem('spellbook-layout') as 'split' | 'full') ?? 'split'
  )

  const toggleLayout = useCallback(() => {
    setLayout(l => {
      const next = l === 'split' ? 'full' : 'split'
      localStorage.setItem('spellbook-layout', next)
      return next
    })
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && layout === 'full' && selectedSpell) {
        setSelectedSpell(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [layout, selectedSpell])

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

  const { spells, loading, toggleFavorite } = useSpells(sidebarView, searchQuery)

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

  const handleSelectSpell = useCallback((spell: Spell) => {
    setSelectedSpell(spell)
  }, [])

  const handleSelectSuggestion = useCallback(async (id: number) => {
    const row = await window.api.getSpellById(id)
    if (row) setSelectedSpell(parseSpell(row as SpellRow))
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

  const isSpellbookView = sidebarView.type === 'spellbook'

  return (
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
        onOpenUpdateModal={() => setShowUpdateModal(true)}
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
          <SearchBar value={searchQuery} onChange={setSearchQuery} onSelectSuggestion={handleSelectSuggestion} />
          <button
            className={styles.layoutToggle}
            onClick={toggleLayout}
            title={layout === 'split' ? 'Switch to full view (hides list when spell is open)' : 'Switch to split view (list and detail side by side)'}
          >
            {layout === 'split' ? <FullViewIcon /> : <SplitViewIcon />}
          </button>
        </div>
        <div className={styles.contentArea}>
          {layout === 'split' ? (
            <>
              {isSpellbookView ? (
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
              ) : (
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
                />
              )}
              {selectedSpell && (
                <SpellDetail spell={selectedSpell} onToggleFavorite={handleToggleFavorite} />
              )}
            </>
          ) : selectedSpell ? (
            <SpellDetail
              spell={selectedSpell}
              onToggleFavorite={handleToggleFavorite}
              fullWidth
              onBack={() => setSelectedSpell(null)}
            />
          ) : isSpellbookView ? (
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
          ) : (
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
            />
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
    </div>
  )
}
