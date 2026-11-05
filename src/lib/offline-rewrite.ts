import type { Format, TransferDepth, Voice } from '~/lib/types'
import {
  avgSentenceWords,
  pickSamplesForFormat,
  scanSlop,
  sentences,
  stripSlopMatch,
  wordCount,
} from '~/lib/utils'

const HYPE_RE =
  /\b(very excited|game.?changer|revolutionary|massive|huge|LFG|to the moon|bullish af)\b/gi

function avgSampleSentenceWords(voice: Voice): number {
  const texts = voice.rawSamples.map((s) => s.text)
  if (texts.length === 0) return 14
  const total = texts.reduce((n, t) => n + avgSentenceWords(t), 0)
  return Math.round(total / texts.length)
}

function isStaccato(voice: Voice): boolean {
  const c = voice.styleProfile.cadence.toLowerCase()
  const h = voice.handle.toLowerCase()
  return (
    c.includes('staccato') ||
    c.includes('punch') ||
    h.includes('cobie') ||
    h.includes('loomdart')
  )
}

function isLowercaseVoice(voice: Voice): boolean {
  const h = voice.handle.toLowerCase()
  return h.includes('cobie') || h.includes('loomdart')
}

function isHasu(voice: Voice): boolean {
  return voice.handle.toLowerCase().includes('hasu')
}

function isHayes(voice: Voice): boolean {
  return voice.handle.toLowerCase().includes('hayes')
}

function stripAllSlop(text: string): string {
  let t = text
  const matches = scanSlop(text).sort((a, b) => b.start - a.start)
  for (const m of matches) {
    t = stripSlopMatch(t, m)
  }
  return t.replace(/\s{2,}/g, ' ').trim()
}

function deHype(text: string): string {
  return text.replace(HYPE_RE, '').replace(/\s{2,}/g, ' ').trim()
}

function chunkSentence(text: string, maxWords: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return [text]
  const out: string[] = []
  for (let i = 0; i < words.length; i += maxWords) {
    out.push(words.slice(i, i + maxWords).join(' '))
  }
  return out
}

function rhythmSketch(draft: string, voice: Voice): string {
  const s = sentences(draft)
  const target = Math.max(8, avgSampleSentenceWords(voice))
  const staccato = isStaccato(voice)
  const lines: string[] = []

  for (const line of s) {
    if (staccato) {
      lines.push(...chunkSentence(line, Math.min(12, target + 2)))
    } else if (wordCount(line) > target + 8) {
      lines.push(...chunkSentence(line, target + 4))
    } else {
      lines.push(line)
    }
  }

  if (staccato) return lines.join('\n\n')
  const grouped: string[] = []
  for (let i = 0; i < lines.length; i += 2) {
    grouped.push(lines.slice(i, i + 2).join(' '))
  }
  return grouped.join('\n\n')
}

function hasuReframe(text: string): string {
  let t = stripAllSlop(deHype(text))
  t = t.replace(/\bsounds bullish\b/gi, 'looks attractive on the surface')
  t = t.replace(/\bbut it might\b/gi, 'but the tradeoff is that it might')
  t = t.replace(/\bbecause\b/gi, 'because, incentive-wise,')
  if (!/tradeoff|incentive|equilibrium|measurement|operational risk/i.test(t)) {
    const lead = t.charAt(0).toLowerCase() + t.slice(1)
    t = `Mostly an incentives question: ${lead}`
  }
  return t
}

function hayesReframe(text: string): string {
  let t = stripAllSlop(deHype(text))
  if (!/liquidity|rates|dollar|Treasury|Fed/i.test(t)) {
    t = `Liquidity sets the weather. ${t.charAt(0).toUpperCase()}${t.slice(1)}`
  }
  return t
}

function cobieReframe(text: string): string {
  let t = stripAllSlop(deHype(text))
  t = t.replace(/\.$/, '')
  if (t.length > 90) {
    const parts = chunkSentence(t, 14)
    return parts.join('\n\n')
  }
  return t
}

