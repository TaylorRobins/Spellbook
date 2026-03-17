import { useMemo, useState } from 'react'
import DOMPurify from 'dompurify'
import type { Spell, SpellTag } from '../../types/spell'
import { TraditionBadge } from '../shared/TraditionBadge'
import styles from './SpellDetail.module.css'

const ALLOWED_TAGS = ['p','ul','ol','li','table','thead','tbody','tr','td','th','strong','em','b','i','hr','br','span','h3','h4']
const ALLOWED_ATTR = ['class','colspan','rowspan']

const ACTION_GLYPHS: Record<string, string> = {
  a: '◆', '1': '◆',
  d: '◆◆', '2': '◆◆',
  t: '◆◆◆', '3': '◆◆◆',
  r: '↩',
  f: '◇',
}

function prepareDescription(raw: string): string {
  if (!raw) return ''

  // Strip Foundry macros before HTML/plain-text branching so both paths are covered
  let text = raw
  text = text.replace(/@\w+\[[^\]]+\]\{([^}]+)\}/g, '$1')
  text = text.replace(/@\w+\[[^\]]+\]/g, '')
  text = text.replace(/\[\[\/\w[^\]]*\]\]\{([^}]+)\}/g, '$1')
  text = text.replace(/\[\[[^\]]+\]\]/g, '')

  // Replace action-glyph spans (HTML descriptions) — runs before isHtml check so it's
  // also a no-op on plain text without causing issues
  text = text.replace(
    /<(?:span|i)[^>]*class="[^"]*(?:action-glyph|pf2-icon)[^"]*"[^>]*>([^<]*)<\/(?:span|i)>/gi,
    (_, g) => ACTION_GLYPHS[g.trim()] ?? g
  )
  // Contextual replacement: "Melee a " / "Ranged d " etc. in plain-text descriptions
  // where the glyph letter appears literally between attack type and weapon name
  text = text.replace(/\b(Melee|Ranged) ([adtrf1-3]) /g, (_, type: string, g: string) =>
    `${type} ${ACTION_GLYPHS[g.toLowerCase()] ?? g} `
  )

  const isHtml = /<[a-z][\s\S]*>/i.test(text)
  const BR = isHtml ? '<br><br>' : '\n\n'

  // Form/deity name: 1-2 capitalised words, hyphens allowed (e.g. Zon-Kuthon, Cayden Cailean)
  const N = '([A-Z][a-zA-Z-]+(?:\\s[A-Z][a-zA-Z-]+)?)'
  // Stat keyword that immediately follows the form name
  const S = '( Speed | fly | swim | burrow | climb | no )'
  // Damage types that can end an entry with no trailing period (e.g. "piercing Asmodeus")
  const D = 'piercing|slashing|bludgeoning|fire|cold|electricity|poison|acid|sonic|mental|vitality|void|force'

  // Pass 1 — entry preceded by an explicit separator (. : ;)
  text = text.replace(
    new RegExp(`([.:;]) ${N}${S}`, 'g'),
    (_, sep, name, stat) => `${sep}${BR}<strong>${name}</strong>${stat}`
  )
  // Pass 2 — entry preceded only by a damage type word (no period)
  text = text.replace(
    new RegExp(`\\b(${D})\\.?\\s+${N}${S}`, 'g'),
    (_, dmg, name, stat) => `${dmg}${BR}<strong>${name}</strong>${stat}`
  )

  // Break before each Heightened entry that appears inline in the description
  text = text.replace(/(?<=[^\n])\s+(Heightened \([^)]+\))/g, `${BR}<strong>$1</strong>`)

  if (!isHtml) {
    return text.split('\n\n').map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
  }

  text = DOMPurify.sanitize(text, { ALLOWED_TAGS, ALLOWED_ATTR }) as string
  // Wrap dice notation outside HTML tags
  text = text.replace(/(<[^>]+>)|(\b\d+d\d+(?:[+-]\d+)?\b)/g, (_m, tag, dice) =>
    tag ? tag : `<span class="dice">${dice}</span>`
  )
  return text
}

interface SpellDetailProps {
  spell: Spell
  onToggleFavorite: (id: number) => void
  fullWidth?: boolean
  onBack?: () => void
  style?: React.CSSProperties
  allTags?: SpellTag[]
  onSetSpellTag?: (tagId: number, add: boolean) => Promise<void>
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

export function SpellDetail({ spell, onToggleFavorite, fullWidth, onBack, style, allTags, onSetSpellTag }: SpellDetailProps): JSX.Element {
  const descHtml = useMemo(() => prepareDescription(spell.description), [spell.description])
  const [tagMenuOpen, setTagMenuOpen] = useState(false)
  const spellTags = spell.tags ?? []
  const availableTags = (allTags ?? []).filter(t => !spellTags.find(s => s.id === t.id))

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
      <div key={spell.id} className={styles.body}>
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

        {/* Tags */}
        {(spellTags.length > 0 || (allTags && allTags.length > 0)) && (
          <div className={styles.tagsSection}>
            <div className={styles.tagsRow}>
              {spellTags.map(tag => (
                <button
                  key={tag.id}
                  className={styles.tagPill}
                  style={{ borderColor: tag.color, color: tag.color, background: `${tag.color}18` }}
                  onClick={() => onSetSpellTag?.(tag.id, false)}
                  title={`Remove tag: ${tag.name}`}
                >
                  {tag.name} ✕
                </button>
              ))}
              {onSetSpellTag && availableTags.length > 0 && (
                <div className={styles.tagAddWrap}>
                  <button
                    className={styles.tagAddBtn}
                    onClick={() => setTagMenuOpen(o => !o)}
                    title="Add tag"
                  >
                    + Tag
                  </button>
                  {tagMenuOpen && (
                    <div className={styles.tagDropdown}>
                      {availableTags.map(tag => (
                        <button
                          key={tag.id}
                          className={styles.tagDropdownItem}
                          onClick={() => { onSetSpellTag(tag.id, true); setTagMenuOpen(false) }}
                        >
                          <span className={styles.tagDropdownDot} style={{ background: tag.color }} />
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

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
