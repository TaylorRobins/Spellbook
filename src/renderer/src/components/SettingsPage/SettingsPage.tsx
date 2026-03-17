import { useState, useCallback, useEffect } from 'react'
import type { AppSettings } from '../../hooks/useSettings'
import type { SpellTag } from '../../types/spell'
import styles from './SettingsPage.module.css'

const TAG_PALETTE = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6',
  '#a855f7', '#ec4899', '#78716c', '#06b6d4',
]

interface SettingsPageProps {
  settings: AppSettings
  onUpdateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  tags: SpellTag[]
  onCreateTag: (name: string, color: string) => Promise<void>
  onUpdateTag: (id: number, name: string, color: string) => Promise<void>
  onDeleteTag: (id: number) => Promise<void>
}

interface TagEditing {
  id: number
  name: string
  color: string
}

export function SettingsPage({
  settings, onUpdateSetting,
  tags, onCreateTag, onUpdateTag, onDeleteTag,
}: SettingsPageProps): JSX.Element {
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3b82f6')
  const [editingTag, setEditingTag] = useState<TagEditing | null>(null)
  const [dbStatus, setDbStatus] = useState<string | null>(null)
  const [appVersion, setAppVersion] = useState<string | null>(null)

  useEffect(() => {
    window.api.getAppVersion?.().then(setAppVersion).catch(() => null)
  }, [])

  const handleUpdateDb = useCallback(async () => {
    setDbStatus('Updating…')
    try {
      const result = await window.api.updateSpells()
      setDbStatus(`Done — ${result.added} added, ${result.updated} updated, ${result.skipped} unchanged`)
    } catch {
      setDbStatus('Update failed. Check your internet connection.')
    }
  }, [])

  const handleResetDb = useCallback(async () => {
    if (!window.confirm(
      'Reset all user data?\n\nThis will permanently delete all characters, spellbooks, favorites, and custom tags. The spell database will not be affected.\n\nThis cannot be undone.'
    )) return
    try {
      await window.api.resetUserData()
      setDbStatus('Database reset. Restart the app to see the changes.')
    } catch {
      setDbStatus('Reset failed.')
    }
  }, [])

  const handleExport = useCallback(async () => {
    try {
      const result = await window.api.exportData()
      if (result) setDbStatus('Data exported successfully.')
    } catch {
      setDbStatus('Export failed.')
    }
  }, [])

  const handleImport = useCallback(async () => {
    try {
      const result = await window.api.importData()
      if (result) setDbStatus('Data imported. Restart the app to see changes.')
    } catch {
      setDbStatus('Import failed — file may be invalid.')
    }
  }, [])

  const handleCreateTag = useCallback(async () => {
    const name = newTagName.trim()
    if (!name) return
    await onCreateTag(name, newTagColor)
    setNewTagName('')
    setNewTagColor('#3b82f6')
  }, [newTagName, newTagColor, onCreateTag])

  const handleSaveEdit = useCallback(async () => {
    if (!editingTag || !editingTag.name.trim()) return
    await onUpdateTag(editingTag.id, editingTag.name.trim(), editingTag.color)
    setEditingTag(null)
  }, [editingTag, onUpdateTag])

  const handleDeleteTag = useCallback(async (tag: SpellTag) => {
    if (!window.confirm(`Delete tag "${tag.name}"? It will be removed from all spells.`)) return
    await onDeleteTag(tag.id)
  }, [onDeleteTag])

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.pageTitle}>
          <span className={styles.titleRune}>⚙</span> Settings
        </h1>

        {/* ── Appearance ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Appearance</h2>
          <div className={styles.ornament} />

          <div className={styles.row}>
            <span className={styles.label}>Theme</span>
            <div className={styles.btnGroup}>
              <button
                className={`${styles.groupBtn} ${settings.theme === 'dark' ? styles.groupBtnActive : ''}`}
                onClick={() => onUpdateSetting('theme', 'dark')}
              >Dark Grimoire</button>
              <button
                className={`${styles.groupBtn} ${settings.theme === 'light' ? styles.groupBtnActive : ''}`}
                onClick={() => onUpdateSetting('theme', 'light')}
              >Light Parchment</button>
            </div>
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Font Size</span>
            <div className={styles.btnGroup}>
              {(['small', 'medium', 'large'] as const).map(size => (
                <button
                  key={size}
                  className={`${styles.groupBtn} ${settings.fontSize === size ? styles.groupBtnActive : ''}`}
                  onClick={() => onUpdateSetting('fontSize', size)}
                >
                  {size.charAt(0).toUpperCase() + size.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Animations</span>
            <button
              className={`${styles.toggle} ${settings.animations ? styles.toggleOn : ''}`}
              onClick={() => onUpdateSetting('animations', !settings.animations)}
            >
              <span className={styles.toggleKnob} />
              <span className={styles.toggleLabel}>{settings.animations ? 'On' : 'Off'}</span>
            </button>
          </div>
        </section>

        {/* ── Defaults ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Defaults</h2>
          <div className={styles.ornament} />

          <div className={styles.row}>
            <span className={styles.label}>Default Tradition</span>
            <select
              className={styles.select}
              value={settings.defaultTradition}
              onChange={e => onUpdateSetting('defaultTradition', e.target.value as AppSettings['defaultTradition'])}
            >
              <option value="">All Spells</option>
              <option value="arcane">Arcane</option>
              <option value="divine">Divine</option>
              <option value="occult">Occult</option>
              <option value="primal">Primal</option>
            </select>
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Default Layout</span>
            <div className={styles.btnGroup}>
              <button
                className={`${styles.groupBtn} ${settings.defaultLayout === 'split' ? styles.groupBtnActive : ''}`}
                onClick={() => onUpdateSetting('defaultLayout', 'split')}
              >Split</button>
              <button
                className={`${styles.groupBtn} ${settings.defaultLayout === 'full' ? styles.groupBtnActive : ''}`}
                onClick={() => onUpdateSetting('defaultLayout', 'full')}
              >Full</button>
            </div>
          </div>
        </section>

        {/* ── Tag Management ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Tag Management</h2>
          <div className={styles.ornament} />

          <div className={styles.tagList}>
            {tags.map(tag => (
              <div key={tag.id} className={styles.tagRow}>
                {editingTag?.id === tag.id ? (
                  <>
                    <input
                      className={styles.tagNameInput}
                      value={editingTag.name}
                      onChange={e => setEditingTag({ ...editingTag, name: e.target.value })}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingTag(null) }}
                      autoFocus
                    />
                    <div className={styles.colorPalette}>
                      {TAG_PALETTE.map(c => (
                        <button
                          key={c}
                          className={`${styles.colorSwatch} ${editingTag.color === c ? styles.colorSwatchActive : ''}`}
                          style={{ background: c }}
                          onClick={() => setEditingTag({ ...editingTag, color: c })}
                        />
                      ))}
                      <input type="color" className={styles.colorInput} value={editingTag.color}
                        onChange={e => setEditingTag({ ...editingTag, color: e.target.value })} />
                    </div>
                    <button className={styles.saveBtn} onClick={handleSaveEdit}>Save</button>
                    <button className={styles.cancelBtn} onClick={() => setEditingTag(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span className={styles.tagDot} style={{ background: tag.color }} />
                    <span className={styles.tagName}>{tag.name}</span>
                    <button className={styles.editBtn} onClick={() => setEditingTag({ id: tag.id, name: tag.name, color: tag.color })}>✎</button>
                    <button className={styles.deleteBtn} onClick={() => handleDeleteTag(tag)}>✕</button>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className={styles.addTagRow}>
            <input
              className={styles.tagNameInput}
              placeholder="New tag name…"
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateTag() }}
            />
            <div className={styles.colorPalette}>
              {TAG_PALETTE.map(c => (
                <button
                  key={c}
                  className={`${styles.colorSwatch} ${newTagColor === c ? styles.colorSwatchActive : ''}`}
                  style={{ background: c }}
                  onClick={() => setNewTagColor(c)}
                />
              ))}
              <input type="color" className={styles.colorInput} value={newTagColor}
                onChange={e => setNewTagColor(e.target.value)} />
            </div>
            <button className={styles.addBtn} onClick={handleCreateTag} disabled={!newTagName.trim()}>
              + Add Tag
            </button>
          </div>
        </section>

        {/* ── Data Management ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Data Management</h2>
          <div className={styles.ornament} />

          {dbStatus && <div className={styles.statusMsg}>{dbStatus}</div>}

          <div className={styles.dataGrid}>
            <button className={styles.dataBtn} onClick={handleUpdateDb}>
              <span className={styles.dataBtnIcon}>↻</span>
              <span>Update Spell Database</span>
              <span className={styles.dataBtnDesc}>Pull latest spells from Foundry VTT</span>
            </button>
            <button className={styles.dataBtn} onClick={() => window.api.checkForAppUpdate()}>
              <span className={styles.dataBtnIcon}>⬆</span>
              <span>Check for App Updates</span>
              <span className={styles.dataBtnDesc}>Check GitHub for a new version</span>
            </button>
            <button className={styles.dataBtn} onClick={handleExport}>
              <span className={styles.dataBtnIcon}>⬇</span>
              <span>Export Data</span>
              <span className={styles.dataBtnDesc}>Save characters, favorites & tags as JSON</span>
            </button>
            <button className={styles.dataBtn} onClick={handleImport}>
              <span className={styles.dataBtnIcon}>⬆</span>
              <span>Import Data</span>
              <span className={styles.dataBtnDesc}>Restore from a previous export</span>
            </button>
            <button className={`${styles.dataBtn} ${styles.dataBtnDanger}`} onClick={handleResetDb}>
              <span className={styles.dataBtnIcon}>✕</span>
              <span>Reset User Data</span>
              <span className={styles.dataBtnDesc}>Delete all characters, favorites & tags</span>
            </button>
          </div>
        </section>

        {/* ── About ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>About</h2>
          <div className={styles.ornament} />

          <div className={styles.aboutGrid}>
            <div className={styles.aboutRow}>
              <span className={styles.label}>Version</span>
              <span className={styles.aboutValue}>{appVersion ?? '—'}</span>
            </div>
            <div className={styles.aboutRow}>
              <span className={styles.label}>Source</span>
              <a
                className={styles.aboutLink}
                href="https://github.com/TaylorRobins/Spellbook"
                onClick={e => { e.preventDefault(); window.open('https://github.com/TaylorRobins/Spellbook') }}
              >
                GitHub ↗
              </a>
            </div>
            <div className={styles.aboutDivider} />
            <p className={styles.aboutCredit}>
              Spell data sourced from the{' '}
              <strong>Foundry VTT PF2e system</strong> (github.com/foundryvtt/pf2e),
              used under the <strong>ORC License</strong> from Paizo Inc.
            </p>
            <p className={styles.aboutCredit}>
              Pathfinder is a registered trademark of Paizo Inc.
              This app is an unofficial fan tool, not affiliated with Paizo.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
