// game.js — Core game state, scoring, floor progression, charms, shop

// ── Floor definitions ──
const FLOORS = [
  { num: 1, name: 'The First Sentence', genre: 'Coming of Age', opening: 50, rising: 100, final: 200,
    intro: 'The library door creaks open. Dust motes swirl in amber lamplight as you step inside. A blank notebook lies open on the nearest desk, its pages waiting.',
    opening_line: 'It was the kind of day that changed everything, though no one knew it yet.' },
  { num: 2, name: 'The Plot Thickens', genre: 'Mystery', opening: 125, rising: 250, final: 500,
    intro: 'The staircase spirals upward. On this floor, the shelves are darker, the shadows longer. A magnifying glass sits on a bloodstained desk.',
    opening_line: 'The detective stared at the letter. Three words. Three impossibly wrong words.' },
  { num: 3, name: 'The Moonlit Moor', genre: 'Gothic Romance', opening: 300, rising: 600, final: 1250,
    intro: 'Candles flicker in iron sconces. The books here are bound in velvet, their spines embossed with thorned roses. Something sighs behind the shelves.',
    opening_line: 'She had sworn never to return to Thornfield, and yet here she stood in the rain.' },
  { num: 4, name: 'City of Whispers', genre: 'Thriller', opening: 750, rising: 1500, final: 3000,
    intro: 'The floor above is all glass and steel. Headlines scroll across the walls. Every book here is redacted, censored, classified.',
    opening_line: 'The phone rang at 3 AM. On the other end, a voice said only: "They know."' },
  { num: 5, name: 'The Long Winter', genre: 'Epic Fantasy', opening: 1750, rising: 3500, final: 7000,
    intro: 'Frost creeps across the bookshelves. The volumes here are massive, leather-bound, ancient. A sword is embedded in the reading desk.',
    opening_line: 'The kingdom had forgotten magic, but magic had not forgotten the kingdom.' },
  { num: 6, name: 'Palace of Mirrors', genre: 'Surrealism', opening: 4000, rising: 8000, final: 16000,
    intro: 'The geometry of this floor is wrong. Staircases lead sideways. Books read themselves aloud in languages that don\'t exist. A cat watches you with too many eyes.',
    opening_line: 'The clock struck thirteen and the fish began to speak in perfect iambic pentameter.' },
  { num: 7, name: 'The Unwritten', genre: 'Metafiction', opening: 9000, rising: 18000, final: 35000,
    intro: 'The shelves here are nearly empty. The few books that remain have no endings. One of them is about a writer climbing an endless library.',
    opening_line: 'The character looked up from the page and realized, with growing unease, that someone was reading.' },
  { num: 8, name: 'The Last Chapter', genre: '???', opening: 17500, rising: 35000, final: 75000,
    intro: 'The final floor. There is only one book here, open to its last page. The words shimmer and shift. You recognize your own handwriting.',
    opening_line: 'And so the writer reached the top of the library, and the library held its breath.' }
];

// ── Narrator commentary — reactive to gameplay events ──
const NARRATOR = {
  // Word length reactions
  wordShort: [
    'A modest start.',
    'Brief, but it counts.',
    'Every word matters.',
    'Small words build big stories.'
  ],
  wordMedium: [
    'The pen moves with purpose.',
    'A solid word takes shape.',
    'The page drinks it in.',
    'Well chosen.'
  ],
  wordLong: [
    'The ink practically sings!',
    'A word worthy of the library.',
    'The shelves hum with approval.',
    'Magnificent penmanship!',
    'The cats look up, impressed.'
  ],
  wordHuge: [
    'The entire floor trembles with the weight of that word!',
    'Somewhere, a librarian sheds a single tear of joy.',
    'That word could fill a chapter on its own!',
    'The library itself applauds!'
  ],
  // Score reactions
  bigScore: [
    'The page glows golden!',
    'Ink pools and swirls into something beautiful.',
    'The multipliers cascade!'
  ],
  // Charm triggers
  charmFire: [
    'Your charm glimmers.',
    'Magic stirs on your desk.',
    'A charm catches the light.'
  ],
  // Round events
  closeToTarget: [
    'Almost there... one more word might do it.',
    'The page is nearly full.',
    'So close. Choose carefully.'
  ],
  pageCleared: [
    'The page turns itself, satisfied.',
    'Another page written. The story grows.',
    'The ink dries. Well done.',
    'The manuscript accepts your words.'
  ],
  floorCleared: [
    'The staircase reveals itself. Upward.',
    'The story is complete. A new one awaits above.',
    'You hear pages rustling on the floor above.'
  ],
  gameOver: [
    'The ink runs dry. The page crumbles to dust.',
    'The story stutters, falters, and goes silent.',
    'The book slams shut. The library sighs.',
    'Your words weren\'t enough. Not this time.'
  ],
  shake: [
    'The dice scatter and tumble anew.',
    'You sweep the desk clean. Fresh letters fall.',
    'The letters rearrange themselves.'
  ]
};

