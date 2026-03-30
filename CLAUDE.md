# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Spellbound** is a roguelike deck-builder / word game ("Boggle meets Balatro, set in a cozy infinite library"). The player rolls letter dice into a 4x4 grid, traces adjacent letters to form words, and scores using a chips x mult system. The primary design document is `spellbound.md` (v0.5).

## Running the Prototype

No build step. Open `index.html` in a browser, or serve with any static server:
```
python -m http.server 8080
# then visit http://localhost:8080
```

## Architecture

Plain HTML/CSS/JS with no frameworks or bundler. Scripts load in order via `<script>` tags:

1. **`js/dictionary.js`** — Word list (~3000 words) stored as a newline-delimited string, loaded into a `Trie` for O(k) prefix/word checking. Exports `GameDictionary` (initDictionary, isValidWord, checkPrefix).
2. **`js/dice.js`** — Standard Boggle dice faces, letter chip values, word length multipliers, grid dealing, adjacency checking, re-roll. Exports `GameDice`.
3. **`js/game.js`** — Core state machine: floor/page definitions, scoring (chips x mult with charm effects), charm definitions with effect functions, story twists, shop item generation, gold economy. Exports `Game`.
4. **`js/ui.js`** — All DOM rendering and input handling. Manages screen transitions (title → playing → shop → pageResult → gameOver/victory). Cell click tracing with adjacency validation. Initializes on DOMContentLoaded.

All modules attach to `window.*` globals — no ES modules.

## Key Design Concepts

- **Core loop:** Roll 4x4 grid → trace words (Boggle adjacency) → used dice re-roll in place → repeat until submissions exhausted → score vs target → shop
- **Scoring:** `(sum of letter chips + bonuses) x (word length mult + mult bonuses)`. Minimum 3-letter words.
- **Dice bag** replaces a traditional deck — 16 dice drawn into the grid, with bag size > 16 introducing randomness as a strategic tradeoff
- **4 Writers** (characters) each change the core mechanic: Novelist (5 submissions, no timer), Journalist (60s timer), Poet (3 submissions, x2 scoring), Editor (4 submissions + 3 grid swaps). Only The Novelist is implemented in this prototype.
- **Charms** (passive relics, max 5) are the engine-building mechanic, with designed synergies
- **Single-life tension:** fail any page and the run ends — no extra lives
- **8 hand-authored floors** (campaign), then procedural Endless Stacks (not yet implemented)

## Balatro-to-Spellbound Glossary

Floor = Ante, Page = Blind, Final Page = Boss Blind, Charm = Joker, Dice Bag = Deck, Ink Card = Consumable, Bookmark = Tag, Ink & Quill Cart = Shop
