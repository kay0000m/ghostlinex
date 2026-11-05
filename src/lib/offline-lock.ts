import { getSeedVoiceByHandle } from '~/lib/seed-voices'
import type { RawSample, StyleProfile, Voice } from '~/lib/types'
import { avgSentenceWords, bucketSample, sentences } from '~/lib/utils'

function sampleFromText(id: string, text: string, pinned: boolean): RawSample {
  return {
    id,
    text,
    bucket: bucketSample(text),
    pinned,
  }
}

function heuristicProfile(
  handle: string,
  posts: string[],
): StyleProfile {
  const avg = Math.round(
    posts.reduce((n, t) => n + avgSentenceWords(t), 0) / Math.max(1, posts.length),
  )
  const lowerRatio =
    posts.filter((t) => t === t.toLowerCase()).length / Math.max(1, posts.length)
  const cadence =
    avg <= 12
      ? 'Short clauses. Punchy lines.'
      : avg <= 20
        ? 'Mixed sentence length. Conversational flow.'
        : 'Longer sentences. Builds an argument across beats.'

  return {
    summary: `Local profile from ${posts.length} pasted posts (no API lock).`,
    tone: lowerRatio > 0.5 ? 'Informal, internet-native.' : 'Direct, declarative.',
    cadence,
    vocabulary: 'Derived from pasted samples — read anchors in the drawer.',
    structure: posts.some((p) => p.includes('\n'))
      ? 'Multi-line posts detected.'
      : 'Mostly single-post observations.',
    do: ['Match pinned anchor phrasing', 'Cut slop tells', 'Keep your core claim'],
    dont: ['Paste marketing clichés', 'Add hashtags for reach'],
    signatureMoves: ['Open with the claim', 'Name the tradeoff', 'Stop before over-explaining'],
  }
}

/** Build a voice from pasted posts without xAI lock. Reuses seed fingerprint when handle matches. */
export function offlineLockFromPosts(
  handle: string,
  name: string | undefined,
  posts: string[],
): Pick<Voice, 'rawSamples' | 'styleProfile'> {
  const h = handle.startsWith('@') ? handle : `@${handle.replace(/^@/, '')}`
  const seed = getSeedVoiceByHandle(h)
  const styleProfile = seed?.styleProfile ?? heuristicProfile(h, posts)
  const rawSamples = posts.map((text, i) =>
    sampleFromText(`manual-${i}`, text, i === 0),
  )
  if (seed) {
    return {
      rawSamples,
      styleProfile: {
        ...styleProfile,
        summary: `${seed.styleProfile.summary} (samples pasted locally — fingerprint from seed.)`,
      },
    }
  }
  return { rawSamples, styleProfile }
}
