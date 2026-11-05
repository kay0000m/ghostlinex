import { useStudio } from '~/store/studio'
import { Odometer } from '~/components/studio/odometer'

export function Study() {
  const studyProgress = useStudio((s) => s.studyProgress)
  const studyRunning = useStudio((s) => s.studyRunning)
  const apiError = useStudio((s) => s.apiError)

  const pct =
    studyProgress && studyProgress.target > 0
      ? Math.min(100, (studyProgress.collected / studyProgress.target) * 100)
      : 0

  return (
    <section className="border border-ink-line bg-ink-elevated">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-line px-6 py-5">
        <div>
          <p className="ritual-mark">03 / Study — Archive pull</p>
          {studyProgress && (
            <p className="mt-2 font-mono text-[11px] tracking-wider text-stone">
              {studyProgress.windowLabel}
            </p>
          )}
        </div>
        {studyProgress && (
          <p className="font-mono text-2xl tabular-nums text-paper">
            <Odometer value={studyProgress.collected} pad={3} />
            <span className="text-stone"> / </span>
            <Odometer value={studyProgress.target} pad={3} />
            <span className="ml-2 text-[11px] text-stone">UNIQUE POSTS</span>
          </p>
        )}
      </header>

      <div className="h-[2px] bg-ink-line">
        <div
          className="h-full bg-sage transition-all duration-[120ms] ease-editorial"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid border-b border-ink-line sm:grid-cols-2">
        <div className="border-ink-line p-4 font-mono text-[11px] leading-relaxed text-stone sm:border-r">
          <p className="ritual-mark mb-3">Live sample ticker</p>
          <ul className="space-y-2">
            {(studyProgress?.ticker ?? []).map((row) => (
              <li key={row.id} className="text-paper-dim">
                <span className="text-amber-slop/80">{row.tag}</span>{' '}
                {row.text.slice(0, 72)}
                {row.text.length > 72 ? '…' : ''}
              </li>
            ))}
            {!studyProgress?.ticker.length && (
              <li className="text-stone-muted">Awaiting samples…</li>
            )}
          </ul>
        </div>
        <div className="p-6">
          {studyProgress?.lockingProfile || (studyRunning && pct >= 99) ? (
            <p className="font-display text-lg italic leading-relaxed text-paper-dim">
              Synthesizing StyleProfile: extracting cadence, signature moves,
              and anti-tells…
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-stone">
              Keep this tab open. Ghostline walks date windows newest-first,
              deduplicates by ID and normalized text, then locks your profile
              locally.
            </p>
          )}
          {studyRunning && !studyProgress?.lockingProfile && (
            <div className="scan-line mt-8 w-full" />
          )}
        </div>
      </div>

      {apiError && (
        <p className="border-t border-ink-line px-6 py-4 text-sm text-oxide">
          {apiError}
        </p>
      )}
    </section>
  )
}
