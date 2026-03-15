import { useMemo } from 'react'
import type { CharacterSpell } from '../../types/character'
import type { Character } from '../../types/character'
import type { Spell } from '../../types/spell'
import { TraditionBadge } from '../shared/TraditionBadge'
import styles from './SpellbookView.module.css'

interface SpellbookViewProps {
  characterSpells: CharacterSpell[]
  loading: boolean
  activeCharacter: Character | null
  selectedId: number | null
  onSelect: (spell: Spell) => void
  onToggleFavorite: (id: number) => void
  onTogglePrepared: (id: number) => void
  onRemove: (id: number) => void
  onNewCharacter: () => void
}

function levelLabel(level: number): string {
  return level === 0 ? 'Cantrips' : `Level ${level}`
}

export function SpellbookView({
  characterSpells,
  loading,
  activeCharacter,
  selectedId,
  onSelect,
  onToggleFavorite,
  onTogglePrepared,
  onRemove,
  onNewCharacter,
}: SpellbookViewProps): JSX.Element {
  const groups = useMemo(() => {
    const map = new Map<number, CharacterSpell[]>()
    for (const spell of characterSpells) {
      const arr = map.get(spell.level) ?? []
      arr.push(spell)
      map.set(spell.level, arr)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b)
  }, [characterSpells])

  const summary = useMemo(() => {
    return groups
      .filter(([level]) => level > 0)
      .map(([level, spells]) => ({
        level,
        prepared: spells.filter((s) => s.is_prepared).length,
        total: spells.length,
      }))
      .filter(({ total }) => total > 0)
  }, [groups])

  if (!activeCharacter) {
    return (
      <div className={styles.list}>
        <div className={styles.empty}>
          <div className={styles.emptyRune}>◈</div>
          <div className={styles.emptyTitle}>No character selected</div>
          <div className={styles.emptyText}>Create a character to start building your spellbook.</div>
          <button className={styles.createBtn} onClick={onNewCharacter}>
            + New Character
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.list}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.skeletonRow} />
        ))}
      </div>
    )
  }

  if (characterSpells.length === 0) {
    return (
      <div className={styles.list}>
        <div className={styles.empty}>
          <div className={styles.emptyRune}>◇</div>
          <div className={styles.emptyTitle}>{activeCharacter.name}'s spellbook is empty</div>
          <div className={styles.emptyText}>
            Browse All Spells and click ◇ to add spells to this spellbook.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.list}>
      {summary.length > 0 && (
        <div className={styles.summary}>
          <span className={styles.summaryLabel}>Prepared:</span>
          <div className={styles.summaryPips}>
            {summary.map(({ level, prepared, total }) => (
              <span
                key={level}
                className={`${styles.summaryPip} ${prepared === total ? styles.summaryFull : prepared > 0 ? styles.summaryPartial : ''}`}
                title={`Level ${level}: ${prepared}/${total} prepared`}
              >
                {level}:{prepared}/{total}
              </span>
            ))}
          </div>
        </div>
      )}

      {groups.map(([level, spells]) => (
        <div key={level} className={styles.group}>
          <div className={styles.groupHeader}>
            <span className={styles.groupLabel}>{levelLabel(level)}</span>
            {level > 0 && (
              <span className={styles.groupCount}>
                {spells.filter((s) => s.is_prepared).length}/{spells.length} prepared
              </span>
            )}
          </div>
          {spells.map((spell) => (
            <div
              key={spell.id}
              className={`${styles.spellRow} ${spell.id === selectedId ? styles.selected : ''}`}
              onClick={() => onSelect(spell)}
            >
              {level > 0 && (
                <button
                  className={`${styles.prepareBtn} ${spell.is_prepared ? styles.prepared : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onTogglePrepared(spell.id)
                  }}
                  title={spell.is_prepared ? 'Unprepare' : 'Prepare'}
                >
                  {spell.is_prepared ? '●' : '○'}
                </button>
              )}
              {level === 0 && <span className={styles.cantripDot}>●</span>}
              <span className={`${styles.spellName} ${spell.id === selectedId ? styles.selectedName : ''}`}>
                {spell.name}
              </span>
              <div className={styles.spellMeta}>
                {spell.traditions.map((t) => (
                  <TraditionBadge key={t} tradition={t} />
                ))}
              </div>
              <button
                className={`${styles.favBtn} ${spell.is_favorite ? styles.favorited : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleFavorite(spell.id)
                }}
                title={spell.is_favorite ? 'Unfavorite' : 'Favorite'}
              >
                {spell.is_favorite ? '★' : '☆'}
              </button>
              <button
                className={styles.removeBtn}
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(spell.id)
                }}
                title="Remove from spellbook"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
