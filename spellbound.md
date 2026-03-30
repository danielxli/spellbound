# SPELLBOUND — Game Design Spec v0.5

**Genre:** Roguelike Deck Builder / Word Game
**Pitch:** *Boggle meets Balatro, set in a cozy infinite library.* You're a writer climbing the floors of a magical library, rolling letter dice to form words powerful enough to complete each story. Build your dice bag, collect Charms, and reach the top before your story falls apart.
**Title meaning:** You're *spelling* words, and the library has you under its *spell*.
**Players:** Solo + async competitive (daily/weekly leaderboards)
**Platform:** TBD (mobile-first recommended; works on PC/web)

---

## 1. Setting & Story

### The Endless Library

You are a **Writer** — one of a few gifted wordsmiths who can enter the **Endless Library**, a vast, cozy, impossible building where every floor contains an unfinished story. The books on each floor are incomplete, their pages blank or scrambled. Only by forming words powerful enough to fill them can you climb higher.

The library is warm and inviting — amber lamplight, overstuffed armchairs, floating dust motes, cats sleeping on bookshelves. But the higher you climb, the stranger the stories become, and the harder they resist being written.

**The goal:** Reach the top floor of the library. No one ever has. The library, it seems, keeps building itself upward.

### Narrative Flavor

- Each **floor** has a genre and a name (e.g. *Floor 3: "The Moonlit Moor" — Gothic Romance*).
- Boss encounters are **Unfinished Manuscripts** — stories so stubborn they fight back with weird rules.
- The shop is the **Ink & Quill Cart**, a rolling vendor that appears on landings between floors.
- Jokers are **Charms** — trinkets, bookmarks, and curios pinned to your writer's desk that bend how words score.
- Failure means the story falls apart — your run is over in a single collapse. No extra lives. Every page matters.

---

## 2. Playable Characters (Writers)

Each Writer fundamentally changes how you interact with the grid. They aren't just stat tweaks — they alter the core mechanic of word-finding.

### Launch Roster (4 Writers)

---

#### 📖 The Novelist (Starter — Unlocked)

*"Methodical. Patient. Every word chosen with care."*

| Trait | Detail |
|---|---|
| **Core Mechanic** | **Submission-based.** You get **5 word submissions** per round. No timer. |
| **Passive** | +1 bonus submission on Final Pages. |
| **Starting Charm** | *Rough Draft* — Your first word each round gains +10 chips. |
| **Playstyle** | The default experience. Strategic, untimed. Rewards careful grid-reading and maximizing each submission. |

---

#### ⏱️ The Journalist (Unlocked after 1st clear)

*"No time for poetry. Deadline's in 60 seconds."*

| Trait | Detail |
|---|---|
| **Core Mechanic** | **Timer-based.** Submit as many words as you can in **60 seconds**, but with **diminishing returns** — your 1st–3rd words score at full value, 4th–6th at 75%, 7th+ at 50%. Used dice re-roll between submissions just like other Writers, but the re-roll animation is **instant** (snap, not tumble) so it doesn't eat into the timer. |
| **Passive** | Words submitted in the final 10 seconds gain +3 mult ("deadline rush"). |
| **Starting Charm** | *Press Pass* — Earn +1 gold for every word submitted beyond the 5th in a round. |
| **Playstyle** | Frantic and exciting. Rewards fast pattern recognition, but diminishing returns prevent brute-forcing with dozens of 3-letter words. Best runs balance speed with quality. |

---

#### 🎭 The Poet (Unlocked after winning with 3 different Charms active)

*"Fewer words. Each one perfect."*

| Trait | Detail |
|---|---|
| **Core Mechanic** | **Limited submissions (3 per round)**, but each word's final score is doubled (×2 applied *after* all other chip and mult calculations). |
| **Passive** | Words of 6+ letters gain an additional ×1.5 mult ("eloquence bonus"). |
| **Starting Charm** | *Quill of Precision* — If all 3 words in a round are 5+ letters, gain ×3 mult on the last word. |
| **Playstyle** | High-risk, high-reward. Every submission matters enormously. You need long, valuable words or you'll fall behind on scaling floors. |

