import { create } from 'zustand'
import { checkStudioApi, hooks, lock, pull, rewrite, scout } from '~/lib/ai'
import { offlineLockFromPosts } from '~/lib/offline-lock'
import { SEED_VOICES } from '~/lib/seed-voices'
import type {
  DossierState,
  Format,
  Phase,
  StudyMode,
  TapeEntry,
  TransferDepth,
  Voice,
} from '~/lib/types'
import {
  BYOK_STORAGE_KEY,
  HISTORY_STORAGE_KEY,
  VOICES_STORAGE_KEY,
} from '~/lib/types'
import {
  buildDateWindows,
  dedupePosts,
  exportVoiceCartridge,
  formatStudyWindowLabel,
  parseVoiceCartridge,
  sampleLengthTag,
  stripHandle,
  studyTarget,
} from '~/lib/utils'
import {
  FREE_MODE_HOOKS_HINT,
  FREE_MODE_REWRITE_HINT,
  offlineHooks,
  offlineVoiceSketch,
} from '~/lib/offline-rewrite'

const MAX_TAPE = 20
const PHASE_STORAGE_KEY = 'ghostline.phase.v1'
const MAX_PINS = 5

interface StudyTickerRow {
  id: string
  text: string
  tag: string
}

interface StudyProgress {
  collected: number
  target: number
  windowIndex: number
  windowTotal: number
  windowLabel: string
  latestSample?: string
  ticker: StudyTickerRow[]
  lockingProfile: boolean
}

interface StudioState {
  hydrated: boolean
  phase: Phase
  intakeMode: 'handle' | 'manual'
  scouting: boolean
  scoutError: string | null
  dossier: DossierState | null
  studyMode: StudyMode | null
  studyProgress: StudyProgress | null
  studyRunning: boolean
  voices: Voice[]
  primaryVoiceId: string | null
  secondaryVoiceId: string | null
  draft: string
  targetPost: string
  targetPostOpen: boolean
  output: string
  lockedParagraphIndexes: number[]
  transferDepth: TransferDepth
  format: Format
  rewriting: boolean
  hooksLoading: boolean
  hookCards: Partial<Record<string, string>> | null
  apiError: string | null
  creditsExhausted: boolean
  serverApiConfigured: boolean
  byokKey: string
  byokVisible: boolean
  tape: TapeEntry[]
  drawerVoiceId: string | null
  tapeOpen: boolean

  hydrate: () => void
  setPhase: (phase: Phase) => void
  setIntakeMode: (mode: 'handle' | 'manual') => void
  setDraft: (draft: string) => void
  insertSampleText: (text: string) => void
  setTargetPost: (text: string) => void
  toggleTargetPostOpen: () => void
  setTransferDepth: (d: TransferDepth) => void
  setFormat: (f: Format) => void
  setByokKey: (key: string) => void
  setByokVisible: (v: boolean) => void
  selectVoice: (id: string, blend?: boolean) => void
  openVoiceDrawer: (id: string | null) => void
  setTapeOpen: (open: boolean) => void
  toggleParagraphLock: (index: number) => void
  clearLocks: () => void

  runScout: (handle: string) => Promise<void>
  chooseStudyMode: (mode: StudyMode) => void
  runStudy: () => Promise<void>
  deepenVoice: (voiceId: string) => Promise<void>
  runManualLock: (input: {
    handle: string
    name?: string
    posts: string[]
  }) => Promise<void>
  importCartridgeFile: (json: string) => boolean
  exportCartridge: (voiceId: string) => string | null

  pinSample: (voiceId: string, sampleId: string) => void
  deleteSample: (voiceId: string, sampleId: string) => void
  relockVoice: (voiceId: string) => Promise<void>

  runRewrite: () => Promise<void>
  runHooks: () => Promise<void>
  applyHook: (text: string) => void
  restoreTapeEntry: (id: string) => void
}

function isNoKeyMessage(msg: string): boolean {
  return /no xai api key|not configured|401|invalid api/i.test(msg)
}

function loadCustomVoices(): Voice[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(VOICES_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Voice[]
  } catch {
    return []
  }
}

function saveCustomVoices(custom: Voice[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(VOICES_STORAGE_KEY, JSON.stringify(custom))
}

function persistCustomFromAll(voices: Voice[]) {
  saveCustomVoices(voices.filter((v) => !v.isSeed))
}

function loadTape(): TapeEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as TapeEntry[]
  } catch {
    return []
  }
}

