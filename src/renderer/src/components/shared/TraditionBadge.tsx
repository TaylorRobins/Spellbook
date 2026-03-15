import type { Tradition } from '../../types/spell'
import styles from './TraditionBadge.module.css'

interface TraditionBadgeProps {
  tradition: Tradition
}

const LABELS: Record<Tradition, string> = {
  arcane: 'Arc',
  divine: 'Div',
  occult: 'Occ',
  primal: 'Pri'
}

export function TraditionBadge({ tradition }: TraditionBadgeProps): JSX.Element {
  return (
    <span className={`${styles.badge} ${styles[tradition]}`} title={tradition}>
      {LABELS[tradition]}
    </span>
  )
}
