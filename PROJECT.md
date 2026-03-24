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
- Seat circles: `#333340` background, 44px diameter (scales up on desktop), status-colored borders (yellow=hero, orange=raised, blue=called, white 50%=posted, white 30%=default/folded)
- Active seat: white 3px border + white glow shadow (no pulse animation)
- Cards: hero 48×68px, board 36×50px, card backs navy `#1a2659`
- Action buttons: red (raise/bet), green (call/check), gray (fold), 44px height, 10px radius
- Pot pill: orange capsule, bet pills: white background with black text
- Responsive table: horizontal stadium (2:1) on desktop, vertical stadium (0.7:1) on mobile
- Fonts: Outfit (UI) + JetBrains Mono (numbers/data)
- Loaded via Google Fonts CDN

### Core Modules (all in `driller/index.html`)
- **Deck Engine** — Fisher-Yates shuffle, deal with burn cards, no duplicates
- **Game State Machine** — street progression (flop→turn→river→showdown), pot/stack tracking, action log
- **Preflop Spot Definitions** — 7 preflop configs with fixed pot sizes, positions, and narratives
- **Opponent AI** — weighted random (never folds, ~70% check/call, ~30% bet/raise, fixed 1/2 pot sizing)
- **Config UI** — stack depth, spot type, position, stakes with mutual exclusion rules
- **Table UI** — 8-max stadium-shaped felt (responsive: vertical on mobile, horizontal on desktop) with positioned seats, hero hand below table, white glow active-turn indicators, status-colored seat borders
- **Preflop Animation Sequencer** — async step-by-step preflop replay: posts blinds (~150ms), walks each PREFLOP_STEPS entry with timed delays (~300ms/action), folds seats with card-slide-away, shows bet pills, then collects into pot pill before dealing flop; seats update border colors based on action status (raised/called/posted)
- **Chip Pills** — bet/raise/call amounts shown as white capsule pills at each seat position; collected into center orange pot pill on street completion; used in both preflop animation and postflop play
- **Animations** — 0.25s easeInOut seat status transitions, 0.15s active position highlight, 0.4s card deal (scale+fade), fold card slide-away, action button fade in/out
- **Session Log** — in-memory hand history, drawer UI, clears on refresh

### Preflop Spots
| Spot | Position | Pot (bb) | User Invested | Description |
|------|----------|----------|---------------|-------------|
| Limp | IP only  | 15.5     | 7             | Opp limps MP, user raises to 7bb |
| SRP  | IP/OOP   | 10.5     | 5             | User opens 5bb MP, BB calls |
| 3BP  | IP       | 33.5     | 16            | Opp opens 4bb CO, user 3b 16bb BTN |
| 3BP  | OOP      | 41       | 20            | Opp opens 4bb BTN, user 3b 20bb SB |
| 4BP  | IP       | 89       | 44            | User opens 5bb BTN, opp 3b 20bb SB, user 4b 44bb |
| 4BP  | OOP      | 101      | 50            | User opens 5bb CO, opp 3b 20bb BTN, user 4b 50bb |

### Config Constraints
- 4BP disabled when 100bb stack selected (and vice versa)
- Limp locks position to IP
- Default: IP, SRP, 200bb, $1/$3

## Known Issues
- **Driller**: Pot rounding — 10.5bb × $3 = $31.50 rounds to $32 (only affects SRP initial pot from 0.5bb dead SB)
- **Driller**: Sidebar post-flop section shows only current street title — actions from all streets appear without grouping by street
- **Dashboard**: Password hardcoded in source (not a real security measure)
- **Dashboard**: Relies on third-party CORS proxies which may go down; fallback chain mitigates but doesn't eliminate risk