const PAGE_NAMES = ['Opening Page', 'Rising Page', 'Final Page'];
const PAGE_GOLD = [4, 6, 8]; // base gold per page type

// ── Story Twists (Final Page modifiers) ──
const STORY_TWISTS = [
  { name: 'The Sequel', genre: 'Fantasy', desc: 'You cannot reuse any word you\'ve played earlier in the run.' },
  { name: 'Banned Books', genre: 'Dystopia', desc: '3-letter words are invalid this page.' },
  { name: 'Purple Prose', genre: 'Romance', desc: 'Words under 5 letters score 0 — only long, lavish words count.' },
  { name: 'The Short Story', genre: 'Minimalism', desc: 'You only get 3 submissions this page.' },
  { name: 'Lost in Translation', genre: 'Foreign Literature', desc: 'All vowel dice score 0 chips — only consonants count.' },
  { name: 'The Rewrite', genre: 'Literary Fiction', desc: 'Your first 2 submissions score at half value.' }
];

// ── Charm Definitions ──
const ALL_CHARMS = [
  // Common — cheap, always useful, additive
  { id: 'rough_draft', name: 'Rough Draft', flavor: 'Always knows where you left off.', rarity: 'common', cost: 3,
    desc: 'Your first word each round gains x2 mult.',
    effect: (ctx) => { if (ctx.wordIndex === 0) ctx.multMultiplier *= 2; } },
  { id: 'reading_glasses', name: 'Reading Glasses', flavor: 'The vowels practically glow.', rarity: 'common', cost: 3,
    desc: '+3 chips for every vowel in the word.',
    effect: (ctx) => { const vowels = ctx.word.split('').filter(c => 'AEIOU'.includes(c)).length; ctx.bonusChips += vowels * 3; } },
  { id: 'dog_eared', name: 'Dog-Eared Page', flavor: 'Every word opens a new chapter.', rarity: 'common', cost: 3,
    desc: '+2 mult for every unique starting letter across your words this round.',
    effect: (ctx) => { ctx.bonusMult += ctx.uniqueStarts * 2; } },
  { id: 'double_vision', name: 'Double Vision', flavor: 'Seeing double is a feature.', rarity: 'common', cost: 4,
    desc: 'Words with double letters gain +4 mult.',
    effect: (ctx) => { if (hasDoubleLetter(ctx.word)) ctx.bonusMult += 4; } },
  { id: 'iron_nib', name: 'Iron Nib', flavor: 'Writes with authority.', rarity: 'common', cost: 3,
    desc: '+2 chips for every consonant in the word.',
    effect: (ctx) => { const cons = ctx.word.split('').filter(c => !'AEIOU'.includes(c)).length; ctx.bonusChips += cons * 2; } },
  { id: 'page_turner', name: 'Page Turner', flavor: 'Can\'t put it down.', rarity: 'common', cost: 4,
    desc: 'Each word scores +8 chips more than the last this round.',
    effect: (ctx) => { ctx.bonusChips += ctx.wordIndex * 8; } },
  // Uncommon — moderate cost, conditional multipliers
  { id: 'overwriter', name: 'Overwriter', flavor: 'More is more.', rarity: 'uncommon', cost: 5,
    desc: '5+ letter words gain x2 mult.',
    effect: (ctx) => { if (ctx.word.length >= 5) ctx.multMultiplier *= 2; } },
  { id: 'fountain_pen', name: 'Fountain Pen', flavor: 'Flows like water.', rarity: 'uncommon', cost: 5,
    desc: 'Words with all unique letters gain +5 mult.',
    effect: (ctx) => { if (new Set(ctx.word.split('')).size === ctx.word.length) ctx.bonusMult += 5; } },
  { id: 'chapter_break', name: 'Chapter Break', flavor: 'And then everything changed.', rarity: 'uncommon', cost: 6,
    desc: 'Your last submission each round gains x2 mult.',
    effect: (ctx) => { if (ctx.isLastWord) ctx.multMultiplier *= 2; } },
  { id: 'bookend_clasp', name: 'Bookend Clasp', flavor: 'Everything comes full circle.', rarity: 'uncommon', cost: 5,
    desc: 'Bookend words (same first & last letter) gain +10 chips and x2 mult.',
    effect: (ctx) => { if (ctx.word[0] === ctx.word[ctx.word.length - 1]) { ctx.bonusChips += 10; ctx.multMultiplier *= 2; } } },
  { id: 'thesaurus', name: 'Thesaurus', flavor: 'Why use a small word when a diminutive one will do?', rarity: 'uncommon', cost: 6,
    desc: '6+ letter words gain x3 mult.',
    effect: (ctx) => { if (ctx.word.length >= 6) ctx.multMultiplier *= 3; } },
  { id: 'inkpot', name: 'Inkpot of Fortune', flavor: 'Drips gold when it writes.', rarity: 'uncommon', cost: 6,
    desc: 'Earn +3 gold per word submitted.',
    effect: (ctx) => { ctx.bonusGold += 3; } },
  // Rare — expensive, powerful multipliers
  { id: 'consonant_crunch', name: 'Consonant Crunch', flavor: 'Who needs vowels?', rarity: 'rare', cost: 7,
    desc: 'Words with a consonant run (3+ in a row) gain x3 mult.',
    effect: (ctx) => { if (hasConsonantRun(ctx.word)) ctx.multMultiplier *= 3; } },
  { id: 'synonym_ribbon', name: 'Synonym Ribbon', flavor: 'Same meaning, different magic.', rarity: 'rare', cost: 7,
    desc: 'If current word is same length as previous word, gain x2 mult.',
    effect: (ctx) => { if (ctx.prevWordLength === ctx.word.length && ctx.prevWordLength > 0) ctx.multMultiplier *= 2; } },
  { id: 'ancient_tome', name: 'Ancient Tome', flavor: 'The words of those who came before.', rarity: 'rare', cost: 8,
    desc: '7+ letter words gain x3 mult.',
    effect: (ctx) => { if (ctx.word.length >= 7) ctx.multMultiplier *= 3; } },
  { id: 'red_ink', name: 'Red Ink', flavor: 'Bleeds power.', rarity: 'rare', cost: 7,
    desc: 'Words using rare/epic/legendary letters gain x2 mult.',
    effect: (ctx) => {
      const hasRare = ctx.cells.some(c => {
        const tier = (GameDice.LETTER_TIERS[c.letter] || 'common');
        return tier === 'rare' || tier === 'epic' || tier === 'legendary';
      });
      if (hasRare) ctx.multMultiplier *= 2;
    } },
  { id: 'crescendo', name: 'Crescendo', flavor: 'Building to something magnificent.', rarity: 'rare', cost: 8,
    desc: 'Each word this round gains +2 mult more than the last.',
    effect: (ctx) => { ctx.bonusMult += ctx.wordIndex * 2; } },
  // Legendary — game-changers
  { id: 'masterwork', name: 'The Masterwork', flavor: 'Only for those who demand perfection.', rarity: 'legendary', cost: 10,
    desc: 'If every word this round is 5+ letters, gain x5 mult on the last word.',
    effect: (ctx) => { if (ctx.isLastWord && ctx.allWordsLong) ctx.multMultiplier *= 5; } },
  { id: 'librarians_cat', name: "The Librarian's Cat", flavor: 'Knocks things off shelves. Helpfully.', rarity: 'legendary', cost: 10,
    desc: 'At round start, one random die becomes a wild card (any letter).',
    effect: () => {} }, // handled in round setup
  { id: 'golden_quill', name: 'Golden Quill', flavor: 'Worth its weight in stories.', rarity: 'legendary', cost: 12,
    desc: 'All words gain x2 mult.',
    effect: (ctx) => { ctx.multMultiplier *= 2; } }
];

