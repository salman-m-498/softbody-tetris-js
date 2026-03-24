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
import { Grid }            from './entities/Grid.js';

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

const BLOB_PALETTE = {
    red:    '#FF6B6B',
    blue:   '#6BB5FF',
    green:  '#6BFF8E',
    yellow: '#FFE66B',
};
const BLOB_COLOR_KEYS = Object.keys(BLOB_PALETTE);
const BLOB_MIN_RADIUS = 42;
const BLOB_MAX_RADIUS = 60;
const SPAWN_INTERVAL  = 3; // seconds between auto-drops
let   spawnTimer      = SPAWN_INTERVAL;

const blobs = []; // starts empty — spawner handles population
let activeBlob = null; // the blob currently under player control
let nextColorKey = BLOB_COLOR_KEYS[Math.floor(Math.random() * BLOB_COLOR_KEYS.length)];

const grid = new Grid(0, 0, canvas.width, canvas.height, 28, BLOB_PALETTE);
grid.init();

// ── 4. Game reset ─────────────────────────────────────────────────────────────

function resetGame() {
    score.reset();
    particles.clear();
    blobs.length   = 0;
    activeBlob     = null;
    spawnTimer     = SPAWN_INTERVAL;
    _clearCooldown = 0;
    nextColorKey   = BLOB_COLOR_KEYS[Math.floor(Math.random() * BLOB_COLOR_KEYS.length)];
}

// ── Clear helpers ────────────────────────────────────────────────────

function spawnBlob() {
    const radius   = BLOB_MIN_RADIUS + Math.random() * (BLOB_MAX_RADIUS - BLOB_MIN_RADIUS);
    const x        = radius + Math.random() * (canvas.width - radius * 2);
    const colorKey = nextColorKey;
    nextColorKey   = BLOB_COLOR_KEYS[Math.floor(Math.random() * BLOB_COLOR_KEYS.length)];
    const blob     = new Blob(x, -radius * 2, { radius, color: BLOB_PALETTE[colorKey], colorKey });
    blobs.push(blob);
    activeBlob = blob; // newest blob becomes the active one
}

let _clearCooldown = 0;
const CLEAR_COOLDOWN = 0.6; // prevents re-triggering while blobs settle after a clear

/**
 * Edge clear: any color with a contiguous left-to-right cell path is cleared.
 * All blobs of that color are removed entirely — gravity cascades the rest down.
 */
function clearColors() {
    if (_clearCooldown > 0) return;
    const clearing = grid.getColorPaths();
    if (clearing.length === 0) return;
    for (const colorKey of clearing) {
        for (let i = blobs.length - 1; i >= 0; i--) {
            if (blobs[i].colorKey === colorKey) blobs.splice(i, 1);
        }
    }
    score.add(200 * clearing.length);
    score.hit();
    _clearCooldown = CLEAR_COOLDOWN;
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
        // Tick timers
        _clearCooldown = Math.max(0, _clearCooldown - dt);

        // Auto-spawn blobs from the top
        spawnTimer -= dt;
        if (spawnTimer <= 0) { spawnBlob(); spawnTimer = SPAWN_INTERVAL; }

        // ── Keyboard control of the active blob ──────────────────────────────
        // If the active blob is no longer in the list (e.g. removed by clear),
        // we stop trying to control it.
        if (activeBlob && !blobs.includes(activeBlob)) activeBlob = null;

        const MOVE_FORCE  = 3200; // horizontal push per second
        const DROP_FORCE  = 1000; // extra downward impulse on tap
        if (activeBlob) {
            const moveLeft  = input.isDown('ArrowLeft')  || input.isDown('KeyA');
            const moveRight = input.isDown('ArrowRight') || input.isDown('KeyD');
            const softDrop  = input.isDown('ArrowDown')  || input.isDown('KeyS');
            const hardDrop  = input.isJustPressed('ArrowDown') || input.isJustPressed('KeyS');

            for (const p of activeBlob.particles) {
                if (moveLeft)  p.applyForce(-MOVE_FORCE * dt, 0);
                if (moveRight) p.applyForce( MOVE_FORCE * dt, 0);
                if (softDrop)  p.applyForce(0,  MOVE_FORCE * dt);
            }
            // Hard-drop: single-frame impulse on first press for a snappier feel
            if (hardDrop) {
                for (const p of activeBlob.particles) p.applyForce(0, DROP_FORCE);
            }
        }

        for (const blob of blobs) {
            Gravity.apply(blob.particles, dt);
            blob.update(dt);
            for (const p of blob.particles) {
                CollisionUtils.resolveCircleBoundary(p, canvas.width, canvas.height);
            }
        }

        // Softbody blob-to-blob collision — all pairs
        for (let i = 0; i < blobs.length; i++) {
            for (let j = i + 1; j < blobs.length; j++) {
                if (CollisionUtils.checkAABB(blobs[i], blobs[j])) {
                    const edgesI = blobs[i].getEdges();
                    const edgesJ = blobs[j].getEdges();
                    for (const p of blobs[i].particles)
                        for (const [a, b] of edgesJ)
                            CollisionUtils.resolveParticleEdge(p, a, b);
                    for (const p of blobs[j].particles)
                        for (const [a, b] of edgesI)
                            CollisionUtils.resolveParticleEdge(p, a, b);
                }
            }
        }

        // Remove blobs that have fallen completely off the bottom
        for (let i = blobs.length - 1; i >= 0; i--) {
            if (blobs[i].getBroadBounds().top > canvas.height + 100) blobs.splice(i, 1);
        }

        score.update(dt);
        particles.update(dt);

        grid.update(dt, blobs);
        clearColors();
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

    grid.draw(ctx);

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

    // Next-color preview panel
    drawNextPanel(ctx);
}

function drawNextPanel(ctx) {
    const PAD    = 8;
    const W      = 56;
    const H      = 66;
    const x      = canvas.width - W - PAD;  // right-aligned
    const y      = 48;
    const cx     = x + W / 2;
    const color  = BLOB_PALETTE[nextColorKey];

    // Panel background
    ctx.save();
    ctx.fillStyle   = 'rgba(0,0,0,0.55)';
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, W, H, 6);
    ctx.fill();
    ctx.stroke();

    // "NEXT" label
    ctx.restore();
    ArcadeRenderer.pixelTextCentered(ctx, 'NEXT', cx, y + 11, 6, 'rgba(255,255,255,0.6)');

    // Color swatch — glowing filled circle
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur  = 12;
    ArcadeRenderer.circle(ctx, cx, y + H - 22, 16, color, 'rgba(0,0,0,0.4)', 2);
    ctx.restore();
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
