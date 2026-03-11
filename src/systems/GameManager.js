/**
 * GameManager.js
 * Generic finite-state-machine game manager.
 *
 * Extend this class and add your own state logic.
 * The FSM validates transitions so you can never accidentally jump states.
 *
 * Usage:
 *   class MyGame extends GameManager {
 *       onEnterPlaying() { this.spawnPlayer(); }
 *       onExitPlaying()  { this.cleanup(); }
 *   }
 *   const gm = new MyGame({ allowedTransitions: { ... } });
 *   gm.start();
 */

import { GAME_STATES } from '../constants/GameStates.js';
import { EventBus }    from '../core/EventBus.js';

export class GameManager {
    /**
     * @param {object} [options]
     * @param {string} [options.initialState]  Default MENU
     * @param {object} [options.allowedTransitions]
     *   Map of { fromState: [toState, ...] }. Omit to allow any transition.
     * @param {function} [options.onReset]  Optional reset callback
     */
    constructor({ initialState = GAME_STATES.MENU, allowedTransitions = null, onReset = null } = {}) {
        this.currentState        = initialState;
        this._prevState          = null;
        this._allowedTransitions = allowedTransitions;
        this._onReset            = onReset;
    }

    // ── State access ──────────────────────────────────────────────────────────

    getState()     { return this.currentState; }
    getPrevState() { return this._prevState; }

    is(state)      { return this.currentState === state; }
    isPlaying()    { return this.currentState === GAME_STATES.PLAYING; }
    isPaused()     { return this.currentState === GAME_STATES.PAUSED; }
    isGameOver()   { return this.currentState === GAME_STATES.GAMEOVER; }
    isMenu()       { return this.currentState === GAME_STATES.MENU; }

    // ── State transition ──────────────────────────────────────────────────────

    /**
     * Transition to a new state.
     * Calls `onExit<PrevState>` and `onEnter<NewState>` lifecycle hooks.
     * Emits an 'stateChange' event on the EventBus.
     * @param {string} newState
     * @returns {boolean} true if transition succeeded
     */
    setState(newState) {
        if (newState === this.currentState) return false;

        if (this._allowedTransitions) {
            const allowed = this._allowedTransitions[this.currentState] || [];
            if (!allowed.includes(newState)) {
                console.warn(`[GameManager] Invalid transition: ${this.currentState} → ${newState}`);
                return false;
            }
        }

        const prev = this.currentState;
        this._callLifecycle('onExit', prev);
        this._prevState   = prev;
        this.currentState = newState;
        this._callLifecycle('onEnter', newState);

        EventBus.emit('stateChange', { from: prev, to: newState });
        return true;
    }

    _callLifecycle(prefix, state) {
        const method = prefix + state.charAt(0) + state.slice(1).toLowerCase()
                                                              .replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        if (typeof this[method] === 'function') this[method]();
    }

    // ── Convenience transitions ───────────────────────────────────────────────

    start() {
        if (this._onReset) this._onReset();
        this.setState(GAME_STATES.PLAYING);
    }

    pause() {
        if (this.isPlaying()) this.setState(GAME_STATES.PAUSED);
    }

    resume() {
        if (this.isPaused()) this.setState(GAME_STATES.PLAYING);
    }

    togglePause() {
        if (this.isPlaying()) this.pause();
        else if (this.isPaused()) this.resume();
    }

    toMenu() {
        this.setState(GAME_STATES.MENU);
    }

    toGameOver() {
        this.setState(GAME_STATES.GAMEOVER);
    }

    toWin() {
        this.setState(GAME_STATES.WIN);
    }

    // ── Lifecycle hooks (override in subclass) ────────────────────────────────
    // These are called automatically by setState().
    // Naming convention: onEnter<StateName> / onExit<StateName>
    //   e.g. onEnterPlaying(), onExitPaused(), onEnterGameover() …

    onEnterMenu()     {}
    onExitMenu()      {}
    onEnterPlaying()  {}
    onExitPlaying()   {}
    onEnterPaused()   {}
    onExitPaused()    {}
    onEnterGameover() {}
    onExitGameover()  {}
    onEnterWin()      {}
    onExitWin()       {}
}