// ── Pattern detection helpers ──
function hasDoubleLetter(word) {
  for (let i = 0; i < word.length - 1; i++) {
    if (word[i] === word[i + 1]) return true;
  }
  return false;
}

function hasConsonantRun(word) {
  const consonants = 'BCDFGHJKLMNPQRSTVWXYZ';
  let run = 0;
  for (const c of word) {
    if (consonants.includes(c)) { run++; if (run >= 3) return true; }
    else run = 0;
  }
  return false;
}

function isBookend(word) {
  return word.length >= 3 && word[0] === word[word.length - 1];
}

function isVowelHeavy(word) {
  return word.split('').filter(c => 'AEIOU'.includes(c)).length >= 3;
}

function isAllUnique(word) {
  return new Set(word.split('')).size === word.length;
}

function detectPatterns(word) {
  const patterns = [];
  if (hasDoubleLetter(word)) patterns.push('Double Letter');
  if (isVowelHeavy(word)) patterns.push('Vowel-Heavy');
  if (hasConsonantRun(word)) patterns.push('Consonant Run');
  if (isBookend(word)) patterns.push('Bookend');
  if (isAllUnique(word)) patterns.push('All Unique');
  return patterns;
}

// ── Scoring ──
function scoreWord(word, cells, gameState) {
  const { LETTER_CHIPS, LETTER_TIERS, getWordLengthMult } = window.GameDice;

  // Per-letter chip breakdown (includes per-die upgrades)
  const letterDetails = cells.map(cell => {
    const base = LETTER_CHIPS[cell.letter] || 2;
    const dieBonus = cell.die.bonusChips || 0;
    const dieMult = cell.die.bonusMult || 0;
    return {
      letter: cell.letter === 'QU' ? 'Qu' : cell.letter,
      chips: base + dieBonus,
      baseChips: base,
      dieBonus,
      dieMult,
      tier: LETTER_TIERS[cell.letter] || 'common',
      upgraded: dieBonus > 0
    };
  });

  let baseChips = letterDetails.reduce((s, l) => s + l.chips, 0);

  // Base mult = length table + word-type upgrades
  const lengthKey = Math.min(word.length, 10);
  const lengthBonus = gameState.lengthBonuses[lengthKey] || 0;
  let baseMult = getWordLengthMult(word.length) + lengthBonus;

  // Build charm context — track each charm's contribution
  const ctx = {
    word, cells,
    wordIndex: gameState.wordsThisRound.length,
    bonusChips: 0, bonusMult: 0, multMultiplier: 1, bonusGold: 0,
    uniqueStarts: new Set(gameState.wordsThisRound.map(w => w[0]).concat(word[0])).size,
    prevWordLength: gameState.wordsThisRound.length > 0 ? gameState.wordsThisRound[gameState.wordsThisRound.length - 1].length : 0,
    isLastWord: gameState.submissionsLeft <= 1,
    allWordsLong: gameState.wordsThisRound.every(w => w.length >= 5) && word.length >= 5
  };

  const charmTriggers = []; // { name, desc, chipDelta, multDelta, multMultDelta }
  for (const charm of gameState.charms) {
    const before = { chips: ctx.bonusChips, mult: ctx.bonusMult, mm: ctx.multMultiplier, gold: ctx.bonusGold };
    charm.effect(ctx);
    const chipDelta = ctx.bonusChips - before.chips;
    const multDelta = ctx.bonusMult - before.mult;
    const multMultDelta = ctx.multMultiplier / before.mm; // ratio, e.g. 3 means ×3
    const goldDelta = ctx.bonusGold - before.gold;
    if (chipDelta !== 0 || multDelta !== 0 || multMultDelta !== 1 || goldDelta !== 0) {
      charmTriggers.push({
        name: charm.name, rarity: charm.rarity,
        chipDelta, multDelta,
        multMultDelta: multMultDelta !== 1 ? multMultDelta : 0,
        goldDelta
      });
    }
  }

  // Die-based bonus mult and gold
  let dieBonusMult = 0;
  let dieBonusGold = 0;
  for (const cell of cells) {
    dieBonusMult += cell.die.bonusMult || 0;
    dieBonusGold += cell.die.bonusGold || 0;
  }

  const totalChips = baseChips + ctx.bonusChips;
  const totalMult = (baseMult + ctx.bonusMult + dieBonusMult) * ctx.multMultiplier;
  const score = Math.floor(totalChips * totalMult);
  const totalBonusGold = ctx.bonusGold + dieBonusGold;

  return {
    word, letterDetails,
    baseChips, baseMult,
    bonusChips: ctx.bonusChips,
    bonusMult: ctx.bonusMult + dieBonusMult,
    multMultiplier: ctx.multMultiplier,
    totalChips, totalMult, score,
    bonusGold: totalBonusGold,
    charmTriggers,
    patterns: detectPatterns(word)
  };
}

