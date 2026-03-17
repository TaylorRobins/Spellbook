import { useState, useCallback, useEffect } from 'react'
import type { SpellTag } from '../types/spell'

interface SpellTagAssignment {
  spell_id: number
  id: number
  name: string
  color: string
}

export interface UseTagsResult {
  tags: SpellTag[]
  spellTagsById: Record<number, SpellTag[]>
  tagCounts: Record<number, number>
  createTag: (name: string, color: string) => Promise<void>
  updateTag: (id: number, name: string, color: string) => Promise<void>
  deleteTag: (id: number) => Promise<void>
  setSpellTag: (spellId: number, tagId: number, add: boolean) => Promise<void>
  refresh: () => Promise<void>
}

export function useTags(): UseTagsResult {
  const [tags, setTags] = useState<SpellTag[]>([])
  const [spellTagsById, setSpellTagsById] = useState<Record<number, SpellTag[]>>({})
  const [tagCounts, setTagCounts] = useState<Record<number, number>>({})

  const refresh = useCallback(async () => {
    const [allTags, assignments] = await Promise.all([
      window.api.getTags(),
      window.api.getAllSpellTagAssignments(),
    ])
    setTags(allTags)
    const map: Record<number, SpellTag[]> = {}
    const counts: Record<number, number> = {}
    for (const a of assignments as SpellTagAssignment[]) {
      if (!map[a.spell_id]) map[a.spell_id] = []
      map[a.spell_id].push({ id: a.id, name: a.name, color: a.color })
      counts[a.id] = (counts[a.id] ?? 0) + 1
    }
    setSpellTagsById(map)
    setTagCounts(counts)
  }, [])

  // Load on mount
  useEffect(() => { refresh() }, [])

  const createTag = useCallback(async (name: string, color: string) => {
    await window.api.createTag(name, color)
    await refresh()
  }, [refresh])

  const updateTag = useCallback(async (id: number, name: string, color: string) => {
    await window.api.updateTag(id, name, color)
    await refresh()
  }, [refresh])

  const deleteTag = useCallback(async (id: number) => {
    await window.api.deleteTag(id)
    await refresh()
  }, [refresh])

  const setSpellTag = useCallback(async (spellId: number, tagId: number, add: boolean) => {
    await window.api.setSpellTag(spellId, tagId, add)
    await refresh()
  }, [refresh])

  return { tags, spellTagsById, tagCounts, createTag, updateTag, deleteTag, setSpellTag, refresh }
}
