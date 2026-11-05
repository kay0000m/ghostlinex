import { useMemo } from 'react'
import { canUseStudioApi, useStudio } from '~/store/studio'
import { countSlopTells, scanSlop, stripSlopMatch } from '~/lib/utils'
import { SlopDraftEditor } from '~/components/studio/slop-draft-editor'

export function DraftPane() {
  const draft = useStudio((s) => s.draft)
  const setDraft = useStudio((s) => s.setDraft)
  const targetPost = useStudio((s) => s.targetPost)
  const setTargetPost = useStudio((s) => s.setTargetPost)
  const targetPostOpen = useStudio((s) => s.targetPostOpen)
  const toggleTargetPostOpen = useStudio((s) => s.toggleTargetPostOpen)
  const runRewrite = useStudio((s) => s.runRewrite)
  const runHooks = useStudio((s) => s.runHooks)
  const rewriting = useStudio((s) => s.rewriting)
  const hooksLoading = useStudio((s) => s.hooksLoading)
  const byokKey = useStudio((s) => s.byokKey)
  const serverApiConfigured = useStudio((s) => s.serverApiConfigured)
  const freeMode = !canUseStudioApi({ byokKey, serverApiConfigured })

  const slopMatches = useMemo(() => scanSlop(draft), [draft])
  const slopCount = slopMatches.length
  const slopSummary = useMemo(() => {
    const uniq = [...new Set(slopMatches.map((m) => m.text))]
    return uniq.slice(0, 3).join(', ')
  }, [slopMatches])

  return (
    <div className="flex min-h-0 flex-col border-ink-line lg:border-r">
      <div className="border-b border-ink-line bg-ink-subtle">
        <button
          type="button"
          onClick={toggleTargetPostOpen}
          className="flex w-full items-center px-4 py-2.5 text-left font-mono text-[11px] tracking-wider text-stone transition-colors hover:text-sage"
        >
          [+] Target Post / QT Context {targetPostOpen ? '−' : '+'}
        </button>
        {targetPostOpen && (
          <textarea
            value={targetPost}
            onChange={(e) => setTargetPost(e.target.value)}
            rows={3}
            placeholder="Paste tweet, headline, or protocol announcement…"
            className="w-full resize-none border-t border-ink-line bg-ink px-4 py-3 text-sm leading-relaxed text-paper outline-none"
          />
        )}
      </div>

      <div className="flex items-center justify-between border-b border-ink-line px-4 py-2">
        <span className="ritual-mark">Draft</span>
        <span className="ritual-mark text-stone-muted">01/02</span>
      </div>

      <SlopDraftEditor
        value={draft}
        onChange={setDraft}
        placeholder="Write your draft in your own words…"
      />

      <footer className="flex h-12 shrink-0 items-center justify-between gap-2 border-t border-ink-line px-4">
        <div className="min-w-0 font-mono text-[11px] text-amber-slop">
          {slopCount > 0 ? (
            <span>
              {slopCount} SLOP TELL{slopCount === 1 ? '' : 'S'}
              {slopSummary ? ` (${slopSummary})` : ''}
            </span>
          ) : (
            <span className="text-stone">0 slop tells</span>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={hooksLoading || !draft.trim()}
            onClick={() => void runHooks()}
            className="flex items-center gap-2 border border-ink-line px-3 py-1.5 text-[13px] font-medium text-stone transition-colors hover:border-sage hover:text-paper disabled:opacity-40"
          >
            4 Hook Angles
            <span className="keycap hidden sm:inline">⌘⇧H</span>
          </button>
          <button
            type="button"
            disabled={rewriting || !draft.trim()}
            onClick={() => void runRewrite()}
            className="flex items-center gap-2 border border-sage bg-sage-dim px-3 py-1.5 text-[13px] font-medium text-sage disabled:opacity-40"
          >
            {freeMode ? 'Polish' : 'Rewrite'}
            <span className="keycap hidden sm:inline">⌘↵</span>
          </button>
        </div>
      </footer>
    </div>
  )
}

export function stripFirstSlop(draft: string) {
  const m = scanSlop(draft)[0]
  if (!m) return draft
  return stripSlopMatch(draft, m)
}
