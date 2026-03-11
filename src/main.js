/**
 * main.js — Game entry point template
 *
 * This file owns the canvas, the game loop, and wires together all systems.
 * Replace the TODO sections with your game-specific logic.
 *
 * Sections:
 *   1. Imports
 *   2. Canvas setup + fullscreen
 *   3. System instantiation
 *   4. Game state reset
 *   5. Update logic
 *   6. Render logic
 *   7. Game loop start
 */

// ── 1. Imports ────────────────────────────────────────────────────────────────

import './polyfills.js';

import { GameLoop }      from './core/GameLoop.js';
import { InputManager }  from './core/InputManager.js';
import { EventBus }      from './core/EventBus.js';

import { GAME_STATES }   from './constants/GameStates.js';
import { GameManager }   from './systems/GameManager.js';
import { ScoreSystem }   from './systems/Score.js';
import { ParticleSystem }from './systems/ParticleSystem.js';
import { CollisionUtils }from './systems/Collision.js';
import { Gravity }      from './core/Gravity.js';

import { Renderer }      from './rendering/Renderer.js';
import { ArcadeRenderer }from './rendering/ArcadeRenderer.js';

import { Camera }        from './entities/Camera.js';
import { GameObject }    from './entities/GameObject.js';

import { Particle }        from './entities/Particle.js';
import { Blob }            from './entities/Blob.js';

import { DebugDraw, FPSCounter } from './debug.js';

// ── 2. Canvas setup ───────────────────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

canvas.focus();

// Fullscreen toggle
(function () {
    const btn       = document.getElementById('fullscreenBtn');
    const container = canvas.parentElement;
    const ASPECT    = canvas.width / canvas.height;

    function scaleToFit() {
        const vw = window.innerWidth, vh = window.innerHeight;
        let w = vw, h = vw / ASPECT;
        if (h > vh) { h = vh; w = vh * ASPECT; }
        canvas.style.width  = Math.floor(w) + 'px';
        canvas.style.height = Math.floor(h) + 'px';
    }

    function resetScale() {
        canvas.style.width = canvas.style.height = '';
    }

    btn?.addEventListener('click', () => {
        const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
        if (isFS) document.exitFullscreen?.() || document.webkitExitFullscreen?.();
        else      container.requestFullscreen?.() || container.webkitRequestFullscreen?.();
        canvas.focus();
    });

    function onFSChange() {
        const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
        container?.classList.toggle('is-fullscreen', isFS);
        if (isFS) { scaleToFit(); window.addEventListener('resize', scaleToFit); }
        else       { window.removeEventListener('resize', scaleToFit); resetScale(); }
        canvas.focus();
    }
    document.addEventListener('fullscreenchange',       onFSChange);
    document.addEventListener('webkitfullscreenchange', onFSChange);
})();

// ── 3. System instantiation ───────────────────────────────────────────────────

const input     = new InputManager(canvas);
const score     = new ScoreSystem({ storageKey: 'my-game-leaderboard' });
const particles = new ParticleSystem(400);
const camera    = new Camera(canvas.width, canvas.height);
const fps       = new FPSCounter();

// Extend GameManager with your game's lifecycle
class MyGameManager extends GameManager {
    onEnterPlaying() {
        resetGame();
    }
    onEnterGameover() {
        score.save();
    }
}

const gm = new MyGameManager({
    onReset: () => resetGame(),
});

score.loadBest();

// ── Initialize GameObjects ───────────────────────────────────────────────────

const blobs = [
    new Blob(canvas.width / 3,       canvas.height / 2),
    new Blob(canvas.width / 3 * 2,   canvas.height / 2),
];

// ── 4. Game reset ─────────────────────────────────────────────────────────────

function resetGame() {
    score.reset();
    particles.clear();

    // TODO: reset your game objects here
    // player.x = canvas.width / 2;
    // enemies.length = 0;
}

// ── 5. Update ─────────────────────────────────────────────────────────────────

