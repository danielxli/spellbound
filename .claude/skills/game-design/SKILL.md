---
name: game-design
description: Design and implement polished game UI, screens, animations, and visual effects for Spellbound. Use this skill when the user asks to build game screens, menus, overlays, scoring animations, visual effects, or any player-facing game interface. Produces distinctive, juicy, production-grade game UI that feels like a real mobile game — not a web prototype.
---

This skill guides creation of polished, production-grade game interfaces for Spellbound — a roguelike deck-builder word game ("Boggle meets Balatro, set in a cozy infinite library"). Every screen, animation, and interaction should feel like it belongs in a top-tier indie mobile game.

The user provides game UI requirements: a screen, overlay, animation, visual effect, menu, or interaction to build. They may include context about the gameplay purpose, player flow, or design constraints.

## Design Thinking

Before coding, understand the game context and commit to a design direction that serves the player experience:

- **Player moment**: What is the player feeling right now? Tension before a score reveal? Relief after clearing a floor? Excitement in the shop? Dread on a final page? Design for the emotion.
- **Game feel priority**: Pick what matters most for this element: juice/satisfaction, clarity/readability, tension/stakes, discovery/delight, or flow/speed. Every element can't maximize everything — choose.
- **Information hierarchy**: What does the player NEED to see vs. what's flavor? Score, target, and submissions are life-or-death. Charm names and narrator text are atmosphere. Never let flavor compete with critical info.
- **Pacing**: Games live and die by pacing. Scoring animations need beats and crescendo. Shop screens need breathing room. Grid interactions need snappy response. Match the tempo to the moment.
- **Differentiation**: What makes this screen feel like *Spellbound* and not a generic word game? The cozy library aesthetic, warm amber palette, serif typography, literary flavor text, the dice-and-ink metaphor.

## Spellbound Aesthetic Identity

Spellbound has a specific, established visual language. Every new UI element must feel native to it:

