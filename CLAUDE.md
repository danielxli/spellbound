# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Spellbound** is a roguelike deck-builder / word game ("Boggle meets Balatro, set in a cozy infinite library"). The player rolls letter dice into a 4x4 grid, traces adjacent letters to form words, and scores using a chips x mult system. Targeting mobile app stores via Capacitor.

## Running

No build step. Serve with any static server (word list loads via fetch):
```
python -m http.server 8080
# then visit http://localhost:8080
```

Playtest script (simulates 30 AI runs): `node playtest.js`

Live at: https://danielxli.github.io/spellbound/

## Architecture

Plain HTML/CSS/JS with no frameworks or bundler. Scripts load in order via `<script>` tags:

1. **`js/dictionary.js`** — Loads ~358K words from `words_filtered.txt` into a Trie. Exports `GameDictionary`.
2. **`js/dice.js`** — Boggle dice faces, letter chip values, word length multipliers, grid dealing, adjacency. Exports `GameDice`.
3. **`js/storage.js`** — localStorage persistence: run save/resume, career stats, settings, tutorial flag. Exports `Storage`.
4. **`js/settings.js`** — User preferences (SFX volume, haptics, animation speed). Exports `Settings`.
5. **`js/audio.js`** — Procedural Web Audio SFX (12 sounds) + haptic feedback. No audio files. Exports `GameAudio`.
6. **`js/game.js`** — Core state machine: 7 floor definitions with narrative, scoring (chips x mult with charm effects), 31 charms with weighted rarity shop generation, 6 story twists, shop, gold economy. Exports `Game`.
7. **`js/ui.js`** — All DOM rendering and input. Screen transitions, Balatro-style scoring animation, pause menu, settings overlay, wild card picker. Exports globals for onclick handlers.

All modules attach to `window.*` globals — no ES modules.

## Three Scaling Layers

1. **Charms** (max 5) — passive scoring effects. 31 total across common/uncommon/rare/legendary. Weighted rarity in shops (legendaries ~3% early, ~10% late). Includes multiplicative, scaling, retrigger, penalty tradeoff, and gold conversion types. Sellable for half cost.
2. **Word Upgrades** (planet cards) — permanently add +1 base mult to a specific word length. Cost escalates per level.
3. **Die Upgrades** — pick a specific die in your bag, +5 chips permanently. Max 3 upgrades per die (+15 cap).

## Floor Targets (7 floors, 1x/1.5x/2x page pattern)

F1: 50/100/150 | F2: 250/375/500 | F3: 500/750/1000 | F4: 1000/1500/1800
F5: 2000/3000/4000 | F6: 4000/6000/8000 | F7: 8000/12000/16000

Gold per page: 5/7/10 (+ unused submissions x 2 bonus)

Playtest win rate: ~10-17% for AI with mixed 4-6 letter words.

## Key Design Concepts

- **Core loop:** Roll 4x4 grid → trace words (Boggle adjacency) → used dice re-roll in place → repeat until submissions exhausted or target met → score vs target → shop
- **Scoring:** `(sum of letter chips + bonuses) x (word length mult + bonuses) x charm multipliers`
- **Finish early:** Banking unused submissions as bonus gold is key to the economy
- **Dice bag** replaces a traditional deck — 16 dice drawn into the grid
- **Single-life tension:** fail any page and the run ends
- **The Novelist** character: 5 submissions per round, no timer (only character implemented)
- **Shake:** re-rolls entire grid, costs 1 submission

## Mobile Features

- **Persistence:** localStorage save/resume, career stats
- **Audio:** 12 procedural Web Audio SFX (no files), haptic feedback
- **Settings:** SFX volume, haptics toggle, animation speed (1x/2x)
- **PWA:** manifest.json, service worker, offline support
- **Capacitor:** package.json ready, safe area CSS, viewport-fit=cover

## Balatro-to-Spellbound Glossary

Floor = Ante, Page = Blind, Final Page = Boss Blind, Charm = Joker, Dice Bag = Deck, Ink Card = Consumable, Ink & Quill Cart = Shop, Word Upgrade = Planet Card, Die Upgrade = Tarot Card
