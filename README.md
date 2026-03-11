# Softbody Tetris

A 2D browser game built with vanilla JavaScript and the Canvas API. The core concept is a Tetris-style falling piece mechanic where every piece is a softbody — a deformable mass-spring system that squishes, bounces, and reacts physically to the environment and other pieces.

The game is currently in the physics prototyping stage. The softbody simulation is being built and tuned before game logic is layered on top.

---

## Concept

Standard Tetris pieces are rigid. Here, each piece is a blob — a ring of particles connected by springs. Pieces deform on impact, wobble as they settle, and interact with each other through particle-level collision. The goal is to preserve the core Tetris loop (clear lines, score, speed up) while replacing rigid geometry with a fully simulated softbody.

---

## Current state

- Softbody blob: ring of particles connected by perimeter springs and cross-diameter springs
- Mass-spring physics with Hooke's law, gravity, damping, and velocity integration
- Canvas boundary collision with restitution
- Mouse drag: grab and pull any blob interactively
- Multiple blobs simulated simultaneously

Game rules, line clearing, and piece generation are not yet implemented.

---

## Project structure

```
softbody-tetris-js/
├── index.html
├── style.css
└── src/
    ├── main.js                    ← Entry point: wires all systems together
    ├── polyfills.js               ← Browser shims
    ├── debug.js                   ← FPS counter, debug overlay
    │
    ├── core/
    │   ├── Point.js               ← 2D point: distance, lerp, rotation, line math
    │   ├── Vector2.js             ← Extends Point: reflect, drag, forces
    │   ├── Rectangle.js           ← AABB: contains, intersect, union
    │   ├── MathUtils.js           ← Clamp, remap, easing, random, angle utils
    │   ├── EventBus.js            ← Pub/sub event system
    │   ├── InputManager.js        ← Keyboard, mouse, touch input
    │   ├── GameLoop.js            ← requestAnimationFrame loop, capped delta time
    │   ├── Gravity.js             ← Stateless gravity applicator for RigidBodyGameObjects
    │   └── index.js
    │
    ├── entities/
    │   ├── GameObject.js          ← Base class: position, rotation, bounds, vertices
    │   ├── RigidBodyGameObject.js ← Extends GameObject: vx, vy, mass, damping, forces
    │   ├── Particle.js            ← Extends RigidBodyGameObject: circle, draw
    │   ├── Spring.js              ← Hooke's law spring between two particles
    │   ├── Blob.js                ← Softbody: particle ring + springs, drag, update, draw
    │   ├── Camera.js              ← Scroll, follow, shake
    │   └── index.js
    │
    ├── systems/
    │   ├── GameManager.js         ← Finite state machine: MENU, PLAYING, PAUSED, GAMEOVER
    │   ├── Score.js               ← Points, combo multiplier, localStorage leaderboard
    │   ├── Collision.js           ← SAT, AABB, MTV, circle helpers, boundary resolution
    │   ├── ParticleSystem.js      ← Pool-based visual particles
    │   └── index.js
    │
    ├── rendering/
    │   ├── Renderer.js            ← Clear, world, HUD render layers
    │   ├── ArcadeRenderer.js      ← Pixel text, progress bars, arcade-style helpers
    │   └── index.js
    │
    └── constants/
        └── GameStates.js
```

---

## Running locally

ES modules require a server — opening `index.html` directly from the filesystem will not work.

```bash
# Node
npx serve .

# Python
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

---

## Physics overview

Each blob is a ring of `N` particles evenly distributed around a circle. Springs connect:

- **Perimeter springs** — each particle to its two neighbours, maintaining the shape of the outline
- **Cross springs** — each particle to the one directly opposite, providing structural resistance to collapse

Every spring applies Hooke's law each frame:

```
F = k * (currentLength - restLength)
```

Forces are accumulated on each particle, then integrated via Euler integration. Damping is applied to velocity each step to prevent infinite oscillation.

Gravity is applied externally as a constant downward acceleration. Boundary collision clamps positions and reflects velocity scaled by a restitution coefficient.

---

## Credits

Spring physics based on the Spring Forces coding challenge by Daniel Shiffman.

- https://thecodingtrain.com/CodingChallenges/160-spring-forces.html
- https://youtu.be/Rr-5HiXquhw

Engine structure derived from [Fwoggy-Flick](https://github.com/salman-m-498/Fwoggy-Flick).