---

#### 🔀 The Editor (Unlocked after playing 100 unique words across all runs)

*"The words are all there. They're just in the wrong order."*

| Trait | Detail |
|---|---|
| **Core Mechanic** | **4 submissions**, but you can **rearrange the grid**. You get **3 swaps** per round (swap any two dice positions) before or between submissions. |
| **Passive** | After using all 3 swaps, gain +5 chips on your next word. |
| **Starting Charm** | *Red Pen* — After submitting a word, you may swap 1 die for free. |
| **Playstyle** | Puzzle-solver. The grid is a problem to be *edited* into shape. Swaps let you manufacture long words that wouldn't naturally appear. |

---

### Character Design Philosophy

- Each Writer should feel like a **different game** in the first 30 seconds of a round.
- Charms and dice upgrades interact differently per character (e.g. timer-extension Charms are useless for The Novelist but critical for The Journalist).
- Leaderboards are **per-character** so players can't just optimize one.

---

## 3. Core Loop

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   ROLL GRID → SUBMIT WORD → USED DICE RE-ROLL → REPEAT  │
│        ▲                                        │        │
│        │    (repeat until submissions exhausted) │        │
│        │                                        ▼        │
│        │              SCORE THE PAGE                     │
│        │         pass → next page / floor                │
│        │         fail → run over                         │
│        │                    │                             │
│        └── INK & QUILL CART ┘                            │
└──────────────────────────────────────────────────────────┘
```

1. **Roll the Grid.** Your dice bag is shaken and 16 dice are dealt into a 4×4 grid.
2. **Find & Submit a Word.** Trace adjacent letters (orthogonal + diagonal, classic Boggle rules) to form a word. As you trace, the path glows in real-time: **green** if the current sequence is a valid word, **white** if it's a valid prefix (could become a word with more letters), **dim/red** if it's a dead end. The score is *not* shown until you submit — you know it's a real word, but not how much it'll earn until the Charms fire and the dice animate. Submit when ready.
3. **Used Dice Re-Roll.** After a word is submitted, the dice used in that word **re-roll in place** — their faces change, but their grid positions stay. The rest of the grid is unchanged. This means the grid shifts between submissions, creating new opportunities (and risks).
4. **Repeat.** Continue submitting words until you've used all your submissions (varies by Writer).
5. **Score the Page.** Your cumulative score for the round is checked against the page's target. **Pass = advance. Fail = run over.** There are no extra lives — every page is do-or-die.
6. **Ink & Quill Cart.** Between pages, spend gold on new dice, Charms, consumables, and upgrades.

### The Re-Roll Mechanic — Why It Matters

The grid shifting between submissions is the key strategic wrinkle that separates this from classic Boggle:

- **Risk/reward on word choice.** Using a high-value letter in a short word scores okay now, but re-rolls that die — you might lose it. Was it worth it?
- **Grid sculpting.** Submitting a word that uses bad letters (low value) can be worth it just to re-roll them into something better for your next submission.
- **Combo setup.** Leave key letters untouched to build toward a big word on your final submission.
- **Character interactions.** The Editor's swaps become even more powerful when combined with re-rolls — swap a die into position, submit a word using other dice, and the swapped die stays put.

---

## 4. The Dice Bag (Your "Deck")

Instead of a deck of cards, you own a **bag of letter dice**. Each die has 6 faces with letters on them.

| Concept | Details |
|---|---|
| **Starting bag** | 16 standard dice (mirrors classic Boggle distribution) |
| **Adding dice** | Buy new dice at the Cart — they get added to your bag |
| **Removing dice** | Pay to remove weak dice (trim the Q-without-U problem) |
| **Upgrading dice** | Enhance individual faces: add bonus chips, apply multipliers, make a face wild |
| **Bag size & draw** | Grid is always 4×4 (16 dice drawn randomly from your bag). If your bag has exactly 16 dice, you see all of them every round — total control. Add a 17th die and now one gets left behind each round — more powerful options, but less predictability. This is a core strategic tension. |

### Special Dice

| Die Type | Flavor | Effect |
|---|---|---|
| **Gilded Die** | *Flecked with gold leaf* | Any word using this letter awards +2 bonus gold |
| **Wild Die** | *Shimmering, never settles* | One face is a ★ wildcard — counts as any letter |
| **Ember Die** | *Warm to the touch* | Letters on this die have +5 base chips |
| **Resonant Die** | *Hums when you hold it* | Words using this letter gain +2 mult |
| **Glass Die** | *Beautiful but fragile* | +15 base chips, but shatters (removed from bag) after one use |
| **Ghost Die** | *Barely visible* | Appears in the grid without being drawn from your bag — vanishes after the round |

---

## 5. Scoring System

Scoring follows a **chips × mult** model. **Minimum word length is 3 letters** — 2-letter words are not valid submissions.

```
WORD SCORE  = (sum of letter chips + chip bonuses) × (word length mult + mult bonuses)
PAGE SCORE  = sum of all word scores submitted that round
```

### Base Letter Values

| Tier | Letters | Base Chips |
|---|---|---|
| Common | E, A, I, O, N, R, S, T, L, U | 2 |
| Uncommon | D, G, B, C, M, P | 4 |
| Rare | F, H, V, W, Y | 6 |
| Epic | K, J, X | 10 |
| Legendary | Q, Z | 15 |

### Word Length Mult

| Length | Base Mult |
|---|---|
| 3 letters | ×1 |
| 4 letters | ×2 |
| 5 letters | ×4 |
| 6 letters | ×7 |
| 7+ letters | ×12 |

### Worked Example — Floor 1, Opening Page (Target: 100)

Playing as **The Novelist** (5 submissions). No Charms yet.

| # | Word | Letters | Chips | Mult | Score |
|---|---|---|---|---|---|
| 1 | TONE | T(2) O(2) N(2) E(2) | 8 | ×2 | 16 |
| 2 | GRIP | G(4) R(2) I(2) P(4) | 12 | ×2 | 24 |
| 3 | FLAME | F(6) L(2) A(2) M(4) E(2) | 16 | ×4 | 64 |
| | | | | **Total** | **104 ✓** |

The player clears the Opening Page in 3 submissions with room to spare, but needed a 5-letter word to do it. They bank their remaining 2 submissions — earning +4 bonus gold on top of the +4 base reward for clearing the page (8 gold total). By Floor 5, targets are in the thousands — you'll need Charms, upgraded dice, and long words to keep up.

### Word Pattern Bonuses

Instead of grammar-based tagging (which is ambiguous for multi-class words), bonuses are based on **observable letter patterns** that any player can see and plan around. Active Charms can reward specific patterns:

| Pattern | Name | Example Words |
|---|---|---|
| **Double Letter** | Word contains a repeated letter | BOOK, TEETH, LLAMA |
| **Vowel-Heavy** | 3+ vowels in the word | AUDIO, OCEAN, ADIEU |
| **Consonant Run** | 3+ consonants in a row | STRENGTH, SCRIPT |
| **Bookend** | Word starts and ends with the same letter | ROAR, KAYAK, LEVEL |
| **Alphabetical Run** | Contains 3+ letters in alphabetical order | ALMOST (A-L-M), FIRST (F-I-R-S) |
| **All Unique** | No repeated letters | BRAVE, DUSK, LIGHT |
| **Rare Heavy** | 2+ letters from Epic/Legendary tier | JINX, QUARTZ |

*Example Charm: "Double Vision" — Words with double letters gain +3 mult.*

These patterns are deterministic, visible on the grid, and create interesting sub-goals while tracing words. They also combo naturally with Charms (see Section 7).

---

## 6. Floors & Progression

A run is a climb through the **Endless Library**. Each floor is a story that must be "written" by hitting score targets. **Fail any page and the run is over** — there are no extra lives.

### Floor Structure

Each floor contains **3 Pages**:

| Page | Description |
|---|---|
| **Opening Page** | Low target. Can be skipped — the story starts itself, and you pocket a **Bookmark**. No Cart visit. |
| **Rising Page** | Medium target. Can also be skipped for a Bookmark. No Cart visit. |
| **Final Page** | High target + a **Story Twist** — a special rule imposed by the unfinished manuscript. Cannot be skipped. |

The Cart only appears after pages you **play** — skipping a page means no shopping opportunity.

### Bookmarks (Skip Rewards)

When you skip a page, you earn a **Bookmark** — a one-time bonus. Bookmarks are drawn from a pool and you choose 1 of 2 options:

| Bookmark | Effect |
|---|---|
| **Gilt Edge** | +10 gold immediately |
| **Second Printing** | Next Cart visit has 1 extra Charm slot |
| **Ghostwriter's Notes** | Your next Final Page's Story Twist is revealed in advance |
| **Warm-Up** | +1 extra submission on the next page only |
| **Overstock** | Next Cart has all items discounted by 25% |
| **Annotated Copy** | Gain a random Common Charm for free |

Skipping is a genuine strategic choice: you forgo the gold/score from playing the page and the Cart visit, but gain a targeted bonus. Skipping both the Opening and Rising Pages means you walk into the Final Page with no shop visits that floor — risky but potentially efficient.

### Story Twists (Boss Mechanics)

Each Final Page features a **Story Twist** — the manuscript resisting being written. Twists are themed to the floor's literary genre.

| Twist | Genre | Rule |
|---|---|---|
| **The Unreliable Narrator** | Mystery | All vowels are hidden — you must guess which letter is under each blank |
| **Writer's Block** | Literary Fiction | Real-time timer (15 seconds per word), even for The Novelist |
| **Purple Prose** | Romance | Words under 5 letters score 0 — only long, lavish words count |
| **The Sequel** | Fantasy | You cannot reuse any word you've played earlier in the run |
| **Redacted** | Thriller | 4 random dice in the grid are face-down / unknown |
| **Lost in Translation** | Foreign Literature | Vowel dice are removed — grid is consonant-heavy |
| **The Palindrome Chapter** | Experimental | Palindromes gain ×5 mult; other words score at half |
| **Ghostwriter** | Horror | One random submission per round scores 0 — you don't know which until you submit |

### Floor Scaling

| Floor | Opening Page | Rising Page | Final Page | Genre |
|---|---|---|---|---|
| 1 — *"The First Sentence"* | 100 | 200 | 400 | Coming of Age |
| 2 — *"The Plot Thickens"* | 250 | 500 | 1,000 | Mystery |
| 3 — *"The Moonlit Moor"* | 600 | 1,200 | 2,500 | Gothic Romance |
| 4 — *"City of Whispers"* | 1,500 | 3,000 | 6,000 | Thriller |
| 5 — *"The Long Winter"* | 3,500 | 7,000 | 14,000 | Epic Fantasy |
| 6 — *"Palace of Mirrors"* | 8,000 | 16,000 | 32,000 | Surrealism |
| 7 — *"The Unwritten"* | 18,000 | 36,000 | 70,000 | Metafiction |
| 8 — *"The Last Chapter"* | 35,000 | 70,000 | 150,000 | ??? |

The scaling is roughly ×2.2 per floor. By Floor 5+, you need a well-built Charm engine and upgraded dice to keep pace.

### Endgame — The Endless Stacks

Beating Floor 8 is the **win condition**. Credits roll, the story concludes, and unlocks are awarded. But the run doesn't have to end.

After Floor 8, the library reveals **The Endless Stacks** — procedurally generated floors with names assembled from a pool of ~15 genres and ~20 title fragments (e.g. *Floor 11: "The Ivory Labyrinth" — Magical Realism*). Targets continue scaling at ×2.2 per floor with no cap. Your score keeps climbing as long as you survive.

This serves both audiences: completionists get a clear "I beat the game" moment, and leaderboard chasers get an infinite optimization treadmill. Daily/Weekly runs use this model too — most skilled players clear Floor 8, but the leaderboard question is *how far beyond it can you push?*

---

## 7. Charms (Passive Relics)

Charms are trinkets pinned to your writer's desk — the primary engine-building mechanic. Hold up to **5 Charms** at a time.

### Example Charms

| Charm | Flavor Text | Effect | Rarity |
|---|---|---|---|
| **Dog-Eared Page** | *"Always knows where you left off."* | +1 mult for every unique starting letter across your submitted words this round | Common |
| **Reading Glasses** | *"The vowels practically glow."* | +3 chips for every vowel in a word | Common |
| **Double Vision** | *"Seeing double is a feature."* | Words with double letters gain +3 mult | Common |
| **Thesaurus** | *"Why use a small word when a diminutive one will do?"* | 6+ letter words gain ×3 mult | Uncommon |
| **Bookend Clasp** | *"Everything comes full circle."* | Bookend words (same first and last letter) gain +8 chips and +2 mult | Uncommon |
| **Inkpot of Fortune** | *"Drips gold when it writes."* | Earn +2 gold per word submitted | Uncommon |
| **Consonant Crunch** | *"Who needs vowels?"* | Words with a consonant run (3+ in a row) gain ×4 mult | Rare |
| **Synonym Ribbon** | *"Same meaning, different magic."* | If your current word is the same length as your previous word, gain +15 chips | Rare |
| **The Masterwork** | *"Only for those who demand perfection."* | If every submission in a round is 5+ letters, gain ×5 mult on the last word | Legendary |
| **The Librarian's Cat** | *"Knocks things off shelves. Helpfully."* | At the start of each round, one random die in the grid is replaced with a Wild Die | Legendary |

### Charm Combos — The Engine

The real depth of Charms comes from combinations. Here are examples of how Charms interact to create exponential scoring:

**"The Vowel Engine"**
- *Reading Glasses* (+3 chips per vowel) + *Double Vision* (+3 mult for double letters) → Spell "OOZE" — 4 vowels = +12 chips, double O = +3 mult. A 4-letter word scoring like a 6-letter word.

**"The Long Game"**
- *Thesaurus* (6+ letters gain ×3 mult) + *The Masterwork* (all 5+ letters = ×5 on last word) → Build every submission around long words. Your final word could hit ×3 × ×5 = ×15 mult on top of base length mult.

**"Bookend Farmer"**
- *Bookend Clasp* (+8 chips, +2 mult on bookends) + *Consonant Crunch* (×4 mult on consonant runs) → Spell "STRUTS" — bookend S…S, consonant run STR. Both Charms fire on the same word.

**"Gold Rush"**
- *Inkpot of Fortune* (+2 gold/word) + *Press Pass* (Journalist only: +1 gold per word beyond 5th) → The Journalist submits 10 words in 60 seconds = 20 gold from Inkpot + 5 gold from Press Pass. 25 gold per round funds an aggressive shopping strategy.

The Charm pool should be designed so that ~30% of Charms have obvious synergies with at least one other Charm, and ~10% have non-obvious synergies that reward experimentation.

---

## 8. The Ink & Quill Cart (Shop)

Between pages, the **Ink & Quill Cart** rolls up — a cluttered, charming vendor's wagon run by a cheerful automaton librarian.

### Currency

- **Gold** — earned through page completion, not raw scoring. When you clear a page, you receive:
  - **Base reward** per page type: **+4 gold** (Opening), **+6 gold** (Rising), **+8 gold** (Final Page).
  - **+2 bonus gold per unused submission.** If you clear a page in 3 words instead of 5 as The Novelist, you bank 2 unused submissions = +4 bonus gold. This is the game's core economic tension: *can you beat the target with fewer words and pocket the difference?*
  - Additional gold from Charms (e.g. Inkpot of Fortune), Gilded Dice, and skipping pages.
- **Interest** — earn 1 gold per 5 gold held at end of each floor (up to +5), rewarding banking across a full floor rather than spending immediately.

### Gold Per Character — How Unused Submissions Work

| Writer | Submissions | Max Bonus Gold | Notes |
|---|---|---|---|
| **Novelist** | 5 per round | +10 (if clears in 0… but realistically +2 to +6) | The most room to optimize — a skilled Novelist clearing pages in 2–3 words earns significantly more gold |
| **Poet** | 3 per round | +6 (if clears in 0… realistically +0 to +2) | Very tight — the Poet rarely has submissions to spare, making each bonus feel earned |
| **Editor** | 4 per round | +8 (realistically +2 to +4) | Swaps let the Editor manufacture efficient words, converting swaps into gold indirectly |
| **Journalist** | Timer-based | **+1 gold per 10 unused seconds** (max +6 at 0 words) | Translates the same tension into time — finish fast, earn more. A 40-second clear = +2 bonus gold |

*Example floor: The Novelist plays all 3 pages on Floor 1. Opening Page cleared in 3 words (2 unused = +4 bonus), Rising Page in 4 words (1 unused = +2 bonus), Final Page in 5 words (0 unused = +0 bonus). Total: 4+6+8 base + 4+2+0 bonus = 24 gold. Enough for a Charm and a couple of Ink Cards.*

This system creates a satisfying skill gradient: new players spend all their submissions to safely clear pages and earn base gold. Experienced players push to clear pages efficiently, banking submissions for bonus gold that funds a stronger Charm engine — which in turn lets them clear pages even faster. The flywheel is effort-based, not score-based, so it doesn't create a rich-get-richer spiral.

### Cart Slots (5 items per visit)

| Category | Price Range | Examples |
|---|---|---|
| **New Dice** | 4–8 gold | Add a die to your bag with a specific letter distribution or a special die type |
| **Charms** | 3–10 gold | Passive relics (see Section 7) |
| **Ink Cards** | 2–4 gold | One-shot consumables used before or during a round |
| **Upgrades** | 5–12 gold | Enhance a specific die face: +3 chips, +1 mult, or convert to wild |
| **Bag Surgery** | 3–6 gold | Remove a die from your bag, or duplicate an existing die |

### Example Ink Cards (Consumables)

Ink Cards can be played at **two moments**: at the **start of a round** (before your first word) or **between submissions** (after a word scores, before tracing the next). They cannot be played mid-trace. For The Journalist, playing an Ink Card **pauses the timer** for the duration of the card's effect.

| Ink Card | Flavor | Effect |
|---|---|---|
| **Fresh Page** | *"Start over. No judgment."* | Re-roll the entire grid (all 16 dice) |
| **Cut & Paste** | *"Rearrange to taste."* | Swap two dice positions in the grid |
| **Muse's Whisper** | *"Psst — try this one."* | Highlights the highest-scoring word currently available |
| **Paperweight** | *"These letters aren't going anywhere."* | Choose up to 4 dice — they won't re-roll when used in a word this round |
| **Alchemy Ink** | *"Transforms lead type into gold."* | Transform one die into a random special die |
| **Extra Ink** | *"Just a few more words…"* | +2 bonus submissions this round (Novelist/Poet/Editor) or +20 seconds (Journalist) |

---

## 9. Meta-Progression & Unlocks

### Unlock Tracks

- **Word Catalogue** — Track unique words ever played. Milestones unlock cosmetic die skins, new Charms, and lore entries about the library.
- **Letter Mastery** — Track total chips scored per letter. Max out a letter to unlock its "Gilded" variant die.
- **Manuscript Collection** — Beating each Story Twist unlocks its lore entry and alternate twist variants for future runs.
- **Writer Unlocks** — New characters unlocked via specific achievements (see Section 2).
- **Starter Bags** — Unlock alternate starting dice configurations (e.g. "All Vowels", "Consonant Chaos", "Rare Collection").
- **The Index** *(unlocked after clearing Floor 4 for the first time)* — You can now **inspect any die** in the grid to see all 6 of its faces, not just the top face. This lets experienced players calculate re-roll odds ("this die has 3 vowels on its other faces — 50% chance I get one back") and makes bag curation (removing/upgrading dice) far more informed. Early runs stay simple and surprising; later runs reward deep strategy.

### Difficulty Modifiers (Unlocked after first win)

Stackable challenge stamps on your **Library Card** for harder runs with higher leaderboard multipliers:

- **Overdue** — No Cart (no shopping between pages)
- **Speed Read** — Real-time timer on every round, even for The Novelist
- **Minimalist** — Cannot add dice to your bag (starting 16 only)
- **Banned Books** — 3-letter words are invalid
- **Abridged** — Charm slots reduced from 5 to 3

---

## 10. Leaderboards & Async Competition

### Daily Story

- Everyone gets the **same seeded run** each day (same dice, same Cart offerings, same floors).
- Final score posted to a global leaderboard, split **per character**.
- Encourages optimizing a shared puzzle rather than relying on RNG.

### Weekly Challenge

- A curated run with **pre-set modifiers and floor order** (e.g. "This week: all Final Pages use 'Redacted', Charm slots reduced to 3").
- Separate leaderboard with cosmetic rewards (die skins, desk decorations) for top finishers.

### Stats & Profile — The Library Card

- Lifetime stats: total words written, longest word, highest single-word score, highest run score, floors climbed, favorite Charm, words per character.
- Shareable run summaries (score breakdown, Charm loadout, best word, floor reached).

---

## 11. Art Direction & Tone

- **Visual style:** Cozy, warm, handcrafted. Golden lamplight on wooden shelves, leather-bound books, scattered papers. Dice are wooden or bone-colored with stamped letters. UI elements look like card catalogue drawers, bookmarks, and sticky notes. The whole game feels like being inside a Studio Ghibli library.
- **The re-roll moment:** When you submit a word, the used dice should tumble and click satisfyingly as they re-roll in place — this is the game's signature animation. New letters appearing should feel like a mini-revelation each time.
- **Audio:** Page-turning sounds for submissions, satisfying *thunk* of wooden dice, quill-scratch scoring animations. Escalating chimes for long words, warm brass stingers for big multipliers. Background music is lo-fi jazz / acoustic — cozy study-session energy. Each floor's music should subtly shift to match its genre.
- **Tone:** Warm, witty, bookish without being pretentious. Charm flavor text is playful. Story Twist intros are written like opening lines of novels. The library feels alive — shelves rearrange themselves, books flutter, cats wander between rounds.
- **Characters:** Each Writer has a distinct visual design and personality shown through idle animations and reactions (The Journalist checks a watch nervously; The Poet gazes out a window; The Editor furiously crosses things out).

---

## 12. Monetization

**Model: Premium purchase.**

| Platform | Price |
|---|---|
| Mobile (iOS / Android) | $6.99 |
| PC / Steam | $12.99 |
| Web (itch.io or similar) | $9.99 |

No ads, no gacha, no energy systems. All content is earnable through play. Balatro proved that premium roguelikes can sell millions of copies, and a F2P model would warp meta-progression pacing to incentivize spending rather than rewarding skill.

**Post-launch paid expansion** (targeting ~6 months after release): 2 new Writers, 15+ new Charms, 4 new Story Twists, new Endless Stacks floor themes. Price: $3.99 mobile / $5.99 PC.

**Free updates:** seasonal Daily/Weekly challenge themes, cosmetic die skins tied to Word Catalogue milestones, balance patches, and community-requested features.

---

## 13. Design Decisions Log

Previously open questions, now resolved:

| # | Question | Decision | Rationale |
|---|---|---|---|
| 1 | **Grid size** | **4×4, locked for all characters.** | A 5×5 grid (25 dice) makes words too easy to find, diluting single-life tension. 4×4 keeps the grid tight so bad rolls hurt, Charms matter, and the Editor's swaps feel powerful. A "Large Print Edition" difficulty modifier (5×5, lower leaderboard multiplier) could exist as an accessibility/easy mode. |
| 2 | **Dictionary** | **Curated "literary" dictionary.** Roughly Scrabble-legal minus the most obscure 2-letter words (no QI, ZA, XU). Archaic/literary words are valid and flagged as "Rare" in the UI with a ✨ sparkle. | Cutting exploit-y 2-letter words preserves the spirit of the game. Flagging rare words creates a Charm hook ("Antiquarian — Rare dictionary words gain +5 mult") and rewards deep vocabulary without punishing casual players. Proper nouns excluded — too hard to validate and wrong for the tone. |
| 3 | **Word validation UX** | **Real-time feedback as you trace.** Path glows green (valid word), white (valid prefix), dim/red (dead end). Score is hidden until submission. | Real-time validation is essential for mobile and prevents frustrating submit-and-fail loops. Hiding the score until submission preserves the "is this enough?" tension that makes each word exciting. |
| 4 | **Floor narrative** | **Hand-authored Floors 1–8, procedural beyond that.** | The first 8 floors are the "campaign" and should feel crafted. Procedural Endless Stacks floors use a pool of ~15 genres × ~20 title fragments for variety without authoring cost. |
| 5 | **Re-roll visibility** | **Unlockable via "The Index" (after clearing Floor 4).** Early game: dice are opaque, re-rolls are surprises. Post-unlock: inspect any die to see all 6 faces. | Keeps early runs simple and delightful. Gives experienced players a depth layer for calculating re-roll odds and informed bag curation. Natural meta-progression reward. |
| 6 | **Endgame** | **Floor 8 = win (credits roll). Endless Stacks continue infinitely for score chasers.** | Serves both audiences — completionists get a clear victory, leaderboard players get infinite scaling. Daily/Weekly runs use the same model. |
| 7 | **Monetization** | **Premium purchase ($6.99 mobile / $12.99 PC).** No ads, no gacha. Paid expansion ~6 months post-launch. | Balatro comp validates premium roguelike pricing. F2P would warp progression pacing and undermine the cozy tone. |

---

## Appendix: Glossary

| Game Term | Balatro Equivalent | Description |
|---|---|---|
| Writer | — | Playable character class |
| Floor | Ante | One stage of the run (contains 3 pages) |
| Page | Blind | A single scoring round with a target |
| Final Page | Boss Blind | Page with a Story Twist modifier |
| Story Twist | Boss effect | Special rule on the Final Page |
| Charm | Joker | Passive relic that modifies scoring |
| Dice Bag | Deck | Your collection of letter dice |
| Ink Card | Consumable / Tarot | One-shot power card |
| Bookmark | Tag | Bonus earned by skipping a page |
| Ink & Quill Cart | Shop | Between-round vendor |
| Library Card | — | Player profile / stats screen |
| Re-roll | Discard + draw | Used dice get new faces after a word is submitted |

---

*Version 0.5 — Rules clarity pass: gold economy redesigned (completion + unused submission bonus), minimum 3-letter words, Poet ×2 order of operations, Journalist re-roll speed, Ink Card timing windows, Cart/skip interaction clarified.*
*Ready for prototyping.*
