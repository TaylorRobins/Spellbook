import { useState, useEffect } from 'react'
import styles from './UpdateModal.module.css'

interface UpdateModalProps {
  onClose: () => void
}

export function UpdateModal({ onClose }: UpdateModalProps): JSX.Element {
  const [status, setStatus] = useState('Checking for updates…')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cleanup = window.api.onUpdateProgress((msg) => setStatus(msg))

    window.api.updateSpells().then(() => {
      setDone(true)
    }).catch((e: Error) => {
      setError(e.message)
      setDone(true)
    })

    return cleanup
  }, [])

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.title}>Update Spell Database</span>
        </div>

        <div className={styles.body}>
          {!done && <div className={styles.spinner} />}
          <span className={error ? styles.errorText : styles.statusText}>
            {error ? `Error: ${error}` : status}
          </span>
        </div>

        <div className={styles.footer}>
          <button className={styles.closeBtn} onClick={onClose} disabled={!done}>
            {done ? 'Close' : 'Working…'}
          </button>
        </div>
      </div>
    </div>
  )
}
