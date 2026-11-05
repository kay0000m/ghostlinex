import { useStudio } from '~/store/studio'

export function TapeDrawer() {
  const tapeOpen = useStudio((s) => s.tapeOpen)
  const setTapeOpen = useStudio((s) => s.setTapeOpen)
  const tape = useStudio((s) => s.tape)
  const voices = useStudio((s) => s.voices)
  const restoreTapeEntry = useStudio((s) => s.restoreTapeEntry)

  if (!tapeOpen) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-line bg-ink-elevated">
      <div className="flex items-center justify-between border-b border-ink-line px-5 py-2">
        <p className="ritual-mark">Local tape · last {tape.length} runs</p>
        <button
          type="button"
          onClick={() => setTapeOpen(false)}
          className="font-mono text-[11px] text-stone hover:text-paper"
        >
          [CLOSE]
        </button>
      </div>
      <ul className="max-h-56 overflow-y-auto">
        {tape.length === 0 && (
          <li className="px-5 py-4 text-sm text-stone-muted">No runs yet.</li>
        )}
        {tape.map((entry) => {
          const primary = voices.find((v) => v.id === entry.primaryVoiceId)
          return (
            <li key={entry.id} className="border-t border-ink-line">
              <button
                type="button"
                onClick={() => restoreTapeEntry(entry.id)}
                className="w-full px-5 py-3 text-left transition-colors hover:bg-ink-hover"
              >
                <p className="font-mono text-[10px] tracking-wider text-stone">
                  {new Date(entry.timestamp).toLocaleString()} ·{' '}
                  {primary?.handle ?? 'voice'} · {entry.depth} · {entry.format}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-paper-dim">
                  {entry.output}
                </p>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
