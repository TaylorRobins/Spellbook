import type { Character } from '../../types/character'
import styles from './CharacterSwitcher.module.css'

interface CharacterSwitcherProps {
  characters: Character[]
  activeCharacterId: number | null
  onCharacterChange: (id: number) => void
  onNewCharacter: () => void
  onEditCharacter: () => void
  onDeleteCharacter: (id: number) => void
}

export function CharacterSwitcher({
  characters,
  activeCharacterId,
  onCharacterChange,
  onNewCharacter,
  onEditCharacter,
  onDeleteCharacter,
}: CharacterSwitcherProps): JSX.Element {
  const active = characters.find((c) => c.id === activeCharacterId) ?? null

  return (
    <div className={styles.switcher}>
      <div className={styles.header}>
        <span className={styles.label}>Character</span>
        <button className={styles.newBtn} onClick={onNewCharacter} title="New character">
          + New
        </button>
      </div>
      {characters.length === 0 ? (
        <div className={styles.empty}>No characters yet</div>
      ) : (
        <>
          <div className={styles.selectRow}>
            <select
              className={styles.select}
              value={activeCharacterId ?? ''}
              onChange={(e) => onCharacterChange(Number(e.target.value))}
            >
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {active && (
              <div className={styles.actions}>
                <button
                  className={styles.actionBtn}
                  onClick={onEditCharacter}
                  title="Edit character"
                >
                  ✎
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                  onClick={() => onDeleteCharacter(active.id)}
                  title="Delete character"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
          {active && (
            <div className={styles.charMeta}>
              {[active.class, active.level > 0 ? `Lvl ${active.level}` : '', active.tradition]
                .filter(Boolean)
                .join(' · ')}
            </div>
          )}
        </>
      )}
    </div>
  )
}