// ── Game State ──
function createGameState() {
  return {
    // Run state
    floor: 0,          // index into FLOORS
    page: 0,           // 0=opening, 1=rising, 2=final
    gold: 0,
    runScore: 0,
    usedWords: new Set(), // all words used this run (for The Sequel twist)

    // Round state
    grid: null,
    diceBag: GameDice.createStandardBag(),
    submissionsLeft: 5,
    maxSubmissions: 5,
    roundScore: 0,
    wordsThisRound: [],
    wordHistory: [],
    selectedCells: [],

    // Build state
    charms: [],
    maxCharms: 5,
    inkCards: [],

    // Word-type upgrades: bonus mult per word length (like Balatro planet cards)
    lengthBonuses: { 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 },

    // Phase: 'title' | 'playing' | 'scoring' | 'pageResult' | 'shop' | 'skipChoice' | 'gameOver' | 'victory'
    phase: 'title',

    // Story twist for final page
    activeTwist: null,

    // Journalist timer (not used for Novelist prototype)
    writer: 'novelist',

    // Stats
    wordsPlayed: 0,
    longestWord: '',
    bestWordScore: 0,
    floorsCleared: 0
  };
}

// ── Game Flow ──
function getTarget(state) {
  const floor = FLOORS[state.floor] || FLOORS[FLOORS.length - 1];
  const targets = [floor.opening, floor.rising, floor.final];
  return targets[state.page];
}

