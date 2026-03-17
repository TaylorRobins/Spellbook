import { useRef, useEffect } from 'react'
import type { Spell, SpellTag } from '../../types/spell'
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
  focusedIndex?: number
  style?: React.CSSProperties
  spellTagsById?: Record<number, SpellTag[]>
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
  focusedIndex,
  style,
  spellTagsById,
}: SpellListProps): JSX.Element {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (focusedIndex == null || focusedIndex < 0 || !listRef.current) return
    const cards = listRef.current.querySelectorAll('[data-card]')
    ;(cards[focusedIndex] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' })
  }, [focusedIndex])

  if (loading && spells.length === 0) {
    return (
      <div className={styles.list} style={style}>
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

  if (!loading && spells.length === 0) {
    return (
      <div className={styles.list} style={style}>
        <div className={styles.empty}>
          <div className={styles.emptyRune}>✦</div>
          <div className={styles.emptyTitle}>No spells found</div>
          <div className={styles.emptyText}>Your grimoire reveals nothing matching this search.</div>
        </div>
      </div>
    )
  }

  return (
    <div ref={listRef} className={`${styles.list} ${loading ? styles.fading : ''}`} style={style}>
      <div className={styles.count}>{spells.length} spell{spells.length !== 1 ? 's' : ''}</div>
      {spells.map((spell, i) => (
        <SpellCard
          key={spell.id}
          spell={spell}
          isSelected={spell.id === selectedId}
          isFocused={i === focusedIndex}
          onSelect={onSelect}
          onToggleFavorite={onToggleFavorite}
          inSpellbook={spellbookIds?.has(spell.id)}
          hasActiveCharacter={hasActiveCharacter}
          onAddToSpellbook={onAddToSpellbook}
          onRemoveFromSpellbook={onRemoveFromSpellbook}
          spellTags={spellTagsById?.[spell.id]}
        />
      ))}
    </div>
  )
}
