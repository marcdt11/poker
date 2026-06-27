// Phase 1 verification: the extracted app.js loads, bootstraps, and a hand can
// start without errors. If this passes, the cut-and-paste + seams didn't break
// the app's wiring.

import { describe, it, expect } from 'vitest';
import { loadApp } from './harness.js';

describe('app loads headless', () => {
    it('exposes the test handle and definitions', () => {
        const { D } = loadApp();
        expect(typeof D.startHand).toBe('function');
        expect(Object.keys(D.SPOTS)).toContain('SRP_IP');
        expect(D.STREETS).toEqual(['flop', 'turn', 'river']);
    });

    it('starts a hand and produces a live game state', async () => {
        const { D, window } = loadApp({ seed: 42 });
        // Configure a known spot, then start.
        D.config.spot = 'SRP';
        D.config.position = 'IP';
        D.config.stack = 200;
        D.config.stakes = 5;
        await D.startHand();
        const g = D.game;
        expect(g).toBeTruthy();
        expect(g.pot).toBeGreaterThan(0);
        expect(g.userStack).toBeGreaterThan(0);
        expect(g.oppStack).toBeGreaterThan(0);
        expect(Array.isArray(g.board)).toBe(true);
    });
});
