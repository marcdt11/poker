# Poker Tools — Project Overview

## What It Is
A collection of web-based poker tools hosted at `poker.marctorrence.com`. Currently two apps:
1. **Dashboard** — Analytics dashboard that pulls session data from a Google Sheet and displays stats, charts, and filterable session history.
2. **RTP Driller** — Scenario drilling tool for NLHE study groups. Automates card dealing and opponent actions so players can focus on articulating their thought process street-by-street.

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
├── CNAME                  # Custom domain config
├── index.html             # Landing page → links to /dashboard/ and /driller/
├── dashboard/
│   └── index.html         # Analytics dashboard
└── driller/
    └── index.html         # RTP Driller app
```

## Deployment
- GitHub Pages from `main` branch, root `/` path
- Repo: `marcdt11/poker`
- Custom domain: `poker.marctorrence.com`
- No CI/CD — push to main auto-deploys

---

## Dashboard — Technical Details

### Data Source
- Published Google Sheet CSV fetched client-side
- CORS proxy fallback chain (allorigins → corsproxy.io → api.codetabs.com) for reliable cross-origin fetching
- Cache-busting query param appended to each request

### Authentication
- Simple password gate stored in `sessionStorage` (password hardcoded in source — not secure, just a casual gate)

### Features
- **KPI Cards** — Total profit, hourly rate, session count, win rate, avg session hours, best/worst session
- **Cumulative Profit Chart** — Chart.js line chart with toggle between cumulative profit and hourly rate views
- **Filters** — Multiselect dropdowns for location, stakes, game type + date range inputs. Dropdowns show only options available given other active filters. Select all/none controls.
- **Session Table** — Paginated (25 rows), sortable, showing date, location, game, stakes, hours, buy-in, cash-out, profit
- **Responsive** — Mobile-friendly layout

### Design System
- Dark GitHub-style theme (`--bg-primary: #0d1117`)
- Fonts: Outfit (UI) + JetBrains Mono (numbers)
- Green/red profit coloring

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
- Mobile optimizations: `100dvh` viewport with `env(safe-area-inset-bottom)` for iOS Safari, 58px seats with 12px labels, balanced rank/suit font sizing, numeric keypad bet input (`inputmode="numeric"`), zoom prevention via `maximum-scale=1.0`, cards scaled to seat height, facedown cards tucked behind circles, folded cards hidden completely
- Fonts: Outfit (UI) + JetBrains Mono (numbers/data)
- Loaded via Google Fonts CDN

### Core Modules (all in `driller/index.html`)
- **Deck Engine** — Fisher-Yates shuffle, deal with burn cards, no duplicates. Hero hole cards dealt from preflop raising ranges (embedded per spot from PreflopTrainer data)
- **Game State Machine** — street progression (flop→turn→river→showdown), pot/stack tracking, action log
- **Preflop Spot Definitions** — 7 preflop configs with fixed pot sizes, positions, narratives, and raising ranges
- **Opponent Logic** — position-aware: when H is IP, V checks then calls (but if H checked back previous street, V mixes check/bet ⅓ pot/bet ⅔ pot at 33% each); when H is OOP and checks, V checks/bets ⅓ pot/bets ⅔ pot (equal 33% weight); when H is OOP and bets, V always calls
- **Config UI** — stack depth, spot type, position, stakes with mutual exclusion rules. Desktop: persistent left sidebar (330px, sticky). Mobile: two-mode system — **Setup mode** (full-screen config with "Start Drilling" button) and **Play mode** (full-screen table with compact header showing config summary + gear icon to return to Setup)
- **Table UI** — 8-max stadium-shaped felt (responsive: vertical on mobile, horizontal on desktop) with rail-aligned seat positioning (desktop tuned so the rail crosses near each seat midline while staying in viewport), hero hand below table, white glow active-turn indicators, status-colored seat borders
- **Control Bar** — "New Hand" button lives in sidebar on desktop (below config panel), in control bar on mobile play mode; future home for street navigation controls
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
| 4BP  | OOP      | 101      | 50            | User opens 5bb CO, opp 3b 20bb BTN, user 4b 50bb |

### Config Constraints
- 4BP disabled when 100bb stack selected (and vice versa)
- Limp locks position to IP
- Default: IP, SRP, 200bb, $2/$5

## Known Issues
- **Driller**: Pot rounding — 10.5bb × $3 = $31.50 rounds to $32 (only affects SRP initial pot from 0.5bb dead SB)
- **Dashboard**: Password hardcoded in source (not a real security measure)
- **Dashboard**: Relies on third-party CORS proxies which may go down; fallback chain mitigates but doesn't eliminate risk
