/**
 * Score.js
 * Reusable score and combo system — ported and generalised from Fwoggy-Flick.
 *
 * Combo tiers and window are configurable per-game.
 *
 * Usage:
 *   import { ScoreSystem } from './Score.js';
 *   const score = new ScoreSystem();
 *
 *   score.add(10);          // add base points
 *   score.hit();            // register a combo hit
 *   score.update(dt);       // call each frame
 *   score.reset();          // on game restart
 *   score.save('my-game');  // save to localStorage leaderboard
 *
 *   score.points            // current points
 *   score.best              // best score this session (or loaded from storage)
 *   score.combo             // { count, timer, multiplier, barFill }
 */

export class ScoreSystem {
    /**
     * @param {object} [options]
     * @param {string} [options.storageKey]  localStorage key for leaderboard
     * @param {number} [options.comboWindow] Seconds before combo resets (default 3.5)
     * @param {Array}  [options.comboTiers]  Array of {hits, multiplier}, highest hits first
     */
    constructor({
        storageKey  = 'js-game-template-leaderboard',
        comboWindow = 3.5,
        comboTiers  = [
            { hits: 35, multiplier: 8 },
            { hits: 20, multiplier: 5 },
            { hits: 10, multiplier: 3 },
            { hits:  5, multiplier: 2 },
        ],
    } = {}) {
        this._key        = storageKey;
        this._window     = comboWindow;
        this._tiers      = comboTiers;

        this.points      = 0;
        this.best        = 0;

        this._combo      = 0;
        this._comboTimer = 0;
        this._mult       = 1;
    }

    // ── Scoring ───────────────────────────────────────────────────────────────

    /** Add `base` points, multiplied by the current combo multiplier. */
    add(base) {
        this.points += base * this._mult;
    }

    /** Raw add — ignores combo multiplier. */
    addRaw(points) {
        this.points += points;
    }

    // ── Combo ─────────────────────────────────────────────────────────────────

    /**
     * Register a combo hit.
     * @returns {number|null} The new multiplier if a tier was just crossed, else null.
     */
    hit() {
        const prevMult  = this._mult;
        this._combo++;
        this._comboTimer = this._window;
        this._mult = this._calcMultiplier(this._combo);
        return this._mult > prevMult ? this._mult : null;
    }

    _calcMultiplier(count) {
        for (const tier of this._tiers) {
            if (count >= tier.hits) return tier.multiplier;
        }
        return 1;
    }

    resetCombo() {
        this._combo      = 0;
        this._comboTimer = 0;
        this._mult       = 1;
    }

    get combo() {
        return {
            count:      this._combo,
            timer:      this._comboTimer,
            multiplier: this._mult,
            barFill:    this._window > 0 ? Math.max(0, this._comboTimer / this._window) : 0,
        };
    }

    // ── Update ────────────────────────────────────────────────────────────────

    update(dt) {
        if (this._comboTimer <= 0) return;
        this._comboTimer -= dt;
        if (this._comboTimer <= 0) this.resetCombo();
    }

    // ── Reset ─────────────────────────────────────────────────────────────────

    reset() {
        this.points = 0;
        this.resetCombo();
    }

    // ── Best score ────────────────────────────────────────────────────────────

    syncBest() {
        if (this.points > this.best) this.best = this.points;
        return this.best;
    }

    // ── Leaderboard (localStorage) ────────────────────────────────────────────

    save() {
        try {
            const board = this.load();
            board.push({ score: this.points, date: new Date().toLocaleDateString(), timestamp: Date.now() });
            board.sort((a, b) => b.score - a.score);
            localStorage.setItem(this._key, JSON.stringify(board));
            this.syncBest();
        } catch (e) {
            console.error('[ScoreSystem] Save failed:', e);
        }
    }

    load() {
        try {
            const raw = localStorage.getItem(this._key);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    /** Load the all-time best score from the leaderboard. */
    loadBest() {
        const board = this.load();
        this.best = board.length ? Math.max(...board.map(e => e.score || 0)) : 0;
        return this.best;
    }

    clearLeaderboard() {
        try {
            localStorage.removeItem(this._key);
        } catch (_) {}
        this.best = 0;
    }
}
