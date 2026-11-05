import { useStudio } from '~/store/studio'

export function StudyRail() {
  const voices = useStudio((s) => s.voices)
  const primaryVoiceId = useStudio((s) => s.primaryVoiceId)
  const insertSampleText = useStudio((s) => s.insertSampleText)
  const openVoiceDrawer = useStudio((s) => s.openVoiceDrawer)

  const voice = voices.find((v) => v.id === primaryVoiceId)
  if (!voice) return null

  const pinned = voice.rawSamples.filter((s) => s.pinned)
  const anchors = pinned.length > 0 ? pinned : voice.rawSamples.slice(0, 3)
  if (anchors.length === 0) return null

  return (
    <div className="border-b border-ink-line bg-ink-subtle/80 px-3 py-2">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="ritual-mark shrink-0 text-[10px]">ANCHORS</span>
        {anchors.map((s) => (
          <div
            key={s.id}
            className="flex max-w-[min(100%,420px)] shrink-0 items-stretch border border-ink-line bg-ink"
          >
            <p className="max-h-16 flex-1 overflow-hidden px-2 py-1.5 text-xs leading-snug text-paper-dim">
              {s.text}
            </p>
            <button
              type="button"
              onClick={() => insertSampleText(s.text)}
              className="border-l border-ink-line px-2 font-mono text-[9px] text-stone transition-colors hover:bg-ink-hover hover:text-sage"
              title="Append to draft"
            >
              +DRAFT
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => openVoiceDrawer(voice.id)}
          className="shrink-0 border border-ink-line px-2 py-1 font-mono text-[10px] text-stone hover:border-sage hover:text-sage"
        >
          [ALL SAMPLES]
        </button>
      </div>
    </div>
  )
}
