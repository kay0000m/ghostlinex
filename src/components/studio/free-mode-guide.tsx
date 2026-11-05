import { useEffect, useState } from 'react'
import { canUseStudioApi, useStudio } from '~/store/studio'

const DISMISS_KEY = 'ghostline.freeGuideDismissed.v1'

export function FreeModeGuide() {
  const byokKey = useStudio((s) => s.byokKey)
  const serverApiConfigured = useStudio((s) => s.serverApiConfigured)
  const openVoiceDrawer = useStudio((s) => s.openVoiceDrawer)
  const primaryVoiceId = useStudio((s) => s.primaryVoiceId)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1')
  }, [])

  if (dismissed || canUseStudioApi({ byokKey, serverApiConfigured })) {
    return null
  }

  return (
    <div className="border-b border-sage/30 bg-sage-dim/40 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl space-y-1 text-sm text-paper-dim">
          <p className="font-mono text-[10px] tracking-wider text-sage">
            FREE STUDIO — HOW TO USE IT
          </p>
          <p>
            1) Pick a voice (e.g. @hasu). 2) Write your idea in plain English.
            3) Hit Polish for slop cuts + rhythm. 4) Read pinned lines below or press{' '}
            <span className="font-mono text-[11px]">⌘K</span> for the full
            fingerprint, then edit by hand.
          </p>
          <p className="text-xs text-stone">
            Grok API later unlocks real style transfer — not required to draft
            today.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {primaryVoiceId && (
            <button
              type="button"
              onClick={() => openVoiceDrawer(primaryVoiceId)}
              className="border border-sage px-2 py-1 font-mono text-[10px] text-sage"
            >
              [OPEN DOSSIER]
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, '1')
              setDismissed(true)
            }}
            className="border border-ink-line px-2 py-1 font-mono text-[10px] text-stone hover:text-paper"
          >
            [DISMISS]
          </button>
        </div>
      </div>
    </div>
  )
}
