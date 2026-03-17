import { contextBridge, ipcRenderer } from 'electron'
import type { SpellFilters, SpellRow, CharacterRow, CharacterSpellRow, TagRow, SpellTagAssignment } from '../main/database'
import type { UpdateResult } from '../main/spell-updater'
import type { AppUpdateEvent } from '../main/auto-update'

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
  getSpellSuggestions: (query: string): Promise<{ id: number; name: string }[]> => ipcRenderer.invoke('spells:suggestions', query),

  updateSpells: (): Promise<UpdateResult> => ipcRenderer.invoke('spells:update'),
  onUpdateProgress: (cb: (message: string) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, msg: string): void => cb(msg)
    ipcRenderer.on('spells:update-progress', listener)
    return () => ipcRenderer.removeListener('spells:update-progress', listener)
  },

  checkForAppUpdate: (): Promise<void> => ipcRenderer.invoke('app:checkUpdate'),
  quitAndInstall: (): Promise<void> => ipcRenderer.invoke('app:quitAndInstall'),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  onAppUpdate: (cb: (event: AppUpdateEvent) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, event: AppUpdateEvent): void => cb(event)
    ipcRenderer.on('app:update', listener)
    return () => ipcRenderer.removeListener('app:update', listener)
  },

  // Tags
  getTags: (): Promise<TagRow[]> => ipcRenderer.invoke('tags:getAll'),
  createTag: (name: string, color: string): Promise<TagRow> => ipcRenderer.invoke('tags:create', name, color),
  updateTag: (id: number, name: string, color: string): Promise<void> => ipcRenderer.invoke('tags:update', id, name, color),
  deleteTag: (id: number): Promise<void> => ipcRenderer.invoke('tags:delete', id),
  getAllSpellTagAssignments: (): Promise<SpellTagAssignment[]> => ipcRenderer.invoke('tags:getAllAssignments'),
  getTagsForSpell: (spellId: number): Promise<TagRow[]> => ipcRenderer.invoke('tags:getForSpell', spellId),
  setSpellTag: (spellId: number, tagId: number, add: boolean): Promise<void> => ipcRenderer.invoke('tags:setForSpell', spellId, tagId, add),

  // Data management
  resetUserData: (): Promise<void> => ipcRenderer.invoke('db:reset'),
  exportData: (): Promise<boolean> => ipcRenderer.invoke('db:export'),
  importData: (): Promise<boolean> => ipcRenderer.invoke('db:import'),
}

contextBridge.exposeInMainWorld('api', api)

export type SpellbookAPI = typeof api
