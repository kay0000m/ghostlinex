import { useEffect, useState } from 'react'
import { SEED_VOICES } from '~/lib/seed-voices'
import { useStudio } from '~/store/studio'
import { voiceChipLabel } from '~/lib/utils'

export function VoiceChipBar() {
  const voices = useStudio((s) => s.voices)
  const primaryVoiceId = useStudio((s) => s.primaryVoiceId)
  const secondaryVoiceId = useStudio((s) => s.secondaryVoiceId)
  const selectVoice = useStudio((s) => s.selectVoice)
  const openVoiceDrawer = useStudio((s) => s.openVoiceDrawer)
  const setPhase = useStudio((s) => s.setPhase)
  const [shiftHeld, setShiftHeld] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(true)
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const primary = voices.find((v) => v.id === primaryVoiceId)
  const secondary = voices.find((v) => v.id === secondaryVoiceId)

  return (
    <div className="flex h-11 shrink-0 items-center gap-2 overflow-x-auto border-b border-ink-line px-3">
      <span className="ritual-mark shrink-0 text-[10px]">VOICES</span>
      {voices.map((v) => {
        const isPrimary = v.id === primaryVoiceId
        const isSecondary = v.id === secondaryVoiceId
        const previewBlend = shiftHeld && !isPrimary && primaryVoiceId
        return (
          <div key={v.id} className="flex shrink-0 items-stretch">
            <button
              type="button"
              onClick={(e) => selectVoice(v.id, e.shiftKey)}
              className={`flex items-center gap-2 border px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-[120ms] ease-editorial ${
                isPrimary
                  ? 'chip-active border-sage'
                  : isSecondary
                    ? 'chip-blend border-paper-dim text-paper'
                    : previewBlend
                      ? 'border-stone bg-ink-hover text-stone'
                      : 'border-ink-line bg-transparent text-stone hover:bg-ink-hover hover:text-paper-dim'
              }`}
            >
              <span>{voiceChipLabel(v)}</span>
              {isPrimary && (
                <span className="font-mono text-[10px] tracking-wider text-sage">
                  100%
                </span>
              )}
              {isSecondary && (
                <span className="font-mono text-[10px] tracking-wider">30%</span>
              )}
              {previewBlend && (
                <span className="font-mono text-[10px] tracking-wider text-stone">
                  70/30?
                </span>
              )}
            </button>
            <button
              type="button"
              aria-label="Open dossier"
              onClick={() => openVoiceDrawer(v.id)}
              className="border border-l-0 border-ink-line px-1.5 font-mono text-[10px] text-stone transition-colors hover:bg-ink-hover hover:text-sage"
            >
              i
            </button>
          </div>
        )
      })}
      {primary && secondary && (
        <span className="ml-1 hidden font-mono text-[10px] tracking-wider text-stone lg:inline">
          {voiceChipLabel(primary).split(' ·')[0]} 70% +{' '}
          {voiceChipLabel(secondary).split(' ·')[0]} 30%
        </span>
      )}
      <button
        type="button"
        onClick={() => setPhase('intake')}
        className="ml-auto shrink-0 border border-ink-line px-2 py-1 font-mono text-[10px] text-stone transition-colors hover:border-sage hover:text-sage"
      >
        [+ New Voice]
      </button>
    </div>
  )
}

export function SeedVoicePills({ prominent = false }: { prominent?: boolean }) {
  const selectVoice = useStudio((s) => s.selectVoice)
  const setPhase = useStudio((s) => s.setPhase)

  return (
    <div className={prominent ? 'mt-8' : 'mt-8 border-t border-ink-line pt-6'}>
      <p className="text-sm text-paper-dim">
        {prominent
          ? 'Start in the studio with a built-in voice (no API):'
          : 'Or enter studio immediately with a seed voice:'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SEED_VOICES.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => {
              selectVoice(v.id, false)
              setPhase('compose')
            }}
            className="border border-ink-line px-3 py-1.5 font-mono text-[11px] tracking-wide text-stone transition-colors duration-[120ms] ease-editorial hover:border-sage hover:bg-sage-dim hover:text-sage"
          >
            {v.handle}
          </button>
        ))}
      </div>
    </div>
  )
}
