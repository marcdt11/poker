// CHIP-CONSERVATION FUZZER
//
// Plays many randomized hands across every spot / position / stack / stakes
// combo and asserts the master invariant after EVERY transition: the total
// chips in play (pot + both stacks) never changes once the flop is reached.
// Any drift is a pot/stack accounting bug, reproducible from the printed seed.

import { describe, it, expect } from 'vitest';
import { loadApp, makeRng } from './harness.js';
import {
    playHand, chipTotal, SPOT_TYPES, POSITIONS, STACKS, STAKES,
} from './helpers.js';

// LIMP is IP-only (position locks to IP in the app), so skip LIMP+OOP.
function combos() {
    const out = [];
    for (const spot of SPOT_TYPES) {
        for (const position of POSITIONS) {
            if (spot === 'LIMP' && position === 'OOP') continue;
            // 4BP is disabled at 100bb (config constraint); skip that combo.
            for (const stack of STACKS) {
                if (spot === '4BP' && stack === 100) continue;
                for (const stakes of STAKES) {
                    out.push({ spot, position, stack, stakes });
                }
            }
        }
    }
    return out;
}

describe('chip conservation across randomized hands', () => {
    const HANDS_PER_COMBO = 25;

    for (const c of combos()) {
        const name = `${c.spot} ${c.position} ${c.stack}bb ${c.stakes}`;
        it(name, async () => {
            for (let h = 0; h < HANDS_PER_COMBO; h++) {
                const seed = hashSeed(name, h);
                const { D, window } = loadApp({ seed });
                Object.assign(D.config, c);
                const pick = makeRng(seed ^ 0x9e3779b9);

                let baseline = null;
                const failures = [];
                await playHand(D, window, pick, (g, label) => {
                    const total = chipTotal(g);
                    if (baseline === null) {
                        baseline = total;
                    } else if (Math.abs(total - baseline) > 0.001) {
                        failures.push(`${label}: total=${total} expected=${baseline} ` +
                            `(pot=${g.pot} user=${g.userStack} opp=${g.oppStack})`);
                    }
                });

                expect(failures, `seed=${seed} ${name}\n${failures.join('\n')}`).toEqual([]);
            }
        });
    }
});

// Stable per-(combo,hand) seed so failures reproduce exactly.
function hashSeed(name, h) {
    let x = 2166136261 >>> 0;
    const s = `${name}#${h}`;
    for (let i = 0; i < s.length; i++) {
        x ^= s.charCodeAt(i);
        x = Math.imul(x, 16777619);
    }
    return (x >>> 0) || 1;
}