function getFloorInfo(state) {
  return FLOORS[state.floor] || FLOORS[FLOORS.length - 1];
}

function startRound(state) {
  state.grid = GameDice.dealGrid(state.diceBag);
  state.submissionsLeft = state.maxSubmissions;
  state.roundScore = 0;
  state.wordsThisRound = [];
  state.selectedCells = [];
  state.phase = 'playing';

  // Apply Librarian's Cat charm
  if (state.charms.some(c => c.id === 'librarians_cat')) {
    const r = Math.floor(Math.random() * 4);
    const c = Math.floor(Math.random() * 4);
    state.grid[r][c].letter = '★';
    state.grid[r][c].isWild = true;
  }

  // Story twist for final page
  if (state.page === 2) {
    state.activeTwist = STORY_TWISTS[state.floor % STORY_TWISTS.length];
    // Apply twist effects that modify round setup
    if (state.activeTwist.name === 'The Short Story') {
      state.submissionsLeft = 3;
    }
  } else {
    state.activeTwist = null;
  }
}

function submitWord(state) {
  const { isValidWord } = window.GameDictionary;
  const cells = state.selectedCells;
  const word = cells.map(c => c.isWild ? c.wildLetter : c.letter).join('');

  if (word.length < 3) return { success: false, reason: 'Word must be at least 3 letters.' };
  if (!isValidWord(word)) return { success: false, reason: `"${word}" is not in the dictionary.` };

  // Check story twist restrictions
  if (state.activeTwist) {
    if (state.activeTwist.name === 'Purple Prose' && word.length < 5) {
      return { success: false, reason: 'Purple Prose: Only words of 5+ letters count!' };
    }
    if (state.activeTwist.name === 'The Sequel' && state.usedWords.has(word)) {
      return { success: false, reason: 'The Sequel: You\'ve already used this word in this run!' };
    }
    if (state.activeTwist.name === 'Banned Books' && word.length === 3) {
      return { success: false, reason: 'Banned Books: 3-letter words are invalid!' };
    }
  }

  // Score the word
  const result = scoreWord(word, cells, state);

  // Apply twist scoring modifiers
  if (state.activeTwist) {
    if (state.activeTwist.name === 'Lost in Translation') {
      // Vowel dice score 0 chips — recalculate without vowel chip contributions
      const vowels = 'AEIOU';
      let vowelChipLoss = 0;
      for (const ld of result.letterDetails) {
        const rawLetter = ld.letter === 'Qu' ? 'QU' : ld.letter;
        if (rawLetter.length === 1 && vowels.includes(rawLetter)) {
          vowelChipLoss += ld.chips;
        }
      }
      const adjustedChips = Math.max(1, result.totalChips - vowelChipLoss);
      result.score = Math.floor(adjustedChips * result.totalMult);
      result.totalChips = adjustedChips;
    }
    if (state.activeTwist.name === 'The Rewrite' && state.wordsThisRound.length < 2) {
      result.score = Math.floor(result.score / 2);
    }
  }

  // Apply score
  state.roundScore += result.score;
  state.runScore += result.score;
  state.wordsThisRound.push(word);
  state.usedWords.add(word);
  state.submissionsLeft--;
  state.wordsPlayed++;
  state.gold += result.bonusGold;

  // Stats
  if (word.length > state.longestWord.length) state.longestWord = word;
  if (result.score > state.bestWordScore) state.bestWordScore = result.score;

  // Re-roll used dice
  const cellPositions = cells.map(c => ({ row: c.row, col: c.col }));
  GameDice.rerollCells(state.grid, cellPositions);

  // Clear selection
  state.selectedCells = [];

  return { success: true, result };
}

