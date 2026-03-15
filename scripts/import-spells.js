/**
 * Import PF2e spells from the Foundry VTT pf2e system data.
 *
 * Usage:
 *   node scripts/import-spells.js [--db <path>] [--spells-dir <path>] [--include-rituals]
 *
 * Defaults:
 *   --db          %APPDATA%/spellbook/spellbook-dev.db  (Windows)
 *                 ~/Library/Application Support/spellbook/spellbook-dev.db  (macOS)
 *   --spells-dir  ./foundry-pf2e/packs/pf2e/spells
 *
 * Filters:
 *   - Skips focus spells (files under /focus/ subdirectory)
 *   - Skips rituals unless --include-rituals is passed
 *   - Skips non-spell JSON types
 *
 * Safe to re-run: uses INSERT OR IGNORE on the unique name column.
 */

'use strict'

// Uses Node.js built-in SQLite (node:sqlite, available in Node 22.5+).
// This avoids native binary conflicts — better-sqlite3 in node_modules is compiled
// against Electron's Node ABI, not the system Node ABI used to run this script.
const { DatabaseSync } = require('node:sqlite')
const fs = require('fs')
const path = require('path')
const os = require('os')

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
function getArg(flag) {
  const i = args.indexOf(flag)
  return i !== -1 ? args[i + 1] : null
}
const INCLUDE_RITUALS = args.includes('--include-rituals')
const UPDATE_EXISTING = args.includes('--update')  // replace rows that already exist

function defaultDbPath() {
  switch (process.platform) {
    case 'win32':
      return path.join(process.env.APPDATA || os.homedir(), 'spellbook', 'spellbook-dev.db')
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', 'spellbook', 'spellbook-dev.db')
    default:
      return path.join(os.homedir(), '.config', 'spellbook', 'spellbook-dev.db')
  }
}

const DB_PATH = getArg('--db') || defaultDbPath()
const SPELLS_ROOT = getArg('--spells-dir') || path.join(__dirname, '..', 'foundry-pf2e', 'packs', 'pf2e', 'spells')

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCHOOLS = new Set([
  'abjuration', 'conjuration', 'divination', 'enchantment',
  'evocation', 'illusion', 'necromancy', 'transmutation'
])

const TRADITION_TRAITS = new Set(['arcane', 'divine', 'occult', 'primal'])

// Action glyph values used in Foundry descriptions
const ACTION_GLYPHS = { '1': '[1 action]', '2': '[2 actions]', '3': '[3 actions]', 'R': '[reaction]', 'a': '[free action]', 'D': '[2 actions]' }

// ---------------------------------------------------------------------------
// HTML → plain text
// ---------------------------------------------------------------------------

/**
 * Convert an HTML table element to a readable pipe-delimited text block.
 * Handles <th> and <td> cells, skips non-printable Foundry roll macros in headers.
 */
function tableToText(tableHtml) {
  const rows = []

  // Extract each row
  const rowMatches = tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)
  for (const [, rowContent] of rowMatches) {
    const cells = []
    const cellMatches = rowContent.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)
    for (const [, cellContent] of cellMatches) {
      cells.push(cleanInlineHtml(cellContent).trim())
    }
    if (cells.length) rows.push(cells)
  }

  if (!rows.length) return ''

  // Build pipe table
  const lines = rows.map(cells => '| ' + cells.join(' | ') + ' |')
  // Insert separator after header row
  if (rows.length > 1) {
    const sep = '| ' + rows[0].map(() => '---').join(' | ') + ' |'
    lines.splice(1, 0, sep)
  }
  return '\n' + lines.join('\n') + '\n'
}

/**
 * Clean inline Foundry macros and HTML from a string, keeping readable text.
 * Used for table cells and inline content.
 */
