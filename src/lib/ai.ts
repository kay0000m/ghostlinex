import { createServerFn } from '@tanstack/react-start'
import type {
  AiResult,
  Format,
  HookAngle,
  HooksResult,
  LockResult,
  PullResult,
  RewriteResult,
  ScoutResult,
  StyleProfile,
  TransferDepth,
  Voice,
} from '~/lib/types'
import {
  bucketSample,
  mergeStyleProfiles,
  pickSamplesForFormat,
} from '~/lib/utils'
import { parseJsonFromModel, windowToXDates, xSearchPrompt } from '~/lib/x-search'

const MODEL = process.env.XAI_MODEL?.trim() || 'grok-4-1-fast-reasoning'
const MODEL_LOCK = process.env.XAI_MODEL?.trim() || 'grok-4-1-fast-reasoning'

type ApiKeyInput = { customApiKey?: string }

function resolveApiKey(input?: ApiKeyInput): string | null {
  if (input?.customApiKey?.trim()) return input.customApiKey.trim()
  return process.env.XAI_API_KEY?.trim() || null
}

async function parseApiError(res: Response): Promise<AiResult<never>> {
  const text = await res.text()
  if (res.status === 403 && /spending-limit|personal-team-blocked/i.test(text)) {
    return {
      ok: false,
      errorCode: 'CREDITS_EXHAUSTED',
      message: 'Studio API credits are exhausted.',
    }
  }
  return {
    ok: false,
    errorCode: 'API_ERROR',
    message: text.slice(0, 400) || `HTTP ${res.status}`,
  }
}

async function chatComplete(
  key: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  temperature: number,
  model = MODEL,
): Promise<AiResult<string>> {
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature,
      messages,
    }),
  })
  if (!res.ok) return parseApiError(res)
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = json.choices?.[0]?.message?.content?.trim()
  if (!content) {
    return { ok: false, errorCode: 'API_ERROR', message: 'Empty model response.' }
  }
  return { ok: true, data: content }
}

const ANTI_SLOP_RULES = `
Never use em dashes (— or --).
Never use "here's the thing", "let's dive in", "in conclusion", "moreover", "game changer", "few understand".
No hashtags or emojis unless dominant in provided raw samples.
No numbered thread markers (1/, 2/) unless structure notes confirm the writer uses them.
No polished moralizing wrap-up conclusions.
`

function samplesBlock(voice: Pick<Voice, 'rawSamples' | 'styleProfile'>, format: Format): string {
  const picked = pickSamplesForFormat(voice.rawSamples, format, 14)
  const lines = picked.map((s, i) => {
    const pin = s.pinned ? ' [ANCHOR]' : ''
    return `${i + 1}. (${s.bucket})${pin} ${s.text}`
  })
  return lines.join('\n')
}

export const scout = createServerFn({ method: 'POST' })
  .validator((d: { handle: string; customApiKey?: string }) => d)
  .handler(async ({ data }): Promise<AiResult<ScoutResult>> => {
    const key = resolveApiKey(data)
    if (!key) {
      return {
        ok: false,
        errorCode: 'API_ERROR',
        message: 'No xAI API key configured. Add XAI_API_KEY or use BYOK.',
      }
    }
    const handle = data.handle.replace(/^@/, '')
    const prompt = `Use the x_search tool to load the public X profile @${handle} and their recent original posts (no retweets).

Return ONLY valid JSON (no markdown) with keys:
name, handle, bio, followersCount, statusesCount, reachableCount, initialPosts

initialPosts: up to 8 objects { "id": "<post id>", "text": "<verbatim post text>", "createdAt": "<ISO8601>" }

Use real data from X. reachableCount = approximate posts you can see via search for this account (not lifetime total).
handle must be "@${handle}".`

    const result = await xSearchPrompt(key, {
      handle,
      prompt,
      max_turns: 4,
    })
    if (!result.ok) return result
    try {
      const parsed = parseJsonFromModel(result.data) as ScoutResult
      parsed.handle = parsed.handle?.startsWith('@')
        ? parsed.handle
        : `@${parsed.handle || handle}`
      if (!Array.isArray(parsed.initialPosts)) parsed.initialPosts = []
      return { ok: true, data: parsed }
    } catch {
      return {
        ok: false,
        errorCode: 'API_ERROR',
        message:
          'Scout could not parse X search results. Verify your xAI key has x_search access and credits.',
      }
    }
  })

