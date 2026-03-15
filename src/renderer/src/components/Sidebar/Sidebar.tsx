import type { SidebarView, Tradition } from '../../types/spell'
import type { Character } from '../../types/character'
import { CharacterSwitcher } from '../CharacterSwitcher/CharacterSwitcher'
import styles from './Sidebar.module.css'

interface SidebarProps {
  activeView: SidebarView
  onViewChange: (view: SidebarView) => void
  characters: Character[]
  activeCharacterId: number | null
  onCharacterChange: (id: number) => void
  onNewCharacter: () => void
  onEditCharacter: () => void
  onDeleteCharacter: (id: number) => void
}

const LEVELS = Array.from({ length: 11 }, (_, i) => i)

const TRADITIONS: { value: Tradition; label: string }[] = [
  { value: 'arcane', label: 'Arcane' },
  { value: 'divine', label: 'Divine' },
  { value: 'occult', label: 'Occult' },
  { value: 'primal', label: 'Primal' },
]

function isActive(view: SidebarView, check: SidebarView): boolean {
  if (view.type !== check.type) return false
  if (view.type === 'tradition' && check.type === 'tradition') {
    return view.tradition === check.tradition
  }
  if (view.type === 'level' && check.type === 'level') {
    return view.level === check.level
  }
  return true
}

export function Sidebar({
  activeView, onViewChange,
  characters, activeCharacterId, onCharacterChange,
  onNewCharacter, onEditCharacter, onDeleteCharacter
}: SidebarProps): JSX.Element {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.title}>
        <span className={styles.titleRune}>✦</span>
        <span>Spellbook</span>
        <span className={styles.titleRune}>✦</span>
      </div>

      <CharacterSwitcher
        characters={characters}
        activeCharacterId={activeCharacterId}
        onCharacterChange={onCharacterChange}
        onNewCharacter={onNewCharacter}
        onEditCharacter={onEditCharacter}
        onDeleteCharacter={onDeleteCharacter}
      />

      <nav className={styles.nav}>
        <button
          className={`${styles.navItem} ${isActive(activeView, { type: 'all' }) ? styles.active : ''}`}
          onClick={() => onViewChange({ type: 'all' })}
        >
          <span className={styles.navIcon}>◈</span>
          All Spells
        </button>

        <div className={styles.section}>
          <div className={styles.sectionLabel}>By Tradition</div>
          {TRADITIONS.map(({ value, label }) => (
            <button
              key={value}
              className={`${styles.navItem} ${styles[`tradition_${value}`]} ${
                isActive(activeView, { type: 'tradition', tradition: value }) ? styles.active : ''
              }`}
              onClick={() => onViewChange({ type: 'tradition', tradition: value })}
            >
              <span className={styles.traditionDot} data-tradition={value} />
              {label}
            </button>
          ))}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionLabel}>By Level</div>
          <div className={styles.levelGrid}>
            {LEVELS.map((level) => (
              <button
                key={level}
                className={`${styles.levelButton} ${
                  isActive(activeView, { type: 'level', level }) ? styles.active : ''
                }`}
                onClick={() => onViewChange({ type: 'level', level })}
                title={level === 0 ? 'Cantrip' : `Level ${level}`}
              >
                {level === 0 ? 'C' : level}
              </button>
            ))}
          </div>
        </div>

        <button
          className={`${styles.navItem} ${styles.favoritesItem} ${
            isActive(activeView, { type: 'spellbook' }) ? styles.active : ''
          }`}
          onClick={() => onViewChange({ type: 'spellbook' })}
        >
          <span className={styles.navIcon}>★</span>
          My Spellbook
        </button>
      </nav>

      <div className={styles.footer}>
        <div className={styles.footerDivider} />
        <div className={styles.footerText}>Tabletop RPG Grimoire</div>
      </div>
    </aside>
  )
}
