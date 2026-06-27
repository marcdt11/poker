// Shared driver utilities for headless hand simulation.

export const SPOT_TYPES = ['LIMP', 'SRP', '3BP', '4BP'];
export const POSITIONS = ['IP', 'OOP'];
export const STACKS = [40, 100, 200];
export const STAKES = [3, 5, 10];

// Total chips in play. The driller adds bets into game.pot immediately (not on
// street-collect), so this sum must stay constant from the flop through the
// river — across every action, reroll, and history nav. This is the master
// invariant the fuzzer checks.
export function chipTotal(g) {
    return round2(g.pot + g.userStack + g.oppStack);
}

export function round2(n) {
    return Math.round(n * 100) / 100;
}

export function handOver(D) {
    const g = D.game;
    return !g || g.userFolded || g.streetIndex >= 3;
}

// Hero is on the clock iff the action buttons are rendered (what the user sees).
export function heroToAct(D, window) {
    const el = window.document.getElementById('actionButtons');
    return !!el && el.children.length > 0;
}

// Pick a legal hero action given the current pending state. `pick` is a seeded
// rng in [0,1). Biased toward call/check so hands progress to later streets,
// where most pot bugs live.
export function chooseHeroAction(D, pick) {
    const g = D.game;
    const facing = g.pendingAction; // {type, amount} when facing a bet/raise/allin, else null
    if (facing) {
        const r = pick();
        if (r < 0.12) return { action: 'fold' };
        if (r < 0.80) return { action: 'call' };
        // raise: bump above the facing amount, capped at stack
        const raiseTo = Math.min(
            Math.max(D.roundToChip(facing.amount * 2), facing.amount + 1),
            g.userStack
        );
        return { action: 'raise', amount: raiseTo };
    }
    // No bet to face: check or bet
    const r = pick();
    if (r < 0.55) return { action: 'check' };
    const frac = r < 0.78 ? 1 / 3 : 2 / 3;
    const bet = Math.min(Math.max(D.roundToChip(g.pot * frac), 1), g.userStack);
    return { action: 'bet', amount: bet };
}

// Play passively (check, or call when facing a bet) until hero is on the clock
// at or beyond `targetStreetIndex` (0=flop,1=turn,2=river). Returns true if that
// state was reached, false if the hand ended first (folded/all-in/showdown).
export async function advanceToStreet(D, window, targetStreetIndex) {
    let guard = 0;
    while (!handOver(D) && heroToAct(D, window)) {
        if (D.game.streetIndex >= targetStreetIndex) return true;
        const facing = D.game.pendingAction;
        await D.handleUserAction(facing ? 'call' : 'check');
        if (++guard > 30) throw new Error('advanceToStreet runaway');
    }
    return false;
}

// Snapshot of the chip/board state used for nav round-trip comparisons.
export function captureState(g) {
    return {
        pot: round2(g.pot),
        displayPot: round2(g.displayPot),
        userStack: round2(g.userStack),
        oppStack: round2(g.oppStack),
        streetIndex: g.streetIndex,
        board: [...g.board],
        userFolded: g.userFolded,
        allIn: g.allIn,
    };
}

// Drive one full hand to completion, invoking `onStep(g, label)` after the
// flop is first reached and after every subsequent transition so callers can
// assert invariants. Returns the number of hero decisions made.
export async function playHand(D, window, pick, onStep = () => {}) {
    await D.startHand();
    let decisions = 0;
    let guard = 0;
    onStep(D.game, 'flop-reached');
    while (!handOver(D) && heroToAct(D, window)) {
        const choice = chooseHeroAction(D, pick);
        await D.handleUserAction(choice.action, choice.amount);
        decisions++;
        onStep(D.game, `after-hero-${choice.action}`);
        if (++guard > 60) throw new Error('runaway hand loop — state machine never terminated');
    }
    onStep(D.game, 'hand-over');
    return decisions;
}
