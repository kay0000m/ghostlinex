import { useRef, useState } from 'react'
import { useStudio } from '~/store/studio'
import { stripHandle } from '~/lib/utils'
import { SeedVoicePills } from '~/components/studio/voice-chip-bar'

export function Intake() {
  const [handle, setHandle] = useState('')
  const [manualOpen, setManualOpen] = useState(false)
  const [manualHandle, setManualHandle] = useState('')
  const [manualPosts, setManualPosts] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const scouting = useStudio((s) => s.scouting)
  const scoutError = useStudio((s) => s.scoutError)
  const runScout = useStudio((s) => s.runScout)
  const runManualLock = useStudio((s) => s.runManualLock)
  const importCartridgeFile = useStudio((s) => s.importCartridgeFile)

  return (
    <section>
      <p className="ritual-mark">01 / Intake — Target cadence</p>
      <h2 className="phase-hero mt-4 italic">
        Whose cadence are we studying?
      </h2>

      <SeedVoicePills prominent />

      <p className="mt-10 font-mono text-[10px] tracking-wider text-stone">
        OR SCOUT X (NEEDS XAI KEY LATER)
      </p>

      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault()
          void runScout(handle)
        }}
      >
        <label className="flex items-baseline gap-1 border-b-2 border-ink-line pb-1 transition-colors focus-within:border-sage">
          <span className="font-display text-3xl text-stone">@</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value.replace(/^@/, ''))}
            placeholder="hasu"
            autoComplete="off"
            className="w-full bg-transparent py-4 font-display text-3xl text-paper outline-none placeholder:text-stone-muted"
          />
        </label>
        <button
          type="submit"
          disabled={scouting || !stripHandle(handle)}
          className="mt-6 border border-ink-line px-5 py-2.5 text-[13px] font-medium text-paper transition-colors duration-[120ms] ease-editorial hover:border-sage hover:bg-sage-dim disabled:opacity-40"
        >
          {scouting ? 'Scouting archive…' : 'Scout account →'}
        </button>
      </form>

      <div className="mt-10 border border-ink-line">
        <button
          type="button"
          onClick={() => setManualOpen(!manualOpen)}
          className="flex w-full items-center justify-between bg-ink-subtle px-4 py-3 text-left font-mono text-[11px] tracking-wider text-stone transition-colors hover:bg-ink-hover"
        >
          [+ Manual Fallback: Paste handle & raw posts or drop .ghostline.json]
          <span>{manualOpen ? '−' : '+'}</span>
        </button>
        {manualOpen && (
          <div
            className="space-y-4 border-t border-ink-line p-4"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const file = e.dataTransfer.files[0]
              if (!file) return
              void file.text().then((json) => importCartridgeFile(json))
            }}
          >
            <input
              value={manualHandle}
              onChange={(e) => setManualHandle(e.target.value)}
              placeholder="@handle label"
              className="w-full border border-ink-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-sage"
            />
            <textarea
              value={manualPosts}
              onChange={(e) => setManualPosts(e.target.value)}
              rows={6}
              placeholder="Paste posts, blank line separated…"
              className="w-full border border-ink-line bg-ink px-3 py-2 text-sm leading-relaxed text-paper outline-none focus:border-sage"
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  void runManualLock({
                    handle: manualHandle,
                    posts: manualPosts.split(/\n\n+/),
                  })
                }
                className="border border-sage px-4 py-2 font-mono text-[11px] text-sage"
              >
                Lock & enter studio
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="border border-ink-line px-4 py-2 font-mono text-[11px] text-stone"
              >
                Drop .ghostline.json
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
            </div>
          </div>
        )}
      </div>

      {scoutError && (
        <p className="mt-6 border-l-2 border-oxide pl-3 text-sm text-paper-dim">
          {scoutError}
        </p>
      )}
    </section>
  )
}

export function ByokStrip({
  visible,
  onToggle,
  value,
  onChange,
  inline = false,
}: {
  visible: boolean
  onToggle: () => void
  value: string
  onChange: (v: string) => void
  inline?: boolean
}) {
  if (!visible && !inline) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="font-mono text-[11px] tracking-wider text-stone"
      >
        [KEY · BYOK]
      </button>
    )
  }
  return (
    <div className={inline ? '' : 'mt-6 border-t border-ink-line pt-4'}>
      {!inline && (
        <button
          type="button"
          onClick={onToggle}
          className="font-mono text-[11px] tracking-wider text-stone"
        >
          [KEY · HIDE]
        </button>
      )}
      <label className="block">
        {inline && (
          <span className="ritual-mark mb-2 block">Bring your own xAI key</span>
        )}
        <input
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="xai-…"
          className="w-full max-w-md border border-ink-line bg-ink px-3 py-2 font-mono text-xs text-paper outline-none focus:border-sage"
        />
      </label>
    </div>
  )
}
