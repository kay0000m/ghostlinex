import { useEffect } from 'react'

interface InfoModalProps {
  isOpen: boolean
  onClose: () => void
}

const SHORTCUTS = [
  { keys: '⌘↵', action: 'Polish draft (free) / Rewrite (with xAI)' },
  { keys: '⌘⇧H', action: 'Generate 4 hook angles' },
  { keys: '⌘K', action: 'Open voice dossier (active voice)' },
  { keys: '1–9', action: 'Switch primary voice (editor unfocused)' },
  { keys: 'Esc', action: 'Close this panel' },
]

const PRINCIPLES = [
  {
    mark: '01',
    title: 'Drafting only',
    body: 'Style transfer for your ideas. Not impersonation, voice cloning, or posting as someone else.',
  },
  {
    mark: '02',
    title: 'Zero cloud database',
    body: 'Custom voices, tape, and BYOK keys live in browser localStorage only.',
  },
  {
    mark: '03',
    title: 'Raw samples first',
    body: 'Rewrites ground in stored posts and anchor pins; StyleProfile is secondary metadata.',
  },
  {
    mark: '04',
    title: 'Broadsheet mechanics',
    body: 'Exposed grid, monospace telemetry, and tactile locks—not SaaS glow or bounce.',
  },
]

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/90 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-labelledby="info-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl border border-ink-line bg-ink-elevated p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between border-b border-ink-line pb-4">
          <span className="font-mono text-[11px] tracking-[0.06em] text-stone uppercase">
            [About Ghostline · Sys.04]
          </span>
          <button
            type="button"
            onClick={onClose}
            className="border border-ink-line px-2 py-1 font-mono text-[11px] text-paper transition-colors duration-[120ms] ease-editorial hover:border-sage hover:text-sage"
          >
            [ Esc ]
          </button>
        </div>

        <div className="space-y-6">
          <h2
            id="info-modal-title"
            className="font-display text-3xl italic text-paper"
          >
            Style transfer for drafting.
          </h2>

          <p className="text-sm leading-relaxed text-paper-dim">
            Ghostline is a local-first writing studio for Crypto Twitter. Start
            with seed voices and polish drafts in free mode — no API key. Optional
            xAI unlocks scout, study, and full rewrites.
          </p>

          <div>
            <p className="ritual-mark mb-3">The four principles</p>
            <ul className="space-y-3">
              {PRINCIPLES.map((p) => (
                <li
                  key={p.mark}
                  className="grid grid-cols-[2.5rem_1fr] gap-2 border-l border-ink-line pl-3"
                >
                  <span className="font-mono text-[10px] text-sage">{p.mark}</span>
                  <div>
                    <p className="text-[13px] font-medium text-paper">{p.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-paper-dim">
                      {p.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-ink-line pt-4">
            <p className="ritual-mark mb-3">Keyboard shortcuts</p>
            <table className="w-full font-mono text-[11px]">
              <tbody>
                {SHORTCUTS.map((row) => (
                  <tr key={row.keys} className="border-b border-ink-line/80">
                    <td className="py-2 pr-4 text-sage">{row.keys}</td>
                    <td className="py-2 text-stone">{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-ink-line pt-4 font-mono text-[10px] tracking-wider text-stone">
            <span>FREE STUDIO · XAI OPTIONAL</span>
            <span className="text-sage">LOCAL TAPE ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  )
}
