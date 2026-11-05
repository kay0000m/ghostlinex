const POLISH_HEADER =
  /^\[Studio polish · free mode\]\n\n/i

const LEGACY_HEADER =
  /^\[Offline sketch ·[^\]]*\]\n\n/i

const REFERENCE_FOOTER = /\n\n---\nReference[\s\S]*$/

/** Main rewrite body without free-mode chrome (for display, copy, cadence diff). */
export function polishOutputBody(output: string): string {
  return output
    .replace(POLISH_HEADER, '')
    .replace(LEGACY_HEADER, '')
    .replace(REFERENCE_FOOTER, '')
    .replace(/\n\n\(Read pinned samples[\s\S]*?\)$/i, '')
    .trim()
}

export function isFreeModeOutput(output: string): boolean {
  return POLISH_HEADER.test(output) || LEGACY_HEADER.test(output)
}
