# Poker Tools — Project Overview

## What It Is
A collection of web-based poker tools hosted at `poker.marctorrence.com`. Currently:
1. **RTP Driller** — Scenario drilling tool for NLHE study groups. Automates card dealing and opponent actions so players can focus on articulating their thought process street-by-street.

> The **Dashboard** (analytics from a Google Sheet) used to live here at `/dashboard/`. It now lives in its own repo (`marcdt11/dashboard`) at `dashboard.marctorrence.com`, deliberately isolated from this public-facing tools site so it is not discoverable by trimming the poker URL.

## Architecture
- **No build tools, no frameworks.** Vanilla HTML/CSS/JS, static files served by GitHub Pages.
- **Single-file apps.** Each tool is a self-contained `index.html`.
- **Client-side only.** No backend, no database. Dashboard reads from a published Google Sheet CSV; Driller state lives in JS memory.

## Folder Structure
```
/
├── CLAUDE.md              # CTO instructions (Claude-only)
├── PROJECT.md             # This file
├── BACKLOG.md             # Feature backlog + completed items
├── CNAME                  # Custom domain config (poker.marctorrence.com)
├── index.html             # Landing page → links to /driller/ (+ future tools)
├── package.json           # Dev-only test tooling (vitest + happy-dom); NOT deployed
└── driller/
    ├── index.html         # RTP Driller app (markup + CSS; loads app.js)
    ├── app.js             # RTP Driller game engine (extracted from index.html)
    └── tests/             # Headless regression tests (see Testing below)
        ├── README.md
        ├── harness.js     # Loads index.html+app.js in happy-dom; seeded RNG; instant animations
        ├── helpers.js     # Shared driver (playHand, advanceToStreet, chipTotal, …)
        ├── smoke.test.js
        ├── fuzz.test.js
        ├── reroll.test.js
        ├── nav.test.js
        └── perturbation.test.js
```

> **Note:** the Driller logic used to be an inline `<script>` inside
> `driller/index.html`. It now lives in `driller/app.js` (loaded via
> `<script src="app.js">`) so it can be unit-tested headless. Behavior is
> identical; the split exists purely for testability.

## Deployment
- GitHub Pages from `main` branch, root `/` path
- Repo: `marcdt11/poker`
- Custom domain: `poker.marctorrence.com`
- No CI/CD — push to main auto-deploys
- **Dashboard is a separate site:** repo `marcdt11/dashboard` → `dashboard.marctorrence.com`
  (own GitHub Pages site + `CNAME`). DNS: `dashboard` CNAME → `marcdt11.github.io` (GoDaddy).
  Kept off this repo so it can't be reached from the public poker domain.

---

## Driller — Technical Details

### Design System
CSS custom properties matching PreflopTrainer's visual style:
- Pure black theme (`--bg-primary: #000000`, `--bg-secondary: #111111`)
- Table felt: solid `#1a612e` with `#267038` inner line, brown rail gradient (`#4D3820` → `#332412`)
- Seat circles: `#333340` background, 44px base diameter (responsive scaling), status-colored borders (yellow=hero, orange=raised, blue=called, white 50%=posted, white 30%=default/folded)
- Active seat: white 3px border + white glow shadow (no pulse animation)
- Cards: hero 48×68px, board 36×50px, card backs navy `#1a2659`
- Action buttons: red (raise/bet), green (call/check), gray (fold), 44px height, 10px radius
- Pot pill: orange capsule, bet pills: white background with black text
- Responsive table: horizontal stadium (2:1) on desktop, tighter vertical stadium (0.58:1) on mobile
- Mobile optimizations: `100dvh` viewport with `env(safe-area-inset-bottom)` for iOS Safari, 58px seats with 12px labels, balanced rank/suit font sizing, numeric keypad bet input (`inputmode="numeric"`), zoom prevention via `maximum-scale=1.0`, `text-size-adjust: 100%` to prevent iOS Accessibility "Larger Text" from inflating layout, tighter rail-centered seat inset, and compact side hidden-card markers (stacked mini backs) instead of top "bunny ears"
- Fonts: Outfit (UI) + JetBrains Mono (numbers/data)
- Loaded via Google Fonts CDN

