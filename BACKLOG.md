# Poker Tools — Backlog

---

## Dashboard

### Completed
- [x] Google Sheets CSV data integration with CORS proxy fallback chain
- [x] Password-gated access (sessionStorage)
- [x] KPI stat cards (profit, hourly rate, sessions, win rate, avg hours, best/worst)
- [x] Cumulative profit chart with hourly rate toggle (Chart.js)
- [x] Multiselect filter dropdowns (location, stakes, game type) with select all/none
- [x] Filters show only options available given other active filters
- [x] Date range filter
- [x] Paginated session table (25 rows)
- [x] Responsive dark theme layout
- [x] Fallback CORS proxies for reliable data fetching

### Features (Future)
_(none planned)_

### Bugs
_(none known)_

### Tech Debt
- Password hardcoded in source — fine for now, but not real auth
- CORS proxy dependency — if all three proxies go down, dashboard breaks

---

## Driller

### Completed
- [x] Core deck engine with shuffle and burn cards
- [x] Range-based hero dealing (preflop raising ranges from PreflopTrainer, per spot)
- [x] Game state machine (street progression, pot/stack tracking)
- [x] 7 preflop spot definitions with correct pot math
- [x] Config screen with mutual exclusion (4BP/100bb, Limp/IP lock)
- [x] Position-aware opponent logic (IP: V checks/calls; OOP: V checks/bets 1/3 or 2/3 pot when checked to, calls when bet into)
- [x] User action buttons (check/bet/call/fold/raise + freeform sizing)
- [x] Card rendering with suit colors
- [x] Hand summary screen with full action log
- [x] Session log drawer (in-memory)
- [x] Responsive layout (mobile + desktop)
- [x] Landing page with navigation to dashboard + driller
- [x] Dark theme matching dashboard design system
- [x] Stakes selector ($1/$3, $2/$5, $5/$10) with dollar-based UI
- [x] 8-max poker table UI with oval felt and positioned seats
- [x] Simplified seat displays with active-turn glow indicators
- [x] Hero hole cards displayed below table
- [x] Animations: preflop sequencer, board card dealing, opponent action pulse
- [x] Preflop animation sequencer: step-by-step replay of blinds, folds, bets before flop is dealt
- [x] Chip pill system: bet/raise/call amounts shown as pills at seats, collected into center pot pill on street end
- [x] Facedown card indicators at active seats, slide-away on fold
- [x] Active-turn glow pulse animation for action indicator
- [x] Visual overhaul to match PreflopTrainer: pure black theme, green felt with brown rail, status-colored seat borders, responsive stadium table (vertical mobile/horizontal desktop), orange pot pills, white bet pills, PreflopTrainer-style action buttons (red/green/gray), faster animation timings (~300ms actions), white glow active seat indicator, navy card backs, smaller cards matching iOS app sizes
- [x] Mobile UX improvements: larger player circles (62px), balanced card rank/suit sizing, Safari dvh viewport fix with safe-area padding, numeric keypad for bet input with zoom prevention
- [x] Mobile card/fold polish: scaled hero + community cards to match seat height, facedown cards tucked behind seat circles, folded cards disappear completely (no dotted outlines)
- [x] Combined setup + drill screen: config sidebar on desktop, collapsible strip on mobile, persistent "New Hand" button, no auto-summary (history via drawer only)
- [x] Preflop/postflop action flow polish: each action now displays in-seat as a single sequential step (no separate pre-action highlight jump)
- [x] Table/seat UX polish: side-seat hole cards now anchor inward toward table center, and stadium seat placement uses inset geometry to avoid off-screen circles/cards
- [x] Mobile table layout tune: switched to tighter vertical stadium ratio (0.58:1) and slightly smaller play-mode seats (58px) for better fit with controls
- [x] Desktop rail alignment polish: seat inset tuned so player circles sit on the felt rail rather than floating inward
- [x] Layering/spacing polish: hero bet pills render above cards, and opponent card anchors shifted so cards no longer cover player circles
- [x] Reference emulation pass: desktop rail now crosses near seat centers and cards anchor to each seat's outer side (away from table interior)
- [x] Opponent card-back polish: desktop facedown cards are tucked behind seat/ring and overlap slightly to match reference compact stacking
- [x] Layering correction pass: hero + opponent cards now render below seat and active ring overlays; opponent hidden card overlap increased to tighter stack
- [x] Layer order hardening: desktop seat layers now follow explicit stack (table < cards < seat < text < active ring < HERO label)
- [x] Mobile reference-emulation pass: rail-centered seats, centered side-seat text, and compact side hidden-card markers replacing bunny-ear styling
- [x] Pot math + bet sizing audit: corrected 4BP_OOP pot (101 → 101.5bb), fixed SB seat-bet pill overcount on 'raises to' actions, aligned session-log pot rounding with in-game pot pill, villain postflop bets now round to $5 increments regardless of stakes (hero sizing remains free-form)

### Features (Future)
- [ ] Street navigation controls (go back a street, re-deal turn/river cards)
- [ ] Configurable preflop sizings
- [ ] Multiway pots (3+ players)
- [ ] Persistent session history (localStorage)
- [ ] Hand export (copy to clipboard as text)
- [ ] Voice/text notes per street for thought process recording
- [ ] Quick-sizing buttons (1/3 pot, 1/2 pot, 2/3 pot, pot, overbet)
- [ ] Shot clock — optional per-action countdown timer (e.g. 15s, 30s, 60s) to practice time pressure; visual only, does not auto-fold
- [ ] Villain player types — assign profiles (e.g. tight/passive, loose/aggressive, calling station) that change opponent betting/calling behavior

### Bugs
_(none known)_

### Tech Debt
- Single-file architecture will need splitting if app grows significantly
