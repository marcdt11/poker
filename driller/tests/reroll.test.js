// REROLL ("New Flop/Turn/River") edge cases.
//
// Rerolling a street must restore pot + both stacks to exactly what they were at
// the START of that street — preserving all prior streets' betting (and undoing
// any villain bet already made on the current street) — and must never create or
// destroy chips.

import { describe, it, expect } from 'vitest';
import { loadApp } from './harness.js';
import { advanceToStreet, chipTotal, round2, handOver } from './helpers.js';

const CFG = { spot: '3BP', position: 'IP', stack: 200, stakes: 5 };

describe('rerollStreet restores street-start state', () => {
    for (const targetStreet of [0, 1, 2]) {
        const label = ['flop', 'turn', 'river'][targetStreet];
        it(`reroll on the ${label} resets to street start and conserves chips`, async () => {
            let exercised = 0;
            let sawFacingBet = 0;
            for (let seed = 1; seed <= 300 && exercised < 15; seed++) {
                const { D, window } = loadApp({ seed });
                Object.assign(D.config, CFG);
                await D.startHand();

                const reached = await advanceToStreet(D, window, targetStreet);
                if (!reached) continue;
                const g = D.game;
                if (g.streetIndex !== targetStreet) continue; // overshot via all-in

                const baseTotal = chipTotal(g);
                // streetStartPot/Stacks = state when this street began. Reroll must
                // restore exactly these (preserving prior streets' betting).
                const ssPot = round2(g.streetStartPot);
                const ssUser = round2(g.streetStartUserStack);
                const ssOpp = round2(g.streetStartOppStack);
                const boardBefore = [...g.board];
                if (g.pendingAction) sawFacingBet++; // villain already bet this street

                // Reroll. The pot/stack RESET is synchronous (before the new street's
                // action runs), so assert before awaiting the settle.
                const p = D.rerollStreet();
                expect(round2(g.pot), `seed=${seed} ${label} pot`).toBe(ssPot);
                expect(round2(g.userStack), `seed=${seed} ${label} user`).toBe(ssUser);
                expect(round2(g.oppStack), `seed=${seed} ${label} opp`).toBe(ssOpp);
                expect(chipTotal(g), `seed=${seed} ${label} conservation`).toBe(baseTotal);

                // Prior streets' board cards preserved; only the rerolled street's
                // card(s) get replaced.
                const preserved = targetStreet === 0 ? 0 : targetStreet + 2;
                expect(g.board.slice(0, preserved)).toEqual(boardBefore.slice(0, preserved));
                expect(g.board.length).toBe(targetStreet === 0 ? 3 : targetStreet + 3);

                await p;
                exercised++;
            }
            expect(exercised, 'no seeds reached this street').toBeGreaterThan(0);
            // Sanity: on the turn, hero (IP) can face a villain bet, so across
            // seeds we should hit the "undo a bet already made this street" path.
            // (On the flop with hero IP, villain always checks first, so there is
            // no current-street bet to undo there.)
            if (targetStreet === 1) {
                expect(sawFacingBet, 'never exercised the undo-current-bet path').toBeGreaterThan(0);
            }
        });
    }
});

describe('repeated rerolls do not drift chips', () => {
    it('rerolling the flop many times keeps pot/stacks pinned to street start', async () => {
        const { D } = loadApp({ seed: 7 });
        Object.assign(D.config, { spot: 'SRP', position: 'OOP', stack: 200, stakes: 5 });
        await D.startHand();
        const g = D.game;
        const ssPot = round2(g.streetStartPot);
        const ssUser = round2(g.streetStartUserStack);
        const ssOpp = round2(g.streetStartOppStack);
        const total = chipTotal(g);
        for (let i = 0; i < 12; i++) {
            await D.rerollStreet();
            expect(round2(g.pot)).toBe(ssPot);
            expect(round2(g.userStack)).toBe(ssUser);
            expect(round2(g.oppStack)).toBe(ssOpp);
            expect(chipTotal(g)).toBe(total);
        }
    });
});
