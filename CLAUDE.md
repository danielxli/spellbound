# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Spellbound** is a roguelike deck-builder / word game ("Boggle meets Balatro, set in a cozy infinite library"). The player rolls letter dice into a 4x4 grid, traces adjacent letters to form words, and scores using a chips x mult system. The primary design document is `spellbound.md` (v0.5).

## Running the Prototype

No build step. Serve with any static server (word list loads via fetch):
```
python -m http.server 8080
# then visit http://localhost:8080
```

Live at: https://danielxli.github.io/spellbound/

## Architecture

Plain HTML/CSS/JS with no frameworks or bundler. Scripts load in order via `<script>` tags:

1. **`js/dictionary.js`** — Loads ~358K words from `words_filtered.txt` (from dwyl/english-words) into a Trie for O(k) prefix/word checking. Exports `GameDictionary`.
2. **`js/dice.js`** — Standard Boggle dice faces, letter chip values (Common 2, Uncommon 4, Rare 6, Epic 10, Legendary 15), word length multipliers (3:x1 through 10+:x8), grid dealing, adjacency, re-roll. Q always becomes QU. Exports `GameDice`.
3. **`js/game.js`** — Core state machine: floor definitions with narrative, scoring (chips x mult with charm/upgrade effects), 30 charms across 6 categories, 6 story twists, shop generation (charms, word upgrades, die upgrades, ink cards), gold economy. Exports `Game`.
4. **`js/ui.js`** — All DOM rendering and input. Screen transitions (title → floor intro → playing → scoring animation → page result → shop → twist reveal → game over/victory). Balatro-style step-by-step scoring animation. Die picker for upgrades. Exports globals for onclick handlers.

All modules attach to `window.*` globals — no ES modules.

## Three Scaling Layers

1. **Charms** (max 5) — passive scoring effects. 30 total across common/uncommon/rare/legendary. Includes multiplicative, scaling, retrigger, penalty tradeoff, and gold conversion types. Sellable in shop for half cost.
2. **Word Upgrades** (planet cards) — permanently add +1 base mult to a specific word length. Named by length (Haiku, Limerick, Sonnet, etc). Cost escalates per level.
3. **Die Upgrades** — pick a specific die in your bag, +5 chips permanently. Max 3 upgrades per die (+15 cap). Upgraded dice glow gold on the grid.

## Floor Targets (Balatro 1x/1.5x/2x pattern)

F1: 50/75/100 | F2: 150/225/300 | F3: 400/600/800 | F4: 1000/1500/2000
F5: 2500/3750/5000 | F6: 5500/8250/11000 | F7: 10000/15000/20000 | F8: 15000/22500/30000

## Key Design Concepts

- **Core loop:** Roll 4x4 grid → trace words (Boggle adjacency) → used dice re-roll in place → repeat until submissions exhausted → score vs target → shop
- **Scoring:** `(sum of letter chips + bonuses) x (word length mult + bonuses) x charm multipliers`
- **Dice bag** replaces a traditional deck — 16 dice drawn into the grid
- **Single-life tension:** fail any page and the run ends
- **The Novelist** character: 5 submissions per round, no timer (only character implemented)
- **Shake:** re-rolls entire grid, costs 1 submission

## Balatro-to-Spellbound Glossary

Floor = Ante, Page = Blind, Final Page = Boss Blind, Charm = Joker, Dice Bag = Deck, Ink Card = Consumable, Ink & Quill Cart = Shop, Word Upgrade = Planet Card, Die Upgrade = Tarot Card
