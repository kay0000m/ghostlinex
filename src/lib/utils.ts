import type { Format, RawSample, StudyMode, Voice } from '~/lib/types'
import { STUDY_TARGETS } from '~/lib/types'

const SLOP_PATTERNS: Array<{ pattern: RegExp; label: string; code: string }> = [
  { pattern: /—/g, label: 'em dash', code: 'EM-DASH' },
  { pattern: /--/g, label: 'double hyphen', code: 'EM-DASH' },
  {
    pattern: /\bhere's the thing\b/gi,
    label: "here's the thing",
    code: 'CLICHÉ',
  },
  { pattern: /\blet's dive in\b/gi, label: "let's dive in", code: 'CLICHÉ' },
  { pattern: /\bin conclusion\b/gi, label: 'in conclusion', code: 'CLICHÉ' },
  { pattern: /\bmoreover\b/gi, label: 'moreover', code: 'CLICHÉ' },
  { pattern: /#\w+/g, label: 'hashtag', code: 'HASHTAG' },
  { pattern: /[🚀🔥]/g, label: 'hype emoji', code: 'HYPE EMOJI' },
]

export interface SlopMatch {
  start: number
  end: number
  label: string
  code: string
  text: string
}

export function scanSlop(text: string): SlopMatch[] {
  const matches: SlopMatch[] = []
  for (const { pattern, label, code } of SLOP_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags)
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      matches.push({
        start: m.index,
        end: m.index + m[0].length,
        label,
        code,
        text: m[0],
      })
    }
  }
  return matches.sort((a, b) => a.start - b.start)
}

export function stripSlopMatch(text: string, match: SlopMatch): string {
  return (text.slice(0, match.start) + text.slice(match.end)).replace(/\s{2,}/g, ' ')
}

export function sampleLengthTag(text: string): string {
  const bucket = bucketSample(text)
  const len = text.length
  return `[${bucket.toUpperCase()} · ${len}c]`
}

export function formatStudyWindowLabel(window: string, index: number): string {
  const parts = window.split('..')
  const fmt = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
  }
  const range =
    parts.length === 2 ? `${fmt(parts[0]!)} – ${fmt(parts[1]!)}` : window
  return `WINDOW ${String(index).padStart(2, '0')} · ${range}`
}

export function countSlopTells(text: string): number {
  return scanSlop(text).length
}

export function bucketSample(text: string): 'short' | 'long' {
  return text.length <= 280 ? 'short' : 'long'
}

export function normalizePostText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase()
}

export function dedupePosts<T extends { id: string; text: string }>(
  posts: T[],
  seen: Set<string>,
): T[] {
  const out: T[] = []
  for (const p of posts) {
    const key = p.id || normalizePostText(p.text)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }
  return out
}

export function studyTimeEstimate(mode: StudyMode): string {
  return mode === 'recent' ? '5–10s' : '25–45s'
}

export function studyTarget(mode: StudyMode): number {
  return STUDY_TARGETS[mode]
}

/** Newest-first date windows for client-side pull loop (ISO date strings). */
export function buildDateWindows(count: number, startFrom?: string): string[] {
  const windows: string[] = []
  const start = startFrom ? new Date(startFrom) : new Date()
  let cursor = new Date(start)
  for (let i = 0; i < count; i++) {
    const end = new Date(cursor)
    const begin = new Date(cursor)
    begin.setDate(begin.getDate() - 14)
    windows.push(`${begin.toISOString()}..${end.toISOString()}`)
    cursor = begin
  }
  return windows
}

export function wordCount(text: string): number {
  const t = text.trim()
  if (!t) return 0
  return t.split(/\s+/).length
}

export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function avgSentenceWords(text: string): number {
  const s = sentences(text)
  if (s.length === 0) return 0
  const total = s.reduce((n, line) => n + wordCount(line), 0)
  return Math.round(total / s.length)
}

export interface CadenceDiff {
  wordsBefore: number
  wordsAfter: number
  wordDeltaPct: number
  avgSentenceBefore: number
  avgSentenceAfter: number
  tellsAfter: number
}

export function cadenceDiff(draft: string, output: string): CadenceDiff {
  const wordsBefore = wordCount(draft)
  const wordsAfter = wordCount(output)
  const wordDeltaPct =
    wordsBefore === 0
      ? 0
      : Math.round(((wordsAfter - wordsBefore) / wordsBefore) * 100)
  return {
    wordsBefore,
    wordsAfter,
    wordDeltaPct,
    avgSentenceBefore: avgSentenceWords(draft),
    avgSentenceAfter: avgSentenceWords(output),
    tellsAfter: countSlopTells(output),
  }
}

export function formatCadenceDiffLine(d: CadenceDiff): string {
  const sign = d.wordDeltaPct >= 0 ? '+' : ''
  return `${d.wordsBefore}w → ${d.wordsAfter}w (${sign}${d.wordDeltaPct}%) · avg sentence ${d.avgSentenceBefore}w → ${d.avgSentenceAfter}w · ${d.tellsAfter} tells`
}

export function voiceCartridgeFilename(handle: string): string {
  const clean = handle.replace(/^@/, '')
  return `${clean}.ghostline.json`
}

export function exportVoiceCartridge(voice: Voice): string {
  const { isSeed: _s, ...payload } = voice
  return JSON.stringify(payload, null, 2)
}

export function parseVoiceCartridge(json: string): Voice | null {
  try {
    const v = JSON.parse(json) as Voice
    if (!v.id || !v.handle || !v.rawSamples || !v.styleProfile) return null
    return { ...v, isSeed: false }
  } catch {
    return null
  }
}

export function mergeStyleProfiles(
  primary: Voice['styleProfile'],
  secondary: Voice['styleProfile'],
  primaryWeight = 0.7,
): Voice['styleProfile'] {
  const w = primaryWeight
  const blend = (a: string, b: string) =>
    `${a} (${Math.round(w * 100)}%) blended with ${b} (${Math.round((1 - w) * 100)}%)`
  return {
    summary: blend(primary.summary, secondary.summary),
    tone: blend(primary.tone, secondary.tone),
    cadence: blend(primary.cadence, secondary.cadence),
    vocabulary: blend(primary.vocabulary, secondary.vocabulary),
    structure: blend(primary.structure, secondary.structure),
    do: [...new Set([...primary.do, ...secondary.do])].slice(0, 8),
    dont: [...new Set([...primary.dont, ...secondary.dont])].slice(0, 8),
    signatureMoves: [
      ...new Set([...primary.signatureMoves, ...secondary.signatureMoves]),
    ].slice(0, 6),
  }
}

export function pickSamplesForFormat(
  samples: RawSample[],
  format: Format,
  limit = 12,
): RawSample[] {
  const pinned = samples.filter((s) => s.pinned)
  const bucket = format === 'short' ? 'short' : 'long'
  const bucketed = samples.filter((s) => s.bucket === bucket && !s.pinned)
  const rest = samples.filter((s) => s.bucket !== bucket && !s.pinned)
  return [...pinned, ...bucketed, ...rest].slice(0, limit)
}

export function splitOutputParagraphs(text: string): string[] {
  if (text.includes('\n---\n')) {
    return text.split(/\n---\n/).map((p) => p.trim()).filter(Boolean)
  }
  return text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
}

export function stripHandle(input: string): string {
  return input.trim().replace(/^@/, '')
}

export function voiceChipLabel(v: Voice): string {
  const h = v.handle.startsWith('@') ? v.handle : `@${v.handle}`
  if (v.isSeed) return h
  return `${h} · ${v.postsReadCount}`
}
