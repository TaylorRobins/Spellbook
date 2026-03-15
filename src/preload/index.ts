import { contextBridge, ipcRenderer } from 'electron'
import type { SpellFilters, SpellRow, CharacterRow, CharacterSpellRow } from '../main/database'

const api = {
  getSpells: (filters: SpellFilters): Promise<SpellRow[]> => ipcRenderer.invoke('spells:getAll', filters),
  getSpellById: (id: number): Promise<SpellRow | undefined> => ipcRenderer.invoke('spells:getById', id),
  toggleFavorite: (id: number): Promise<boolean> => ipcRenderer.invoke('spells:toggleFavorite', id),
  getCharacters: (): Promise<CharacterRow[]> => ipcRenderer.invoke('characters:getAll'),
  createCharacter: (data: Omit<CharacterRow, 'id'>): Promise<CharacterRow> => ipcRenderer.invoke('characters:create', data),
  updateCharacter: (id: number, data: Partial<Omit<CharacterRow, 'id'>>): Promise<CharacterRow | undefined> => ipcRenderer.invoke('characters:update', id, data),
  deleteCharacter: (id: number): Promise<void> => ipcRenderer.invoke('characters:delete', id),
  addSpellToCharacter: (charId: number, spellId: number): Promise<void> => ipcRenderer.invoke('character_spells:add', charId, spellId),
  removeSpellFromCharacter: (charId: number, spellId: number): Promise<void> => ipcRenderer.invoke('character_spells:remove', charId, spellId),
  toggleSpellPrepared: (charId: number, spellId: number): Promise<boolean> => ipcRenderer.invoke('character_spells:togglePrepared', charId, spellId),
  getCharacterSpells: (charId: number): Promise<CharacterSpellRow[]> => ipcRenderer.invoke('character_spells:getAll', charId),
}

contextBridge.exposeInMainWorld('api', api)

export type SpellbookAPI = typeof api