function endRound(state) {
  const target = getTarget(state);
  const passed = state.roundScore >= target;

  if (passed) {
    // Award gold
    const baseGold = PAGE_GOLD[state.page];
    const bonusGold = state.submissionsLeft * 2;
    state.gold += baseGold + bonusGold;

    return {
      passed: true,
      baseGold,
      bonusGold,
      totalGold: baseGold + bonusGold,
      roundScore: state.roundScore,
      target
    };
  }

  return { passed: false, roundScore: state.roundScore, target };
}

function advancePage(state) {
  if (state.page < 2) {
    state.page++;
    state.phase = 'shop';
  } else {
    // Floor complete
    state.floorsCleared++;
    if (state.floor < FLOORS.length - 1) {
      state.floor++;
      state.page = 0;
      state.phase = 'shop';
    } else {
      state.phase = 'victory';
    }
  }
}

function skipPage(state) {
  // Award bookmark bonus (simplified: just gold for prototype)
  state.gold += 8;
  if (state.page < 2) {
    state.page++;
    // No shop after skip
    return 'skipped';
  }
  return 'cannot_skip_final';
}

// ── Shop ──

// Word-type upgrade names (flavor)
const LENGTH_UPGRADE_NAMES = {
  3: { name: 'Haiku', flavor: 'Brevity is the soul of wit.' },
  4: { name: 'Limerick', flavor: 'Short and punchy.' },
  5: { name: 'Sonnet', flavor: 'The poet\'s favorite length.' },
  6: { name: 'Ballad', flavor: 'Long enough to tell a story.' },
  7: { name: 'Epic', flavor: 'Now we\'re getting somewhere.' },
  8: { name: 'Novella', flavor: 'Serious wordsmithing.' },
  9: { name: 'Saga', flavor: 'A word of legend.' },
  10: { name: 'Magnum Opus', flavor: 'The longest of words.' }
};

