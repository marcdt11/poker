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
- [x] Game state machine (street progression, pot/stack tracking)
- [x] 7 preflop spot definitions with correct pot math
- [x] Config screen with mutual exclusion (4BP/100bb, Limp/IP lock)
- [x] Opponent AI (never folds, weighted passive actions, 1/2 pot sizing)
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
- [x] Animations: preflop sidebar fade-in, board card dealing, opponent action pulse
- [x] Preflop animation sequencer: step-by-step replay of blinds, folds, bets before flop is dealt
- [x] Chip pill system: bet/raise/call amounts shown as pills at seats, collected into center pot pill on street end
- [x] Facedown card indicators at active seats, slide-away on fold
- [x] Active-turn glow pulse animation for action indicator
- [x] Visual overhaul to match PreflopTrainer: pure black theme, green felt with brown rail, status-colored seat borders, responsive stadium table (vertical mobile/horizontal desktop), orange pot pills, white bet pills, PreflopTrainer-style action buttons (red/green/gray), faster animation timings (~300ms actions), white glow active seat indicator, navy card backs, smaller cards matching iOS app sizes

### Features (Future)
- [ ] Configurable opponent AI frequencies (sliders for check/call/raise weights)
- [ ] Configurable preflop sizings
- [ ] Multiway pots (3+ players)
- [ ] Persistent session history (localStorage)
- [ ] Hand export (copy to clipboard as text)
- [ ] Voice/text notes per street for thought process recording
- [ ] Quick-sizing buttons (1/3 pot, 1/2 pot, 2/3 pot, pot, overbet)

### Bugs
- [ ] Sidebar post-flop section doesn't group actions by street (flop/turn/river all appear under one heading)
- [ ] SRP initial pot displays $32 instead of $31.50 due to rounding (0.5bb dead SB × $3)

### Tech Debt
- Single-file architecture will need splitting if app grows significantly
