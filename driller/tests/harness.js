// Headless loader for the RTP Driller app.
//
// Loads the REAL driller/index.html + app.js into a happy-dom window so tests
// exercise the actual game logic (not a reimplementation). Animation waits are
// skipped (TEST_MODE) and randomness is seeded, so full hands run instantly and
// deterministically. Returns the window.__driller test handle.

import { Window } from 'happy-dom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '..');

// Small deterministic PRNG (mulberry32) so a seed reproduces an exact runout.
export function makeRng(seed = 1) {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function loadApp({ seed = 1 } = {}) {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

    const window = new Window({ url: 'http://localhost/' });

    // Inject the markup without the external <script> (we eval app.js manually
    // so it runs in this window's scope and can be controlled before bootstrap).
    window.document.write(html.replace(/<script src="app\.js"><\/script>/, ''));

    // Provide globals app.js relies on that may be absent in the vm scope.
    if (typeof window.structuredClone !== 'function') {
        window.structuredClone = structuredClone;
    }

    window.eval(appJs);

    const D = window.__driller;
    if (!D) throw new Error('window.__driller not exposed — did the export block load?');

    // Deterministic + instant.
    D.setTestMode(true);
    D.setRng(makeRng(seed));

    // Run the DOMContentLoaded bootstrap (wires config, positions seats, etc.).
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

    return { D, window };
}
