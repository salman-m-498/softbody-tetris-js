/**
 * GameStates.js
 * Base game state constants — extend or replace for your specific game.
 *
 * Usage:
 *   import { GAME_STATES } from '../constants/GameStates.js';
 *   manager.setState(GAME_STATES.PLAYING);
 */

export const GAME_STATES = Object.freeze({
    LOADING:           'LOADING',
    MENU:              'MENU',
    PLAYING:           'PLAYING',
    PAUSED:            'PAUSED',
    CUTSCENE:          'CUTSCENE',
    TRANSITION:        'TRANSITION',
    GAMEOVER:          'GAMEOVER',
    WIN:               'WIN',
});
