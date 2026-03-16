import { useMemo } from 'react'
import DOMPurify from 'dompurify'
import type { Spell } from '../../types/spell'
import { TraditionBadge } from '../shared/TraditionBadge'
import styles from './SpellDetail.module.css'

const ALLOWED_TAGS = ['p','ul','ol','li','table','thead','tbody','tr','td','th','strong','em','b','i','hr','br','span','h3','h4']
const ALLOWED_ATTR = ['class','colspan','rowspan']

function prepareDescription(raw: string): string {
  if (!raw) return ''
  const isHtml = /<[a-z][\s\S]*>/i.test(raw)
  if (!isHtml) {
    return raw.split('\n\n').map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
  }
  // Strip Foundry macros: @TAG[...]{label} → label, @TAG[...] → nothing
  let html = raw
  html = html.replace(/@\w+\[[^\]]+\]\{([^}]+)\}/g, '$1')
  html = html.replace(/@\w+\[[^\]]+\]/g, '')
  html = html.replace(/\[\[\/\w[^\]]*\]\]\{([^}]+)\}/g, '$1')
  html = html.replace(/\[\[[^\]]+\]\]/g, '')
  html = DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR }) as string
  // Wrap dice notation outside HTML tags
  html = html.replace(/(<[^>]+>)|(\b\d+d\d+(?:[+-]\d+)?\b)/g, (_m, tag, dice) =>
    tag ? tag : `<span class="dice">${dice}</span>`
  )
  return html
}

interface SpellDetailProps {
  spell: Spell
  onToggleFavorite: (id: number) => void
  fullWidth?: boolean
  onBack?: () => void
  style?: React.CSSProperties
}

interface StatRowProps {
  label: string
  value: string
}

function StatRow({ label, value }: StatRowProps): JSX.Element | null {
  if (!value) return null
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  )
}

export function SpellDetail({ spell, onToggleFavorite, fullWidth, onBack, style }: SpellDetailProps): JSX.Element {
  const descHtml = useMemo(() => prepareDescription(spell.description), [spell.description])

  return (
    <div className={fullWidth ? styles.detailFull : styles.detail} style={style}>
      {/* Header */}
      <div
        className={styles.header}
        style={{ '--school-color': `var(--color-${spell.school})` } as React.CSSProperties}
      >
        <div className={styles.headerAccent} />
        <div className={styles.headerContent}>
          {onBack && (
            <button className={styles.backBtn} onClick={onBack}>
              ← Back to list
            </button>
          )}
          <div className={styles.titleRow}>
            <h1 className={styles.name}>{spell.name}</h1>
            <button
              className={`${styles.favoriteBtn} ${spell.is_favorite ? styles.favorited : ''}`}
              onClick={() => onToggleFavorite(spell.id)}
              title={spell.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {spell.is_favorite ? '★' : '☆'}
            </button>
          </div>
          <div className={styles.subtitle}>
            <span className={styles.levelLabel}>
              {spell.level === 0 ? 'Cantrip' : `Spell ${spell.level}`}
            </span>
            <span className={styles.schoolLabel}>{spell.school}</span>
          </div>
          <div className={styles.traditions}>
            {spell.traditions.map((t) => (
              <TraditionBadge key={t} tradition={t} />
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className={styles.body}>
        {/* Stat block */}
        <div className={fullWidth ? styles.statBlockTwoCol : styles.statBlock}>
          {fullWidth ? (
            <>
              <div className={styles.statCol}>
                <StatRow label="Cast" value={spell.cast_time} />
                <StatRow label="Components" value={spell.components} />
                <StatRow label="Save" value={spell.saving_throw} />
              </div>
              <div className={styles.statCol}>
                <StatRow label="Range" value={spell.range} />
                <StatRow label="Area" value={spell.area} />
                <StatRow label="Duration" value={spell.duration} />
              </div>
            </>
          ) : (
            <>
              <StatRow label="Cast" value={spell.cast_time} />
              <StatRow label="Components" value={spell.components} />
              <StatRow label="Range" value={spell.range} />
              <StatRow label="Area" value={spell.area} />
              <StatRow label="Duration" value={spell.duration} />
              <StatRow label="Save" value={spell.saving_throw} />
            </>
          )}
        </div>

        {/* Divider */}
        <div className={styles.divider} />

        {/* Description */}
        <div className={styles.description} dangerouslySetInnerHTML={{ __html: descHtml }} />

        {/* Heightened effects */}
        {spell.heightened_effects.length > 0 && (
          <div className={styles.heightened}>
            <div className={styles.heightenedTitle}>
              <span className={styles.heightenedRune}>✦</span> Heightened
            </div>
            {spell.heightened_effects.map((h, i) => (
              <div key={i} className={styles.heightenedRow}>
                <span className={styles.heightenedLevel}>{h.level}</span>
                <span className={styles.heightenedEffect} dangerouslySetInnerHTML={{ __html: prepareDescription(h.effect) }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
