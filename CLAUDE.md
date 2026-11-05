### 9. Info Page & Interactive Background Overlay (`src/components/studio/info-modal.tsx`)

- **Trigger:** Quiet `[?]` button in the top global masthead.
- **Layout:** Centered broadsheet overlay (`fixed inset-0 z-50 bg-ink/90 backdrop-blur-sm`) with 1px `border border-ink-line bg-ink-elevated max-w-xl p-8`.
- **Content:**
  1. *What is Ghostline?* — Local-first style-transfer writing studio for CT.
  2. *The Four Principles:* Drafting only, zero server database, raw samples first, broadsheet mechanics.
  3. *Keyboard Shortcuts:* `⌘↵`, `⌘⇧H`, `⌘K`, voice keys `1–9`, `Esc`.

### Interactive Background Engine (`src/components/studio/interactive-bg.tsx`)

- **Technology:** HTML5 Canvas 2D with `requestAnimationFrame` particle mesh.
- **Interactions:**
  - **Cursor magnetic field:** Smoothed mouse lerp; nodes warp and interconnect near the pointer.
  - **Magnetic trail:** Faint evaporating line segments follow cursor velocity.
  - **Typing pulse (`isWriting`):** Draft edits, rewrite, hooks, and study runs emit concentric writing ripples and agitate drift.
  - **Voice theming:** Lattice color, link distance, drift, and magnetic strength shift per active voice chip (`@cobie`, `@CryptoHayes`, `@hasu`, `@6529`, `@loomdart`).
  - **Kinetic shockwave:** Clicks emit expanding ripples and scatter nodes before grid snap-back.
- **Performance:** `pointer-events-none`, resize rebuild, props via refs (no effect restart per keystroke), `prefers-reduced-motion` fallback.
