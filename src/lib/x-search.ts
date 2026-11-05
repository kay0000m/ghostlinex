import type { AiResult } from '~/lib/types'

const SEARCH_MODEL =
  process.env.XAI_SEARCH_MODEL?.trim() || 'grok-4-1-fast-reasoning'

type XSearchTool = {
  type: 'x_search'
  allowed_x_handles?: string[]
  from_date?: string
  to_date?: string
}

export interface XSearchRequest {
  prompt: string
  handle: string
  from_date?: string
  to_date?: string
  max_turns?: number
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
    message: text.slice(0, 500) || `HTTP ${res.status}`,
  }
}

function extractResponseText(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null
  const root = json as Record<string, unknown>
  if (typeof root.output_text === 'string' && root.output_text.trim()) {
    return root.output_text.trim()
  }
  const output = root.output
  if (!Array.isArray(output)) return null
  const chunks: string[] = []
  for (const item of output) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (row.type === 'message' && Array.isArray(row.content)) {
      for (const part of row.content) {
        if (!part || typeof part !== 'object') continue
        const p = part as Record<string, unknown>
        if (p.type === 'output_text' && typeof p.text === 'string') {
          chunks.push(p.text)
        }
      }
    }
  }
  const text = chunks.join('\n').trim()
  return text || null
}

export function parseJsonFromModel(text: string): unknown {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    /* try fenced or embedded object */
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence?.[1]) {
    return JSON.parse(fence[1].trim())
  }
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1))
  }
  throw new Error('Model did not return JSON.')
}

/** Parse `buildDateWindows` range; xAI `to_date` is exclusive (YYYY-MM-DD). */
export function windowToXDates(window: string): {
  from_date?: string
  to_date?: string
} {
  const [fromIso, toIso] = window.split('..')
  if (!fromIso || !toIso) return {}
  const from_date = fromIso.slice(0, 10)
  const end = new Date(toIso)
  end.setUTCDate(end.getUTCDate() + 1)
  const to_date = end.toISOString().slice(0, 10)
  return { from_date, to_date }
}

export async function xSearchPrompt(
  apiKey: string,
  req: XSearchRequest,
): Promise<AiResult<string>> {
  const handle = req.handle.replace(/^@/, '')
  const tool: XSearchTool = {
    type: 'x_search',
    allowed_x_handles: [handle],
  }
  if (req.from_date) tool.from_date = req.from_date
  if (req.to_date) tool.to_date = req.to_date

  const res = await fetch('https://api.x.ai/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: SEARCH_MODEL,
      input: [{ role: 'user', content: req.prompt }],
      tools: [tool],
      max_turns: req.max_turns ?? 3,
    }),
  })

  if (!res.ok) return parseApiError(res)

  const json = (await res.json()) as unknown
  const text = extractResponseText(json)
  if (!text) {
    return {
      ok: false,
      errorCode: 'API_ERROR',
      message:
        'X search returned no text. Check XAI_SEARCH_MODEL supports x_search (e.g. grok-4-1-fast-reasoning).',
    }
  }
  return { ok: true, data: text }
}