export const pull = createServerFn({ method: 'POST' })
  .validator(
    (d: { handle: string; window: string; customApiKey?: string }) => d,
  )
  .handler(async ({ data }): Promise<AiResult<PullResult>> => {
    const key = resolveApiKey(data)
    if (!key) {
      return {
        ok: false,
        errorCode: 'API_ERROR',
        message: 'No xAI API key configured.',
      }
    }
    const handle = data.handle.replace(/^@/, '')
    const { from_date, to_date } = windowToXDates(data.window)
    const prompt = `Use x_search to fetch original posts from @${handle}${
      from_date && to_date
        ? ` between ${from_date} and ${to_date} (UTC dates, exclusive end).`
        : '.'
    }

Return ONLY JSON: { "posts": [ { "id", "text", "createdAt" } ] } with up to 25 posts.
Use verbatim post text from X. Prefer original posts over pure retweets.`

    const result = await xSearchPrompt(key, {
      handle,
      prompt,
      from_date,
      to_date,
      max_turns: 3,
    })
    if (!result.ok) return result
    try {
      const parsed = parseJsonFromModel(result.data) as PullResult
      if (!Array.isArray(parsed.posts)) parsed.posts = []
      return { ok: true, data: parsed }
    } catch {
      return {
        ok: false,
        errorCode: 'API_ERROR',
        message: 'Pull could not parse X search results.',
      }
    }
  })

export const lock = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      handle: string
      name: string
      bio: string
      posts: Array<{ id: string; text: string }>
      customApiKey?: string
    }) => d,
  )
  .handler(async ({ data }): Promise<AiResult<LockResult>> => {
    const key = resolveApiKey(data)
    if (!key) {
      return {
        ok: false,
        errorCode: 'API_ERROR',
        message: 'No xAI API key configured.',
      }
    }
    const corpus = data.posts.map((p, i) => `${i + 1}. ${p.text}`).join('\n')
    const system = `Synthesize a StyleProfile from posts for STYLE TRANSFER (user drafts their own ideas in similar cadence; not impersonation).
Return ONLY JSON: { "styleProfile": { summary, tone, cadence, vocabulary, structure, do[], dont[], signatureMoves[] }, "samples": same posts as { id, text, bucket, pinned:false } }.
Bucket: short if text <=280 chars else long.`
    const user = `Handle ${data.handle}\nName ${data.name}\nBio ${data.bio}\n\nPosts:\n${corpus}`
    const result = await chatComplete(
      key,
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      0.25,
      MODEL_LOCK,
    )
    if (!result.ok) return result
    try {
      const parsed = JSON.parse(result.data) as {
        styleProfile: StyleProfile
        samples?: Array<{ id: string; text: string; bucket?: string; pinned?: boolean }>
      }
      const samples =
        parsed.samples?.map((s) => ({
          id: s.id,
          text: s.text,
          bucket: bucketSample(s.text),
          pinned: Boolean(s.pinned),
        })) ??
        data.posts.map((p) => ({
          id: p.id,
          text: p.text,
          bucket: bucketSample(p.text),
          pinned: false,
        }))
      return { ok: true, data: { styleProfile: parsed.styleProfile, samples } }
    } catch {
      return { ok: false, errorCode: 'API_ERROR', message: 'Lock returned invalid JSON.' }
    }
  })