### Testing
- **Stack:** Vitest + happy-dom, run with `npm test` (or `npm run test:watch`). Dev-only deps in `package.json`; never deployed (Pages serves static files only). `node_modules/` is gitignored.
- **Approach:** Tests load the *real* `index.html` + `app.js` headless via `driller/tests/harness.js`. Three test seams in `app.js` make this possible (all no-ops in the browser): `TEST_MODE` (skips `delay()` animation waits), a swappable `_rng`/`rng()` (seeded, deterministic shuffles + villain actions), and a `window.__driller` export exposing game state + core functions. `startHand`/`rerollStreet`/`startStreetAction` return their async chains so tests can await them.
- **Master invariant:** `pot + userStack + oppStack` is constant from the flop onward (bets are added to `game.pot` immediately, not on collect). Drift = a pot/stack bug. The fuzzers assert this after every action, reroll, and history nav across all spots/positions/stacks/stakes.
- **Coverage:** straight-play fuzz (`fuzz`), reroll street-start restoration (`reroll`), history nav determinism + branch-and-replay (`nav`), and combined reroll+rewind perturbation (`perturbation`). See `driller/tests/README.md`.
- **Pre-push guard:** `.githooks/pre-push` runs `npm test` and blocks the push on failure. Enable once per clone with `git config core.hooksPath .githooks`. Bypass intentionally with `git push --no-verify`. Client-side only — it does **not** guard GitHub web-UI commits or the Pages deploy.

