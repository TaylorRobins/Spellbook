import { useState, useCallback } from 'react'
import { Sidebar } from './components/Sidebar/Sidebar'
import { SearchBar } from './components/SearchBar/SearchBar'
import { SpellList } from './components/SpellList/SpellList'
import { SpellDetail } from './components/SpellDetail/SpellDetail'
import { SpellbookView } from './components/SpellbookView/SpellbookView'
import { CharacterModal } from './components/CharacterModal/CharacterModal'
import { useSpells } from './hooks/useSpells'
import { useCharacters } from './hooks/useCharacters'
import { useSpellbook } from './hooks/useSpellbook'
import type { SidebarView, Spell } from './types/spell'
import type { Character } from './types/character'
import styles from './App.module.css'

export default function App(): JSX.Element {
  const [sidebarView, setSidebarView] = useState<SidebarView>({ type: 'all' })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)

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
      />
      <div className={styles.mainPane}>
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        <div className={styles.contentArea}>
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
    </div>
  )
}
