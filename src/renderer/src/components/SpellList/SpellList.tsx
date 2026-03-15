import type { Spell } from '../../types/spell'
import { SpellCard } from '../SpellCard/SpellCard'
import styles from './SpellList.module.css'

interface SpellListProps {
  spells: Spell[]
  loading: boolean
  selectedId: number | null
  onSelect: (spell: Spell) => void
  onToggleFavorite: (id: number) => void
  spellbookIds?: Set<number>
  hasActiveCharacter?: boolean
  onAddToSpellbook?: (id: number) => void
  onRemoveFromSpellbook?: (id: number) => void
}

export function SpellList({
  spells,
  loading,
  selectedId,
  onSelect,
  onToggleFavorite,
  spellbookIds,
  hasActiveCharacter,
  onAddToSpellbook,
  onRemoveFromSpellbook,
}: SpellListProps): JSX.Element {
  if (loading) {
    return (
      <div className={styles.list}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={styles.skeleton}>
            <div className={styles.skeletonBar} />
            <div className={styles.skeletonBody}>
              <div className={styles.skeletonName} />
              <div className={styles.skeletonMeta} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (spells.length === 0) {
    return (
      <div className={styles.list}>
        <div className={styles.empty}>
          <div className={styles.emptyRune}>✦</div>
          <div className={styles.emptyTitle}>No spells found</div>
          <div className={styles.emptyText}>Your grimoire reveals nothing matching this search.</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.list}>
      <div className={styles.count}>{spells.length} spell{spells.length !== 1 ? 's' : ''}</div>
      {spells.map((spell) => (
        <SpellCard
          key={spell.id}
          spell={spell}
          isSelected={spell.id === selectedId}
          onSelect={onSelect}
          onToggleFavorite={onToggleFavorite}
          inSpellbook={spellbookIds?.has(spell.id)}
          hasActiveCharacter={hasActiveCharacter}
          onAddToSpellbook={onAddToSpellbook}
          onRemoveFromSpellbook={onRemoveFromSpellbook}
        />
      ))}
    </div>
  )
}
