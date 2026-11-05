# Ghostline

Local-first **style-transfer writing studio** for Crypto Twitter drafts. Learn cadence from seed voices (or pasted posts), polish your own ideas, and edit by hand. Not impersonation, not voice cloning, not posting as someone else.

**No Grok / xAI key required** for the main studio flow. API is optional later for live X scout and full AI rewrites.

## Prerequisites

Install [Node.js LTS](https://nodejs.org/) (includes `npm`).

## Setup

```bash
git clone https://github.com/<your-username>/ghostline.git
cd ghostline
npm install --legacy-peer-deps
```

You do **not** need a `.env` file for free mode. Copy `.env.example` → `.env` only when you add xAI later.

### Publish this repo to GitHub (maintainer)

Git is not bundled with Node. On Windows, install [GitHub Desktop](https://desktop.github.com/) or [Git for Windows](https://git-scm.com/download/win), then from the project folder:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\publish-to-github.ps1
```

If you use [GitHub CLI](https://cli.github.com/) and `gh auth login`, the script creates a public `ghostline` repo and pushes. Otherwise it commits locally and prints GitHub Desktop steps.

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should land in **STUDIO** with **`[STUDIO: FREE MODE]`** in the masthead.

## Free mode (no API) — what to do

1. Click a **seed voice** (`@hasu`, `@cobie`, `@CryptoHayes`, `@6529`, `@loomdart`).
2. Write your idea in the **Draft** pane (plain English is fine).
3. Click **Polish** — slop cuts, rhythm, light voice heuristics (not a full LLM rewrite).
4. Use **ANCHORS** (`+DRAFT`) or **⌘K / i** on a voice to read real sample posts and edit toward that cadence.
5. **4 Hook Angles** gives offline starter hooks from the voice fingerprint.
6. **Tape** saves local history; **Import .JSON** loads voice cartridges.

**Manual voice:** Intake → paste 2+ posts (blank line between) → **Lock & enter studio** (works offline; `@hasu`-style handles reuse seed fingerprints).

## Optional: Grok API later

Scout, Study pull from X, Lock via AI, and full **Rewrite** need an [xAI API key](https://console.x.ai/) (prepaid credits, $5 minimum).

1. Copy `.env.example` to `.env` and set `XAI_API_KEY=xai-...`
2. Restart `npm run dev`
3. Or paste the key in the masthead **BYOK** bar (stored in browser as `ghostline.byok.v1`)

Ghostline uses **xAI `x_search`** for scout/study — not the separate [X Developer API](https://developer.x.com/) by default.

## Product flow

| Phase | Free mode | With xAI |
|-------|-----------|----------|
| Intake | Seeds, manual paste, `.ghostline.json` | + Scout handle on X |
| Dossier / Study | Skip (use seeds) | Pull posts + lock profile |
| Compose | Polish, hooks, tape | Full rewrite + hooks |

## Keyboard shortcuts (compose)

- **⌘↵** / **Ctrl+Enter** — Polish / Rewrite  
- **⌘⇧H** — Hook angles  
- **⌘K** — Voice dossier  
- **1–9** — Switch seed voices (when draft not focused)

## Tech

TanStack Start, React 19, Tailwind v4, Zustand. Data stays in the browser (`localStorage`) except when you call xAI from your machine.