function generateShopItems(state) {
  const items = [];

  // ── 1-2 Charms ──
  const availableCharms = ALL_CHARMS.filter(c => !state.charms.some(owned => owned.id === c.id));
  const shuffledCharms = shuffle(availableCharms);
  const charmCount = state.charms.length >= state.maxCharms ? 0 : Math.min(2, shuffledCharms.length);
  for (let i = 0; i < charmCount; i++) {
    items.push({ type: 'charm', data: shuffledCharms[i], cost: shuffledCharms[i].cost });
  }

  // ── 1 Word-type upgrade (like Balatro planet cards) ──
  // Pick a random word length to offer an upgrade for
  const lengths = [3, 4, 5, 6, 7, 8];
  const targetLen = lengths[Math.floor(Math.random() * lengths.length)];
  const currentBonus = state.lengthBonuses[targetLen] || 0;
  const upgradeCost = 4 + currentBonus * 2; // gets more expensive each level
  const info = LENGTH_UPGRADE_NAMES[targetLen] || { name: 'Verse', flavor: 'Words of power.' };
  items.push({
    type: 'length_upgrade',
    data: {
      length: targetLen,
      name: info.name,
      flavor: info.flavor,
      currentBonus,
      newBonus: currentBonus + 1
    },
    cost: upgradeCost
  });

  // ── 1 Die upgrade (pick a die, +5 chips permanently) ──
  items.push({
    type: 'die_upgrade',
    data: {
      name: 'Sharpen a Die',
      flavor: 'Choose a die. Every face cuts deeper.',
      chipBonus: 5
    },
    cost: 5
  });

  // ── 1 Ink card ──
  const inkCards = [
    { id: 'fresh_page', name: 'Fresh Page', flavor: 'Start over. No judgment.', desc: 'Re-roll the entire grid.', cost: 3 },
    { id: 'extra_ink', name: 'Extra Ink', flavor: 'Just a few more words...', desc: '+2 bonus submissions this round.', cost: 4 },
    { id: 'muse_whisper', name: "Muse's Whisper", flavor: 'Psst — try this one.', desc: 'Highlights the best word on the grid.', cost: 2 }
  ];
  const card = inkCards[Math.floor(Math.random() * inkCards.length)];
  items.push({ type: 'ink_card', data: card, cost: card.cost });

  return items;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buyShopItem(state, item) {
  if (state.gold < item.cost) return { success: false, reason: 'Not enough gold.' };

  state.gold -= item.cost;

  switch (item.type) {
    case 'charm':
      if (state.charms.length >= state.maxCharms) return { success: false, reason: 'Charm slots full!' };
      state.charms.push(item.data);
      return { success: true, msg: `Acquired ${item.data.name}!` };

    case 'die':
      state.diceBag.push({
        faces: item.data.faces,
        type: item.data.type,
        bonusChips: item.data.bonusChips || 0,
        bonusMult: item.data.bonusMult || 0,
        bonusGold: item.data.bonusGold || 0
      });
      return { success: true, msg: `Added ${item.data.name} to your bag! (${state.diceBag.length} dice)` };

    case 'remove_die':
      const stdIdx = state.diceBag.findIndex(d => d.type === 'standard');
      if (stdIdx >= 0) state.diceBag.splice(stdIdx, 1);
      return { success: true, msg: `Removed a die. (${state.diceBag.length} dice)` };

    case 'ink_card':
      state.inkCards.push(item.data);
      return { success: true, msg: `Got ${item.data.name}!` };

    case 'length_upgrade': {
      const len = item.data.length;
      state.lengthBonuses[len] = (state.lengthBonuses[len] || 0) + 1;
      return { success: true, msg: `${len}-letter words now have +${state.lengthBonuses[len]} bonus mult!` };
    }

    case 'die_upgrade':
      // Requires picking a die — returns 'pick_die' signal for UI to handle
      return { success: true, msg: 'pick_die', pickDie: true, chipBonus: item.data.chipBonus };

    default:
      return { success: false, reason: 'Unknown item.' };
  }
}

// Apply die upgrade to a specific die in the bag (max 3 upgrades per die = +15)
const MAX_DIE_UPGRADES = 3;
const DIE_UPGRADE_CHIPS = 5;

function upgradeDie(state, dieIndex, chipBonus) {
  const die = state.diceBag[dieIndex];
  if (!die) return false;
  const currentLevel = Math.round((die.bonusChips || 0) / DIE_UPGRADE_CHIPS);
  if (currentLevel >= MAX_DIE_UPGRADES) return false;
  die.bonusChips = (die.bonusChips || 0) + chipBonus;
  return true;
}

function getDieUpgradeLevel(die) {
  return Math.round((die.bonusChips || 0) / DIE_UPGRADE_CHIPS);
}

function useInkCard(state, cardIndex) {
  const card = state.inkCards[cardIndex];
  if (!card) return false;

  switch (card.id) {
    case 'fresh_page':
      state.grid = GameDice.dealGrid(state.diceBag);
      state.selectedCells = [];
      break;
    case 'extra_ink':
      state.submissionsLeft += 2;
      break;
    case 'muse_whisper':
      // Handled in UI — just mark as used
      break;
  }

  state.inkCards.splice(cardIndex, 1);
  return true;
}

window.Game = {
  FLOORS, PAGE_NAMES, PAGE_GOLD, STORY_TWISTS, ALL_CHARMS, NARRATOR,
  createGameState, getTarget, getFloorInfo, startRound, submitWord,
  endRound, advancePage, skipPage, generateShopItems, buyShopItem,
  upgradeDie, getDieUpgradeLevel, MAX_DIE_UPGRADES, DIE_UPGRADE_CHIPS,
  useInkCard, scoreWord, detectPatterns, hasDoubleLetter, hasConsonantRun,
  isBookend, isVowelHeavy, isAllUnique
};
