import https from 'https'
import { upsertSpells, rebuildFts, getSetting, setSetting } from './database'
import type { SpellInsert } from './database'

export interface UpdateResult {
  added: number
  updated: number
  skipped: number
  errors: string[]
}

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const makeRequest = (target: string): void => {
      const parsed = new URL(target)
      https
        .get(
          {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            headers: { 'User-Agent': 'Spellbook-App/1.0', Accept: 'application/json' }
          },
          (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
              makeRequest(res.headers.location!)
              return
            }
            if (res.statusCode !== 200) {
              reject(new Error(`HTTP ${res.statusCode} for ${target}`))
              return
            }
            let data = ''
            res.on('data', (chunk) => (data += chunk))
            res.on('end', () => resolve(data))
            res.on('error', reject)
          }
        )
        .on('error', reject)
    }
    makeRequest(url)
  })
}

async function downloadConcurrent(
  urls: string[],
  concurrency: number,
  onProgress: (done: number, total: number) => void
): Promise<(string | Error)[]> {
  const results: (string | Error)[] = new Array(urls.length)
  let index = 0
  let done = 0
  const worker = async (): Promise<void> => {
    while (index < urls.length) {
      const i = index++
      try {
        results[i] = await httpsGet(urls[i])
      } catch (e) {
        results[i] = e instanceof Error ? e : new Error(String(e))
      }
      done++
      onProgress(done, urls.length)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function parseCastTime(value: string | undefined): string {
  if (!value) return ''
  const v = value.trim()
  if (v === '1') return '1 action'
  if (v === '2') return '2 actions'
  if (v === '3') return '3 actions'
  if (v === 'reaction') return 'reaction'
  if (v === 'free') return 'free action'
  return v
}

function ordinal(n: number): string {
  if (n === 1) return '1st'
  if (n === 2) return '2nd'
  if (n === 3) return '3rd'
  return `${n}th`
}

const VALID_TRADITIONS = new Set(['arcane', 'divine', 'occult', 'primal'])

interface FoundrySpell {
  name?: string
  type?: string
  system?: {
    description?: { value?: string }
    level?: { value?: number }
    time?: { value?: string }
    range?: { value?: string }
    area?: { value?: number; type?: string }
    duration?: { value?: string; sustained?: boolean }
    defense?: { save?: { basic?: boolean; statistic?: string } } | null
    // Legacy fields (pre-Remaster)
    save?: { value?: string; basic?: boolean }
    traditions?: { value?: string[] }
    school?: { value?: string }
    components?: { cast?: string; verbal?: boolean; somatic?: boolean; material?: boolean }
    heightening?: {
      type?: string
      levels?: Record<string, { value?: string }>
    }
    traits?: {
      value?: string[]
      traditions?: string[]
      rarity?: string
    }
  }
}

function transformSpell(raw: FoundrySpell): SpellInsert | null {
  if (!raw.name || raw.type !== 'spell') return null
  const sys = raw.system ?? {}

  const level = sys.level?.value ?? 1
  if (level < 0 || level > 10) return null

  // Traditions: Remaster stores in traits.traditions, legacy in traditions.value
  const rawTraditions =
    sys.traits?.traditions ?? sys.traditions?.value ?? []
  const traditions = rawTraditions.filter((t) => VALID_TRADITIONS.has(t)).join(',')

  const school = sys.school?.value ?? ''

  const cast_time = parseCastTime(sys.time?.value)

  // Components: Remaster uses traits.value (concentrate = verbal, manipulate = somatic)
  // Legacy uses components object
  let components = ''
  if (sys.components?.cast) {
    components = sys.components.cast
  } else if (sys.traits?.value) {
    const parts: string[] = []
    if (sys.traits.value.includes('concentrate')) parts.push('concentrate')
    if (sys.traits.value.includes('manipulate')) parts.push('manipulate')
    if (sys.traits.value.includes('verbal')) parts.push('verbal')
    if (sys.traits.value.includes('somatic')) parts.push('somatic')
    if (sys.traits.value.includes('material')) parts.push('material')
    components = parts.join(', ')
  } else if (sys.components && typeof sys.components === 'object') {
    const parts: string[] = []
    if (sys.components.verbal) parts.push('verbal')
    if (sys.components.somatic) parts.push('somatic')
    if (sys.components.material) parts.push('material')
    components = parts.join(', ')
  }

  const range = sys.range?.value ?? ''

  const areaData = sys.area
  const area = areaData?.value
    ? `${areaData.value}-foot ${areaData.type ?? ''}`.trim()
    : ''

  const duration = sys.duration?.value ?? ''

  // Saving throw: Remaster uses defense.save, legacy uses save
  let saving_throw = ''
  const defSave = sys.defense?.save
  const legSave = sys.save
  const saveSrc = defSave ?? legSave
  if (saveSrc) {
    const stat =
      (saveSrc as { statistic?: string }).statistic ??
      (saveSrc as { value?: string }).value ??
      ''
    if (stat) {
      const capped = stat.charAt(0).toUpperCase() + stat.slice(1)
      saving_throw = saveSrc.basic ? `basic ${capped}` : capped
    }
  }

  const description = sys.description?.value ?? ''
  if (!description.replace(/<[^>]+>/g, '').trim()) return null

  const heightenedLevels =
    sys.heightening?.type === 'fixed' ? sys.heightening.levels : undefined
  const heightened_effects = heightenedLevels
    ? JSON.stringify(
        Object.entries(heightenedLevels)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([lvl, data]) => ({
            level: ordinal(parseInt(lvl)),
            effect: (data as { value?: string }).value ?? ''
          }))
          .filter((e) => e.effect)
      )
    : '[]'

  return {
    name: raw.name,
    level,
    traditions,
    school,
    cast_time,
    components,
    range,
    area,
    duration,
    saving_throw,
    description,
    heightened_effects
  }
}

type GithubFile = { name: string; download_url: string; type: string }

async function fetchSpellFileUrls(onProgress: (msg: string) => void): Promise<string[]> {
  // Structure: packs/pf2e/spells/spells/{cantrip,rank-1..rank-10}/
  const BASE = 'https://api.github.com/repos/foundryvtt/pf2e/contents/packs/pf2e/spells/spells'

  const subdirData = await httpsGet(BASE)
  const subdirs = (JSON.parse(subdirData) as GithubFile[]).filter((f) => f.type === 'dir')

  if (subdirs.length === 0) {
    throw new Error('No subdirectories found in packs/pf2e/spells/spells — repo structure may have changed')
  }

  onProgress(`Found ${subdirs.length} spell rank directories. Fetching file lists…`)

  const fileUrls: string[] = []
  for (let i = 0; i < subdirs.length; i++) {
    const dir = subdirs[i]
    onProgress(`Listing ${dir.name} (${i + 1}/${subdirs.length})…`)
    const dirData = await httpsGet(
      `https://api.github.com/repos/foundryvtt/pf2e/contents/packs/pf2e/spells/spells/${dir.name}`
    )
    const files = (JSON.parse(dirData) as GithubFile[]).filter(
      (f) => f.type === 'file' && f.name.endsWith('.json')
    )
    for (const f of files) fileUrls.push(f.download_url)
  }

  return fileUrls
}

async function fetchLatestSpellsCommitSha(): Promise<string> {
  const data = await httpsGet(
    'https://api.github.com/repos/foundryvtt/pf2e/commits?path=packs%2Fpf2e%2Fspells&per_page=1'
  )
  const commits = JSON.parse(data) as { sha: string }[]
  if (!commits.length) throw new Error('Could not determine latest commit SHA')
  return commits[0].sha
}

export async function updateSpellsFromFoundry(
  onProgress: (message: string) => void
): Promise<UpdateResult> {
  const errors: string[] = []

  onProgress('Checking for updates…')

  let latestSha: string
  try {
    latestSha = await fetchLatestSpellsCommitSha()
  } catch (e) {
    throw new Error(`Could not reach GitHub: ${e instanceof Error ? e.message : String(e)}`)
  }

  const storedSha = getSetting('spells_commit_sha')
  if (storedSha === latestSha) {
    onProgress('Already up to date. No changes since last update.')
    return { added: 0, updated: 0, skipped: 0, errors: [] }
  }

  onProgress('Updates available. Fetching spell list…')

  let downloadUrls: string[]
  try {
    downloadUrls = await fetchSpellFileUrls(onProgress)
  } catch (e) {
    throw new Error(`Failed to fetch spell list: ${e instanceof Error ? e.message : String(e)}`)
  }

  onProgress(`Found ${downloadUrls.length} spell files. Downloading…`)

  let lastReported = 0
  const results = await downloadConcurrent(downloadUrls, 8, (done, total) => {
    const pct = Math.floor((done / total) * 100)
    if (pct >= lastReported + 10) {
      lastReported = pct
      onProgress(`Downloaded ${done} / ${total} (${pct}%)…`)
    }
  })

  onProgress('Parsing and saving spells…')

  const spellsToUpsert: SpellInsert[] = []
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const name = downloadUrls[i].split('/').pop() ?? String(i)
    if (result instanceof Error) {
      errors.push(`${name}: ${result.message}`)
      continue
    }
    try {
      const spell = transformSpell(JSON.parse(result) as FoundrySpell)
      if (spell) spellsToUpsert.push(spell)
    } catch (e) {
      errors.push(`${name}: parse error — ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  onProgress(`Saving ${spellsToUpsert.length} spells to database…`)
  const { added, updated, skipped } = upsertSpells(spellsToUpsert)

  if (added > 0 || updated > 0) {
    onProgress('Rebuilding search index…')
    rebuildFts()
  }

  setSetting('spells_commit_sha', latestSha)

  const parts = []
  if (added > 0) parts.push(`${added} new`)
  if (updated > 0) parts.push(`${updated} updated`)
  if (skipped > 0) parts.push(`${skipped} unchanged`)
  if (errors.length > 0) parts.push(`${errors.length} errors`)
  onProgress(`Done. ${parts.join(', ')}.`)
  return { added, updated, skipped, errors }
}
