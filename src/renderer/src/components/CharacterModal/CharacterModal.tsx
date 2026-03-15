import { useState, useEffect } from 'react'
import type { Character } from '../../types/character'
import styles from './CharacterModal.module.css'

interface CharacterModalProps {
  mode: 'create' | 'edit'
  character: Character | null
  onSave: (data: Omit<Character, 'id'>) => void
  onClose: () => void
}

export function CharacterModal({ mode, character, onSave, onClose }: CharacterModalProps): JSX.Element {
  const [name, setName] = useState('')
  const [cls, setCls] = useState('')
  const [level, setLevel] = useState(1)
  const [tradition, setTradition] = useState('')

  useEffect(() => {
    if (character) {
      setName(character.name)
      setCls(character.class)
      setLevel(character.level)
      setTradition(character.tradition)
    } else {
      setName('')
      setCls('')
      setLevel(1)
      setTradition('')
    }
  }, [character])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), class: cls.trim(), level, tradition })
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>
            {mode === 'create' ? 'New Character' : 'Edit Character'}
          </span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Name</label>
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Character name"
              required
              autoFocus
            />
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Class</label>
              <input
                className={styles.input}
                value={cls}
                onChange={(e) => setCls(e.target.value)}
                placeholder="e.g. Wizard"
              />
            </div>
            <div className={styles.field} style={{ width: 80 }}>
              <label className={styles.fieldLabel}>Level</label>
              <input
                className={styles.input}
                type="number"
                min={1}
                max={20}
                value={level}
                onChange={(e) => setLevel(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
              />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Tradition</label>
            <select
              className={styles.select}
              value={tradition}
              onChange={(e) => setTradition(e.target.value)}
            >
              <option value="">None</option>
              <option value="arcane">Arcane</option>
              <option value="divine">Divine</option>
              <option value="occult">Occult</option>
              <option value="primal">Primal</option>
            </select>
          </div>
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn}>
              {mode === 'create' ? 'Create' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
