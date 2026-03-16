import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { seedSpells } from './seed-data'
import { CANONICAL_SPELL_NAMES } from './canonical-spell-names'

const isDev = process.env.NODE_ENV !== 'production'

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function initDatabase(): void {
  const dbPath = isDev
    ? join(app.getPath('userData'), 'spellbook-dev.db')
    : join(app.getPath('userData'), 'spellbook.db')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations()
}

function runMigrations(): void {
  const currentVersion = db.pragma('user_version', { simple: true }) as number

  if (currentVersion < 1) {
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
    db.pragma('user_version = 1')

    const row = db.prepare('SELECT COUNT(*) as n FROM spells').get() as { n: number }
    if (row.n === 0) seedSpells(db)
  }

  // v2: drop the strict school CHECK constraint (PF2e Remaster removed spell schools)
  // Recreates the table without the constraint. Safe to re-run (checks version).
  if (currentVersion < 2) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      BEGIN;
      CREATE TABLE IF NOT EXISTS spells_v2 (
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
      COMMIT;
      PRAGMA foreign_keys = ON;
    `)
    db.pragma('user_version = 2')
  }

  // v3: dedicated favorites table with timestamp, migrates is_favorite = 1 rows
  if (currentVersion < 3) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS favorites (
        spell_id  INTEGER PRIMARY KEY REFERENCES spells(id) ON DELETE CASCADE,
        added_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT OR IGNORE INTO favorites (spell_id)
        SELECT id FROM spells WHERE is_favorite = 1;
    `)
    db.pragma('user_version = 3')
  }

  if (currentVersion < 4) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS characters (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        name      TEXT NOT NULL,
        class     TEXT NOT NULL DEFAULT '',
        level     INTEGER NOT NULL DEFAULT 1 CHECK(level >= 1 AND level <= 20),
        tradition TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS character_spells (
        character_id  INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        spell_id      INTEGER NOT NULL REFERENCES spells(id) ON DELETE CASCADE,
        is_prepared   INTEGER NOT NULL DEFAULT 0 CHECK(is_prepared IN (0, 1)),
        slot_level    INTEGER,
        PRIMARY KEY (character_id, spell_id)
      );
    `)

    const favCount = (db.prepare('SELECT COUNT(*) as n FROM favorites').get() as { n: number }).n
    if (favCount > 0) {
      const result = db.prepare(
        "INSERT INTO characters (name, class, level, tradition) VALUES ('My Character', '', 1, '')"
      ).run()
      db.prepare(
        'INSERT OR IGNORE INTO character_spells (character_id, spell_id) SELECT ?, spell_id FROM favorites'
      ).run(result.lastInsertRowid)
    }

    db.pragma('user_version = 4')
  }

  // v5: seed the full spell list into any existing database
  if (currentVersion < 5) {
    seedSpells(db)
    db.pragma('user_version = 5')
  }

  // v6: remove spells not in the canonical list (cleans up old partial seeds)
  if (currentVersion < 6) {
    const allSpells = db.prepare('SELECT name FROM spells').all() as { name: string }[]
    const toDelete = allSpells.filter(s => !CANONICAL_SPELL_NAMES.has(s.name))
    if (toDelete.length > 0) {
      const del = db.prepare('DELETE FROM spells WHERE name = ?')
      const deleteAll = db.transaction(() => { for (const s of toDelete) del.run(s.name) })
      deleteAll()
    }
    db.pragma('user_version = 6')
  }

  // v7: settings key-value table + FTS5 virtual table
  if (currentVersion < 7) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `)
    db.exec(`
      DROP TABLE IF EXISTS spells_fts;
      CREATE VIRTUAL TABLE spells_fts USING fts5(
        name,
        description,
        traditions,
        components,
        saving_throw,
        area,
        content='spells',
        content_rowid='id'
      );
      INSERT INTO spells_fts(rowid, name, description, traditions, components, saving_throw, area)
        SELECT id, name, description, traditions, components, saving_throw, area FROM spells;

      CREATE TRIGGER IF NOT EXISTS spells_ai AFTER INSERT ON spells BEGIN
        INSERT INTO spells_fts(rowid, name, description, traditions, components, saving_throw, area)
        VALUES (new.id, new.name, new.description, new.traditions, new.components, new.saving_throw, new.area);
      END;

      CREATE TRIGGER IF NOT EXISTS spells_ad AFTER DELETE ON spells BEGIN
        INSERT INTO spells_fts(spells_fts, rowid, name, description, traditions, components, saving_throw, area)
        VALUES ('delete', old.id, old.name, old.description, old.traditions, old.components, old.saving_throw, old.area);
      END;

      CREATE TRIGGER IF NOT EXISTS spells_au AFTER UPDATE ON spells BEGIN
        INSERT INTO spells_fts(spells_fts, rowid, name, description, traditions, components, saving_throw, area)
        VALUES ('delete', old.id, old.name, old.description, old.traditions, old.components, old.saving_throw, old.area);
        INSERT INTO spells_fts(rowid, name, description, traditions, components, saving_throw, area)
        VALUES (new.id, new.name, new.description, new.traditions, new.components, new.saving_throw, new.area);
      END;
    `)
    db.pragma('user_version = 7')
  }
}

