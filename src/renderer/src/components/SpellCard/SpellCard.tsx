import type { Spell } from '../../types/spell'
import { TraditionBadge } from '../shared/TraditionBadge'
import { LevelPip } from '../shared/LevelPip'
import styles from './SpellCard.module.css'

interface SpellCardProps {
  spell: Spell
  isSelected: boolean
  onSelect: (spell: Spell) => void
  onToggleFavorite: (id: number) => void
  inSpellbook?: boolean
  hasActiveCharacter?: boolean
  onAddToSpellbook?: (id: number) => void
  onRemoveFromSpellbook?: (id: number) => void
}

export function SpellCard({
  spell,
  isSelected,
  onSelect,
  onToggleFavorite,
  inSpellbook,
  hasActiveCharacter,
  onAddToSpellbook,
  onRemoveFromSpellbook,
}: SpellCardProps): JSX.Element {
  const showSpellbookBtn = onAddToSpellbook !== undefined && hasActiveCharacter

  return (
    <div
      className={`${styles.card} ${isSelected ? styles.selected : ''}`}
      style={{ '--school-color': `var(--color-${spell.school})` } as React.CSSProperties}
      onClick={() => onSelect(spell)}
    >
      <div className={styles.schoolBar} />
      <div className={styles.body}>
        <div className={styles.topRow}>
          <span className={styles.name}>{spell.name}</span>
          <div className={styles.meta}>
            {showSpellbookBtn && (
              <button
                className={`${styles.spellbookBtn} ${inSpellbook ? styles.inSpellbook : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  if (inSpellbook) {
                    onRemoveFromSpellbook?.(spell.id)
                  } else {
                    onAddToSpellbook(spell.id)
                  }
                }}
                title={inSpellbook ? 'Remove from spellbook' : 'Add to spellbook'}
              >
                {inSpellbook ? '◈' : '◇'}
              </button>
            )}
            <LevelPip level={spell.level} />
          </div>
        </div>
        <div className={styles.bottomRow}>
          <div className={styles.traditions}>
            {spell.traditions.map((t) => (
              <TraditionBadge key={t} tradition={t} />
            ))}
          </div>
          <span className={styles.school}>{spell.school}</span>
          <button
            className={`${styles.favoriteBtn} ${spell.is_favorite ? styles.favorited : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite(spell.id)
            }}
            title={spell.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {spell.is_favorite ? '★' : '☆'}
          </button>
        </div>
      </div>
    </div>
  )
}
