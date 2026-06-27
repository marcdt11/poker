    /* ===================================================================
       RTP DRILLER — Core Engine
       =================================================================== */

    // ===== TEST SEAMS =====
    // No-ops in the browser. The headless test harness flips TEST_MODE on
    // (to skip animation waits) and swaps _rng for a seeded generator so
    // villain actions / shuffles are deterministic. See driller/tests/.
    let TEST_MODE = false;
    let _rng = Math.random;
    function rng() { return _rng(); }

    // ===== CONSTANTS =====
    const SUITS = ['s', 'h', 'd', 'c'];
    const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
    const SUIT_SYMBOLS = { s: '♠', h: '♥', d: '♦', c: '♣' };
    const SUIT_COLORS = { s: 'black', h: 'red', d: 'red', c: 'black' };
    const STREETS = ['flop', 'turn', 'river'];

    // Opponent AI weights
    // Opponent logic is position-aware — see doOpponentAction()

    // Full table seat order (clockwise from BTN)
    const FULL_TABLE = ['BTN', 'SB', 'BB', 'UTG', 'UTG1', 'MP', 'HJ', 'CO'];

    // Preflop spot definitions
    const SPOTS = {
        'LIMP_IP': {
            pot: 15.5,
            narrative: 'Opponent in MP limps 1bb. You raise to 7bb, opponent calls.',
            userInvested: 7,
            oppInvested: 7,
            positions: { user: 'IP (Next to Act)', opp: 'MP (Limper)' },
            heroSeat: 'HJ',
            villainSeat: 'MP'
        },
        'SRP_IP': {
            pot: 10.5,
            narrative: 'You open to 5bb from MP. BB calls.',
            userInvested: 5,
            oppInvested: 5,
            positions: { user: 'MP (Opener)', opp: 'BB (Caller)' },
            heroSeat: 'MP',
            villainSeat: 'BB'
        },
        'SRP_OOP': {
            pot: 11.5,
            narrative: 'You open to 5bb from CO. BTN calls.',
            userInvested: 5,
            oppInvested: 5,
            positions: { user: 'CO (Opener)', opp: 'BTN (Caller)' },
            heroSeat: 'CO',
            villainSeat: 'BTN'
        },
        '3BP_IP': {
            pot: 33.5,
            narrative: 'Opponent opens 4bb from CO. You 3-bet to 16bb from BTN. Opponent calls.',
            userInvested: 16,
            oppInvested: 16,
            positions: { user: 'BTN (3-bettor)', opp: 'CO (Opener)' },
            heroSeat: 'BTN',
            villainSeat: 'CO'
        },
        '3BP_OOP': {
            pot: 41,
            narrative: 'Opponent opens 4bb from BTN. You 3-bet to 20bb from SB. Opponent calls.',
            userInvested: 20,
            oppInvested: 20,
            positions: { user: 'SB (3-bettor)', opp: 'BTN (Opener)' },
            heroSeat: 'SB',
            villainSeat: 'BTN'
        },
        '4BP_IP': {
            pot: 89,
            narrative: 'You open 5bb from BTN. Opponent 3-bets to 20bb from SB. You 4-bet to 44bb. Opponent calls.',
            userInvested: 44,
            oppInvested: 44,
            positions: { user: 'BTN (4-bettor)', opp: 'SB (3-bettor)' },
            heroSeat: 'BTN',
            villainSeat: 'SB'
        },
        '4BP_OOP': {
            pot: 101.5,
            narrative: 'You open 5bb from CO. Opponent 3-bets to 20bb from BTN. You 4-bet to 50bb. Opponent calls.',
            userInvested: 50,
            oppInvested: 50,
            positions: { user: 'CO (4-bettor)', opp: 'BTN (3-bettor)' },
            heroSeat: 'CO',
            villainSeat: 'BTN'
        }
    };

    // Stakes definitions: bigBlind amount, smallBlind amount, min bet increment
    const STAKES = {
        3:  { bb: 3, sb: 1, label: '$1/$3' },
        5:  { bb: 5, sb: 2, label: '$2/$5' },
        10: { bb: 10, sb: 5, label: '$5/$10' },
    };

    // All postflop bets are made in $5 increments regardless of stakes
    const POSTFLOP_BET_INCREMENT = 5;

    // Hero preflop ranges (hands containing "raise" action)
    const RANGES = {
        'SRP_IP': ['44','55','66','77','88','99','AA','AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s','AKo','KK','KQs','KJs','KTs','K9s','K8s','K7s','AQo','KQo','QQ','QJs','QTs','Q9s','Q8s','AJo','KJo','JJ','JTs','J9s','J8s','ATo','TT','T9s','T8s','98s','87s','76s','65s','54s'],
        'SRP_OOP': ['22','33','44','55','66','77','88','99','AA','AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s','AKo','KK','KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s','AQo','KQo','QQ','QJs','QTs','Q9s','Q8s','Q7s','AJo','KJo','QJo','JJ','JTs','J9s','J8s','J7s','ATo','KTo','QTo','JTo','TT','T9s','T8s','T7s','98s','97s','87s','76s','65s','54s'],
        'LIMP_IP': ['88','99','AA','AKs','AQs','AJs','ATs','A5s','AKo','KK','KQs','KJs','KTs','AQo','QQ','QJs','QTs','AJo','JJ','JTs','TT'],
        '3BP_IP': ['66','77','88','99','AA','AKs','AQs','AJs','ATs','A9s','A5s','A4s','AKo','KK','KQs','KJs','KTs','AQo','QQ','QJs','QTs','JJ','JTs','TT','T9s','76s','65s','54s'],
        '3BP_OOP': ['88','99','AA','AKs','AQs','AJs','ATs','A9s','A5s','A4s','AKo','KK','KQs','KJs','KTs','AQo','QQ','QJs','QTs','JJ','JTs','TT','T9s','65s','54s'],
        '4BP_IP': ['AA','AKs','A9s','A5s','AKo','KK','KTs','87s'],
        '4BP_OOP': ['AA','AKs','AQs','AJs','AKo','KK','KQs','AQo','QQ','QJs','JJ','TT'],
    };

    // Preflop action steps (per spot)
    const PREFLOP_STEPS = {
        'LIMP_IP': [
            { who: 'fold', seats: ['UTG', 'UTG1'], dimmed: true },
            { who: 'villain', seat: 'MP', action: 'limps', bb: 1 },
            { who: 'hero', seat: 'HJ', action: 'raises to', bb: 7 },
            { who: 'fold', seats: ['CO', 'BTN', 'SB', 'BB'], dimmed: true },
            { who: 'villain', seat: 'MP', action: 'calls', bb: 6 }
        ],
        'SRP_IP': [
            { who: 'fold', seats: ['UTG', 'UTG1'], dimmed: true },
            { who: 'hero', seat: 'MP', action: 'raises to', bb: 5 },
            { who: 'fold', seats: ['HJ', 'CO', 'BTN', 'SB'], dimmed: true },
            { who: 'villain', seat: 'BB', action: 'calls', bb: 4 }
        ],
        'SRP_OOP': [
            { who: 'fold', seats: ['UTG', 'UTG1', 'MP', 'HJ'], dimmed: true },
            { who: 'hero', seat: 'CO', action: 'raises to', bb: 5 },
            { who: 'villain', seat: 'BTN', action: 'calls', bb: 5 },
            { who: 'fold', seats: ['SB', 'BB'], dimmed: true }
        ],
        '3BP_IP': [
            { who: 'fold', seats: ['UTG', 'UTG1', 'MP', 'HJ'], dimmed: true },
            { who: 'villain', seat: 'CO', action: 'raises to', bb: 4 },
            { who: 'hero', seat: 'BTN', action: '3-bets to', bb: 16 },
            { who: 'fold', seats: ['SB', 'BB'], dimmed: true },
            { who: 'villain', seat: 'CO', action: 'calls', bb: 12 }
        ],
        '3BP_OOP': [
            { who: 'fold', seats: ['UTG', 'UTG1', 'MP', 'HJ', 'CO'], dimmed: true },
            { who: 'villain', seat: 'BTN', action: 'raises to', bb: 4 },
            { who: 'hero', seat: 'SB', action: '3-bets to', bb: 20 },
            { who: 'fold', seats: ['BB'], dimmed: true },
            { who: 'villain', seat: 'BTN', action: 'calls', bb: 16 }
        ],
        '4BP_IP': [
            { who: 'fold', seats: ['UTG', 'UTG1', 'MP', 'HJ', 'CO'], dimmed: true },
            { who: 'hero', seat: 'BTN', action: 'raises to', bb: 5 },
            { who: 'villain', seat: 'SB', action: '3-bets to', bb: 20 },
            { who: 'fold', seats: ['BB'], dimmed: true },
            { who: 'hero', seat: 'BTN', action: '4-bets to', bb: 44 },
            { who: 'villain', seat: 'SB', action: 'calls', bb: 24 }
        ],
        '4BP_OOP': [
            { who: 'fold', seats: ['UTG', 'UTG1', 'MP', 'HJ'], dimmed: true },
            { who: 'hero', seat: 'CO', action: 'raises to', bb: 5 },
            { who: 'villain', seat: 'BTN', action: '3-bets to', bb: 20 },
            { who: 'fold', seats: ['SB', 'BB'], dimmed: true },
            { who: 'hero', seat: 'CO', action: '4-bets to', bb: 50 },
            { who: 'villain', seat: 'BTN', action: 'calls', bb: 30 }
        ]
    };

    // ===== STATE =====
    let config = {
        position: 'IP',
        spot: 'SRP',
        stack: 200,
        stakes: 5,
        shotClock: { enabled: false, seconds: 30 },
    };
    let game = null;
    let sessionLog = [];
    let handNumber = 0;

    // ===== HAND HISTORY NAVIGATION =====
    // navLocked is true while an action/animation sequence is running, so the
    // back/forward buttons stay disabled until control returns to the user.
    let navLocked = false;
    // Fields deep-copied into each snapshot (everything needed to silently re-render
    // a prior visual state). Transient glow state (activeTurn/seatAction) and
    // spot/spotKey/heroCardsRendered are intentionally excluded.
    const SNAPSHOT_FIELDS = [
        'deck', 'board', 'pot', 'displayPot', 'userStack', 'oppStack', 'streetIndex',
        'actions', 'streetActions', 'seatStates', 'seatBets', 'holeCards',
        'heroCheckedBackLastStreet', 'allIn', 'userFolded', 'pendingAction',
        'renderedBoardCount', 'preflopAnimating',
        'streetStartPot', 'streetStartUserStack', 'streetStartOppStack',
    ];

    // heroToAct marks snapshots where hero genuinely has a live decision. Only
    // those show action buttons on restore; all other snapshots are review-only
    // (no buttons), which also prevents re-acting on a state where hero's action
    // was already applied (e.g. double-betting a "hero bet $25" step).
    function snapshot(heroToAct = false) {
        if (!game || !game.history) return;
        const snap = {};
        for (const f of SNAPSHOT_FIELDS) snap[f] = game[f];
        // Treat all dealt board cards as already-rendered so restores never replay
        // a card-deal animation (silent restore, even after an all-in runout).
        snap.renderedBoardCount = game.board.length;
        snap.heroToAct = !!heroToAct;
        game.history.push(structuredClone(snap));
        game.historyIndex = game.history.length - 1;
        updateHistoryButtons();
    }

    function restoreSnapshot(idx) {
        if (!game || !game.history || idx < 0 || idx >= game.history.length) return;
        const heroToAct = !!game.history[idx].heroToAct;
        Object.assign(game, structuredClone(game.history[idx]));
        game.historyIndex = idx;
        // Clear transient highlight/action-pill state so no stale glow lingers.
        game.seatAction = null;
        game.activeTurn = null;
        stopShotClock();
        renderHand();
        renderPotPill();
        renderTableSeats();
        if (heroToAct) {
            renderActionButtons(game.pendingAction);
        } else {
            // Review-only step: no decision for hero here, so show no buttons/glow.
            document.getElementById('actionButtons').innerHTML = '';
        }
        updateHistoryButtons();
    }

    function updateHistoryButtons() {
        const hasHistory = !!(game && game.history && game.history.length > 0);
        const canBack = hasHistory && !navLocked && game.historyIndex > 0;
        const canForward = hasHistory && !navLocked && game.historyIndex < game.history.length - 1;
        for (const id of ['btnHistoryBack', 'btnHistoryBackMobile']) {
            const el = document.getElementById(id);
            if (el) el.disabled = !canBack;
        }
        for (const id of ['btnHistoryForward', 'btnHistoryForwardMobile']) {
            const el = document.getElementById(id);
            if (el) el.disabled = !canForward;
        }
    }

    // ===== SHOT CLOCK =====
    const SHOTCLOCK_STORAGE_KEY = 'driller_shotclock_v1';
    let shotClockState = { intervalId: null, remaining: 0, expired: false, running: false };

    function loadShotClockConfig() {
        try {
            const raw = localStorage.getItem(SHOTCLOCK_STORAGE_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            if (typeof saved.enabled === 'boolean') config.shotClock.enabled = saved.enabled;
            if (Number.isFinite(saved.seconds)) {
                config.shotClock.seconds = clampShotClockSeconds(saved.seconds);
            }
        } catch (_) { /* ignore corrupt storage */ }
    }
    function saveShotClockConfig() {
        try {
            localStorage.setItem(SHOTCLOCK_STORAGE_KEY, JSON.stringify(config.shotClock));
        } catch (_) { /* ignore quota errors */ }
    }
    function clampShotClockSeconds(n) {
        const v = Math.round(Number(n));
        if (!Number.isFinite(v)) return 30;
        return Math.max(5, Math.min(300, v));
    }
    function formatShotClock(secs) {
        const s = Math.max(0, Math.floor(secs));
        const m = Math.floor(s / 60);
        const r = s % 60;
        return `${m}:${String(r).padStart(2, '0')}`;
    }
    function renderShotClock() {
        const el = document.getElementById('shotClock');
        if (!el) return;
        const visible = shotClockState.running || shotClockState.expired;
        el.classList.toggle('enabled', !!config.shotClock.enabled);
        el.classList.toggle('running', visible);
        el.classList.toggle('expired', shotClockState.expired);
        // Always set text so the pill has consistent dimensions even when hidden.
        el.textContent = formatShotClock(visible ? shotClockState.remaining : config.shotClock.seconds);
    }
    function startShotClock() {
        stopShotClock();
        if (!config.shotClock.enabled) return;
        shotClockState.remaining = config.shotClock.seconds;
        shotClockState.expired = false;
        shotClockState.running = true;
        renderShotClock();
        shotClockState.intervalId = setInterval(() => {
            shotClockState.remaining -= 1;
            if (shotClockState.remaining <= 0) {
                shotClockState.remaining = 0;
                shotClockState.expired = true;
                shotClockState.running = false;
                clearInterval(shotClockState.intervalId);
                shotClockState.intervalId = null;
            }
            renderShotClock();
        }, 1000);
    }
    function stopShotClock() {
        if (shotClockState.intervalId !== null) {
            clearInterval(shotClockState.intervalId);
            shotClockState.intervalId = null;
        }
        shotClockState.running = false;
        shotClockState.expired = false;
        shotClockState.remaining = 0;
        renderShotClock();
    }

    // ===== DECK ENGINE =====
    function createDeck() {
        const deck = [];
        for (const s of SUITS) {
            for (const r of RANKS) {
                deck.push({ rank: r, suit: s });
            }
        }
        return shuffle(deck);
    }

    function shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    // Deal hero hole cards from the spot's preflop range
    function dealFromRange(spotKey, deck) {
        const range = RANGES[spotKey];
        // Weight by combo count: pairs=6, suited=4, offsuit=12
        const weights = range.map(h => h.length === 2 ? 6 : h[2] === 's' ? 4 : 12);
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let roll = rng() * totalWeight;
        let hand;
        for (let i = 0; i < range.length; i++) {
            roll -= weights[i];
            if (roll <= 0) { hand = range[i]; break; }
        }
        if (!hand) hand = range[range.length - 1];

        let rank1, rank2, suited;
        if (hand.length === 2) {
            // Pair: e.g. "AA"
            rank1 = hand[0];
            rank2 = hand[1];
            suited = null;
        } else {
            // Non-pair: e.g. "AKs" or "AKo"
            rank1 = hand[0];
            rank2 = hand[1];
            suited = hand[2] === 's';
        }

        // Collect candidate cards from deck
        const cards1 = deck.filter(c => c.rank === rank1);
        const cards2 = deck.filter(c => c.rank === rank2);

        let c1, c2;
        if (rank1 === rank2) {
            // Pair — pick two random cards of that rank
            const shuffled = shuffle(cards1);
            c1 = shuffled[0];
            c2 = shuffled[1];
        } else if (suited) {
            // Suited — pick a random suit, then find both ranks in that suit
            const availableSuits = SUITS.filter(s =>
                cards1.some(c => c.suit === s) && cards2.some(c => c.suit === s)
            );
            const suit = availableSuits[Math.floor(rng() * availableSuits.length)];
            c1 = cards1.find(c => c.suit === suit);
            c2 = cards2.find(c => c.suit === suit);
        } else {
            // Offsuit — pick two different suits
            const s1 = shuffle(cards1);
            c1 = s1[0];
            const offsuit2 = cards2.filter(c => c.suit !== c1.suit);
            c2 = offsuit2[Math.floor(rng() * offsuit2.length)];
        }

        // Remove chosen cards from deck
        deck.splice(deck.indexOf(c1), 1);
        deck.splice(deck.indexOf(c2), 1);

        return [c1, c2];
    }

    // ===== PREFLOP ANIMATION =====
    function delay(ms) {
        if (TEST_MODE) return Promise.resolve();
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function showSeatAction(seat, text, opts = {}) {
        const mode = opts.mode || 'hand';
        const holdMs = opts.holdMs ?? 560;
        const pauseMs = opts.pauseMs ?? 140;
        game.activeTurn = seat;
        game.seatAction = { seat, text };
        if (mode === 'table') renderTableSeats();
        else renderHand();
        await delay(holdMs);
        game.seatAction = null;
        if (game.activeTurn === seat) game.activeTurn = null;
        if (mode === 'table') renderTableSeats();
        else renderHand();
        if (pauseMs > 0) await delay(pauseMs);
    }

    function getSeatElByPosition(position) {
        const heroSeatIndex = FULL_TABLE.indexOf(game.spot.heroSeat);
        const posIndex = FULL_TABLE.indexOf(position);
        const visualIndex = (posIndex - heroSeatIndex + 8) % 8;
        return document.getElementById('tableSeat' + visualIndex);
    }

    function positionSeatsOnStadium() {
        const felt = document.querySelector('.table-felt');
        if (!felt) return;

        const width = felt.clientWidth;
        const height = felt.clientHeight;
        if (!width || !height) return;

        const isMobile = window.matchMedia('(max-width: 767px)').matches;
        const seatEl0 = document.getElementById('tableSeat0');
        const seatDiameter = seatEl0 ? seatEl0.offsetWidth : (isMobile ? 58 : 56);
        // Keep circles riding the felt rail while staying inside bounds.
        // Desktop target: rail should pass through seat midline, so inset is minimal.
        const edgeInset = isMobile
            ? Math.max(1, Math.round(seatDiameter * 0.08))
            : Math.max(0, Math.round(seatDiameter * 0.08));
        const layoutWidth = Math.max(80, width - (edgeInset * 2));
        const layoutHeight = Math.max(80, height - (edgeInset * 2));
        const seatPoints = [];

        if (isMobile) {
            // Vertical stadium: equal spacing by perimeter distance, CCW from hero.
            const r = layoutWidth / 2;
            const s = Math.max(0, layoutHeight - (2 * r));
            const perimeter = (2 * s) + (2 * Math.PI * r);
            const step = perimeter / 8;

            const arcQuarter = (Math.PI * r) / 2;
            const arcHalf = Math.PI * r;
            const bottomCy = layoutHeight - r;

            for (let i = 0; i < 8; i++) {
                let d = i * step;
                let x;
                let y;

                if (d <= arcQuarter) {
                    // Bottom cap: bottom-center -> left tangent.
                    const theta = (Math.PI / 2) + (d / r);
                    x = r + (r * Math.cos(theta));
                    y = bottomCy + (r * Math.sin(theta));
                } else if (d <= arcQuarter + s) {
                    // Left flat side: bottom -> top.
                    const t = d - arcQuarter;
                    x = 0;
                    y = (layoutHeight - r) - t;
                } else if (d <= arcQuarter + s + arcHalf) {
                    // Top cap: left tangent -> right tangent.
                    const t = d - arcQuarter - s;
                    const theta = Math.PI + (t / r);
                    x = r + (r * Math.cos(theta));
                    y = r + (r * Math.sin(theta));
                } else if (d <= arcQuarter + (2 * s) + arcHalf) {
                    // Right flat side: top -> bottom.
                    const t = d - arcQuarter - s - arcHalf;
                    x = layoutWidth;
                    y = r + t;
                } else {
                    // Bottom cap: right tangent -> bottom-center.
                    const t = d - arcQuarter - (2 * s) - arcHalf;
                    const theta = t / r;
                    x = r + (r * Math.cos(theta));
                    y = bottomCy + (r * Math.sin(theta));
                }

                seatPoints.push({ x: x + edgeInset, y: y + edgeInset });
            }
        } else {
            // Horizontal stadium: equal spacing by perimeter distance, CCW from hero.
            const r = layoutHeight / 2;
            const s = Math.max(0, layoutWidth - (2 * r));
            const perimeter = (2 * s) + (2 * Math.PI * r);
            const step = perimeter / 8;

            const flatHalf = s / 2;
            const arcHalf = Math.PI * r;

            for (let i = 0; i < 8; i++) {
                let d = i * step;
                let x;
                let y;

                if (d <= flatHalf) {
                    // Bottom flat: bottom-center -> left tangent.
                    x = (layoutWidth / 2) - d;
                    y = layoutHeight;
                } else if (d <= flatHalf + arcHalf) {
                    // Left cap: bottom tangent -> top tangent.
                    const t = d - flatHalf;
                    const theta = (Math.PI / 2) + (t / r);
                    x = r + (r * Math.cos(theta));
                    y = r + (r * Math.sin(theta));
                } else if (d <= flatHalf + arcHalf + s) {
                    // Top flat: left tangent -> right tangent.
                    const t = d - flatHalf - arcHalf;
                    x = r + t;
                    y = 0;
                } else if (d <= flatHalf + arcHalf + s + arcHalf) {
                    // Right cap: top tangent -> bottom tangent.
                    const t = d - flatHalf - arcHalf - s;
                    const theta = (-Math.PI / 2) + (t / r);
                    x = (layoutWidth - r) + (r * Math.cos(theta));
                    y = r + (r * Math.sin(theta));
                } else {
                    // Bottom flat: right tangent -> bottom-center.
                    const t = d - flatHalf - arcHalf - s - arcHalf;
                    x = (layoutWidth - r) - t;
                    y = layoutHeight;
                }

                seatPoints.push({ x: x + edgeInset, y: y + edgeInset });
            }
        }

        for (let i = 0; i < 8; i++) {
            const seatEl = document.getElementById('tableSeat' + i);
            if (!seatEl || !seatPoints[i]) continue;
            seatEl.style.left = `${seatPoints[i].x}px`;
            seatEl.style.top = `${seatPoints[i].y}px`;
        }
    }

    async function playPreflopSequence() {
        const spotKey = game.spotKey;
        const steps = PREFLOP_STEPS[spotKey];
        const spot = game.spot;
        const stake = STAKES[config.stakes];

        game.preflopAnimating = true;
        game.seatStates = {};
        game.seatBets = {};

        // Initialize all seats as active (dealt in)
        for (const pos of FULL_TABLE) {
            game.seatStates[pos] = 'active';
        }

        // Post blinds immediately
        game.seatBets['SB'] = stake.sb / stake.bb; // in BB
        game.seatBets['BB'] = 1; // 1 BB
        game.seatStates['SB'] = 'posted';
        game.seatStates['BB'] = 'posted';
        renderTableSeats();
        renderPotPill();

        await delay(600);

        // Walk through each preflop step
        for (const step of steps) {
            if (step.dimmed && step.seats) {
                // Fold sequence — each seat folds one at a time
                for (const seat of step.seats) {
                    game.activeTurn = seat;
                    game.seatAction = { seat, text: 'fold' };
                    renderTableSeats();
                    // Animate cards folding into the circle as action text shows
                    const foldSeatEl = getSeatElByPosition(seat);
                    const foldCards = foldSeatEl && foldSeatEl.querySelector('.seat-cards');
                    if (foldCards) {
                        foldCards.classList.add('folding');
                    }
                    await delay(360);
                    // Mark folded — cards won't be re-added on next render
                    game.seatStates[seat] = 'folded';
                    game.seatAction = null;
                    if (game.activeTurn === seat) game.activeTurn = null;
                    renderTableSeats();
                    await delay(120);
                }
            } else if (step.who === 'hero' || step.who === 'villain') {
                // Bet/raise/call action
                const seat = step.seat;
                // Update seat status based on action
                let actionLabel = step.action;
                if (step.action.includes('raise') || step.action.includes('bet') || step.action.includes('3-bet') || step.action.includes('4-bet')) {
                    game.seatStates[seat] = 'raised';
                } else if (step.action === 'calls') {
                    game.seatStates[seat] = 'called';
                    actionLabel = 'call';
                } else if (step.action === 'limps') {
                    game.seatStates[seat] = 'called';
                    actionLabel = 'limp';
                }
                // Place bet pill first so it appears at the same moment as action text
                // 'calls' is an increment; 'raises to'/'3-bets to'/'4-bets to'/'limps'/'bets' are totals
                if (step.action === 'calls') {
                    game.seatBets[seat] = (game.seatBets[seat] || 0) + step.bb;
                } else {
                    game.seatBets[seat] = step.bb;
                }

                // Show action + active ring with bet pill visible in the same render
                await showSeatAction(seat, actionLabel, { mode: 'table', holdMs: 320, pauseMs: 220 });
            }
        }

        // Collect all bets into pot — brief pause then clear pills
        await delay(300);
        game.seatBets = {};
        game.pot = spot.pot;
        game.displayPot = spot.pot;
        game.activeTurn = null;
        game.seatAction = null;
        renderPotPill();
        renderTableSeats();

        await delay(400);

        // Preflop complete — set final stacks and deal flop
        game.preflopAnimating = false;
        game.userStack = config.stack - game.spot.userInvested;
        game.oppStack = config.stack - game.spot.oppInvested;

        // Now deal the flop
        game.deck.pop(); // burn
        game.board.push(game.deck.pop(), game.deck.pop(), game.deck.pop());
        document.getElementById('tableArea').classList.remove('preflop-animating');
        renderHand();
        // First reviewable state: flop dealt, before any flop action.
        // Hero is on the clock here only if hero acts first (OOP).
        game.pendingAction = null;
        snapshot(userActsFirst());
        await startStreetAction();
    }

    function renderPotPill() {
        const potPill = document.getElementById('potPill');
        if (game.displayPot > 0) {
            potPill.textContent = fmtDollar(game.displayPot);
            potPill.classList.add('visible');
        } else {
            potPill.classList.remove('visible');
        }
    }

    // ===== GAME STATE =====
    function startHand() {
        clearHandCompleteBanner();
        document.getElementById('actionButtons').innerHTML = '';
        hideSizing();
        stopShotClock();
        const spotKey = config.spot === 'LIMP' ? 'LIMP_IP' : `${config.spot}_${config.position}`;
        const spot = SPOTS[spotKey];
        const deck = createDeck();

        handNumber++;
        game = {
            spot,
            spotKey,
            deck,
            holeCards: dealFromRange(spotKey, deck),
            board: [],
            streetIndex: 0,
            pot: 0,
            userStack: config.stack,
            oppStack: config.stack,
            actions: [],
            streetActions: [],
            userFolded: false,
            allIn: false,
            displayPot: 0,
            pendingAction: null,
            renderedBoardCount: 0,
            preflopAnimating: true,
            seatStates: {},
            seatBets: {},
            history: [],
            historyIndex: -1,
        };

        navLocked = true; // preflop animating — no rewind until flop is dealt
        updateHistoryButtons();
        renderHand();
        // Hide board/actions during preflop animation
        document.getElementById('tableArea').classList.add('preflop-animating');
        updateMobilePrimaryButtonLabel();
        // Play the preflop sequence, then deal flop.
        // Returned so headless tests can await the chain settling; the browser
        // call site ignores the return value (no behavior change).
        return playPreflopSequence();
    }

    function updateNewStreetButton() {
        const label = game ? 'New ' + (STREETS[game.streetIndex] || 'Flop').charAt(0).toUpperCase() + (STREETS[game.streetIndex] || 'flop').slice(1) : 'New Flop';
        document.getElementById('btnNewStreet').textContent = label;
        document.getElementById('btnNewStreetMobile').textContent = label;
    }

    function rerollStreet() {
        if (!game || !game.board || game.board.length === 0) return;

        // Clear action buttons and sizing
        document.getElementById('actionButtons').innerHTML = '';
        hideSizing();
        stopShotClock();

        // Determine how many cards to replace based on current street
        const streetIdx = game.streetIndex;
        if (streetIdx === 0) {
            // Re-deal entire flop: put old flop cards back, burn + deal 3 new
            const oldBoard = game.board.splice(0);
            game.deck.push(...oldBoard);
            game.deck = shuffle(game.deck);
            game.deck.pop(); // burn
            game.board.push(game.deck.pop(), game.deck.pop(), game.deck.pop());
        } else if (streetIdx === 1) {
            // Re-deal turn card only: put old turn back, burn + deal 1 new
            const oldTurn = game.board.pop();
            game.deck.push(oldTurn);
            game.deck = shuffle(game.deck);
            game.deck.pop(); // burn
            game.board.push(game.deck.pop());
        } else if (streetIdx === 2) {
            // Re-deal river card only: put old river back, burn + deal 1 new
            const oldRiver = game.board.pop();
            game.deck.push(oldRiver);
            game.deck = shuffle(game.deck);
            game.deck.pop(); // burn
            game.board.push(game.deck.pop());
        }

        // Reset street state and re-render
        game.renderedBoardCount = game.board.length - (streetIdx === 0 ? 3 : 1);
        game.streetActions = [];
        game.pendingAction = null;
        game.seatAction = null;
        game.seatBets = {};

        // Reset pot/stacks to what they were at the start of THIS street, preserving
        // betting from prior streets (e.g. flop bets when rerolling the turn).
        game.userStack = game.streetStartUserStack ?? (config.stack - game.spot.userInvested);
        game.oppStack = game.streetStartOppStack ?? (config.stack - game.spot.oppInvested);
        game.pot = game.streetStartPot ?? game.spot.pot;
        game.displayPot = game.pot;
        renderPotPill();

        renderHand();
        // Reroll discards the old runout — start a fresh history seeded at the new street.
        game.history = [];
        game.historyIndex = -1;
        navLocked = true;
        snapshot(userActsFirst()); // hero on the clock only if hero acts first (OOP)
        return startStreetAction(); // returned for headless test awaiting (browser ignores)
    }

    function getCurrentStreet() {
        return STREETS[game.streetIndex] || 'showdown';
    }

    function isUserOOP() {
        return config.position === 'OOP';
    }

    function userActsFirst() {
        return isUserOOP();
    }

    async function startStreetAction() {
        // Track if hero checked back last street (IP only — V checked, then H checked)
        const heroIsIP = !isUserOOP();
        game.heroCheckedBackLastStreet = heroIsIP &&
            game.streetActions &&
            game.streetActions.length === 2 &&
            game.streetActions[0].action === 'check' &&
            game.streetActions[1].action === 'check';
        game.streetActions = [];
        game.pendingAction = null;
        // Capture pot/stacks at the start of this street so a reroll (New Flop/Turn/River)
        // re-deals the current street's card without discarding prior streets' betting.
        game.streetStartPot = game.pot;
        game.streetStartUserStack = game.userStack;
        game.streetStartOppStack = game.oppStack;
        updateNewStreetButton();

        if (userActsFirst()) {
            promptUserAction(null);
        } else {
            await doOpponentAction(null);
        }
    }

    async function doOpponentAction(facingBet) {
        let action, amount = 0;

        navLocked = true; // villain acting — disable rewind until control returns
        updateHistoryButtons();

        if (game.oppStack <= 0 || game.allIn) {
            await advanceStreet();
            return;
        }

        // Keep a short pause between sequential actions, without a separate pre-action highlight step.
        await delay(420);

        const heroIsIP = !isUserOOP();

        if (heroIsIP) {
            // Hero is IP → V acts first
            if (facingBet === null) {
                if (game.heroCheckedBackLastStreet) {
                    // H checked back last street → V mixes: check 33%, bet 1/3 pot 33%, bet 2/3 pot 33%
                    const roll = rng();
                    if (roll < 1/3) {
                        action = 'checks';
                    } else if (roll < 2/3) {
                        const betSize = roundToChip(game.pot * (1/3));
                        amount = Math.min(betSize, game.oppStack);
                        if (amount >= game.oppStack) {
                            action = 'goes all in';
                            amount = game.oppStack;
                        } else {
                            action = 'bets';
                        }
                    } else {
                        const betSize = roundToChip(game.pot * (2/3));
                        amount = Math.min(betSize, game.oppStack);
                        if (amount >= game.oppStack) {
                            action = 'goes all in';
                            amount = game.oppStack;
                        } else {
                            action = 'bets';
                        }
                    }
                } else {
                    action = 'checks';
                }
            } else {
                action = 'calls';
                amount = Math.min(facingBet.amount, game.oppStack);
            }
        } else {
            // Hero is OOP
            if (facingBet === null) {
                // Hero checked → V checks 33%, bets 1/3 pot 33%, bets 2/3 pot 33%
                const roll = rng();
                if (roll < 1/3) {
                    action = 'checks';
                } else if (roll < 2/3) {
                    const betSize = roundToChip(game.pot * (1/3));
                    amount = Math.min(betSize, game.oppStack);
                    if (amount >= game.oppStack) {
                        action = 'goes all in';
                        amount = game.oppStack;
                    } else {
                        action = 'bets';
                    }
                } else {
                    const betSize = roundToChip(game.pot * (2/3));
                    amount = Math.min(betSize, game.oppStack);
                    if (amount >= game.oppStack) {
                        action = 'goes all in';
                        amount = game.oppStack;
                    } else {
                        action = 'bets';
                    }
                }
            } else {
                // Hero bet or raised → V always calls
                action = 'calls';
                amount = Math.min(facingBet.amount, game.oppStack);
            }
        }

        // Apply opponent action
        const villainSeat = game.spot.villainSeat;

        if (action === 'checks') {
            logAction('Opponent', 'checks', 0);
            game.streetActions.push({ actor: 'opp', action: 'check' });
            await showSeatAction(villainSeat, 'check');
            if (game.streetActions.some(a => a.actor === 'user')) {
                game.pendingAction = null;
                snapshot();
                await advanceStreet();
            } else {
                promptUserAction(null);
                snapshot(true); // villain checks to hero — hero's decision
            }
        } else if (action === 'calls') {
            game.oppStack -= amount;
            game.pot += amount;
            showSeatBet(villainSeat, amount);
            logAction('Opponent', 'calls', amount);
            game.streetActions.push({ actor: 'opp', action: 'call', amount });
            await showSeatAction(villainSeat, 'call');
            game.pendingAction = null;
            snapshot();
            if (game.oppStack <= 0 || game.userStack <= 0) {
                game.allIn = true;
                collectBetsIntoPot();
                await runOutBoard();
            } else {
                await advanceStreet();
            }
        } else if (action === 'bets') {
            game.oppStack -= amount;
            game.pot += amount;
            showSeatBet(villainSeat, amount);
            logAction('Opponent', 'bets', amount);
            game.streetActions.push({ actor: 'opp', action: 'bet', amount });
            await showSeatAction(villainSeat, `bet ${fmtDollar(amount)}`);
            promptUserAction({ type: 'bet', amount });
            snapshot(true); // hero faces a bet — hero's decision
        } else if (action === 'raises to') {
            game.oppStack -= amount;
            game.pot += amount;
            showSeatBet(villainSeat, amount);
            logAction('Opponent', 'raises to', amount);
            game.streetActions.push({ actor: 'opp', action: 'raise', amount });
            await showSeatAction(villainSeat, `raise ${fmtDollar(amount)}`);
            promptUserAction({ type: 'raise', amount });
            snapshot(true); // hero faces a raise — hero's decision
        } else if (action === 'goes all in') {
            game.oppStack -= amount;
            game.pot += amount;
            showSeatBet(villainSeat, amount);
            logAction('Opponent', 'goes all in', amount);
            game.streetActions.push({ actor: 'opp', action: 'allin', amount });
            await showSeatAction(villainSeat, 'all in');
            promptUserAction({ type: 'raise', amount });
            snapshot(true); // hero faces an all-in — hero's decision
        }
    }

    function promptUserAction(facingBet) {
        game.pendingAction = facingBet;
        renderActionButtons(facingBet);
        navLocked = false; // user's turn — allow rewind/forward
        updateHistoryButtons();
        startShotClock();
    }

    async function handleUserAction(action, amount) {
        // Clear buttons immediately to prevent double-clicks during animation
        document.getElementById('actionButtons').innerHTML = '';
        hideSizing();
        stopShotClock();

        // Branch-and-replay: if the user acts while rewound, drop the discarded
        // future and reshuffle the remaining deck so the new runout is fresh.
        if (game.history && game.historyIndex < game.history.length - 1) {
            game.history = game.history.slice(0, game.historyIndex + 1);
            game.deck = shuffle(game.deck);
        }
        navLocked = true; // processing action — disable rewind until control returns
        updateHistoryButtons();

        const heroSeat = game.spot.heroSeat;

        if (action === 'fold') {
            game.userFolded = true;
            logAction('You', 'fold', 0);
            collectBetsIntoPot();
            endHand();
            return;
        }

        if (action === 'check') {
            logAction('You', 'check', 0);
            game.streetActions.push({ actor: 'user', action: 'check' });
            await showSeatAction(heroSeat, 'check');
            game.pendingAction = null;
            snapshot();
            if (game.streetActions.some(a => a.actor === 'opp')) {
                await advanceStreet();
            } else {
                await doOpponentAction(null);
            }
        } else if (action === 'call') {
            const callAmount = Math.min(game.pendingAction.amount, game.userStack);
            game.userStack -= callAmount;
            game.pot += callAmount;
            showSeatBet(heroSeat, callAmount);
            logAction('You', 'call', callAmount);
            game.streetActions.push({ actor: 'user', action: 'call', amount: callAmount });
            await showSeatAction(heroSeat, 'call');
            game.pendingAction = null;
            snapshot();
            if (game.userStack <= 0 || game.oppStack <= 0) {
                game.allIn = true;
                collectBetsIntoPot();
                await runOutBoard();
            } else {
                await advanceStreet();
            }
        } else if (action === 'bet' || action === 'raise') {
            game.userStack -= amount;
            game.pot += amount;
            showSeatBet(heroSeat, amount);
            const label = action === 'bet' ? 'bet' : 'raise';
            const isAllIn = game.userStack <= 0;
            const actionText = isAllIn ? 'all in' : `${label} ${fmtDollar(amount)}`;
            logAction('You', isAllIn ? 'goes all in' : (action === 'bet' ? 'bets' : 'raises to'), amount);
            game.streetActions.push({ actor: 'user', action, amount });
            await showSeatAction(heroSeat, actionText);
            if (isAllIn) game.allIn = true;
            game.pendingAction = null;
            snapshot();
            await doOpponentAction({ type: action, amount });
        }
    }

    function collectBetsIntoPot() {
        // Clear seat bets, sync display pot, and update pot pill
        game.seatBets = {};
        game.displayPot = game.pot;
        renderPotPill();
        renderTableSeats();
    }

    function showSeatBet(position, amountBB) {
        if (!game.seatBets) game.seatBets = {};
        game.seatBets[position] = amountBB;
        renderTableSeats();
    }

    async function advanceStreet() {
        // Collect bets into pot, then pause so user sees chips gathered
        collectBetsIntoPot();
        renderHand();
        await delay(600);

        game.streetIndex++;

        if (game.streetIndex >= 3) {
            endHand();
            return;
        }

        // Burn and deal — card appears with animation
        game.deck.pop(); // burn
        game.board.push(game.deck.pop());
        renderHand();
        // Reviewable state: new street card dealt, before any action.
        // Hero is on the clock here only if hero acts first (OOP).
        game.pendingAction = null;
        snapshot(userActsFirst());
        await delay(900); // Let user see the new card before action starts

        await startStreetAction();
    }

    async function runOutBoard() {
        // All-in: brief pause so the user registers the all-in before the runout.
        await delay(600);
        while (game.board.length < 5) {
            game.deck.pop(); // burn
            game.board.push(game.deck.pop());
        }
        game.streetIndex = 3;
        renderHand(); // reveal the remaining community cards (staggered deal animation)
        await delay(900); // let the runout land before the hand ends
        endHand();
    }

    function endHand() {
        stopShotClock();
        collectBetsIntoPot();
        const result = game.userFolded
            ? `You folded. Opponent wins ${fmtDollar(game.pot)} pot.`
            : `Hand complete. Final pot: ${fmtDollar(game.pot)}`;

        sessionLog.push({
            number: handNumber,
            holeCards: game.holeCards,
            board: game.board,
            pot: game.pot,
            actions: [...game.actions],
            userFolded: game.userFolded,
            config: { ...config, stakes: config.stakes },
            userStack: game.userStack,
            oppStack: game.oppStack,
        });

        // Final reviewable state — hand ended. Back/forward stay available for review.
        navLocked = false;
        snapshot();

        // Hand ends silently — no banner, just ready for next hand
    }

    function logAction(actor, action, amount) {
        game.actions.push({ actor, action, amount, street: getCurrentStreet() });
    }

    // ===== RENDERING =====
    function renderCard(card, extraClass = '') {
        const color = SUIT_COLORS[card.suit];
        return `<div class="card ${color} ${extraClass}">
            <span class="rank">${card.rank}</span>
            <span class="suit">${SUIT_SYMBOLS[card.suit]}</span>
        </div>`;
    }

    function renderTableHoleCardFace(card) {
        const color = SUIT_COLORS[card.suit];
        return `<div class="table-hole-card ${color}">
            <span class="rank">${card.rank}</span>
            <span class="suit">${SUIT_SYMBOLS[card.suit]}</span>
        </div>`;
    }

    function renderTableHoleCardBack() {
        return '<div class="table-hole-card back"></div>';
    }

    function renderTableHoleCardEmpty() {
        return '<div class="table-hole-card empty"></div>';
    }

    function fmtBB(val) {
        return Number.isInteger(val) ? val : val.toFixed(1);
    }

    function bbToDollars(bb) {
        const stake = STAKES[config.stakes];
        return Math.floor(bb * stake.bb);
    }

    function fmtDollar(bb) {
        return '$' + bbToDollars(bb).toLocaleString();
    }

    // Round a BB amount so the dollar value is a whole number
    function roundToBBDollar(bb) {
        const stake = STAKES[config.stakes];
        const dollars = Math.floor(bb * stake.bb);
        return dollars / stake.bb;
    }

    // Round a BB amount to the postflop bet increment ($5), with a 1 BB minimum
    function roundToChip(bb) {
        const stake = STAKES[config.stakes];
        const rounded = Math.round(bb * stake.bb / POSTFLOP_BET_INCREMENT) * POSTFLOP_BET_INCREMENT;
        const minBetDollars = Math.max(stake.bb, POSTFLOP_BET_INCREMENT);
        return Math.max(minBetDollars, rounded) / stake.bb;
    }

    function renderTableSeats(activeTurn) {
        // Persist activeTurn in game state so every render knows who's glowing
        if (activeTurn !== undefined) {
            game.activeTurn = activeTurn;
        }
        activeTurn = game.activeTurn || null;
        const spot = game.spot;
        const heroSeatIndex = FULL_TABLE.indexOf(spot.heroSeat);

        for (let visualIndex = 0; visualIndex < 8; visualIndex++) {
            const tableIndex = (heroSeatIndex + visualIndex) % 8;
            const position = FULL_TABLE[tableIndex];
            const isHero = position === spot.heroSeat;
            const isVillain = position === spot.villainSeat;

            // During preflop animation, use seatStates for fold status
            const seatState = game.seatStates && game.seatStates[position];
            const isFolded = seatState === 'folded';

            let type = 'folded';
            if (isHero) type = 'hero';
            else if (isVillain) type = 'villain';
            else if (seatState === 'active') type = 'active-player';

            // Override: if preflopAnimating and not explicitly folded, keep active look
            if (!isHero && !isVillain && game.preflopAnimating && seatState !== 'folded') {
                type = 'active-player';
            }


            let stackStr = '';
            if (isHero) stackStr = fmtDollar(game.userStack);
            else if (isVillain) stackStr = fmtDollar(game.oppStack);

            let typeLabel = 'Fold';
            if (isHero) typeLabel = 'HERO';
            else if (isVillain) typeLabel = 'VILLAIN';
            else if (type === 'active-player') typeLabel = position;

            const hasBet = game.seatBets && game.seatBets[position];
            const dealerBadge = position === 'BTN' && !hasBet ? '<span class="dealer-badge">D</span>' : '';

            // Active turn glow: by position name during preflop, by role during postflop
            let activeClass = '';
            if (activeTurn === position) {
                activeClass = ' active-turn';
            } else if ((activeTurn === 'hero' && isHero) || (activeTurn === 'villain' && isVillain)) {
                activeClass = ' active-turn';
            }

            // Bet pill
            const betAmount = game.seatBets && game.seatBets[position];
            const pillHtml = betAmount ? `<div class="seat-bet-pill visible">${fmtDollar(betAmount)}</div>` : '<div class="seat-bet-pill"></div>';

            // Hero label badge (shown below hero circle)
            const heroLabel = isHero ? '<div class="seat-hero-label">HERO</div>' : '';

            const seatEl = document.getElementById('tableSeat' + visualIndex);

            // Preserve the cards element across innerHTML rebuilds so fold animation persists
            const existingCards = seatEl.querySelector('.seat-cards');

            // Determine status class for border color
            let statusClass = '';
            if (seatState === 'raised') statusClass = ' status-raised';
            else if (seatState === 'called') statusClass = ' status-called';
            else if (seatState === 'posted') statusClass = ' status-posted';

            const isSeatFolded = isFolded && !isHero && !isVillain;
            const isBTN = position === 'BTN';
            seatEl.className = 'seat seat-pos-' + visualIndex + ' ' + (isSeatFolded ? 'folded' : type) + (isBTN ? ' btn-seat' : '') + statusClass + activeClass;
            const posLabel = isSeatFolded ? '' : `<div class="seat-position">${position}</div>`;
            let stackOrAction = '';
            if (game.seatAction && game.seatAction.seat === position) {
                stackOrAction = `<div class="seat-action">${game.seatAction.text}</div>`;
            } else if (stackStr && !isSeatFolded) {
                stackOrAction = `<div class="seat-stack">${stackStr}</div>`;
            }
            seatEl.innerHTML = `${dealerBadge}${heroLabel}${posLabel}${stackOrAction}${pillHtml}`;

            let cardsHTML = '';
            if (isSeatFolded) {
                cardsHTML = renderTableHoleCardEmpty() + renderTableHoleCardEmpty();
            } else if (isHero && game.holeCards && game.holeCards.length === 2) {
                cardsHTML = game.holeCards.map(renderTableHoleCardFace).join('');
            } else {
                cardsHTML = renderTableHoleCardBack() + renderTableHoleCardBack();
            }

            const cardsEl = existingCards || document.createElement('div');
            const wasFolding = existingCards && existingCards.classList.contains('folding');
            cardsEl.className = 'seat-cards' + (wasFolding && !isSeatFolded ? ' folding' : '');
            cardsEl.innerHTML = cardsHTML;
            if (isSeatFolded) cardsEl.classList.remove('folding');
            seatEl.appendChild(cardsEl);
        }

    }

    function renderHand() {
        renderTableSeats();
        positionSeatsOnStadium();

        // Board cards — only animate newly dealt cards
        const boardHTML = [];
        for (let i = 0; i < 5; i++) {
            if (i < game.board.length) {
                const isNew = i >= game.renderedBoardCount;
                const cls = isNew ? 'board-card dealing' : 'board-card';
                const style = isNew ? ` style="animation-delay: ${(i - game.renderedBoardCount) * 150}ms"` : '';
                const cardHtml = renderCard(game.board[i], cls);
                boardHTML.push(isNew ? cardHtml.replace('">', '"' + style + '>') : cardHtml);
            } else {
                boardHTML.push('<div class="card board-card facedown"></div>');
            }
        }
        document.getElementById('boardCards').innerHTML = boardHTML.join('');
        game.renderedBoardCount = game.board.length;

        // Pot pill — only shows collected pot, not in-flight bets
        const potPill = document.getElementById('potPill');
        potPill.textContent = fmtDollar(game.displayPot);
        if (game.displayPot > 0) potPill.classList.add('visible');

        // Hero hole cards — only render once to avoid re-triggering animations
        const heroHandEl = document.getElementById('heroHand');
        if (!game.heroCardsRendered) {
            heroHandEl.innerHTML = game.holeCards.map(c => renderCard(c, 'dealing')).join('');
            game.heroCardsRendered = true;
        }

    }

    function renderActionButtons(facingBet) {
        const btnsEl = document.getElementById('actionButtons');
        renderTableSeats('hero');

        let html = '';
        if (facingBet) {
            // Facing a bet/raise: fold (left) -> call -> raise -> all-in (right)
            const callAmt = Math.min(facingBet.amount, game.userStack);
            html += `<button class="action-btn fold" onclick="handleUserAction('fold')">Fold</button>`;
            html += `<button class="action-btn call" onclick="handleUserAction('call')">Call ${fmtDollar(callAmt)}</button>`;
            if (game.userStack > facingBet.amount) {
                html += `<button class="action-btn raise" onclick="showSizing('raise', ${facingBet.amount})">Raise</button>`;
            } else {
                // Keep action slots stable when raise is unavailable (short stack)
                html += `<button class="action-btn raise action-btn-placeholder" disabled aria-hidden="true" tabindex="-1"></button>`;
            }
            html += `<button class="action-btn all-in" onclick="handleUserAction('raise', ${game.userStack})">All In ${fmtDollar(game.userStack)}</button>`;
        } else {
            // Opening action or facing check: check, bet
            html += `<button class="action-btn check" onclick="handleUserAction('check')">Check</button>`;
            html += `<button class="action-btn bet" onclick="showSizing('bet', 0)">Bet</button>`;
            html += `<button class="action-btn all-in" onclick="handleUserAction('bet', ${game.userStack})">All In ${fmtDollar(game.userStack)}</button>`;
        }

        btnsEl.innerHTML = html;
    }

    function showSizing(type, facingAmountBB) {
        const sizingArea = document.getElementById('sizingArea');
        const sizingInput = document.getElementById('sizingInput');
        const sizingError = document.getElementById('sizingError');
        const stake = STAKES[config.stakes];

        sizingArea.classList.add('visible');
        sizingInput.value = '';
        sizingError.classList.remove('visible');
        sizingInput.focus();

        // Min bet in dollars: for opening bet it's 1 BB ($bb), for raise it's 2x facing
        const minBetBB = type === 'raise' ? facingAmountBB * 2 : 1;
        const minBetDollars = bbToDollars(minBetBB);
        const maxDollars = bbToDollars(game.userStack);

        sizingInput.placeholder = `Min: $${minBetDollars}`;
        sizingInput.min = String(minBetDollars);
        sizingInput.max = String(maxDollars);
        sizingInput.step = '1';

        document.getElementById('sizingConfirm').onclick = () => {
            const dollarRaw = sizingInput.value.trim();
            const dollarVal = Number(dollarRaw);
            if (!Number.isFinite(dollarVal) || !Number.isInteger(dollarVal)) {
                sizingError.textContent = 'Enter a whole dollar amount';
                sizingError.classList.add('visible');
                return;
            }
            if (dollarVal < minBetDollars) {
                sizingError.textContent = `Minimum ${type} is $${minBetDollars}`;
                sizingError.classList.add('visible');
                return;
            }
            if (dollarVal > maxDollars) {
                sizingError.textContent = `Maximum is $${maxDollars} (your stack)`;
                sizingError.classList.add('visible');
                return;
            }
            // Convert dollars back to BB for game state
            const bbVal = dollarVal / stake.bb;
            sizingError.classList.remove('visible');
            sizingArea.classList.remove('visible');
            handleUserAction(type, bbVal);
        };

        // Allow Enter to confirm
        sizingInput.onkeydown = (e) => {
            if (e.key === 'Enter') document.getElementById('sizingConfirm').click();
        };
    }

    function hideSizing() {
        document.getElementById('sizingArea').classList.remove('visible');
        const sizingInput = document.getElementById('sizingInput');
        const sizingError = document.getElementById('sizingError');
        sizingInput.value = '';
        sizingError.textContent = '';
        sizingError.classList.remove('visible');
    }

    // ===== SESSION LOG =====
    function renderSessionLog() {
        const body = document.getElementById('sessionLogBody');
        if (sessionLog.length === 0) {
            body.innerHTML = '<div class="empty-state">No hands drilled yet this session.</div>';
            return;
        }

        body.innerHTML = sessionLog.slice().reverse().map(h => {
            const cards = h.holeCards.map(c => c.rank + SUIT_SYMBOLS[c.suit]).join(' ');
            const board = h.board.map(c => c.rank + SUIT_SYMBOLS[c.suit]).join(' ');
            const stake = STAKES[h.config.stakes];
            const spotLabel = h.config.spot + ' ' + h.config.position + ' ' + h.config.stack + 'bb ' + stake.label;
            const potDollars = '$' + Math.floor(h.pot * stake.bb);
            return `<div class="session-hand-card">
                <div class="session-hand-num">Hand #${h.number} — ${spotLabel}</div>
                <div class="session-hand-details">
                    Hand: <span>${cards}</span> | Board: <span>${board}</span><br>
                    Final pot: <span>${potDollars}</span> | ${h.userFolded ? 'Folded' : 'Went to showdown'}
                </div>
            </div>`;
        }).join('');
    }

    // ===== CONFIG =====
    function applyConfigConstraints() {
        const spotBtns = document.querySelectorAll('#spotOptions .config-btn');
        const stackBtns = document.querySelectorAll('#stackOptions .config-btn');
        const posBtns = document.querySelectorAll('#positionOptions .config-btn');

        // 4BP + 100bb mutual exclusion
        spotBtns.forEach(btn => {
            if (btn.dataset.value === '4BP' && config.stack === 100) {
                btn.classList.add('disabled');
                if (config.spot === '4BP') {
                    config.spot = 'SRP';
                    selectInGroup('spotOptions', 'SRP');
                }
            } else {
                btn.classList.remove('disabled');
            }
        });

        stackBtns.forEach(btn => {
            if (btn.dataset.value === '100' && config.spot === '4BP') {
                btn.classList.add('disabled');
                if (config.stack === 100) {
                    config.stack = 200;
                    selectInGroup('stackOptions', '200');
                }
            } else {
                btn.classList.remove('disabled');
            }
        });

        // Limp is always IP
        if (config.spot === 'LIMP') {
            config.position = 'IP';
            selectInGroup('positionOptions', 'IP');
            posBtns.forEach(btn => {
                if (btn.dataset.value === 'OOP') btn.classList.add('locked');
            });
        } else {
            posBtns.forEach(btn => btn.classList.remove('locked'));
        }
    }

    function selectInGroup(groupId, value) {
        const group = document.getElementById(groupId);
        group.querySelectorAll('.config-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.value === value);
        });
    }

    // ===== CONFIG STRIP (mobile) =====
    function updateConfigSummaryText() {
        const stake = STAKES[config.stakes];
        const text = `${config.position} · ${config.spot} · ${config.stack}bb · ${stake.label}`;
        const playModeSummary = document.getElementById('playModeSummary');
        if (playModeSummary) playModeSummary.textContent = text;
    }

    function updateMobilePrimaryButtonLabel() {
        const btn = document.getElementById('btnStartDrilling');
        if (!btn) return;
        btn.textContent = game ? 'New Hand' : 'Start Drilling';
    }

    function showHandCompleteBanner(resultText, userFolded) {
        // Show a brief banner in the actions area
        const actionsArea = document.getElementById('actionsArea');
        const banner = document.createElement('div');
        banner.className = 'hand-complete-banner' + (userFolded ? ' lost' : '');
        banner.textContent = resultText;
        actionsArea.prepend(banner);
        // Clear action buttons since hand is over
        document.getElementById('actionButtons').innerHTML = '';
    }

    function clearHandCompleteBanner() {
        const banner = document.querySelector('.hand-complete-banner');
        if (banner) banner.remove();
    }

    // ===== EVENT LISTENERS =====
    function setupConfigListeners() {
        document.querySelectorAll('#positionOptions .config-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('locked') || btn.classList.contains('disabled')) return;
                config.position = btn.dataset.value;
                selectInGroup('positionOptions', config.position);
                applyConfigConstraints();
                updateConfigSummaryText();
            });
        });

        document.querySelectorAll('#spotOptions .config-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('disabled')) return;
                config.spot = btn.dataset.value;
                selectInGroup('spotOptions', config.spot);
                applyConfigConstraints();
                updateConfigSummaryText();
            });
        });

        document.querySelectorAll('#stackOptions .config-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('disabled')) return;
                config.stack = parseInt(btn.dataset.value);
                selectInGroup('stackOptions', btn.dataset.value);
                applyConfigConstraints();
                updateConfigSummaryText();
            });
        });

        document.querySelectorAll('#stakesOptions .config-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                config.stakes = parseInt(btn.dataset.value);
                selectInGroup('stakesOptions', btn.dataset.value);
                updateConfigSummaryText();
            });
        });

        document.querySelectorAll('#shotClockOptions .config-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                config.shotClock.enabled = (btn.dataset.value === 'on');
                selectInGroup('shotClockOptions', btn.dataset.value);
                applyShotClockEnabledUI();
                saveShotClockConfig();
                stopShotClock(); // resets state and re-renders pill (reserves/releases layout space)
            });
        });

        const secondsInput = document.getElementById('shotClockSeconds');
        secondsInput.addEventListener('change', () => {
            const v = clampShotClockSeconds(secondsInput.value);
            config.shotClock.seconds = v;
            secondsInput.value = String(v);
            saveShotClockConfig();
        });
    }

    function applyShotClockEnabledUI() {
        document.getElementById('shotClockSeconds').disabled = !config.shotClock.enabled;
    }
    function syncShotClockUI() {
        selectInGroup('shotClockOptions', config.shotClock.enabled ? 'on' : 'off');
        document.getElementById('shotClockSeconds').value = String(config.shotClock.seconds);
        applyShotClockEnabledUI();
        renderShotClock();
    }

    // Init
    document.addEventListener('DOMContentLoaded', () => {
        loadShotClockConfig();
        setupConfigListeners();
        syncShotClockUI();
        applyConfigConstraints();
        updateConfigSummaryText();
        updateMobilePrimaryButtonLabel();

        // New Hand buttons (sidebar on desktop, control bar on mobile)
        document.getElementById('btnNewHand').addEventListener('click', startHand);
        document.getElementById('btnNewHandMobile').addEventListener('click', startHand);
        document.getElementById('btnNewStreet').addEventListener('click', rerollStreet);
        document.getElementById('btnNewStreetMobile').addEventListener('click', rerollStreet);

        // Hand history navigation (back / forward)
        function historyBack() {
            if (game && !navLocked && game.historyIndex > 0) restoreSnapshot(game.historyIndex - 1);
        }
        function historyForward() {
            if (game && !navLocked && game.historyIndex < game.history.length - 1) restoreSnapshot(game.historyIndex + 1);
        }
        document.getElementById('btnHistoryBack').addEventListener('click', historyBack);
        document.getElementById('btnHistoryBackMobile').addEventListener('click', historyBack);
        document.getElementById('btnHistoryForward').addEventListener('click', historyForward);
        document.getElementById('btnHistoryForwardMobile').addEventListener('click', historyForward);

        // Mobile mode switching
        const appEl = document.querySelector('.app');
        const setupBtn = document.getElementById('btnChangeSetup');

        function enterPlayMode() {
            appEl.classList.add('play-mode');
            appEl.classList.remove('setup-open');
            setupBtn.textContent = 'Setup';
            updateConfigSummaryText();
            requestAnimationFrame(() => positionSeatsOnStadium());
        }

        function toggleSetupMode() {
            const isMobile = window.matchMedia('(max-width: 767px)').matches;
            if (!isMobile) return;
            const willOpen = !appEl.classList.contains('setup-open');
            appEl.classList.toggle('setup-open', willOpen);
            setupBtn.textContent = willOpen ? 'Back to Hand' : 'Setup';
            if (!willOpen) {
                requestAnimationFrame(() => positionSeatsOnStadium());
            }
        }

        document.getElementById('btnStartDrilling').addEventListener('click', () => {
            enterPlayMode();
            startHand();
        });

        document.getElementById('btnChangeSetup').addEventListener('click', toggleSetupMode);

        // Remove play-mode if resized to desktop
        window.addEventListener('resize', () => {
            if (!window.matchMedia('(max-width: 767px)').matches) {
                appEl.classList.remove('play-mode');
                appEl.classList.remove('setup-open');
                setupBtn.textContent = 'Setup';
            }
        });

        // Session log drawer
        document.getElementById('btnSessionLog').addEventListener('click', () => {
            renderSessionLog();
            document.getElementById('sessionOverlay').classList.add('open');
        });
        document.getElementById('drawerClose').addEventListener('click', () => {
            document.getElementById('sessionOverlay').classList.remove('open');
        });
        document.getElementById('sessionOverlay').addEventListener('click', (e) => {
            if (e.target === document.getElementById('sessionOverlay')) {
                document.getElementById('sessionOverlay').classList.remove('open');
            }
        });

        positionSeatsOnStadium();
        window.addEventListener('resize', positionSeatsOnStadium);
    });

    // ===== TEST HARNESS EXPORTS =====
    // Surface internal state + the core state-machine functions so the
    // headless test runner can drive hands and assert pot/stack invariants.
    // Has no effect on the live app (the browser never reads __driller).
    if (typeof window !== 'undefined') {
        window.__driller = {
            // live state (getters so tests always see the current object)
            get game() { return game; },
            set game(v) { game = v; },
            get config() { return config; },
            set config(v) { config = v; },
            get navLocked() { return navLocked; },
            // definitions
            SPOTS, STAKES, STREETS, POSTFLOP_BET_INCREMENT,
            // core state-machine entry points
            startHand, handleUserAction, doOpponentAction, startStreetAction,
            advanceStreet, collectBetsIntoPot, rerollStreet,
            snapshot, restoreSnapshot,
            // helpers
            roundToChip, bbToDollars, createDeck, shuffle,
            // test controls
            setTestMode: (v) => { TEST_MODE = v; },
            setRng: (fn) => { _rng = fn; },
        };
    }