function cleanInlineHtml(html) {
  return html
    // Action glyphs: <span class="action-glyph">1</span> → [1 action]
    .replace(/<span[^>]+class="action-glyph"[^>]*>([^<]*)<\/span>/g, (_, g) => ACTION_GLYPHS[g] || `[${g}]`)
    // @UUID[...]{label} → label
    .replace(/@UUID\[[^\]]+\]\{([^}]+)\}/g, '$1')
    // @UUID[...] (no label) → extract last path segment as readable name
    // e.g. @UUID[Compendium.pf2e.spells-srd.Item.Petrify] → "Petrify"
    .replace(/@UUID\[(?:[^\].]+\.)*([^\].]+)\]/g, (_, last) =>
      last.replace(/-/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim()
    )
    // @Damage[(formula)[types]] → formula (types)
    .replace(/@Damage\[\(([^)]+)\)\[([^\]]+)\]\s*\]/g, (_, formula, types) => {
      const f = formula.replace(/@item\.level/g, 'level').replace(/@item\.rank/g, 'rank')
      return `(${f}) ${types.replace(/,/g, ' ')}`
    })
    // @Damage[Xd6[types]] → Xd6 (types)
    .replace(/@Damage\[([^\[]+)\[([^\]]+)\]\s*\]/g, (_, formula, types) => {
      const f = formula.trim().replace(/@item\.level/g, 'level').replace(/@item\.rank/g, 'rank')
      return `${f} ${types.replace(/,/g, ' ')}`
    })
    // @Damage[formula] (no type brackets) → formula
    .replace(/@Damage\[([^\]]+)\]/g, (_, formula) => {
      return formula.replace(/@item\.level/g, 'level').replace(/@item\.rank/g, 'rank')
    })
    // @Template[type|distance:N] → N-foot type
    .replace(/@Template\[(\w+)\|distance:(\d+)\]/g, '$2-foot $1')
    // @Template[type|...] fallback
    .replace(/@Template\[([^\]]+)\]/g, (_, inner) => {
      const m = inner.match(/distance:(\d+)/)
      return m ? `${m[1]}-foot area` : 'area'
    })
    // Inline rolls: [[/r formula #label]] or [[/r formula]] → formula
    .replace(/\[\[\/r ([^\]#]+?)(?:\s*#[^\]]+)?\]\]/g, '$1')
    // Other @macros → strip
    .replace(/@\w+\[[^\]]*\]/g, '')
    // Strip remaining tags
    .replace(/<[^>]+>/g, '')
    // HTML entities
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&[a-z]+;/g, '')
}

/**
 * Convert full description HTML to clean plain text.
 * Splits on <hr> to separate main description from heightened entries.
 * Returns { main, heightenedHtml }.
 */
function splitDescription(html) {
  const hrIdx = html.search(/<hr\s*\/?>/i)
  if (hrIdx === -1) return { main: html, heightenedHtml: '' }
  return {
    main: html.slice(0, hrIdx),
    heightenedHtml: html.slice(hrIdx)
  }
}

/**
 * Convert HTML description to clean plain text, preserving table structure.
 */
function htmlToText(html) {
  let result = html

  // Convert tables before stripping tags
  result = result.replace(/<table[\s\S]*?<\/table>/gi, match => tableToText(match))

  // Block-level tags → newlines
  result = result
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<h[1-6][^>]*>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n')

  result = cleanInlineHtml(result)

  // Normalize whitespace: collapse spaces, max two consecutive newlines
  return result
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ---------------------------------------------------------------------------
// Heightened effect extraction
// ---------------------------------------------------------------------------

/**
 * Extract heightened entries from the description's post-<hr> section.
 * Matches both:
 *   <strong>Heightened (+1)</strong> text
 *   <strong>Heightened (3rd)</strong> text
 *
 * Returns [{ level: string, effect: string }]
 */
function parseHeightenedFromDescription(heightenedHtml) {
  if (!heightenedHtml) return []

  const results = []
  // Each heightened entry is typically a <p> containing <strong>Heightened (...)</strong>
  // We match the <strong> tag and capture until the next <strong>Heightened or end of paragraph
  const pattern = /<strong>Heightened\s*\(([^)]+)\)<\/strong>([\s\S]*?)(?=<strong>Heightened|<\/p>|$)/gi
  let match

  while ((match = pattern.exec(heightenedHtml)) !== null) {
    const level = match[1].trim()  // e.g. "+1", "3rd", "4th"
    const effectHtml = match[2]
    const effect = htmlToText(effectHtml).replace(/^[:\s]+/, '').trim()
    if (effect) results.push({ level, effect })
  }

  return results
}

// ---------------------------------------------------------------------------
// Field transformers
// ---------------------------------------------------------------------------

function formatCastTime(value) {
  if (!value) return ''
  // Numeric → "N action(s)"
  if (/^\d+$/.test(value.trim())) {
    const n = parseInt(value)
    return n === 1 ? '1 action' : `${n} actions`
  }
  return value.trim()
}

function formatSave(defense) {
  if (!defense) return ''
  const save = defense.save
  if (!save || !save.statistic) return ''
  const basic = save.basic ? 'Basic ' : ''
  return basic + save.statistic.charAt(0).toUpperCase() + save.statistic.slice(1)
}

function formatArea(area) {
  if (!area || !area.type) return ''
  return `${area.value}-foot ${area.type}`
}

/**
 * Derive components from PF2e Remaster traits.
 * concentrate → Verbal (focus spell-like), manipulate → Somatic/Material
 * material → Material (pre-remaster explicit component)
 */
function deriveComponents(traits) {
  const parts = []
  if (traits.includes('concentrate')) parts.push('Concentrate')
  if (traits.includes('manipulate')) parts.push('Manipulate')
  if (traits.includes('material') && !traits.includes('manipulate')) parts.push('Material')
  return parts.join(', ')
}

// ---------------------------------------------------------------------------
// Main transform
// ---------------------------------------------------------------------------

function transformSpell(raw) {
  const s = raw.system
  const traits = s.traits?.value || []
  const traditions = s.traits?.traditions || []

  const isCantrip = traits.includes('cantrip')
  const level = isCantrip ? 0 : (s.level?.value ?? 1)

  // School: present in ~92 pre-remaster spells as a trait
  const school = traits.find(t => SCHOOLS.has(t)) || ''

  // Traditions: from traits.traditions; fallback to checking traits array itself
  // (some old spells may have tradition names directly in the traits value array)
  let tradList = traditions.length > 0
    ? traditions
    : traits.filter(t => TRADITION_TRAITS.has(t))

  const { main, heightenedHtml } = splitDescription(s.description?.value || '')
  const description = htmlToText(main)
  const heightened_effects = JSON.stringify(parseHeightenedFromDescription(heightenedHtml))

  return {
    name: raw.name,
    level,
    traditions: tradList.join(','),
    school,
    cast_time: formatCastTime(s.time?.value || ''),
    components: deriveComponents(traits),
    range: (s.range?.value || '').trim(),
    area: formatArea(s.area),
    duration: (s.duration?.value || '').trim(),
    saving_throw: formatSave(s.defense),
    description: description || '(No description)',
    heightened_effects
  }
}

// ---------------------------------------------------------------------------
// File walker
// ---------------------------------------------------------------------------

function walkDir(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkDir(full))
    } else if (entry.isFile() && entry.name.endsWith('.json') && !entry.name.startsWith('_')) {
      results.push(full)
    }
  }
  return results
}

