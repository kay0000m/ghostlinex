import { useEffect } from 'react'
import { useStudio } from '~/store/studio'
import { VoiceChipBar } from '~/components/studio/voice-chip-bar'
import { DraftPane } from '~/components/studio/draft'
import { OutputPane } from '~/components/studio/output'
import { FreeModeGuide } from '~/components/studio/free-mode-guide'
import { StudyRail } from '~/components/studio/study-rail'

export function Compose() {
  const openVoiceDrawer = useStudio((s) => s.openVoiceDrawer)
  const primaryVoiceId = useStudio((s) => s.primaryVoiceId)
  const runRewrite = useStudio((s) => s.runRewrite)
  const runHooks = useStudio((s) => s.runHooks)
  const draft = useStudio((s) => s.draft)
  const apiError = useStudio((s) => s.apiError)
  const creditsExhausted = useStudio((s) => s.creditsExhausted)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'Enter') {
        e.preventDefault()
        void runRewrite()
      }
      if (mod && e.shiftKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault()
        void runHooks()
      }
      if (mod && e.key === 'k') {
        e.preventDefault()
        if (primaryVoiceId) openVoiceDrawer(primaryVoiceId)
      }
      if (!mod && document.activeElement?.tagName !== 'TEXTAREA') {
        const n = Number(e.key)
        if (n >= 1 && n <= 9) {
          const voices = useStudio.getState().voices
          const v = voices[n - 1]
          if (v) useStudio.getState().selectVoice(v.id, false)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openVoiceDrawer, primaryVoiceId, runHooks, runRewrite])

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {creditsExhausted && (
        <div className="border-b border-oxide/50 bg-ink-subtle px-4 py-2 font-mono text-[11px] text-oxide">
          Studio credits exhausted — seed voices, tape, and cartridges remain
          offline. Use masthead [API: 403 · BYOK].
        </div>
      )}

      <FreeModeGuide />
      <VoiceChipBar />
      <StudyRail />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <DraftPane />
        <OutputPane />
      </div>

      {apiError && (
        <p
          className={`border-t px-4 py-2 text-xs ${
            apiError.includes('Free studio') || apiError.includes('Free hook')
              ? 'border-ink-line text-stone'
              : 'border-oxide/50 text-oxide'
          }`}
        >
          {apiError}
        </p>
      )}
      {!draft.trim() && (
        <p className="pointer-events-none absolute bottom-16 left-1/2 hidden -translate-x-1/2 font-mono text-[10px] text-stone-muted lg:block">
          ⌘↵ rewrite · ⌘⇧H hooks · ⌘K dossier · 1–9 voices (when unfocused)
        </p>
      )}
    </div>
  )
}