### Color Palette (use CSS variables)
- **Backgrounds**: `--bg-dark` (#1a1410), `--bg-main` (#2a2118), `--bg-card` (#3a2f24) — deep warm browns, like aged leather and dark wood
- **Primary accent**: `--amber` (#d4a04a), `--amber-light` (#e8c47a) — warm lamplight, golden ink
- **Gold**: `--gold` (#ffd700) — rewards, achievements, premium feel
- **Text**: `--cream` (#f0e6d2), `--text` (#e8dcc8) — parchment tones, never pure white
- **Rarity colors**: common (gray), uncommon (green), rare (blue), epic (purple), legendary (gold) — these are sacred, don't deviate
- **State colors**: `--green` for success/valid, `--red` for failure/danger — used sparingly

### Typography
- **Display/headers**: 'Crimson Text', serif — literary, warm, authoritative. Used for titles, score numbers, charm names, floor names
- **Body/UI**: 'Inter', sans-serif — clean, readable for stats, labels, buttons
- **Flavor text**: Crimson Text italic — narrator quotes, charm flavors, opening lines
- **Never use**: generic sans-serif for headers, monospace for game elements, decorative fonts that break the library tone

### Animation Principles
- **Juice over flash**: Every interaction should have feedback, but subtle. A 2px lift on hover, a 0.97 scale on press, a 300ms fade. Don't overanimate.
- **Staggered reveals**: When showing multiple elements (letters in scoring, items in shop, stats on game over), stagger them with 80-150ms delays. This creates rhythm and lets the player process each piece.
- **Scoring is the star**: The scoring animation is Spellbound's signature moment — letter-by-letter chip counting, charm trigger reveals, multiplier bumps, final score slam. This is where you go big: screen shake, sound cues, scale pops. Study Balatro's scoring for inspiration.
- **Transitions between screens**: Page turn animation, fade overlays, slide-up cards. Never hard-cut between screens.
- **Grid animations**: Dice cascade in (staggered, with 3D rotation feel), rerolled dice tumble, shake rattles the grid. The grid should feel physical — like real dice on a real desk.
- **CSS-first**: Prefer CSS `@keyframes` and `transition` over JS-driven animation. Use `cubic-bezier` easing, never linear. Common easings: `cubic-bezier(0.4, 0, 0.2, 1)` for standard, `cubic-bezier(0.34, 1.56, 0.64, 1)` for bouncy.

### Audio Design (Web Audio API, procedural)
- All SFX are synthesized — no audio files. Use oscillators (sine, triangle, square) and noise buffers.
- **Tile tap**: short sine pop (1800Hz, 30ms)
- **Word submit**: ascending 3-note arpeggio (C5-E5-G5)
- **Chip count**: square wave tick with rising pitch per letter — this is the Balatro-style tally sound
- **Charm trigger**: filtered white noise sparkle (highpass 6000Hz)
- **Score slam**: low sine thump (100Hz) + noise burst
- **Gold**: metallic dual-tone clink (3000Hz + 4500Hz)
- **Always respect** `Settings.get('sfxVolume')` — multiply all gain values by this

### Haptic Feedback
- Light (5ms vibrate): tile selection, small UI taps
- Medium (15ms): word submit, shake, button confirms
- Heavy ([20, 10, 30] pattern): big score slam, victory
- Always check `Settings.get('hapticsOn')` first

## Architecture Rules

Spellbound is plain HTML/CSS/JS with no frameworks. Follow these patterns exactly:

### Screen/Overlay Pattern
Every new screen is an overlay appended to `#app`:
```javascript
function showMyOverlay() {
  const div = document.createElement('div');
  div.className = 'overlay'; // or a custom class
  div.id = 'my-overlay';
  div.innerHTML = `
    <div class="overlay-card">
      <!-- content -->
    </div>
  `;
  document.getElementById('app').appendChild(div);
}
```
Overlays are cleaned up by `render()` which removes `.overlay, .gold-reward-overlay, .floor-intro, .twist-reveal, .page-turn`.

### State Machine
Game phases: `'title' | 'playing' | 'scoring' | 'pageResult' | 'shop' | 'gameOver' | 'victory'`
The main `render()` function switches screens based on `state.phase`. Add new phases if needed.

### Global Exports
All functions called from `onclick` in HTML must be exported: `window.myFunction = myFunction;`

### Script Load Order
`dictionary.js → dice.js → storage.js → settings.js → audio.js → game.js → ui.js`
All modules use `window.*` globals. No ES modules, no imports.

### Persistence
Call `Storage.saveRun(state)` after any game state mutation the player would want preserved. Call `Storage.clearRun()` + `Storage.updateStats(state)` on game over/victory.

### Animation Speed
Use `animDelay(ms)` wrapper for all animation timings — this respects the user's speed preference (1x normal, 2x fast).

## Game Design Principles

When designing game UI, apply these game design heuristics:

- **Show, don't tell**: Animate a charm triggering rather than showing a text log. Flash the rarity color. Bump the multiplier number.
- **Reward the eye**: When the player does something good (big word, high score, charm combo), the UI should celebrate. Screen shake, particle burst, gold sparkle, satisfying number animation.
- **Punish gently**: When something goes wrong (invalid word, game over), use muted feedback. A dull thud, a subtle red flash, a deflating animation. Don't punish with loud/jarring effects.
- **Progressive disclosure**: Don't show everything at once. Scoring reveals letter by letter. Shop items have hover/tap for details. Stats unfold row by row.
- **Tactile metaphor**: Spellbound's dice, ink, and paper metaphor should be felt. Dice should clatter. Pages should turn. Ink should flow. Charms should glimmer.
- **Economy of attention**: On the game screen, the grid and word display dominate. Score bar is always visible but unobtrusive. Charms are small pips until they trigger. Narrator fades in and out. Nothing fights for attention during active play.

## Mobile-First Constraints

- Max width 500px for game container — design for phone screens
- Touch targets minimum 44x44px
- No hover-dependent interactions (hover is enhancement only)
- `touch-action: manipulation` and `-webkit-tap-highlight-color: transparent` on interactive elements
- Safe area support via `env(safe-area-inset-top/bottom)` for notched devices
- No `prompt()`, `alert()`, or `confirm()` — use custom overlays instead

## What NOT to Do

- **No generic UI patterns**: Don't make it look like a web app. No flat material cards, no Bootstrap grids, no standard form elements. This is a *game*.
- **No excessive text**: If you need more than 2 sentences to explain something in-game, the design is wrong. Use icons, animations, and spatial layout to communicate.
- **No competing animations**: One thing moves at a time during important moments (scoring). Background ambiance (dust motes, glow) is fine always.
- **No breaking the palette**: Don't introduce new colors. The palette is intentionally constrained. If you need emphasis, use the existing rarity tiers or the amber/gold accent.
- **No skipping audio/haptics**: Every new interaction should have a sound and (where appropriate) haptic feedback. Silence feels broken in a game.