### Core Modules (all in `driller/app.js`)
- **Deck Engine** — Fisher-Yates shuffle, deal with burn cards, no duplicates. Hero hole cards dealt from preflop raising ranges (embedded per spot from PreflopTrainer data)
- **Game State Machine** — street progression (flop→turn→river→showdown), pot/stack tracking, action log
- **Preflop Spot Definitions** — 7 preflop configs with fixed pot sizes, positions, narratives, and raising ranges
- **Opponent Logic** — position-aware: when H is IP, V checks then calls (but if H checked back previous street, V mixes check/bet ⅓ pot/bet ⅔ pot at 33% each); when H is OOP and checks, V checks/bets ⅓ pot/bets ⅔ pot (equal 33% weight); when H is OOP and bets, V always calls.
- **Postflop Bet Sizing** — Villain postflop bets round to $5 increments regardless of stakes (`POSTFLOP_BET_INCREMENT`), with a max(1 BB, $5) floor. Hero sizing is free-form (any $ amount ≥ 1 BB).
- **Config UI** — stack depth, spot type, position, stakes with mutual exclusion rules. Desktop: persistent left sidebar (330px, sticky). Mobile: two-mode system — **Setup mode** (full-screen config with "Start Drilling" button) and **Play mode** (full-screen table with compact header showing config summary + gear icon to return to Setup)
- **Table UI** — 8-max stadium-shaped felt (responsive: vertical on mobile, horizontal on desktop) with rail-aligned seat positioning (desktop tuned so the rail crosses near each seat midline while staying in viewport), hero hand below table, white glow active-turn indicators, status-colored seat borders
- **Control Bar** — "New Hand" button lives in sidebar on desktop (below config panel), in control bar on mobile play mode; also hosts the `◀`/`▶` history-navigation buttons (see History Navigation)
- **History Navigation** — step backward/forward through the current hand to review prior decisions, with branch-and-replay. One snapshot is recorded per reviewable visual state (flop dealt, each villain action, each hero action, each new street card, hand end) via `structuredClone` of the `SNAPSHOT_FIELDS` game state into `game.history[]` (`game.historyIndex` points at the live state). `restoreSnapshot(idx)` silently re-renders a prior state (no animation; snapshots store `renderedBoardCount = board.length` so card-deal animations never replay, even after an all-in runout). Each snapshot carries a `heroToAct` flag — action buttons only appear on restore for snapshots where hero genuinely has a live decision (flop/turn/river dealt when hero acts first, or facing a villain bet/raise/all-in); all other steps (villain called, street advancing, hero already acted, hand end) are review-only with no buttons. This also prevents re-acting on a state where hero's action was already applied (no double-betting). Acting while rewound **branches**: `handleUserAction` truncates `game.history` to the current index and reshuffles the remaining deck for a fresh runout, then proceeds through the normal animated flow. A module-level `navLocked` flag disables both buttons while any action/animation sequence is in flight (`promptUserAction` and `endHand` unlock; action handlers lock). `New Hand` reseeds an empty history; `rerollStreet` clears and reseeds history at the new street. `rerollStreet` (the "New Flop/Turn/River" button) restores pot/stacks to the start of the **current** street (captured as `streetStartPot`/`streetStartUserStack`/`streetStartOppStack` at the top of `startStreetAction`, and included in `SNAPSHOT_FIELDS`) so re-dealing a card preserves prior streets' betting.
- **Shot Clock** — optional per-decision countdown (`M:SS`) shown in a dark pill at the top of the felt above the community cards. Configured in the sidebar (`Off`/`On` toggle + seconds input, range 5–300, default 30, default off). Persists across sessions in `localStorage` (`driller_shotclock_v1`). Resets on every hero decision (`promptUserAction`), stops on hero action / hand end / new hand / reroll street / history rewind (`restoreSnapshot`). At 0 it stops and turns red — never blocks input or auto-folds (reference only).
- **Preflop Animation Sequencer** — async step-by-step preflop replay: posts blinds, walks each PREFLOP_STEPS entry with single-phase sequential actions (active ring + action text together), folds seats with card-slide-away, shows bet pills, then collects into pot pill before dealing flop; seats update border colors based on action status (raised/called/posted)
- **Chip Pills** — bet/raise/call amounts shown as white capsule pills at each seat position; collected into center orange pot pill on street completion; used in both preflop animation and postflop play
- **Seat Layering** — bet pills render above seat cards to preserve readability during animations; desktop layering order is explicit: table < seat cards < seat circle/border < position/stack text < active ring < HERO label
- **Animations** — 0.25s easeInOut seat status transitions, 0.15s active position highlight, 0.4s card deal (scale+fade), fold card slide-away, action button fade in/out
- **Session Log** — in-memory hand history accessible via History drawer, clears on refresh. Hand completion shows inline banner on table (no separate summary screen)

### Preflop Spots
| Spot | Position | Pot (bb) | User Invested | Description |
|------|----------|----------|---------------|-------------|
| Limp | IP only  | 15.5     | 7             | Opp limps MP, user raises to 7bb |
| SRP  | IP       | 10.5     | 5             | User opens 5bb MP, BB calls |
| SRP  | OOP      | 11.5     | 5             | User opens 5bb CO, BTN calls |
| 3BP  | IP       | 33.5     | 16            | Opp opens 4bb CO, user 3b 16bb BTN |
| 3BP  | OOP      | 41       | 20            | Opp opens 4bb BTN, user 3b 20bb SB |
| 4BP  | IP       | 89       | 44            | User opens 5bb BTN, opp 3b 20bb SB, user 4b 44bb |
| 4BP  | OOP      | 101.5    | 50            | User opens 5bb CO, opp 3b 20bb BTN, user 4b 50bb |

### Config Constraints
- 4BP disabled when 100bb stack selected (and vice versa)
- Limp locks position to IP
- Default: IP, SRP, 200bb, $2/$5

## Known Issues
_(none known — Dashboard issues now tracked in the `marcdt11/dashboard` repo)_
