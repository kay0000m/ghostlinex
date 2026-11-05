import { useState } from 'react'
import { useStudio } from '~/store/studio'
import { voiceCartridgeFilename } from '~/lib/utils'
import { STUDY_TARGETS } from '~/lib/types'

type Tab = 'fingerprint' | 'samples'

export function VoiceDrawer() {
  const drawerVoiceId = useStudio((s) => s.drawerVoiceId)
  const openVoiceDrawer = useStudio((s) => s.openVoiceDrawer)
  const voices = useStudio((s) => s.voices)
  const pinSample = useStudio((s) => s.pinSample)
  const deleteSample = useStudio((s) => s.deleteSample)
  const relockVoice = useStudio((s) => s.relockVoice)
  const deepenVoice = useStudio((s) => s.deepenVoice)
  const insertSampleText = useStudio((s) => s.insertSampleText)
  const [tab, setTab] = useState<Tab>('fingerprint')
  const [filter, setFilter] = useState<'all' | 'pinned' | 'short' | 'long'>(
    'all',
  )

  if (!drawerVoiceId) return null
  const voice = voices.find((v) => v.id === drawerVoiceId)
  if (!voice) return null

  const pinned = voice.rawSamples.filter((s) => s.pinned).length
  const canDeepen =
    !voice.isSeed &&
    voice.studyDepth !== 'deep' &&
    voice.postsReadCount < STUDY_TARGETS.deep

  const filteredSamples = voice.rawSamples.filter((s) => {
    if (filter === 'pinned') return s.pinned
    if (filter === 'short') return s.bucket === 'short'
    if (filter === 'long') return s.bucket === 'long'
    return true
  })

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
      <div className="drawer-panel flex h-full w-full max-w-[480px] flex-col border-l border-ink-line bg-ink-elevated">
        <header className="border-b border-ink-line px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display text-[28px] leading-tight text-paper">
                {voice.handle}
              </h3>
              <p className="mt-1 font-mono text-[11px] tracking-wider text-stone">
                {voice.postsReadCount} READ · {voice.studyDepth.toUpperCase()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openVoiceDrawer(null)}
              className="font-mono text-[11px] text-stone hover:text-paper"
            >
              [CLOSE]
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {canDeepen && (
              <button
                type="button"
                onClick={() => void deepenVoice(voice.id)}
                className="border border-sage px-3 py-1.5 font-mono text-[10px] text-sage"
              >
                [Deepen to 150]
              </button>
            )}
            {!voice.isSeed && (
              <button
                type="button"
                onClick={() => {
                  const json = exportCartridge(voice.id)
                  if (!json) return
                  const blob = new Blob([json], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = voiceCartridgeFilename(voice.handle)
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="border border-ink-line px-3 py-1.5 font-mono text-[10px] text-stone"
              >
                [Export .JSON]
              </button>
            )}
          </div>
        </header>

        <div className="flex border-b border-ink-line font-mono text-[11px] tracking-wider">
          {(
            [
              ['fingerprint', 'Fingerprint'],
              ['samples', 'Raw Samples & Anchors'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 border-r border-ink-line px-3 py-2 last:border-r-0 ${
                tab === id
                  ? 'bg-sage-dim text-sage'
                  : 'text-stone hover:bg-ink-hover'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {tab === 'fingerprint' && (
            <div className="space-y-6">
              <section>
                <p className="ritual-mark">Summary</p>
                <p className="mt-2 font-display text-lg text-paper">
                  {voice.styleProfile.summary}
                </p>
              </section>
              {(['tone', 'cadence', 'structure'] as const).map((key) => (
                <section key={key}>
                  <p className="ritual-mark">{key}</p>
                  <p className="mt-2 text-sm leading-relaxed text-paper-dim">
                    {voice.styleProfile[key]}
                  </p>
                </section>
              ))}
              <div className="grid gap-4 sm:grid-cols-2">
                <section>
                  <p className="ritual-mark text-sage">Do +</p>
                  <ul className="mt-2 space-y-1 text-xs text-paper-dim">
                    {voice.styleProfile.do.map((d) => (
                      <li key={d}>+ {d}</li>
                    ))}
                  </ul>
                </section>
                <section>
                  <p className="ritual-mark text-oxide">Don&apos;t −</p>
                  <ul className="mt-2 space-y-1 text-xs text-paper-dim">
                    {voice.styleProfile.dont.map((d) => (
                      <li key={d}>− {d}</li>
                    ))}
                  </ul>
                </section>
              </div>
              <section>
                <p className="ritual-mark">Signature moves</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {voice.styleProfile.signatureMoves.map((m) => (
                    <span
                      key={m}
                      className="border border-ink-line px-2 py-1 font-mono text-[10px] text-stone"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </section>
            </div>
          )}

          {tab === 'samples' && (
            <div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['all', `All · ${voice.rawSamples.length}`],
                    ['pinned', `Pinned · ${pinned}/5`],
                    [
                      'short',
                      `Short · ${voice.rawSamples.filter((s) => s.bucket === 'short').length}`,
                    ],
                    [
                      'long',
                      `Long · ${voice.rawSamples.filter((s) => s.bucket === 'long').length}`,
                    ],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFilter(id)}
                    className={`border px-2 py-1 font-mono text-[10px] ${
                      filter === id
                        ? 'border-sage bg-sage-dim text-sage'
                        : 'border-ink-line text-stone'
                    }`}
                  >
                    [{label}]
                  </button>
                ))}
              </div>
              <ul className="mt-4 space-y-3">
                {filteredSamples.map((s) => (
                  <li
                    key={s.id}
                    className="border border-ink-line bg-ink p-3 text-sm leading-relaxed"
                  >
                    <div className="flex justify-between gap-2 font-mono text-[10px]">
                      <span className="text-stone">
                        {s.bucket.toUpperCase()}
                        {s.pinned ? ' · ANCHOR' : ''}
                      </span>
                      <span className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => insertSampleText(s.text)}
                          className="text-sage"
                        >
                          [→ DRAFT]
                        </button>
                        <button
                          type="button"
                          onClick={() => pinSample(voice.id, s.id)}
                          className={s.pinned ? 'text-sage' : 'text-stone'}
                        >
                          [PIN ANCHOR]
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSample(voice.id, s.id)}
                          className="text-oxide"
                        >
                          [DELETE]
                        </button>
                      </span>
                    </div>
                    <p className="mt-2 text-paper">{s.text}</p>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => void relockVoice(voice.id)}
                className="mt-6 w-full border border-ink-line py-2 font-mono text-[10px] text-stone hover:border-sage hover:text-sage"
              >
                [Re-lock Profile from Pruned Samples]
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
