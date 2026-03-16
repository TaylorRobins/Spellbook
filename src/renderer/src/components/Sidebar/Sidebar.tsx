import wizardImg from '../../assets/wizard.png'
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
  onOpenUpdateModal: () => void
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
  onNewCharacter, onEditCharacter, onDeleteCharacter,
  onOpenUpdateModal
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
          <span className={styles.navIcon}>◈</span>
          My Spellbook
        </button>

        <button
          className={`${styles.navItem} ${styles.favoritesItem} ${
            isActive(activeView, { type: 'favorites' }) ? styles.active : ''
          }`}
          onClick={() => onViewChange({ type: 'favorites' })}
        >
          <span className={styles.navIcon}>★</span>
          Favorites
        </button>
      </nav>

      <div className={styles.tools}>
        <button className={styles.toolBtn} onClick={onOpenUpdateModal} title="Download latest spells from Foundry VTT">
          ↻ Update Spell Database
        </button>
        <button className={styles.toolBtn} onClick={() => window.api.checkForAppUpdate()} title="Check GitHub for a new app version">
          ⬆ Check for App Updates
        </button>
      </div>

      <div className={styles.wizard} aria-hidden="true">
        <img
          src={wizardImg}
          className={styles.wizardSprite}
          width={72}
          height={72}
          alt=""
        />
      </div>

      <div className={styles.illustration} aria-hidden="true">
        <svg width="160" height="180" viewBox="0 0 160 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Staff */}
          <line x1="80" y1="18" x2="80" y2="168" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round"/>
          {/* Staff top gem */}
          <circle cx="80" cy="14" r="6" stroke="#c9a84c" strokeWidth="1.5"/>
          <circle cx="80" cy="14" r="2.5" fill="#c9a84c" opacity="0.6"/>
          <line x1="80" y1="8" x2="80" y2="4" stroke="#c9a84c" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="74" y1="11" x2="70" y2="8" stroke="#c9a84c" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="86" y1="11" x2="90" y2="8" stroke="#c9a84c" strokeWidth="1.2" strokeLinecap="round"/>
          {/* Vine - left side, upper */}
          <path d="M80 45 C72 42 62 46 58 54 C54 62 60 70 68 68 C76 66 78 58 72 56" stroke="#c9a84c" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
          <path d="M68 68 C64 72 62 78 66 82" stroke="#c9a84c" strokeWidth="1" strokeLinecap="round" fill="none"/>
          {/* Left vine leaves */}
          <path d="M58 54 C54 50 50 52 52 56 C54 60 58 58 58 54Z" stroke="#c9a84c" strokeWidth="1" fill="none"/>
          <path d="M62 72 C58 70 55 73 57 77 C59 81 63 79 62 72Z" stroke="#c9a84c" strokeWidth="1" fill="none"/>
          <path d="M72 56 C70 52 66 52 66 56 C66 60 70 60 72 56Z" stroke="#c9a84c" strokeWidth="1" fill="none"/>
          {/* Vine - right side, middle */}
          <path d="M80 75 C88 72 98 76 102 84 C106 92 100 100 92 98 C84 96 82 88 88 86" stroke="#c9a84c" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
          <path d="M92 98 C96 102 98 108 94 112" stroke="#c9a84c" strokeWidth="1" strokeLinecap="round" fill="none"/>
          {/* Right vine leaves */}
          <path d="M102 84 C106 80 110 82 108 86 C106 90 102 88 102 84Z" stroke="#c9a84c" strokeWidth="1" fill="none"/>
          <path d="M98 102 C102 100 105 103 103 107 C101 111 97 109 98 102Z" stroke="#c9a84c" strokeWidth="1" fill="none"/>
          <path d="M88 86 C90 82 94 82 94 86 C94 90 90 90 88 86Z" stroke="#c9a84c" strokeWidth="1" fill="none"/>
          {/* Vine - left side, lower */}
          <path d="M80 110 C72 107 63 112 60 120 C57 128 63 135 70 132" stroke="#c9a84c" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
          <path d="M60 120 C56 116 52 118 54 122 C56 126 60 124 60 120Z" stroke="#c9a84c" strokeWidth="1" fill="none"/>
          <path d="M70 132 C67 128 63 129 64 133 C65 137 69 136 70 132Z" stroke="#c9a84c" strokeWidth="1" fill="none"/>
          {/* Arcane rune - left */}
          <g opacity="0.7">
            <circle cx="44" cy="90" r="9" stroke="#c9a84c" strokeWidth="1"/>
            <line x1="44" y1="81" x2="44" y2="99" stroke="#c9a84c" strokeWidth="0.8"/>
            <line x1="35" y1="90" x2="53" y2="90" stroke="#c9a84c" strokeWidth="0.8"/>
            <line x1="37.5" y1="83.5" x2="50.5" y2="96.5" stroke="#c9a84c" strokeWidth="0.8"/>
            <line x1="50.5" y1="83.5" x2="37.5" y2="96.5" stroke="#c9a84c" strokeWidth="0.8"/>
          </g>
          {/* Arcane rune - right */}
          <g opacity="0.7">
            <circle cx="116" cy="65" r="7" stroke="#c9a84c" strokeWidth="1"/>
            <path d="M116 58 L119 69 L110 63 L122 63 L113 69Z" stroke="#c9a84c" strokeWidth="0.9" fill="none" strokeLinejoin="round"/>
          </g>
          {/* Small sparkle dots */}
          <circle cx="50" cy="40" r="1.2" fill="#c9a84c" opacity="0.6"/>
          <circle cx="118" cy="100" r="1.2" fill="#c9a84c" opacity="0.6"/>
          <circle cx="40" cy="120" r="1" fill="#c9a84c" opacity="0.5"/>
          <circle cx="120" cy="130" r="1" fill="#c9a84c" opacity="0.5"/>
          <circle cx="56" cy="145" r="1.2" fill="#c9a84c" opacity="0.4"/>
          <circle cx="108" cy="42" r="1" fill="#c9a84c" opacity="0.4"/>
          {/* Staff base root tendrils */}
          <path d="M80 168 C74 165 68 168 65 173" stroke="#c9a84c" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6"/>
          <path d="M80 168 C86 165 92 168 95 173" stroke="#c9a84c" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6"/>
          <path d="M80 172 C78 170 74 172 72 175" stroke="#c9a84c" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.4"/>
          <path d="M80 172 C82 170 86 172 88 175" stroke="#c9a84c" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.4"/>
          {/* Horizontal ornament bands on staff */}
          <line x1="76" y1="38" x2="84" y2="38" stroke="#c9a84c" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
          <line x1="76" y1="42" x2="84" y2="42" stroke="#c9a84c" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
          <line x1="76" y1="130" x2="84" y2="130" stroke="#c9a84c" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
          <line x1="76" y1="134" x2="84" y2="134" stroke="#c9a84c" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
        </svg>
      </div>

      <div className={styles.footer}>
        <div className={styles.footerDivider} />
        <div className={styles.footerText}>Tabletop RPG Grimoire</div>
      </div>
    </aside>
  )
}
