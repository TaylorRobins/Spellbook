import { ipcMain } from 'electron'
import {
  querySpells, getSpellById, toggleFavorite,
  getAllCharacters, createCharacter, updateCharacter, deleteCharacter,
  addSpellToCharacter, removeSpellFromCharacter, toggleSpellPrepared, getCharacterSpells,
  getSpellSuggestions
} from './database'
import type { SpellFilters, CharacterRow } from './database'

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
}
