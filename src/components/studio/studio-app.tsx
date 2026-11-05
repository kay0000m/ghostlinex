import { useEffect, useState } from 'react'
import { useStudio } from '~/store/studio'
import { Compose } from '~/components/studio/compose'
import { Dossier } from '~/components/studio/dossier'
import { GlobalMasthead } from '~/components/studio/global-masthead'
import { InfoModal } from '~/components/studio/info-modal'
import { InteractiveBackground } from '~/components/studio/interactive-bg'
import { Intake } from '~/components/studio/intake'
import { Study } from '~/components/studio/study'
import { TapeDrawer } from '~/components/studio/tape-drawer'
import { VoiceDrawer } from '~/components/studio/voice-drawer'
import { ByokStrip } from '~/components/studio/intake'

export function StudioApp() {
  const hydrate = useStudio((s) => s.hydrate)
  const hydrated = useStudio((s) => s.hydrated)
  const phase = useStudio((s) => s.phase)
  const byokVisible = useStudio((s) => s.byokVisible)
  const byokKey = useStudio((s) => s.byokKey)
  const setByokKey = useStudio((s) => s.setByokKey)
  const setByokVisible = useStudio((s) => s.setByokVisible)
  const [infoOpen, setInfoOpen] = useState(false)
  const [typingPulse, setTypingPulse] = useState(false)
  const draft = useStudio((s) => s.draft)
  const rewriting = useStudio((s) => s.rewriting)
  const hooksLoading = useStudio((s) => s.hooksLoading)
  const studyRunning = useStudio((s) => s.studyRunning)
  const primaryVoiceId = useStudio((s) => s.primaryVoiceId)
  const voices = useStudio((s) => s.voices)

  const activeVoice = voices.find((v) => v.id === primaryVoiceId)
  const isWriting =
    typingPulse || rewriting || hooksLoading || studyRunning

  useEffect(() => {
    if (!draft) {
      setTypingPulse(false)
      return
    }
    setTypingPulse(true)
    const t = window.setTimeout(() => setTypingPulse(false), 500)
    return () => window.clearTimeout(t)
  }, [draft])

  useEffect(() => {
    hydrate()
  }, [hydrate])

  if (!hydrated) {
    return (
      <>
        <div className="studio-atmosphere" aria-hidden />
        <InteractiveBackground intensity="ambient" activeVoiceHandle={activeVoice?.handle} />
        <div className="studio-shell flex min-h-screen items-center justify-center font-mono text-xs tracking-widest text-stone">
          INITIALIZING STUDIO…
        </div>
      </>
    )
  }

  const isStudio = phase === 'compose'

  return (
    <>
      <div className="studio-atmosphere" aria-hidden />
      <InteractiveBackground
        intensity={infoOpen ? 'modal' : 'ambient'}
        isWriting={isWriting}
        activeVoiceHandle={activeVoice?.handle}
      />
      <div className="studio-shell flex min-h-screen flex-col">
      <GlobalMasthead onOpenInfo={() => setInfoOpen(true)} />

      {byokVisible && (
        <div className="border-b border-ink-line bg-ink-subtle px-4 py-2">
          <ByokStrip
            visible
            onToggle={() => setByokVisible(false)}
            value={byokKey}
            onChange={setByokKey}
            inline
          />
        </div>
      )}

      <main
        className={
          isStudio
            ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
            : 'mx-auto w-full max-w-3xl flex-1 px-6'
        }
      >
        {phase === 'intake' && (
          <div className="mx-auto mt-24 max-w-2xl pb-16">
            <Intake />
          </div>
        )}
        {phase === 'dossier' && (
          <div className="mx-auto mt-20 max-w-3xl pb-16">
            <Dossier />
          </div>
        )}
        {phase === 'study' && (
          <div className="mx-auto mt-20 max-w-3xl pb-16">
            <Study />
          </div>
        )}
        {phase === 'compose' && <Compose />}
      </main>

      <VoiceDrawer />
      <TapeDrawer />
      <InfoModal isOpen={infoOpen} onClose={() => setInfoOpen(false)} />
      </div>
    </>
  )
}
