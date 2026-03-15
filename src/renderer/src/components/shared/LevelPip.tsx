import styles from './LevelPip.module.css'

interface LevelPipProps {
  level: number
}

export function LevelPip({ level }: LevelPipProps): JSX.Element {
  return (
    <span className={`${styles.pip} ${level === 0 ? styles.cantrip : ''}`}>
      {level === 0 ? 'Cantrip' : `${level}`}
    </span>
  )
}
