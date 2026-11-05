import { useState } from 'react'
import type { StudyMode } from '~/lib/types'
import { useStudio } from '~/store/studio'
import { studyTimeEstimate, studyTarget } from '~/lib/utils'

export function Dossier() {
  const dossier = useStudio((s) => s.dossier)
  const chooseStudyMode = useStudio((s) => s.chooseStudyMode)
  const setPhase = useStudio((s) => s.setPhase)
  const [selected, setSelected] = useState<StudyMode>('deep')

  if (!dossier) return null

  const coverage = Math.min(
    100,
    Math.round((dossier.reachableCount / dossier.statusesCount) * 100),
  )

  return (
    <section className="border border-ink-line bg-ink-elevated">
      <header className="border-b border-ink-line px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-stone">{dossier.handle}</p>
            <h2 className="font-display mt-1 text-2xl tracking-tight text-paper">
              {dossier.name}
            </h2>
            {dossier.bio && (
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-paper-dim">
                {dossier.bio}
              </p>
            )}
          </div>
          <span className="border border-sage px-2 py-1 font-mono text-[10px] tracking-wider text-sage">
            [REACHABLE ARCHIVE VERIFIED]
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 border-b border-ink-line sm:grid-cols-3">
        <div className="border-ink-line px-6 py-4 sm:border-r">
          <p className="ritual-mark">Lifetime posts</p>
          <p className="mt-2 font-mono text-xl tabular-nums text-stone">
            {dossier.statusesCount.toLocaleString()}
          </p>
        </div>
        <div className="border-ink-line px-6 py-4 sm:border-r">
          <p className="ritual-mark">Reachable slice</p>
          <p className="mt-2 font-mono text-xl tabular-nums text-paper">
            ~{dossier.reachableCount}
          </p>
        </div>
        <div className="px-6 py-4">
          <p className="ritual-mark">Archive coverage</p>
          <p className="mt-2 text-xs leading-relaxed text-stone">
            Search sees ~{coverage}% of lifetime posts. Ghostline never claims a
            full X archive dump.
          </p>
        </div>
      </div>

      {dossier.initialPosts.length > 0 && (
        <div className="border-b border-ink-line px-6 py-4">
          <p className="ritual-mark mb-3">Preview strip</p>
          <ul className="space-y-2">
            {dossier.initialPosts.slice(0, 3).map((p) => (
              <li
                key={p.id}
                className="border-l-2 border-ink-line pl-3 text-sm leading-relaxed text-paper-dim"
              >
                {p.text.slice(0, 140)}
                {p.text.length > 140 ? '…' : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-px bg-ink-line sm:grid-cols-2">
        {(
          [
            {
              mode: 'recent' as const,
              title: 'Recent pulse',
              desc: 'Best for current tone & recent topics.',
            },
            {
              mode: 'deep' as const,
              title: 'Deep study',
              desc: 'Multi-month windows for full structural fingerprint.',
            },
          ] as const
        ).map(({ mode, title, desc }) => {
          const active = selected === mode
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setSelected(mode)}
              className={`bg-ink-elevated p-6 text-left transition-colors duration-[120ms] ease-editorial ${
                active ? 'ring-1 ring-inset ring-sage' : 'hover:bg-ink-hover'
              }`}
            >
              <p className="ritual-mark text-sage">{title}</p>
              <p className="mt-3 font-display text-lg text-paper">
                ~{studyTarget(mode)} unique posts
              </p>
              <p className="mt-1 font-mono text-[11px] text-stone">
                Est. {studyTimeEstimate(mode)}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-paper-dim">{desc}</p>
            </button>
          )
        })}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <button
          type="button"
          onClick={() => setPhase('intake')}
          className="font-mono text-[11px] text-stone hover:text-paper"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => chooseStudyMode(selected)}
          className="border border-sage bg-sage-dim px-5 py-2.5 font-mono text-[11px] tracking-wider text-sage"
        >
          Begin {selected === 'deep' ? 'deep study' : 'recent pulse'} →
        </button>
      </footer>
    </section>
  )
}