export const rewrite = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      draft: string
      targetPost?: string
      primaryVoice: Voice
      secondaryVoice?: Voice | null
      depth: TransferDepth
      format: Format
      lockedParagraphs?: string[]
      customApiKey?: string
    }) => d,
  )
  .handler(async ({ data }): Promise<AiResult<RewriteResult>> => {
    const key = resolveApiKey(data)
    if (!key) {
      return {
        ok: false,
        errorCode: 'API_ERROR',
        message: 'No xAI API key configured.',
      }
    }
    const depthGuide: Record<TransferDepth, string> = {
      rhythm:
        'Rhythm Only: keep user vocabulary and terminology; apply sentence length, pacing, line breaks only.',
      cadence:
        'Cadence (default): transfer structure, transitions, rhetorical pacing; keep user core terms.',
      full: 'Full Voice: transfer signature vocabulary, openers, structural habits from samples.',
    }
    const formatGuide: Record<Format, string> = {
      short: '1-3 punchy sentences.',
      post: 'Single long-form post with natural paragraph breaks.',
      thread: 'Multi-post sequence separated by --- on its own line.',
    }
    const profile =
      data.secondaryVoice && data.primaryVoice
        ? mergeStyleProfiles(
            data.primaryVoice.styleProfile,
            data.secondaryVoice.styleProfile,
            0.7,
          )
        : data.primaryVoice.styleProfile
    const primarySamples = samplesBlock(data.primaryVoice, data.format)
    const secondarySamples = data.secondaryVoice
      ? `\nSecondary samples (30% weight):\n${samplesBlock(data.secondaryVoice, data.format)}`
      : ''
    const locked =
      data.lockedParagraphs && data.lockedParagraphs.length > 0
        ? `\nLOCKED paragraphs (copy verbatim, do not edit):\n${data.lockedParagraphs.map((p, i) => `[${i + 1}] ${p}`).join('\n\n')}`
        : ''
    const qt = data.targetPost?.trim()
      ? `\nQuote/reply context (react sharply, do not summarize):\n${data.targetPost}`
      : ''
    const system = `You rewrite the USER's draft in the TARGET WRITER's style for drafting assistance only.
Ground truth order: rawSamples (especially ANCHOR) > StyleProfile metadata.
${ANTI_SLOP_RULES}
${depthGuide[data.depth]}
Output format: ${formatGuide[data.format]}`
    const user = `StyleProfile:\n${JSON.stringify(profile, null, 2)}\n\nPrimary samples:\n${primarySamples}${secondarySamples}${qt}${locked}\n\nUser draft:\n${data.draft}`
    const result = await chatComplete(
      key,
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      0.4,
    )
    if (!result.ok) return result
    return { ok: true, data: { output: result.data } }
  })

export const hooks = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      draft: string
      targetPost?: string
      primaryVoice: Voice
      secondaryVoice?: Voice | null
      customApiKey?: string
    }) => d,
  )
  .handler(async ({ data }): Promise<AiResult<HooksResult>> => {
    const key = resolveApiKey(data)
    if (!key) {
      return {
        ok: false,
        errorCode: 'API_ERROR',
        message: 'No xAI API key configured.',
      }
    }
    const profile =
      data.secondaryVoice
        ? mergeStyleProfiles(
            data.primaryVoice.styleProfile,
            data.secondaryVoice.styleProfile,
            0.7,
          )
        : data.primaryVoice.styleProfile
    const samples = samplesBlock(data.primaryVoice, 'short')
    const system = `Generate 4 opening hooks (1-2 sentences each) in the target voice for the user's draft topic.
Return ONLY JSON with keys: contrarian, deadpan, "thesis-first", observation.
${ANTI_SLOP_RULES}`
    const user = `Profile:\n${JSON.stringify(profile)}\nSamples:\n${samples}\nDraft:\n${data.draft}\nContext:\n${data.targetPost ?? ''}`
    const result = await chatComplete(
      key,
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      0.55,
    )
    if (!result.ok) return result
    try {
      const parsed = JSON.parse(result.data) as Record<string, string>
      return {
        ok: true,
        data: {
          hooks: {
            contrarian: parsed.contrarian ?? '',
            deadpan: parsed.deadpan ?? '',
            'thesis-first': parsed['thesis-first'] ?? parsed.thesis ?? '',
            observation: parsed.observation ?? '',
          },
        },
      }
    } catch {
      return { ok: false, errorCode: 'API_ERROR', message: 'Hooks returned invalid JSON.' }
    }
  })

export const checkStudioApi = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ hasKey: boolean }> => ({
    hasKey: Boolean(process.env.XAI_API_KEY?.trim()),
  }),
)

export type { HookAngle }
