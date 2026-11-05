import { useMemo, useRef } from 'react'
import { scanSlop } from '~/lib/utils'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function SlopDraftEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const matches = useMemo(() => scanSlop(value), [value])

  const mirrorHtml = useMemo(() => {
    const text = value || ''
    if (!text) return `<span class="text-stone-muted">${escapeHtml(placeholder ?? '')}</span>`
    let html = ''
    let cursor = 0
    for (const m of matches) {
      html += escapeHtml(text.slice(cursor, m.start))
      html += `<span class="slop-mark" title="[SLOP TELL: ${m.code}]">${escapeHtml(text.slice(m.start, m.end))}</span>`
      cursor = m.end
    }
    html += escapeHtml(text.slice(cursor))
    return html.replace(/\n/g, '<br/>')
  }, [value, placeholder, matches])

  const syncScroll = () => {
    const ta = textareaRef.current
    const mirror = ta?.previousElementSibling as HTMLElement | null
    if (ta && mirror) mirror.scrollTop = ta.scrollTop
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 overflow-auto px-5 py-5 text-base leading-[1.65] text-paper"
        dangerouslySetInnerHTML={{ __html: mirrorHtml }}
      />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        placeholder=""
        spellCheck={false}
        className="relative z-[1] h-full min-h-[280px] w-full resize-none bg-transparent px-5 py-5 text-base leading-[1.65] text-transparent caret-paper outline-none"
      />
    </div>
  )
}
