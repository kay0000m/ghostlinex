export type Phase = 'intake' | 'dossier' | 'study' | 'compose'

export type StudyDepth = 'seed' | 'recent' | 'deep' | 'manual'

export type Format = 'short' | 'post' | 'thread'

export type TransferDepth = 'rhythm' | 'cadence' | 'full'

export type SampleBucket = 'short' | 'long'

export type HookAngle =
  | 'contrarian'
  | 'deadpan'
  | 'thesis-first'
  | 'observation'

export interface RawSample {
  id: string
  text: string
  bucket: SampleBucket
  pinned: boolean
}

export interface StyleProfile {
  summary: string
  tone: string
  cadence: string
  vocabulary: string
  structure: string
  do: string[]
  dont: string[]
  signatureMoves: string[]
}

export interface Voice {
  id: string
  handle: string
  name: string
  bio: string
  postsReadCount: number
  studyDepth: StudyDepth
  oldestTimestamp: string | null
  updatedAt: string
  rawSamples: RawSample[]
  styleProfile: StyleProfile
  isSeed?: boolean
}

export interface BlendConfig {
  primaryId: string
  secondaryId: string | null
}

export interface TapeEntry {
  id: string
  draft: string
  targetPost: string
  primaryVoiceId: string
  secondaryVoiceId: string | null
  depth: TransferDepth
  format: Format
  output: string
  timestamp: string
}

export type AiErrorCode = 'CREDITS_EXHAUSTED' | 'API_ERROR' | 'INVALID_INPUT'

export type AiResult<T> =
  | { ok: true; data: T }
  | { ok: false; errorCode: AiErrorCode; message: string }

export interface ScoutResult {
  name: string
  handle: string
  bio: string
  followersCount: number
  statusesCount: number
  reachableCount: number
  initialPosts: Array<{ id: string; text: string; createdAt: string }>
}

export interface PullResult {
  posts: Array<{ id: string; text: string; createdAt: string }>
}

export interface LockResult {
  styleProfile: StyleProfile
  samples: RawSample[]
}

export interface RewriteResult {
  output: string
}

export interface HooksResult {
  hooks: Record<HookAngle, string>
}

export interface DossierState {
  name: string
  handle: string
  bio: string
  followersCount: number
  statusesCount: number
  reachableCount: number
  initialPosts: Array<{ id: string; text: string; createdAt: string }>
}

export type StudyMode = 'recent' | 'deep'

export const STUDY_TARGETS = { recent: 40, deep: 150 } as const

export const VOICES_STORAGE_KEY = 'ghostline.voices.v1'
export const HISTORY_STORAGE_KEY = 'ghostline.history.v1'
export const BYOK_STORAGE_KEY = 'ghostline.byok.v1'
