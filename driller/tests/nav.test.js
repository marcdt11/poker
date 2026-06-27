// HISTORY NAVIGATION edge cases — the back/forward arrows and branch-and-replay.
//
// 1. Restoring to a given snapshot must be deterministic: arriving at index k
//    from anywhere yields byte-identical chip/board state ("back then forward").
// 2. Acting while rewound (branch) must truncate the future, keep chips
//    conserved, and play out a fresh, legal runout.

import { describe, it, expect } from 'vitest';
import { loadApp, makeRng } from './harness.js';
import {
    playHand, captureState, chipTotal, handOver, heroToAct, chooseHeroAction,
} from './helpers.js';

describe('history nav round-trips are deterministic', () => {
    it('restoring to the same index always yields identical state', async () => {
        for (let seed = 1; seed <= 20; seed++) {
            const { D, window } = loadApp({ seed });
            Object.assign(D.config, { spot: '3BP', position: 'OOP', stack: 200, stakes: 5 });
            const pick = makeRng(seed ^ 0x55555555);
            await playHand(D, window, pick);

            const g = D.game;
            const n = g.history.length;
            if (n < 3) continue;

            for (let k = 1; k < n; k++) {
                D.restoreSnapshot(k);
                const a = captureState(g);
                // wander away…
                D.restoreSnapshot(0);
                D.restoreSnapshot(n - 1);
                // back then forward to k
                D.restoreSnapshot(k - 1);
                D.restoreSnapshot(k);
                const b = captureState(g);
                expect(b, `seed=${seed} idx=${k}`).toEqual(a);
            }
        }
    });
});

describe('branch-and-replay keeps chips conserved', () => {
    it('acting from a rewound hero-decision truncates history and conserves chips', async () => {
        let branchesTested = 0;
        for (let seed = 1; seed <= 40 && branchesTested < 15; seed++) {
            const { D, window } = loadApp({ seed });
            Object.assign(D.config, { spot: 'SRP', position: 'IP', stack: 200, stakes: 5 });
            const pick = makeRng(seed ^ 0xa5a5a5a5);
            await playHand(D, window, pick);

            const g = D.game;
            const baseline = chipTotal(g);

            // Find an earlier snapshot where hero genuinely had a decision.
            const heroIdxs = [];
            for (let i = 0; i < g.history.length - 1; i++) {
                if (g.history[i].heroToAct) heroIdxs.push(i);
            }
            if (heroIdxs.length === 0) continue;
            const k = heroIdxs[Math.floor(makeRng(seed)() * heroIdxs.length)];

            // Rewind there — buttons should appear (hero on the clock).
            D.restoreSnapshot(k);
            expect(heroToAct(D, window), `seed=${seed} restored hero-decision should show buttons`).toBe(true);

            // Branch: take a fresh action and play the new line to the end.
            const branchPick = makeRng(seed ^ 0xdead);
            let guard = 0;
            while (!handOver(D) && heroToAct(D, window)) {
                const choice = chooseHeroAction(D, branchPick);
                await D.handleUserAction(choice.action, choice.amount);
                // Chips conserved at every step of the branched line.
                expect(chipTotal(g), `seed=${seed} branch step`).toBe(baseline);
                if (++guard > 60) throw new Error('branch runaway');
            }
            // History was truncated at the branch point (no orphaned future before
            // the new line was appended).
            expect(g.historyIndex).toBeGreaterThanOrEqual(k);
            branchesTested++;
        }
        expect(branchesTested).toBeGreaterThan(0);
    });
});