function update(dt) {
    fps.update(dt);
    camera.update(dt);

    // ── Input: toggle pause ──
    if (input.isJustPressed('KeyP') || input.isJustPressed('Escape')) {
        gm.togglePause();
    }

    // ── State-specific logic ──
    if (gm.isMenu()) {
        if (input.isJustPressed('Space') || input.mouse.justLeft) {
            gm.start();
        }
    }

    if (gm.isPlaying()) {
        // TODO: update player, enemies, etc.
        // player.update(dt, input);
        // for (const e of enemies) e.update(dt);
        // checkCollisions();
        for (const blob of blobs) {
            if (input.mouse.justLeft)  blob.startDrag(input.mouse.x, input.mouse.y);
            if (!input.mouse.left)     blob.endDrag();
            blob.updateDrag(input.mouse.x, input.mouse.y, dt);

            Gravity.apply(blob.particles, dt);
            blob.update(dt);
            for (const p of blob.particles) {
                CollisionUtils.resolveCircleBoundary(p, canvas.width, canvas.height);
            }
        }

        score.update(dt);
        particles.update(dt);

        // Example: camera follow
        // camera.follow(player, dt);
    }

    input.update(); // MUST be last — clears justPressed flags
}

// ── 6. Render ─────────────────────────────────────────────────────────────────

function render(ctx) {
    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gm.isMenu())    drawMenu(ctx);
    if (gm.isPlaying()) drawGame(ctx);
    if (gm.isPaused())  { drawGame(ctx); drawPauseOverlay(ctx); }
    if (gm.isGameOver()) drawGameOver(ctx);

    // Debug overlay (only when DEBUG=true in debug.js)
    DebugDraw.info(ctx, [
        `FPS: ${fps.fps}`,
        `State: ${gm.getState()}`,
        `Score: ${score.points}`,
        `Particles: ${particles.activeCount}`,
    ]);
}

function drawMenu(ctx) {
    ArcadeRenderer.pixelTextCentered(ctx, 'MY GAME', canvas.width / 2, canvas.height / 2 - 40,
        28, ArcadeRenderer.COLORS.NEON_GREEN);
    ArcadeRenderer.pixelTextCentered(ctx, 'PRESS SPACE TO START', canvas.width / 2, canvas.height / 2 + 20,
        10, ArcadeRenderer.COLORS.WHITE);
}

function drawGame(ctx) {
    // Apply camera transform for world objects
    camera.begin(ctx);

    for (const blob of blobs) blob.draw(ctx);

    particles.draw(ctx);
    camera.end(ctx);

    // HUD (drawn in screen space, outside camera)
    drawHUD(ctx);
}

function drawHUD(ctx) {
    const combo = score.combo;

    // Score
    ArcadeRenderer.pixelText(ctx, `${score.points}`, 10, 10, 14, ArcadeRenderer.COLORS.ARCADE_YELLOW);

    // Best
    ArcadeRenderer.pixelText(ctx, `BEST ${score.best}`, 10, 32, 8, ArcadeRenderer.COLORS.WHITE);

    // Combo bar
    if (combo.count > 0) {
        ArcadeRenderer.progressBar(ctx, canvas.width - 120, 10, 110, 12,
            combo.barFill, ArcadeRenderer.COLORS.NEON_GREEN);
        ArcadeRenderer.pixelText(ctx, `x${combo.multiplier}`, canvas.width - 130, 9,
            10, ArcadeRenderer.COLORS.NEON_GREEN);
    }
}

function drawPauseOverlay(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ArcadeRenderer.pixelTextCentered(ctx, 'PAUSED', canvas.width / 2, canvas.height / 2, 24, '#ffffff');
}

function drawGameOver(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ArcadeRenderer.pixelTextCentered(ctx, 'GAME OVER', canvas.width / 2, canvas.height / 2 - 30,
        20, ArcadeRenderer.COLORS.RED);
    ArcadeRenderer.pixelTextCentered(ctx, `SCORE: ${score.points}`, canvas.width / 2, canvas.height / 2 + 10,
        12, ArcadeRenderer.COLORS.ARCADE_YELLOW);
    ArcadeRenderer.pixelTextCentered(ctx, 'PRESS SPACE TO RETRY', canvas.width / 2, canvas.height / 2 + 50,
        8, ArcadeRenderer.COLORS.WHITE);

    // Allow restart from game over
    if (input.isJustPressed('Space') || input.mouse.justLeft) {
        gm.start();
    }
}

// ── 7. Start ──────────────────────────────────────────────────────────────────

const loop = new GameLoop({ update, render, canvas });
loop.start();
