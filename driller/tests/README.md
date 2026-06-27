# Driller Tests

Headless regression tests for the RTP Driller game logic. They catch the class
of bug we keep hitting: **pot / stack accounting drifting** when you use the
back/forward arrows or re-deal a flop/turn/river.

## How to run

From the repo root:

```bash
npm install   # first time only — installs dev-only test tools
npm test      # run the whole suite
```

`npm run test:watch` re-runs automatically as you edit.

> The test tools (`vitest`, `happy-dom`) are **dev-only**. They are not part of
> the deployed site — GitHub Pages only serves the static `index.html` + `app.js`.

## What it does

The tests load the **real** `driller/index.html` + `driller/app.js` in a fake
browser, then play thousands of randomized hands with animations skipped and the
shuffle seeded (so every failure is reproducible from its printed `seed=`).

The core idea is one **invariant**: the total chips in play
(`pot + your stack + opponent stack`) can never change once the flop is dealt.
If a reroll or a rewind silently adds or drops chips, that sum drifts and the
test fails — pointing straight at the accounting bug.

| File | What it checks |
|------|----------------|
| `smoke.test.js` | App loads, bootstraps, and a hand starts cleanly. |
| `fuzz.test.js` | Chip conservation across every spot × position × stack × stakes, straight-played hands. |
| `reroll.test.js` | "New Flop/Turn/River" restores the street's starting pot/stacks and preserves prior betting. |
| `nav.test.js` | Back/forward arrows are deterministic; branching after a rewind conserves chips. |
| `perturbation.test.js` | Randomly rerolls **and** rewinds mid-hand (closest to real usage) while checking conservation after every click. |

## Adding tests for new features

When you ship something that touches pot, stacks, betting rounds, or history,
add a case to the matching file. The shared driver lives in `helpers.js`
(`playHand`, `advanceToStreet`, `chipTotal`, …) and the headless loader in
`harness.js` (`loadApp({ seed })` returns the `D` test handle exposing the game
state and core functions via `window.__driller`).
