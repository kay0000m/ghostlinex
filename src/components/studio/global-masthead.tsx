import { useRef } from 'react'
import type { Phase } from '~/lib/types'
import { useStudio } from '~/store/studio'

const PHASE_CRUMB: Record<Phase, string> = {
  intake: '01 HANDLE',
  dossier: '02 ESTIMATE',
  study: '03 STUDY',
  compose: 'STUDIO',
}

export function GlobalMasthead({ onOpenInfo }: { onOpenInfo: () => void }) {
  const phase = useStudio((s) => s.phase)
  const tape = useStudio((s) => s.tape)
  const setTapeOpen = useStudio((s) => s.setTapeOpen)
  const creditsExhausted = useStudio((s) => s.creditsExhausted)
  const byokKey = useStudio((s) => s.byokKey)
  const serverApiConfigured = useStudio((s) => s.serverApiConfigured)
  const setByokVisible = useStudio((s) => s.setByokVisible)
  const byokVisible = useStudio((s) => s.byokVisible)
  const importCartridgeFile = useStudio((s) => s.importCartridgeFile)
  const fileRef = useRef<HTMLInputElement>(null)

  const hasByok = Boolean(byokKey.trim())
  const hasApi = hasByok || serverApiConfigured
  const apiReady = hasApi && !creditsExhausted

  return (
    <header className="glass-bar flex h-12 shrink-0 items-center border-b border-ink-line px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="masthead-brand shrink-0">Ghostline</span>
        <span className="text-stone-muted">|</span>
        <span className="ritual-mark truncate">{PHASE_CRUMB[phase]}</span>
      </div>

      <div className="flex items-center gap-4 font-mono text-[11px] tracking-[0.06em] text-stone">
        <button
          type="button"
          onClick={onOpenInfo}
          className="transition-colors hover:text-sage"
          aria-label="About Ghostline"
        >
          [?]
        </button>
        <button
          type="button"
          onClick={() => setTapeOpen(true)}
          className="transition-colors hover:text-paper"
        >
          [TAPE · {tape.length}]
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="hidden transition-colors hover:text-paper sm:inline"
        >
          [IMPORT .JSON]
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            void file.text().then((json) => importCartridgeFile(json))
          }}
        />
        <button
          type="button"
          onClick={() => setByokVisible(!byokVisible)}
          className="flex items-center gap-1.5 transition-colors hover:text-paper"
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${hasApi ? (apiReady ? 'bg-sage' : 'bg-oxide') : 'bg-stone'}`}
          />
          {hasApi
            ? apiReady
              ? '[API: READY]'
              : '[API: 403 · BYOK]'
            : '[STUDIO: FREE MODE]'}
        </button>
      </div>
    </header>
  )
}
