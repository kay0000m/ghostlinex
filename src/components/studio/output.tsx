import { useMemo } from 'react'
import type { Format, TransferDepth } from '~/lib/types'
import { polishOutputBody } from '~/lib/studio-output'
import { canUseStudioApi, useStudio } from '~/store/studio'
import {
  cadenceDiff,
  splitOutputParagraphs,
} from '~/lib/utils'
import { Odometer } from '~/components/studio/odometer'

const DEPTHS: { id: TransferDepth; label: string }[] = [
  { id: 'rhythm', label: 'Rhythm' },
  { id: 'cadence', label: 'Cadence' },
  { id: 'full', label: 'Full' },
]

const FORMATS: { id: Format; label: string }[] = [
  { id: 'short', label: 'Short' },
  { id: 'post', label: 'Post' },
  { id: 'thread', label: 'Thread' },
]

const HOOK_LABELS: Record<string, string> = {
  contrarian: '01 Contrarian',
  deadpan: '02 Deadpan',
  'thesis-first': '03 Thesis',
  observation: '04 Observation',
}

export function OutputPane() {
  const output = useStudio((s) => s.output)
  const draft = useStudio((s) => s.draft)
  const hookCards = useStudio((s) => s.hookCards)
  const applyHook = useStudio((s) => s.applyHook)
  const lockedParagraphIndexes = useStudio((s) => s.lockedParagraphIndexes)
  const toggleParagraphLock = useStudio((s) => s.toggleParagraphLock)
  const runRewrite = useStudio((s) => s.runRewrite)
  const rewriting = useStudio((s) => s.rewriting)
  const transferDepth = useStudio((s) => s.transferDepth)
  const setTransferDepth = useStudio((s) => s.setTransferDepth)
  const format = useStudio((s) => s.format)
  const setFormat = useStudio((s) => s.setFormat)
  const tape = useStudio((s) => s.tape)
  const byokKey = useStudio((s) => s.byokKey)
  const serverApiConfigured = useStudio((s) => s.serverApiConfigured)
  const freeMode = !canUseStudioApi({ byokKey, serverApiConfigured })

  const displayOutput = useMemo(
    () => (output ? polishOutputBody(output) : ''),
    [output],
  )

  const paragraphs = useMemo(
    () => (displayOutput ? splitOutputParagraphs(displayOutput) : []),
    [displayOutput],
  )

  const diff = useMemo(() => {
    if (!displayOutput) return null
    return cadenceDiff(draft, displayOutput)
  }, [draft, displayOutput])

  return (
    <div className="flex min-h-0 flex-col bg-ink-elevated/40">
      <div className="flex flex-wrap items-center gap-4 border-b border-ink-line px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="ritual-mark">Depth</span>
          <div className="flex border border-ink-line">
            {DEPTHS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setTransferDepth(d.id)}
                className={`px-2.5 py-1 font-mono text-[10px] tracking-wider transition-colors ${
                  transferDepth === d.id
                    ? 'bg-sage-dim text-sage'
                    : 'text-stone hover:bg-ink-hover'
                }`}
              >
                {d.label}
                {transferDepth === d.id ? ' ●' : ''}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="ritual-mark">Format</span>
          <div className="flex border border-ink-line">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormat(f.id)}
                className={`px-2.5 py-1 font-mono text-[10px] tracking-wider transition-colors ${
                  format === f.id
                    ? 'bg-sage-dim text-sage'
                    : 'text-stone hover:bg-ink-hover'
                }`}
              >
                {f.label}
                {format === f.id ? ' ●' : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-ink-line px-4 py-2">
        <span className="ritual-mark">Rewrite</span>
        {freeMode && (
          <span className="font-mono text-[9px] text-stone">local polish</span>
        )}
        <span className="ritual-mark text-stone-muted">02/02</span>
      </div>

      {hookCards && (
        <div className="grid grid-cols-2 gap-px border-b border-ink-line bg-ink-line">
          {Object.entries(hookCards).map(([key, text]) =>
            text ? (
              <button
                key={key}
                type="button"
                onClick={() => {
                  applyHook(text)
                  void runRewrite()
                }}
                className="bg-ink-elevated p-3 text-left transition-colors hover:bg-ink-hover"
              >
                <span className="ritual-mark">{HOOK_LABELS[key] ?? key}</span>
                <p className="mt-2 text-sm leading-relaxed text-paper">{text}</p>
              </button>
            ) : null,
          )}
        </div>
      )}

      <div className="relative min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {rewriting && (
          <div className="scan-line mb-4 w-full opacity-60" />
        )}
        {!output && !rewriting && (
          <p className="text-sm text-stone-muted">
            {freeMode
              ? 'Polished draft appears here — study anchors above, then edit.'
              : 'Rewrite output appears here.'}
          </p>
        )}
        {paragraphs.map((p, i) => {
          const locked = lockedParagraphIndexes.includes(i)
          return (
            <div
              key={`${i}-${p.slice(0, 16)}`}
              className={`group relative mb-4 pl-4 transition-colors duration-[120ms] ease-editorial ${
                locked ? 'paragraph-locked border-l-2 border-sage' : 'paragraph-lock-hover'
              } ${!locked ? 'hover:bg-ink-hover/50' : ''}`}
            >
              {locked && (
                <span className="absolute right-0 top-0 font-mono text-[9px] tracking-wider text-sage">
                  [LOCKED · ANCHOR]
                </span>
              )}
              <button
                type="button"
                onClick={() => toggleParagraphLock(i)}
                className="w-full text-left text-base leading-[1.65] text-paper"
              >
                {p}
              </button>
            </div>
          )
        })}
      </div>

      <footer className="flex h-12 shrink-0 items-center justify-between border-t border-ink-line px-4 font-mono text-[11px] tabular-nums text-stone">
        {diff ? (
          <span>
            <Odometer value={diff.wordsBefore} pad={0} />w →{' '}
            <Odometer value={diff.wordsAfter} pad={0} />w (
            {diff.wordDeltaPct >= 0 ? '+' : ''}
            {diff.wordDeltaPct}%) · avg {diff.avgSentenceBefore}w →{' '}
            {diff.avgSentenceAfter}w · {diff.tellsAfter} tells
          </span>
        ) : (
          <span>Cadence diff idle</span>
        )}
        <div className="flex gap-3">
          {output && (
            <button
              type="button"
              onClick={() =>
                void navigator.clipboard.writeText(displayOutput || output)
              }
              className="text-stone hover:text-sage"
            >
              [Copy]
            </button>
          )}
          {output && (
            <span className="text-stone-muted">Tape · {tape.length}/20</span>
          )}
        </div>
      </footer>
    </div>
  )
}
