import { ipcMain, app, dialog } from 'electron'
import { writeFileSync, readFileSync } from 'fs'
import {
  querySpells, getSpellById, toggleFavorite,
  getAllCharacters, createCharacter, updateCharacter, deleteCharacter,
  addSpellToCharacter, removeSpellFromCharacter, toggleSpellPrepared, getCharacterSpells,
  getSpellSuggestions,
  getAllTags, createTag, updateTag, deleteTag,
  getAllSpellTagAssignments, getTagsForSpell, setSpellTag,
  resetUserData, exportUserData, importUserData,
} from './database'
import type { SpellFilters, CharacterRow, ExportData } from './database'
import { updateSpellsFromFoundry } from './spell-updater'
import { checkForUpdates, quitAndInstall } from './auto-update'

export function registerIpcHandlers(): void {
  ipcMain.handle('spells:getAll', (_event, filters: SpellFilters) => {
    return querySpells(filters ?? {})
  })

  ipcMain.handle('spells:getById', (_event, id: number) => {
    return getSpellById(id)
  })

  ipcMain.handle('spells:toggleFavorite', (_event, id: number) => {
    return toggleFavorite(id)
  })

  ipcMain.handle('characters:getAll', () => getAllCharacters())
  ipcMain.handle('characters:create', (_e, data: Omit<CharacterRow, 'id'>) => createCharacter(data))
  ipcMain.handle('characters:update', (_e, id: number, data: Partial<Omit<CharacterRow, 'id'>>) => updateCharacter(id, data))
  ipcMain.handle('characters:delete', (_e, id: number) => deleteCharacter(id))
  ipcMain.handle('character_spells:add', (_e, charId: number, spellId: number) => addSpellToCharacter(charId, spellId))
  ipcMain.handle('character_spells:remove', (_e, charId: number, spellId: number) => removeSpellFromCharacter(charId, spellId))
  ipcMain.handle('character_spells:togglePrepared', (_e, charId: number, spellId: number) => toggleSpellPrepared(charId, spellId))
  ipcMain.handle('character_spells:getAll', (_e, charId: number) => getCharacterSpells(charId))
  ipcMain.handle('spells:suggestions', (_e, query: string) => getSpellSuggestions(query))

  ipcMain.handle('spells:update', async (event) => {
    return updateSpellsFromFoundry((message) => {
      event.sender.send('spells:update-progress', message)
    })
  })

  ipcMain.handle('app:checkUpdate', (event) => {
    if (!app.isPackaged) {
      event.sender.send('app:update', { type: 'not-available' })
      return
    }
    checkForUpdates()
  })
  ipcMain.handle('app:quitAndInstall', () => quitAndInstall())
  ipcMain.handle('app:getVersion', () => app.getVersion())

  // ── Tags ──────────────────────────────────────────────────────────────────
  ipcMain.handle('tags:getAll', () => getAllTags())
  ipcMain.handle('tags:create', (_e, name: string, color: string) => createTag(name, color))
  ipcMain.handle('tags:update', (_e, id: number, name: string, color: string) => updateTag(id, name, color))
  ipcMain.handle('tags:delete', (_e, id: number) => deleteTag(id))
  ipcMain.handle('tags:getAllAssignments', () => getAllSpellTagAssignments())
  ipcMain.handle('tags:getForSpell', (_e, spellId: number) => getTagsForSpell(spellId))
  ipcMain.handle('tags:setForSpell', (_e, spellId: number, tagId: number, add: boolean) => setSpellTag(spellId, tagId, add))

  // ── Data management ───────────────────────────────────────────────────────
  ipcMain.handle('db:reset', () => resetUserData())

  ipcMain.handle('db:export', async (event) => {
    const win = require('electron').BrowserWindow.fromWebContents(event.sender)
    const { canceled, filePath } = await dialog.showSaveDialog(win!, {
      title: 'Export Spellbook Data',
      defaultPath: `spellbook-export-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (canceled || !filePath) return false
    const data = exportUserData()
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  })

  ipcMain.handle('db:import', async (event) => {
    const win = require('electron').BrowserWindow.fromWebContents(event.sender)
    const { canceled, filePaths } = await dialog.showOpenDialog(win!, {
      title: 'Import Spellbook Data',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    })
    if (canceled || !filePaths[0]) return false
    const raw = readFileSync(filePaths[0], 'utf-8')
    const data = JSON.parse(raw) as ExportData
    importUserData(data)
    return true
  })
}