// ---------------------------------------------------------------------------
// Schema migration (ensure school column has no restrictive CHECK)
// ---------------------------------------------------------------------------

function getPragma(db, name) {
  return db.prepare(`PRAGMA ${name}`).get()[name]
}

function setPragma(db, name, value) {
  db.exec(`PRAGMA ${name} = ${value}`)
}

function ensureSchema(db) {
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')

  const version = getPragma(db, 'user_version')

  if (version < 1) {
    // Fresh DB: create schema directly (no CHECK on school)
    db.exec(`
      CREATE TABLE IF NOT EXISTS spells (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        name            TEXT NOT NULL UNIQUE,
        level           INTEGER NOT NULL CHECK(level >= 0 AND level <= 10),
        traditions      TEXT NOT NULL DEFAULT '',
        school          TEXT NOT NULL DEFAULT '',
        cast_time       TEXT NOT NULL DEFAULT '',
        components      TEXT NOT NULL DEFAULT '',
        range           TEXT NOT NULL DEFAULT '',
        area            TEXT NOT NULL DEFAULT '',
        duration        TEXT NOT NULL DEFAULT '',
        saving_throw    TEXT NOT NULL DEFAULT '',
        description     TEXT NOT NULL,
        heightened_effects TEXT NOT NULL DEFAULT '[]',
        is_favorite     INTEGER NOT NULL DEFAULT 0 CHECK(is_favorite IN (0, 1))
      );
      CREATE INDEX IF NOT EXISTS idx_spells_level    ON spells(level);
      CREATE INDEX IF NOT EXISTS idx_spells_school   ON spells(school);
      CREATE INDEX IF NOT EXISTS idx_spells_name     ON spells(name COLLATE NOCASE);
      CREATE INDEX IF NOT EXISTS idx_spells_favorite ON spells(is_favorite);
    `)
    setPragma(db, 'user_version', 2)
    return
  }

  if (version < 2) {
    // Existing v1 DB: recreate table without school CHECK constraint
    console.log('Migrating schema to v2 (removing school CHECK constraint)...')
    db.exec('PRAGMA foreign_keys = OFF')
    db.exec('BEGIN')
    db.exec(`
      CREATE TABLE spells_v2 (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        name            TEXT NOT NULL UNIQUE,
        level           INTEGER NOT NULL CHECK(level >= 0 AND level <= 10),
        traditions      TEXT NOT NULL DEFAULT '',
        school          TEXT NOT NULL DEFAULT '',
        cast_time       TEXT NOT NULL DEFAULT '',
        components      TEXT NOT NULL DEFAULT '',
        range           TEXT NOT NULL DEFAULT '',
        area            TEXT NOT NULL DEFAULT '',
        duration        TEXT NOT NULL DEFAULT '',
        saving_throw    TEXT NOT NULL DEFAULT '',
        description     TEXT NOT NULL,
        heightened_effects TEXT NOT NULL DEFAULT '[]',
        is_favorite     INTEGER NOT NULL DEFAULT 0 CHECK(is_favorite IN (0, 1))
      );
      INSERT OR IGNORE INTO spells_v2
        SELECT id, name, level, traditions, school, cast_time, components,
               range, area, duration, saving_throw, description,
               heightened_effects, is_favorite
        FROM spells;
      DROP TABLE spells;
      ALTER TABLE spells_v2 RENAME TO spells;
      CREATE INDEX IF NOT EXISTS idx_spells_level    ON spells(level);
      CREATE INDEX IF NOT EXISTS idx_spells_school   ON spells(school);
      CREATE INDEX IF NOT EXISTS idx_spells_name     ON spells(name COLLATE NOCASE);
      CREATE INDEX IF NOT EXISTS idx_spells_favorite ON spells(is_favorite);
    `)
    db.exec('COMMIT')
    db.exec('PRAGMA foreign_keys = ON')
    setPragma(db, 'user_version', 2)
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (!fs.existsSync(SPELLS_ROOT)) {
  console.error(`Spells directory not found: ${SPELLS_ROOT}`)
  console.error('Run: git clone --depth 1 --filter=blob:none --sparse https://github.com/foundryvtt/pf2e foundry-pf2e')
  console.error('     cd foundry-pf2e && git sparse-checkout set "packs/pf2e/spells"')
  process.exit(1)
}

// Ensure DB directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

console.log(`Database: ${DB_PATH}`)
console.log(`Spells:   ${SPELLS_ROOT}`)

const db = new DatabaseSync(DB_PATH)
ensureSchema(db)

const insertMode = UPDATE_EXISTING ? 'OR REPLACE' : 'OR IGNORE'
const insert = db.prepare(`
  INSERT ${insertMode} INTO spells
    (name, level, traditions, school, cast_time, components, range, area,
     duration, saving_throw, description, heightened_effects)
  VALUES
    (@name, @level, @traditions, @school, @cast_time, @components, @range, @area,
     @duration, @saving_throw, @description, @heightened_effects)
`)

const spellsDir = path.join(SPELLS_ROOT, 'spells')
const focusDir  = path.join(SPELLS_ROOT, 'focus')
const ritualDir = path.join(SPELLS_ROOT, 'rituals')

const dirsToScan = [spellsDir]
if (INCLUDE_RITUALS && fs.existsSync(ritualDir)) dirsToScan.push(ritualDir)

const allFiles = dirsToScan.flatMap(d => (fs.existsSync(d) ? walkDir(d) : []))

// Stats
let imported = 0, skipped = 0, errors = 0, duplicates = 0

db.exec('BEGIN')
try {
  for (const filePath of allFiles) {
    // Resolved path check: skip focus spells regardless of how we got here
    if (filePath.includes(path.sep + 'focus' + path.sep)) {
      skipped++
      continue
    }

    let raw
    try {
      raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    } catch (e) {
      console.error(`  Parse error: ${filePath}: ${e.message}`)
      errors++
      continue
    }

    if (raw.type !== 'spell') { skipped++; continue }

    // Skip focus spells by trait
    if (raw.system?.traits?.value?.includes('focus')) { skipped++; continue }

    let row
    try {
      row = transformSpell(raw)
    } catch (e) {
      console.error(`  Transform error: ${raw.name}: ${e.message}`)
      errors++
      continue
    }

    try {
      const result = insert.run(row)
      if (result.changes === 0) {
        duplicates++
      } else {
        imported++
      }
    } catch (e) {
      console.error(`  Insert error: ${raw.name}: ${e.message}`)
      errors++
    }
  }
  db.exec('COMMIT')
} catch (e) {
  db.exec('ROLLBACK')
  throw e
}

const total = db.prepare('SELECT COUNT(*) as n FROM spells').get()

console.log('\n--- Import complete ---')
console.log(`  Imported:   ${imported}`)
console.log(`  Duplicates: ${duplicates} (already existed, skipped)`)
console.log(`  Skipped:    ${skipped} (focus/non-spell)`)
console.log(`  Errors:     ${errors}`)
console.log(`  Total in DB: ${total.n}`)
