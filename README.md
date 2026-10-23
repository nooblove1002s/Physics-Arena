# Physics Arena — Battle Lab

A standalone, browser-based foundation for the Physics Arena project: a 2D circle-fighter combat sandbox with visible attacks, collision physics, game modes, God Mode stats, and an early ASB-style ability recipe panel.

## Run it

This is a static website—there is no build step or package installation.

1. Open the repository on GitHub.
2. Open `index.html` and use the preview / GitHub Pages once Pages is enabled, or download the repository and open `index.html` in a browser.
3. For easiest iteration, enable GitHub Pages in **Settings → Pages** and publish from the `main` branch, root folder.

Files:
- `index.html` — interface and controls
- `styles.css` — responsive dark battle-lab UI
- `game.js` — canvas renderer, fighter movement/collision, combat effects, basic modes, event log, and ability triggers

## Current prototype features

- 1v1 Duel, Free-for-all, Raid waves, Juggernaut, and Sandbox setup
- Bouncing circle fighters with HP bars and center HP values
- Space-like movement with wall bounce and fighter-to-fighter collision response
- Sword, Energy Beam, Explosion, Black Hole, Thorns, and Chain Lightning
- Event-driven visual cues: attack paths, impact rings, damage numbers, defeat bursts, beam glow, explosion waves, and a black-hole vortex
- Select a fighter by tapping/clicking it; add fighters with the button or press **N**
- Trigger the selected ability with the button or press **F**
- Adjustable range, cooldown, knockback, and simulation speed
- God Mode can apply very large integer HP values without converting health to JavaScript floating-point numbers
- Basic ASB block-recipe preview and combat event feed

## Important prototype notes

This is the first playable foundation, not the finished editor. The repeat-hit selector is currently a UI placeholder; the advanced hitbox editor, reliable per-target tick scheduling, saved custom abilities, team editor, full raid progression/milestones, multiplayer, and persistent saves still need implementation. The prototype uses a simple combat model and should be tested in a browser before relying on balance or advanced game rules.

The project is designed as a standalone app with modular code so the engine can later be extracted or embedded in another project if desired.