function voicePolish(draft: string, voice: Voice, depth: TransferDepth): string {
  let t = stripAllSlop(deHype(draft))
  if (depth !== 'rhythm') {
    if (isHasu(voice)) t = hasuReframe(t)
    else if (isHayes(voice)) t = hayesReframe(t)
    else if (isStaccato(voice)) t = cobieReframe(t)
  }
  if (isLowercaseVoice(voice)) {
    t = t.toLowerCase()
  }
  t = rhythmSketch(t, voice)
  if (depth === 'full') {
    const move = voice.styleProfile.signatureMoves[0]
    if (move && !t.toLowerCase().includes(move.slice(0, 12).toLowerCase())) {
      t = `${t}\n\n(${move} — mirror pinned samples for wording.)`
    }
  }
  return t
}

function referenceFooter(voice: Voice, format: Format): string {
  const refs = pickSamplesForFormat(voice.rawSamples, format, 3)
  if (refs.length === 0) return ''
  return `\n\n---\nStudy ${voice.handle}:\n${refs.map((r) => `· ${r.text.slice(0, 140)}${r.text.length > 140 ? '…' : ''}`).join('\n')}`
}

/** Free local polish — slop cut, rhythm, light voice heuristics. Not LLM transfer. */
export function offlineVoiceSketch(
  draft: string,
  voice: Voice,
  format: Format,
  depth: TransferDepth,
): string {
  const body = voicePolish(draft, voice, depth)
  const header = '[Studio polish · free mode]\n\n'
  const footer = referenceFooter(voice, format)

  if (format === 'short') {
    const first = sentences(body)[0] ?? body
    return header + first + footer
  }
  if (format === 'thread') {
    const parts = sentences(body).slice(0, 4)
    return header + parts.join('\n---\n') + footer
  }
  return header + body + footer
}

function hookTopic(draft: string): string {
  const s = sentences(stripAllSlop(draft))[0] ?? draft
  const words = s.split(/\s+/).filter(Boolean)
  if (words.length <= 14) return s
  return words.slice(0, 14).join(' ')
}

export function offlineHooks(
  draft: string,
  voice: Voice,
): Record<string, string> {
  const topic = hookTopic(draft)
  const anchor = pickSamplesForFormat(voice.rawSamples, 'short', 1)[0]?.text
  const moves = voice.styleProfile.signatureMoves
  const h = voice.handle.toLowerCase()

  if (isHasu(voice)) {
    return {
      contrarian: `The tradeoff people skip: ${topic.toLowerCase()}`,
      deadpan: anchor
        ? anchor.split('.')[0]?.trim() ?? anchor.slice(0, 80)
        : `Not a moral bug. A measurement problem.`,
      'thesis-first': `Mechanism-first read: ${topic}`,
      observation: `Operational risk angle: ${topic}`,
    }
  }

  if (h.includes('cobie')) {
    return {
      contrarian: `everyone thinks ${topic.toLowerCase()}. they usually do not`,
      deadpan: anchor?.slice(0, 72) ?? `same movie. different poster.`,
      'thesis-first': topic.toLowerCase(),
      observation: moves[0]?.toLowerCase() ?? `the detail is in the incentives`,
    }
  }

  return {
    contrarian: `The obvious take on ${topic} is backwards.`,
    deadpan: anchor
      ? anchor.slice(0, 72)
      : `Same story as always.`,
    'thesis-first': moves[0] ? `${moves[0]}: ${topic}` : `The core claim: ${topic}`,
    observation: `One detail people skip: ${topic}`,
  }
}

export const FREE_MODE_REWRITE_HINT =
  'Free studio polish — study pinned samples (⌘K) and edit by hand. Add xAI key later for full rewrites.'

export const FREE_MODE_HOOKS_HINT =
  'Free hook angles from voice fingerprint — add xAI key for deeper hooks.'