function saveTape(tape: TapeEntry[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(tape))
}

function loadByok(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(BYOK_STORAGE_KEY) ?? ''
}

function saveByok(key: string) {
  if (typeof window === 'undefined') return
  if (key) localStorage.setItem(BYOK_STORAGE_KEY, key)
  else localStorage.removeItem(BYOK_STORAGE_KEY)
}

function getVoice(state: StudioState, id: string | null): Voice | undefined {
  if (!id) return undefined
  return state.voices.find((v) => v.id === id)
}

function loadPhase(): Phase {
  if (typeof window === 'undefined') return 'compose'
  const p = localStorage.getItem(PHASE_STORAGE_KEY)
  if (p === 'intake' || p === 'dossier' || p === 'study' || p === 'compose') {
    return p
  }
  return 'compose'
}

function savePhase(phase: Phase) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PHASE_STORAGE_KEY, phase)
}

export function canUseStudioApi(state: Pick<StudioState, 'byokKey' | 'serverApiConfigured'>): boolean {
  return Boolean(state.byokKey.trim() || state.serverApiConfigured)
}

export const useStudio = create<StudioState>((set, get) => ({
  hydrated: false,
  phase: 'compose',
  intakeMode: 'handle',
  scouting: false,
  scoutError: null,
  dossier: null,
  studyMode: null,
  studyProgress: null,
  studyRunning: false,
  voices: SEED_VOICES,
  primaryVoiceId: SEED_VOICES[0]?.id ?? null,
  secondaryVoiceId: null,
  draft: '',
  targetPost: '',
  targetPostOpen: false,
  output: '',
  lockedParagraphIndexes: [],
  transferDepth: 'cadence',
  format: 'post',
  rewriting: false,
  hooksLoading: false,
  hookCards: null,
  apiError: null,
  creditsExhausted: false,
  serverApiConfigured: false,
  byokKey: '',
  byokVisible: false,
  tape: [],
  drawerVoiceId: null,
  tapeOpen: false,

  hydrate: () => {
    const custom = loadCustomVoices()
    const tape = loadTape()
    const byokKey = loadByok()
    set({
      hydrated: true,
      voices: [...SEED_VOICES, ...custom],
      tape,
      byokKey,
      primaryVoiceId: SEED_VOICES[0]?.id ?? custom[0]?.id ?? null,
      phase: loadPhase(),
    })
    void checkStudioApi()
      .then((r) => set({ serverApiConfigured: r.hasKey }))
      .catch(() => set({ serverApiConfigured: false }))
  },

  setPhase: (phase) => {
    savePhase(phase)
    set({ phase })
  },
  setIntakeMode: (mode) => set({ intakeMode: mode }),
  setDraft: (draft) => set({ draft }),
  insertSampleText: (text) => {
    const t = text.trim()
    if (!t) return
    set((s) => ({
      draft: s.draft.trim() ? `${s.draft.trim()}\n\n${t}` : t,
    }))
  },
  setTargetPost: (text) => set({ targetPost: text }),
  toggleTargetPostOpen: () =>
    set((s) => ({ targetPostOpen: !s.targetPostOpen })),
  setTransferDepth: (d) => set({ transferDepth: d }),
  setFormat: (f) => set({ format: f }),
  setByokKey: (key) => {
    saveByok(key)
    set({ byokKey: key, creditsExhausted: false, apiError: null })
  },
  setByokVisible: (v) => set({ byokVisible: v }),
  openVoiceDrawer: (id) => set({ drawerVoiceId: id }),
  setTapeOpen: (open) => set({ tapeOpen: open }),

  selectVoice: (id, blend) => {
    if (blend) {
      const { primaryVoiceId } = get()
      if (primaryVoiceId === id) return
      set({ secondaryVoiceId: id })
      return
    }
    set({ primaryVoiceId: id, secondaryVoiceId: null })
  },

  toggleParagraphLock: (index) => {
    set((s) => {
      const has = s.lockedParagraphIndexes.includes(index)
      return {
        lockedParagraphIndexes: has
          ? s.lockedParagraphIndexes.filter((i) => i !== index)
          : [...s.lockedParagraphIndexes, index],
      }
    })
  },

  clearLocks: () => set({ lockedParagraphIndexes: [] }),

  runScout: async (handle) => {
    const h = stripHandle(handle)
    if (!h) return
    set({ scouting: true, scoutError: null, apiError: null })
    const { byokKey } = get()
    const res = await scout({ data: { handle: h, customApiKey: byokKey || undefined } })
    if (!res.ok) {
      set({
        scouting: false,
        scoutError: res.message,
        creditsExhausted: res.errorCode === 'CREDITS_EXHAUSTED',
        byokVisible: res.errorCode === 'CREDITS_EXHAUSTED' ? true : get().byokVisible,
      })
      return
    }
    set({
      scouting: false,
      dossier: {
        name: res.data.name,
        handle: res.data.handle,
        bio: res.data.bio,
        followersCount: res.data.followersCount,
        statusesCount: res.data.statusesCount,
        reachableCount: res.data.reachableCount,
        initialPosts: res.data.initialPosts,
      },
      phase: 'dossier',
    })
  },

  chooseStudyMode: (mode) => {
    set({ studyMode: mode, phase: 'study' })
    void get().runStudy()
  },

  runStudy: async () => {
    const { dossier, studyMode, byokKey } = get()
    if (!dossier || !studyMode) return
    const target = studyTarget(studyMode)
    const seen = new Set<string>()
    const collected: Array<{ id: string; text: string; createdAt: string }> = []
    for (const p of dossier.initialPosts) {
      const deduped = dedupePosts([p], seen)
      collected.push(...deduped)
    }
    const windows = buildDateWindows(studyMode === 'recent' ? 4 : 12)
    const initialTicker = collected.slice(0, 4).map((p) => ({
      id: p.id,
      text: p.text,
      tag: sampleLengthTag(p.text),
    }))
    set({
      studyRunning: true,
      studyProgress: {
        collected: collected.length,
        target,
        windowIndex: 0,
        windowTotal: windows.length,
        windowLabel: formatStudyWindowLabel(windows[0] ?? '', 1),
        latestSample: collected[0]?.text,
        ticker: initialTicker,
        lockingProfile: false,
      },
    })
    let emptyStreak = 0
    for (let i = 0; i < windows.length; i++) {
      if (collected.length >= target) break
      if (emptyStreak >= 3) break
      set((s) => ({
        studyProgress: s.studyProgress
          ? {
              ...s.studyProgress,
              windowIndex: i + 1,
              windowLabel: formatStudyWindowLabel(windows[i]!, i + 1),
              collected: collected.length,
            }
          : null,
      }))
      const pullRes = await pull({
        data: {
          handle: dossier.handle,
          window: windows[i]!,
          customApiKey: byokKey || undefined,
        },
      })
      if (!pullRes.ok) {
        set({
          studyRunning: false,
          apiError: pullRes.message,
          creditsExhausted: pullRes.errorCode === 'CREDITS_EXHAUSTED',
          byokVisible: pullRes.errorCode === 'CREDITS_EXHAUSTED',
        })
        return
      }
      const batch = dedupePosts(pullRes.data.posts, seen)
      if (batch.length === 0) emptyStreak++
      else emptyStreak = 0
      collected.push(...batch)
      set((s) => {
        const ticker = [...(s.studyProgress?.ticker ?? [])]
        for (const p of batch.slice(0, 2)) {
          ticker.unshift({
            id: p.id,
            text: p.text,
            tag: sampleLengthTag(p.text),
          })
        }
        return {
          studyProgress: s.studyProgress
            ? {
                ...s.studyProgress,
                collected: Math.min(collected.length, target),
                latestSample: batch[0]?.text ?? s.studyProgress.latestSample,
                ticker: ticker.slice(0, 8),
              }
            : null,
        }
      })
    }
    set((s) => ({
      studyProgress: s.studyProgress
        ? { ...s.studyProgress, lockingProfile: true }
        : null,
    }))
    const slice = collected.slice(0, target)
    const lockRes = await lock({
      data: {
        handle: dossier.handle,
        name: dossier.name,
        bio: dossier.bio,
        posts: slice.map((p) => ({ id: p.id, text: p.text })),
        customApiKey: byokKey || undefined,
      },
    })
    if (!lockRes.ok) {
      set({
        studyRunning: false,
        apiError: lockRes.message,
        creditsExhausted: lockRes.errorCode === 'CREDITS_EXHAUSTED',
      })
      return
    }
    const oldest = slice[slice.length - 1]?.createdAt ?? null
    const voice: Voice = {
      id: `voice-${stripHandle(dossier.handle)}-${Date.now()}`,
      handle: dossier.handle.startsWith('@')
        ? dossier.handle
        : `@${dossier.handle}`,
      name: dossier.name,
      bio: dossier.bio,
      postsReadCount: slice.length,
      studyDepth: studyMode,
      oldestTimestamp: oldest,
      updatedAt: new Date().toISOString(),
      rawSamples: lockRes.data.samples,
      styleProfile: lockRes.data.styleProfile,
    }
    set((s) => {
      const voices = [...s.voices, voice]
      persistCustomFromAll(voices)
      return {
        voices,
        studyRunning: false,
        studyProgress: null,
        primaryVoiceId: voice.id,
        secondaryVoiceId: null,
        phase: 'compose',
      }
    })
  },

  deepenVoice: async (voiceId) => {
    const voice = getVoice(get(), voiceId)
    if (!voice || voice.isSeed) return
    const { byokKey } = get()
    const target = studyTarget('deep')
    if (voice.postsReadCount >= target) return
    const seen = new Set(voice.rawSamples.map((s) => s.id))
    const collected = [...voice.rawSamples.map((s) => ({
      id: s.id,
      text: s.text,
      createdAt: voice.updatedAt,
    }))]
    const windows = buildDateWindows(12, voice.oldestTimestamp ?? undefined)
    set({ studyRunning: true, phase: 'study', studyMode: 'deep' })
    let emptyStreak = 0
    for (const window of windows) {
      if (collected.length >= target) break
      if (emptyStreak >= 3) break
      const pullRes = await pull({
        data: {
          handle: voice.handle,
          window,
          customApiKey: byokKey || undefined,
        },
      })
      if (!pullRes.ok) {
        set({ studyRunning: false, apiError: pullRes.message })
        return
      }
      const batch = dedupePosts(pullRes.data.posts, seen)
      if (batch.length === 0) emptyStreak++
      else emptyStreak = 0
      collected.push(...batch)
    }
    const lockRes = await lock({
      data: {
        handle: voice.handle,
        name: voice.name,
        bio: voice.bio,
        posts: collected.slice(0, target).map((p) => ({ id: p.id, text: p.text })),
        customApiKey: byokKey || undefined,
      },
    })
    if (!lockRes.ok) {
      set({ studyRunning: false, apiError: lockRes.message })
      return
    }
    const updated: Voice = {
      ...voice,
      postsReadCount: Math.min(collected.length, target),
      studyDepth: 'deep',
      oldestTimestamp:
        collected[collected.length - 1]?.createdAt ?? voice.oldestTimestamp,
      updatedAt: new Date().toISOString(),
      rawSamples: lockRes.data.samples,
      styleProfile: lockRes.data.styleProfile,
    }
    set((s) => {
      const voices = s.voices.map((v) => (v.id === voiceId ? updated : v))
      persistCustomFromAll(voices)
      return { voices, studyRunning: false, phase: 'compose' }
    })
  },

  runManualLock: async ({ handle, name, posts }) => {
    const h = handle.startsWith('@') ? handle : `@${stripHandle(handle)}`
    const filtered = posts.map((t) => t.trim()).filter(Boolean)
    if (filtered.length < 2) {
      set({ scoutError: 'Paste at least 2 posts for manual intake.' })
      return
    }
    const { byokKey } = get()

    const enterStudio = (
      rawSamples: Voice['rawSamples'],
      styleProfile: Voice['styleProfile'],
    ) => {
      const voice: Voice = {
        id: `voice-manual-${Date.now()}`,
        handle: h,
        name: name ?? stripHandle(h),
        bio: '',
        postsReadCount: filtered.length,
        studyDepth: 'manual',
        oldestTimestamp: null,
        updatedAt: new Date().toISOString(),
        rawSamples,
        styleProfile,
      }
      set((s) => {
        const voices = [...s.voices, voice]
        persistCustomFromAll(voices)
        return {
          voices,
          primaryVoiceId: voice.id,
          phase: 'compose',
          scoutError: null,
          apiError: canUseStudioApi(get())
            ? null
            : 'Voice saved locally from pasted posts — polish & study in studio.',
        }
      })
    }

    if (!canUseStudioApi(get())) {
      const locked = offlineLockFromPosts(h, name, filtered)
      enterStudio(locked.rawSamples, locked.styleProfile)
      return
    }

    const lockRes = await lock({
      data: {
        handle: h,
        name: name ?? stripHandle(h),
        bio: '',
        posts: filtered.map((text, i) => ({ id: `manual-${i}`, text })),
        customApiKey: byokKey || undefined,
      },
    })
    if (!lockRes.ok) {
      if (isNoKeyMessage(lockRes.message)) {
        const locked = offlineLockFromPosts(h, name, filtered)
        enterStudio(locked.rawSamples, locked.styleProfile)
        return
      }
      set({
        apiError: lockRes.message,
        creditsExhausted: lockRes.errorCode === 'CREDITS_EXHAUSTED',
      })
      return
    }
    enterStudio(lockRes.data.samples, lockRes.data.styleProfile)
  },

  importCartridgeFile: (json) => {
    const voice = parseVoiceCartridge(json)
    if (!voice) return false
    voice.id = `import-${voice.id}-${Date.now()}`
    set((s) => {
      const voices = [...s.voices, voice]
      persistCustomFromAll(voices)
      return { voices, primaryVoiceId: voice.id, phase: 'compose' }
    })
    return true
  },

  exportCartridge: (voiceId) => {
    const v = getVoice(get(), voiceId)
    if (!v || v.isSeed) return null
    return exportVoiceCartridge(v)
  },

  pinSample: (voiceId, sampleId) => {
    set((s) => {
      const voices = s.voices.map((v) => {
        if (v.id !== voiceId) return v
        const pinnedCount = v.rawSamples.filter((x) => x.pinned).length
        const samples = v.rawSamples.map((x) => {
          if (x.id !== sampleId) return x
          if (x.pinned) return { ...x, pinned: false }
          if (pinnedCount >= MAX_PINS) return x
          return { ...x, pinned: true }
        })
        return { ...v, rawSamples: samples, updatedAt: new Date().toISOString() }
      })
      persistCustomFromAll(voices)
      return { voices }
    })
  },

  deleteSample: (voiceId, sampleId) => {
    set((s) => {
      const voices = s.voices.map((v) => {
        if (v.id !== voiceId) return v
        const rawSamples = v.rawSamples.filter((x) => x.id !== sampleId)
        return {
          ...v,
          rawSamples,
          postsReadCount: rawSamples.length,
          updatedAt: new Date().toISOString(),
        }
      })
      persistCustomFromAll(voices)
      return { voices }
    })
  },

  relockVoice: async (voiceId) => {
    const voice = getVoice(get(), voiceId)
    if (!voice) return
    const { byokKey } = get()
    const lockRes = await lock({
      data: {
        handle: voice.handle,
        name: voice.name,
        bio: voice.bio,
        posts: voice.rawSamples.map((s) => ({ id: s.id, text: s.text })),
        customApiKey: byokKey || undefined,
      },
    })
    if (!lockRes.ok) {
      set({ apiError: lockRes.message })
      return
    }
    set((s) => {
      const voices = s.voices.map((v) =>
        v.id === voiceId
          ? {
              ...v,
              rawSamples: lockRes.data.samples,
              styleProfile: lockRes.data.styleProfile,
              updatedAt: new Date().toISOString(),
            }
          : v,
      )
      persistCustomFromAll(voices)
      return { voices }
    })
  },

  runRewrite: async () => {
    const s = get()
    const primary = getVoice(s, s.primaryVoiceId)
    if (!primary || !s.draft.trim()) return
    const secondary = getVoice(s, s.secondaryVoiceId)
    set({ rewriting: true, apiError: null })
    const paragraphs = s.output ? s.output.split(/\n\n+/) : []
    const lockedParagraphs = s.lockedParagraphIndexes
      .sort((a, b) => a - b)
      .map((i) => paragraphs[i])
      .filter(Boolean)

    const finish = (output: string, apiError: string | null) => {
      const entry: TapeEntry = {
        id: `tape-${Date.now()}`,
        draft: s.draft,
        targetPost: s.targetPost,
        primaryVoiceId: primary.id,
        secondaryVoiceId: s.secondaryVoiceId,
        depth: s.transferDepth,
        format: s.format,
        output,
        timestamp: new Date().toISOString(),
      }
      const tape = [entry, ...s.tape].slice(0, MAX_TAPE)
      saveTape(tape)
      set({
        rewriting: false,
        output,
        tape,
        hookCards: null,
        apiError,
      })
    }

    const tryOffline = (hint: string | null) => {
      const output = offlineVoiceSketch(
        s.draft,
        primary,
        s.format,
        s.transferDepth,
      )
      finish(output, hint ?? FREE_MODE_REWRITE_HINT)
    }

    if (!canUseStudioApi(s)) {
      tryOffline(FREE_MODE_REWRITE_HINT)
      return
    }

    if (!s.byokKey.trim()) {
      try {
        const res = await rewrite({
          data: {
            draft: s.draft,
            targetPost: s.targetPost || undefined,
            primaryVoice: primary,
            secondaryVoice: secondary ?? null,
            depth: s.transferDepth,
            format: s.format,
            lockedParagraphs,
          },
        })
        if (res?.ok) {
          finish(res.data.output, null)
          return
        }
        if (
          res &&
          !res.ok &&
          (res.errorCode === 'CREDITS_EXHAUSTED' || isNoKeyMessage(res.message))
        ) {
          tryOffline(res.message)
          set({ creditsExhausted: res.errorCode === 'CREDITS_EXHAUSTED' })
          return
        }
        if (res && !res.ok) {
          set({
            rewriting: false,
            apiError: res.message,
            creditsExhausted: res.errorCode === 'CREDITS_EXHAUSTED',
          })
          return
        }
      } catch {
        tryOffline(null)
        return
      }
      tryOffline(null)
      return
    }

    let res: Awaited<ReturnType<typeof rewrite>> | undefined
    try {
      res = await rewrite({
        data: {
          draft: s.draft,
          targetPost: s.targetPost || undefined,
          primaryVoice: primary,
          secondaryVoice: secondary ?? null,
          depth: s.transferDepth,
          format: s.format,
          lockedParagraphs,
          customApiKey: s.byokKey || undefined,
        },
      })
    } catch {
      res = undefined
    }

    if (!res) {
      tryOffline('Network error — showing offline sketch.')
      return
    }
    if (!res.ok) {
      if (
        res.errorCode === 'CREDITS_EXHAUSTED' ||
        isNoKeyMessage(res.message)
      ) {
        tryOffline(res.message)
        set({
          creditsExhausted: res.errorCode === 'CREDITS_EXHAUSTED',
          byokVisible: res.errorCode === 'CREDITS_EXHAUSTED',
        })
        return
      }
      set({
        rewriting: false,
        apiError: res.message,
        creditsExhausted: res.errorCode === 'CREDITS_EXHAUSTED',
      })
      return
    }
    finish(res.data.output, null)
  },

  runHooks: async () => {
    const s = get()
    const primary = getVoice(s, s.primaryVoiceId)
    if (!primary || !s.draft.trim()) return
    const secondary = getVoice(s, s.secondaryVoiceId)
    set({ hooksLoading: true, apiError: null })

    const useOffline = () => {
      set({
        hooksLoading: false,
        hookCards: offlineHooks(s.draft, primary),
        apiError: FREE_MODE_HOOKS_HINT,
      })
    }

    if (!canUseStudioApi(s)) {
      useOffline()
      return
    }

    try {
      const res = await hooks({
        data: {
          draft: s.draft,
          targetPost: s.targetPost || undefined,
          primaryVoice: primary,
          secondaryVoice: secondary ?? null,
          customApiKey: s.byokKey || undefined,
        },
      })
      if (!res?.ok) {
        if (
          !res ||
          res.errorCode === 'CREDITS_EXHAUSTED' ||
          isNoKeyMessage(res.message)
        ) {
          useOffline()
          if (res && !res.ok) {
            set({ creditsExhausted: res.errorCode === 'CREDITS_EXHAUSTED' })
          }
          return
        }
        set({
          hooksLoading: false,
          apiError: res.message,
          creditsExhausted: res.errorCode === 'CREDITS_EXHAUSTED',
        })
        return
      }
      set({ hooksLoading: false, hookCards: res.data.hooks })
    } catch {
      useOffline()
    }
  },

  applyHook: (text) => {
    set((s) => ({ draft: `${text}\n\n${s.draft}`.trim() }))
  },

  restoreTapeEntry: (id) => {
    const entry = get().tape.find((t) => t.id === id)
    if (!entry) return
    set({
      draft: entry.draft,
      targetPost: entry.targetPost,
      primaryVoiceId: entry.primaryVoiceId,
      secondaryVoiceId: entry.secondaryVoiceId,
      transferDepth: entry.depth,
      format: entry.format,
      output: entry.output,
      tapeOpen: false,
    })
  },
}))
