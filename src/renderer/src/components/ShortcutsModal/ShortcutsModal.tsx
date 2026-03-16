import styles from './ShortcutsModal.module.css'

interface ShortcutsModalProps {
  onClose: () => void
}

interface ShortcutRow {
  keys: string[]
  label: string
}

const SHORTCUTS: { section: string; rows: ShortcutRow[] }[] = [
  {
    section: 'Navigation',
    rows: [
      { keys: ['↑', '↓'], label: 'Move focus through spell list' },
      { keys: ['Enter'], label: 'Open focused spell' },
      { keys: ['Ctrl', 'K'], label: 'Focus search bar' },
      { keys: ['Esc'], label: 'Clear search / close detail' },
    ],
  },
  {
    section: 'Actions',
    rows: [
      { keys: ['F'], label: 'Toggle favourite on selected spell' },
    ],
  },
  {
    section: 'Views',
    rows: [
      { keys: ['Ctrl', '0'], label: 'All spells' },
      { keys: ['Ctrl', '1'], label: 'Arcane' },
      { keys: ['Ctrl', '2'], label: 'Divine' },
      { keys: ['Ctrl', '3'], label: 'Occult' },
      { keys: ['Ctrl', '4'], label: 'Primal' },
    ],
  },
  {
    section: 'Interface',
    rows: [
      { keys: ['?'], label: 'Show / hide this panel' },
    ],
  },
]

export function ShortcutsModal({ onClose }: ShortcutsModalProps): JSX.Element {
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Keyboard Shortcuts</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.body}>
          {SHORTCUTS.map((section) => (
            <div key={section.section} className={styles.section}>
              <div className={styles.sectionTitle}>{section.section}</div>
              {section.rows.map((row) => (
                <div key={row.label} className={styles.row}>
                  <div className={styles.keys}>
                    {row.keys.map((k, i) => (
                      <span key={i}>
                        <kbd className={styles.kbd}>{k}</kbd>
                        {i < row.keys.length - 1 && <span className={styles.plus}>+</span>}
                      </span>
                    ))}
                  </div>
                  <span className={styles.label}>{row.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