export interface SpellRow {
  id: number
  name: string
  level: number
  traditions: string
  school: string
  cast_time: string
  components: string
  range: string
  area: string
  duration: string
  saving_throw: string
  description: string
  heightened_effects: string
  is_favorite: 0 | 1
}

export interface SpellFilters {
  search?: string
  tradition?: string
  level?: number
  favorites?: boolean
}

export interface CharacterRow {
  id: number
  name: string
  class: string
  level: number
  tradition: string
}

export interface CharacterSpellRow extends SpellRow {
  is_prepared: 0 | 1
  slot_level: number | null
}

function buildFtsQuery(search: string): string {
  const sanitized = search.replace(/["\^*()\[\]{}<>!:@]/g, ' ')
  const words = sanitized.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '""'
  return words.map(w => `${w}*`).join(' ')
}

export function querySpells(filters: SpellFilters): SpellRow[] {
  // Extra conditions that apply in all paths (tradition + level filters)
  const extraConditions: string[] = []
  const extraParams: (string | number)[] = []

  if (filters.tradition) {
    extraConditions.push(`(',' || s.traditions || ',' LIKE ?)`)
    extraParams.push(`%,${filters.tradition},%`)
  }
  if (filters.level !== undefined) {
    extraConditions.push(`s.level = ?`)
    extraParams.push(filters.level)
  }

  // ── FTS path (search term present) ──────────────────────────────────────
  if (filters.search) {
    const ftsQuery = buildFtsQuery(filters.search)
    const favJoin = filters.favorites ? `JOIN favorites f ON s.id = f.spell_id` : ''
    const extraWhere = extraConditions.length ? `AND ${extraConditions.join(' AND ')}` : ''
    const sql = `
      SELECT s.* FROM spells s
      JOIN spells_fts ON s.id = spells_fts.rowid
      ${favJoin}
      WHERE spells_fts MATCH ?
      ${extraWhere}
      ORDER BY bm25(spells_fts, 10.0, 1.0, 0.5, 0.5, 0.5, 0.5) ASC
    `
    return db.prepare(sql).all(ftsQuery, ...extraParams) as SpellRow[]
  }

  // ── No search: LIKE path ─────────────────────────────────────────────────
  if (filters.favorites) {
    const where = extraConditions.length ? `WHERE ${extraConditions.join(' AND ')}` : ''
    const sql = `SELECT s.* FROM spells s
                 JOIN favorites f ON s.id = f.spell_id
                 ${where}
                 ORDER BY f.added_at DESC, s.name ASC`
    return db.prepare(sql).all(...extraParams) as SpellRow[]
  }

  // Regular: tradition/level only (re-build without table alias for simple query)
  const conditions: string[] = []
  const params: (string | number)[] = []
  if (filters.tradition) {
    conditions.push(`(',' || traditions || ',' LIKE ?)`)
    params.push(`%,${filters.tradition},%`)
  }
  if (filters.level !== undefined) {
    conditions.push(`level = ?`)
    params.push(filters.level)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  return db.prepare(`SELECT * FROM spells ${where} ORDER BY level ASC, name ASC`).all(...params) as SpellRow[]
}

export function getSpellById(id: number): SpellRow | undefined {
  return db.prepare('SELECT * FROM spells WHERE id = ?').get(id) as SpellRow | undefined
}

export function toggleFavorite(id: number): boolean {
  const spell = getSpellById(id)
  if (!spell) return false

  if (spell.is_favorite === 1) {
    db.prepare('DELETE FROM favorites WHERE spell_id = ?').run(id)
    db.prepare('UPDATE spells SET is_favorite = 0 WHERE id = ?').run(id)
    return false
  } else {
    db.prepare("INSERT OR IGNORE INTO favorites (spell_id) VALUES (?)").run(id)
    db.prepare('UPDATE spells SET is_favorite = 1 WHERE id = ?').run(id)
    return true
  }
}

export function getAllCharacters(): CharacterRow[] {
  return db.prepare('SELECT * FROM characters ORDER BY id ASC').all() as CharacterRow[]
}

export function createCharacter(data: Omit<CharacterRow, 'id'>): CharacterRow {
  const result = db
    .prepare('INSERT INTO characters (name, class, level, tradition) VALUES (?, ?, ?, ?)')
    .run(data.name, data.class, data.level, data.tradition)
  return db.prepare('SELECT * FROM characters WHERE id = ?').get(result.lastInsertRowid) as CharacterRow
}

export function updateCharacter(id: number, data: Partial<Omit<CharacterRow, 'id'>>): CharacterRow | undefined {
  const fields = Object.keys(data)
    .map((k) => `${k} = ?`)
    .join(', ')
  if (!fields) return db.prepare('SELECT * FROM characters WHERE id = ?').get(id) as CharacterRow | undefined
  db.prepare(`UPDATE characters SET ${fields} WHERE id = ?`).run(...Object.values(data), id)
  return db.prepare('SELECT * FROM characters WHERE id = ?').get(id) as CharacterRow | undefined
}

export function deleteCharacter(id: number): void {
  db.prepare('DELETE FROM characters WHERE id = ?').run(id)
}

export function addSpellToCharacter(characterId: number, spellId: number): void {
  db.prepare(
    'INSERT OR IGNORE INTO character_spells (character_id, spell_id) VALUES (?, ?)'
  ).run(characterId, spellId)
}

export function removeSpellFromCharacter(characterId: number, spellId: number): void {
  db.prepare('DELETE FROM character_spells WHERE character_id = ? AND spell_id = ?').run(characterId, spellId)
}

export function toggleSpellPrepared(characterId: number, spellId: number): boolean {
  db.prepare(
    'UPDATE character_spells SET is_prepared = ((is_prepared + 1) % 2) WHERE character_id = ? AND spell_id = ?'
  ).run(characterId, spellId)
  const row = db
    .prepare('SELECT is_prepared FROM character_spells WHERE character_id = ? AND spell_id = ?')
    .get(characterId, spellId) as { is_prepared: 0 | 1 } | undefined
  return row?.is_prepared === 1
}

export interface SpellInsert {
  name: string
  level: number
  traditions: string
  school: string
  cast_time: string
  components: string
  range: string
  area: string
  duration: string
  saving_throw: string
  description: string
  heightened_effects: string
}

export function upsertSpells(spells: SpellInsert[]): { added: number; updated: number; skipped: number } {
  let added = 0, updated = 0, skipped = 0
  const checkStmt = db.prepare(
    'SELECT level, traditions, school, cast_time, components, range, area, duration, saving_throw, description, heightened_effects FROM spells WHERE name = ?'
  )
  const insertStmt = db.prepare(
    `INSERT INTO spells (name, level, traditions, school, cast_time, components, range, area, duration, saving_throw, description, heightened_effects)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const updateStmt = db.prepare(
    `UPDATE spells SET level=?, traditions=?, school=?, cast_time=?, components=?, range=?, area=?, duration=?, saving_throw=?, description=?, heightened_effects=?
     WHERE name=?`
  )
  const doUpsert = db.transaction(() => {
    for (const s of spells) {
      const existing = checkStmt.get(s.name) as Omit<SpellInsert, 'name'> | undefined
      if (existing) {
        const changed =
          existing.level !== s.level ||
          existing.traditions !== s.traditions ||
          existing.school !== s.school ||
          existing.cast_time !== s.cast_time ||
          existing.components !== s.components ||
          existing.range !== s.range ||
          existing.area !== s.area ||
          existing.duration !== s.duration ||
          existing.saving_throw !== s.saving_throw ||
          existing.description !== s.description ||
          existing.heightened_effects !== s.heightened_effects
        if (changed) {
          updateStmt.run(s.level, s.traditions, s.school, s.cast_time, s.components, s.range, s.area, s.duration, s.saving_throw, s.description, s.heightened_effects, s.name)
          updated++
        } else {
          skipped++
        }
      } else {
        insertStmt.run(s.name, s.level, s.traditions, s.school, s.cast_time, s.components, s.range, s.area, s.duration, s.saving_throw, s.description, s.heightened_effects)
        added++
      }
    }
  })
  doUpsert()
  return { added, updated, skipped }
}

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
}

export function rebuildFts(): void {
  db.exec("INSERT INTO spells_fts(spells_fts) VALUES('rebuild')")
}

export function getSpellSuggestions(query: string): { id: number; name: string }[] {
  return db.prepare(`
    SELECT id, name FROM spells
    WHERE name LIKE ?
    ORDER BY CASE WHEN name LIKE ? THEN 0 ELSE 1 END, name ASC
    LIMIT 8
  `).all(`%${query}%`, `${query}%`) as { id: number; name: string }[]
}

export function getCharacterSpells(characterId: number): CharacterSpellRow[] {
  return db
    .prepare(
      `SELECT s.*, cs.is_prepared, cs.slot_level
       FROM spells s
       JOIN character_spells cs ON s.id = cs.spell_id
       WHERE cs.character_id = ?
       ORDER BY s.level ASC, s.name ASC`
    )
    .all(characterId) as CharacterSpellRow[]
}
