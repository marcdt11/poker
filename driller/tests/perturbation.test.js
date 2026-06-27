// PERTURBATION FUZZER — the closest model of real usage.
//
// Plays randomized hands, but at each hero decision randomly interleaves the
// exact actions that have produced pot bugs in practice: re-dealing the current
// street ("New Flop/Turn/River") and rewinding to an earlier decision (the
// back-arrow) before continuing down a fresh branch. The total chips in play
// must stay pinned to the flop-baseline through ALL of it.

import { describe, it, expect } from 'vitest';
import { loadApp, makeRng } from './harness.js';
import {
    chipTotal, handOver, heroToAct, chooseHeroAction,
} from './helpers.js';

const COMBOS = [
    { spot: 'SRP', position: 'IP', stack: 200, stakes: 5 },
    { spot: 'SRP', position: 'OOP', stack: 200, stakes: 5 },
    { spot: '3BP', position: 'IP', stack: 100, stakes: 3 },
    { spot: '3BP', position: 'OOP', stack: 200, stakes: 10 },
    { spot: '4BP', position: 'IP', stack: 200, stakes: 5 },
    { spot: 'LIMP', position: 'IP', stack: 40, stakes: 5 },
];

describe('chip conservation under reroll + rewind perturbations', () => {
    for (const c of COMBOS) {
        const name = `${c.spot} ${c.position} ${c.stack}bb ${c.stakes}`;
        it(name, async () => {
            for (let h = 0; h < 30; h++) {
                const seed = (h + 1) * 2654435761 >>> 0;
                const { D, window } = loadApp({ seed });
                Object.assign(D.config, c);
                const pick = makeRng(seed ^ 0x1234);
                await D.startHand();

                const baseline = chipTotal(D.game);
                const fail = (label) => {
                    const g = D.game;
                    expect(chipTotal(g), `${name} seed=${seed} ${label} ` +
                        `(pot=${g.pot} user=${g.userStack} opp=${g.oppStack})`).toBe(baseline);
                };

                let guard = 0;
                while (!handOver(D) && heroToAct(D, window)) {
                    fail('pre-op');
                    const r = pick();
                    const g = D.game;

                    if (r < 0.18 && g.board.length > 0) {
                        // Re-deal the current street.
                        await D.rerollStreet();
                        fail('after-reroll');
                    } else if (r < 0.36) {
                        // Rewind to an earlier hero-decision snapshot, then continue
                        // (acting next iteration branches the line).
                        const idxs = [];
                        for (let i = 0; i < g.historyIndex; i++) {
                            if (g.history[i] && g.history[i].heroToAct) idxs.push(i);
                        }
                        if (idxs.length) {
                            const k = idxs[Math.floor(pick() * idxs.length)];
                            D.restoreSnapshot(k);
                            fail('after-rewind');
                        } else {
                            const choice = chooseHeroAction(D, pick);
                            await D.handleUserAction(choice.action, choice.amount);
                            fail('after-act');
                        }
                    } else {
                        const choice = chooseHeroAction(D, pick);
                        await D.handleUserAction(choice.action, choice.amount);
                        fail('after-act');
                    }

                    if (++guard > 250) throw new Error(`${name} perturbation loop runaway`);
                }
                fail('hand-over');
            }
        });
    }
});
