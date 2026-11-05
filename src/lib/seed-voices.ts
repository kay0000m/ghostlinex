import type { RawSample, StyleProfile, Voice } from '~/lib/types'
import { bucketSample } from '~/lib/utils'

function sample(id: string, text: string, pinned = false): RawSample {
  return {
    id,
    text,
    bucket: bucketSample(text),
    pinned,
  }
}

function profile(p: StyleProfile): StyleProfile {
  return p
}

const now = '2026-01-15T12:00:00.000Z'

function makeSeedVoice(
  handle: string,
  name: string,
  bio: string,
  styleProfile: StyleProfile,
  rawTexts: Array<{ id: string; text: string; pinned?: boolean }>,
): Voice {
  const rawSamples = rawTexts.map((t) => sample(t.id, t.text, t.pinned ?? false))
  return {
    id: `seed-${handle.replace('@', '')}`,
    handle,
    name,
    bio,
    postsReadCount: rawSamples.length,
    studyDepth: 'seed',
    oldestTimestamp: null,
    updatedAt: now,
    rawSamples,
    styleProfile,
    isSeed: true,
  }
}

export const SEED_VOICES: Voice[] = [
  makeSeedVoice(
    '@cobie',
    'Cobie',
    'Commentary on markets, culture, and incentives.',
    profile({
      summary:
        'Dry, skeptical voice. Short clauses. Implies the reader already knows the joke.',
      tone: 'Detached, ironic, rarely excited.',
      cadence: 'Staccato. One-line punches. Minimal setup.',
      vocabulary: 'Plain English. No hype words. Occasional slang.',
      structure: 'Single observations. Rarely threads. No numbering.',
      do: ['Understate', 'Let implication land', 'Use concrete nouns'],
      dont: ['Cheerlead', 'Explain the punchline', 'Use em dashes'],
      signatureMoves: ['Flat declaratives', 'Rhetorical shrug', 'Contrast then stop'],
    }),
    [
      {
        id: 'c1',
        text: 'everyone wants the upside of risk without the downside of being wrong',
        pinned: true,
      },
      {
        id: 'c2',
        text: 'the market is just a mood ring with a liquidity problem',
      },
      {
        id: 'c3',
        text: 'people call it conviction when they cannot exit',
      },
      {
        id: 'c4',
        text: 'if your thesis needs a thread it probably needs a therapist',
      },
      {
        id: 'c5',
        text: 'bear markets are when you find out who was renting confidence',
      },
    ],
  ),
  makeSeedVoice(
    '@CryptoHayes',
    'Arthur Hayes',
    'Macro, rates, and crypto positioning.',
    profile({
      summary:
        'Macro narrative with swagger. Historical analogies. Confident, theatrical but data-laced.',
      tone: 'Bold, provocative, occasionally profane in spirit without emoji.',
      cadence: 'Long paragraphs. Builds tension then releases.',
      vocabulary: 'Finance jargon, geopolitics, vivid metaphors.',
      structure: 'Essay posts. Occasional multi-part threads when framing a trade.',
      do: ['Anchor in rates and liquidity', 'Use historical parallels', 'State a tradeable view'],
      dont: ['Sound like a press release', 'Hedge every sentence', 'Use hashtag campaigns'],
      signatureMoves: ['Open with a macro hook', 'Name the villain (central bank, politician)', 'Close on positioning'],
    }),
    [
      {
        id: 'h1',
        text:
          'When the Treasury is issuing and the Fed is pretending to be tight, the only release valve is risk assets. That is not bullish crypto because you like logos. It is bullish because savers are being pickpocketed in real terms and they will reach for anything that moves.',
        pinned: true,
      },
      {
        id: 'h2',
        text:
          'Dollar liquidity is the sun. Everything else is just weather. You can debate tokenomics until you are blue in the face, but when the pipes are full, garbage floats higher than it should.',
      },
      {
        id: 'h3',
        text: 'The bond market is the adult in the room. Equities are the teenager. Crypto is the toddler huffing paint. Know which voice you are listening to.',
      },
    ],
  ),
  makeSeedVoice(
    '@hasu',
    'Hasu',
    'Research on MEV, staking, and crypto economics.',
    profile({
      summary:
        'Analytical, precise, mechanism-first. Explains incentives without dumbing down.',
      tone: 'Calm, authoritative, curious.',
      cadence: 'Measured sentences. Defines terms inline. Logical progression.',
      vocabulary: 'Protocol-native terms used correctly. Avoids slogans.',
      structure: 'Clear thesis, supporting points, occasional numbered lists when comparing options.',
      do: ['Name tradeoffs', 'Separate facts from preferences', 'Cite mechanism design'],
      dont: ['Hype launches', 'Treat correlation as causation', 'Use thread gimmicks'],
      signatureMoves: ['Frame as incentive problem', 'Compare two equilibria', 'Quiet conclusion'],
    }),
    [
      {
        id: 'u1',
        text:
          'Most debates about "centralization" in staking are really debates about who bears operational risk. If you outsource that risk, you do not get decentralization. You get insurance with extra steps.',
        pinned: true,
      },
      {
        id: 'u2',
        text:
          'MEV is not a bug in the moral sense. It is a measurement of how much surplus the block producer can extract given current market structure. Fix the structure if you do not like the number.',
      },
      {
        id: 'u3',
        text: 'Short term APY is a marketing variable. Long term equilibrium is an engineering variable. Confusing the two is how protocols die slowly.',
      },
    ],
  ),
  makeSeedVoice(
    '@6529',
    '6529',
    'NFTs, culture, and open metaverse framing.',
    profile({
      summary:
        'Manifesto energy with art-world vocabulary. Long-form conviction posts.',
      tone: 'Earnest, philosophical, anti-cynical without being naive.',
      cadence: 'Rolling sentences. Repetition for emphasis. Big picture.',
      vocabulary: 'Art, history, freedom, decentralization as cultural ideas.',
      structure: 'Standalone essays. Threads when building an argument across beats.',
      do: ['Connect art to sovereignty', 'Zoom out decades', 'Invite the reader to think'],
      dont: ['Snark for snark sake', 'Reduce culture to floor prices', 'Use rocket emojis'],
      signatureMoves: ['Historical analogy', 'Freedom framing', 'Call to cultural patience'],
    }),
    [
      {
        id: 'n1',
        text:
          'The open metaverse is not a product launch. It is a property rights question. Who owns the canvas when the canvas is infinite?',
        pinned: true,
      },
      {
        id: 'n2',
        text:
          'Bear markets filter tourists. That is painful and necessary. Culture compounds in the years when nobody is clapping.',
      },
    ],
  ),
  makeSeedVoice(
    '@loomdart',
    'loomdart',
    'Builder voice. Shitpost cadence with technical teeth.',
    profile({
      summary:
        'Internet-native humor mixed with sharp technical asides. Chaotic but not sloppy.',
      tone: 'Playful, irreverent, suddenly serious about code.',
      cadence: 'Mix of one-liners and mid-length rants.',
      vocabulary: 'Dev slang, memes as nouns, no corporate speak.',
      structure: 'Mostly singles. Threads when live-tweeting a build or hack.',
      do: ['Make the joke and the point in the same breath', 'Self-deprecate', 'Drop real insight mid-bit'],
      dont: ['Sound like HR', 'Over-explain the meme', 'Polish away personality'],
      signatureMoves: ['Pivot from joke to insight', 'Lowercase aesthetic', 'Absurdist comparison'],
    }),
    [
      {
        id: 'l1',
        text: 'smart contracts are just spreadsheets with commitment issues',
        pinned: true,
      },
      {
        id: 'l2',
        text: 'shipping is a coping mechanism and i am very healthy',
      },
      {
        id: 'l3',
        text:
          'people want "community owned" until the community votes to do something stupid. then they want a multisig again. fascinating creatures.',
      },
    ],
  ),
]

export function getSeedVoiceById(id: string): Voice | undefined {
  return SEED_VOICES.find((v) => v.id === id)
}

export function getSeedVoiceByHandle(handle: string): Voice | undefined {
  const h = handle.startsWith('@') ? handle : `@${handle}`
  return SEED_VOICES.find(
    (v) => v.handle.toLowerCase() === h.toLowerCase(),
  )
}
