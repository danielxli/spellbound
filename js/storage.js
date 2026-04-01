// storage.js — localStorage persistence for run saves, career stats, and settings

const KEYS = {
  run: 'spellbound_run',
  stats: 'spellbound_stats',
  settings: 'spellbound_settings',
  tutorial: 'spellbound_tutorial_seen',
  version: 'spellbound_save_version'
};

const SAVE_VERSION = 1;

// ── Serialization helpers ──

function serializeState(state) {
  const s = {};

  // Scalar fields
  s.floor = state.floor;
  s.page = state.page;
  s.gold = state.gold;
  s.runScore = state.runScore;
  s.totalLettersUsed = state.totalLettersUsed;
  s.patternCount = state.patternCount;
  s.longWordCount = state.longWordCount;
  s.pagesCleared = state.pagesCleared;
  s.submissionsLeft = state.submissionsLeft;
  s.maxSubmissions = state.maxSubmissions;
  s.roundScore = state.roundScore;
  s.maxCharms = state.maxCharms;
  s.phase = state.phase;
  s.writer = state.writer;
  s.wordsPlayed = state.wordsPlayed;
  s.longestWord = state.longestWord;
  s.bestWordScore = state.bestWordScore;
  s.floorsCleared = state.floorsCleared;
  s.lengthBonuses = { ...state.lengthBonuses };
  s.letterBonuses = { ...state.letterBonuses };

  // Sets → arrays
  s.usedWords = [...state.usedWords];
  s.usedLetters = [...state.usedLetters];

  // Arrays of strings
  s.wordsThisRound = [...state.wordsThisRound];

  // Charms → IDs only (reconstructed from ALL_CHARMS on load)
  s.charmIds = state.charms.map(c => c.id);

  // Ink cards → IDs only
  s.inkCardIds = state.inkCards.map(c => c.id);

  // Dice bag — plain objects, fully serializable
  s.diceBag = state.diceBag.map(d => ({
    faces: d.faces,
    type: d.type,
    bonusChips: d.bonusChips || 0,
    bonusMult: d.bonusMult || 0,
    bonusGold: d.bonusGold || 0
  }));

  // Grid — store letter, position, wild state, and index into diceBag
  if (state.grid) {
    s.grid = [];
    for (let r = 0; r < 4; r++) {
      const row = [];
      for (let c = 0; c < 4; c++) {
        const cell = state.grid[r][c];
        row.push({
          letter: cell.letter,
          row: cell.row,
          col: cell.col,
          used: cell.used || false,
          isWild: cell.isWild || false,
          wildLetter: cell.wildLetter || null,
          dieIndex: state.diceBag.indexOf(cell.die)
        });
      }
      s.grid.push(row);
    }
  }

  // Word history — plain objects, safe to serialize
  s.wordHistory = state.wordHistory || [];

  // Active twist — store by index
  if (state.activeTwist) {
    s.activeTwistIndex = Game.STORY_TWISTS.indexOf(state.activeTwist);
  } else {
    s.activeTwistIndex = -1;
  }

  s._saveVersion = SAVE_VERSION;
  return JSON.stringify(s);
}

function deserializeState(json) {
  const s = JSON.parse(json);

  // Version check
  if (s._saveVersion !== SAVE_VERSION) return null;

  const state = {};

  // Scalar fields
  state.floor = s.floor;
  state.page = s.page;
  state.gold = s.gold;
  state.runScore = s.runScore;
  state.totalLettersUsed = s.totalLettersUsed;
  state.patternCount = s.patternCount;
  state.longWordCount = s.longWordCount;
  state.pagesCleared = s.pagesCleared;
  state.submissionsLeft = s.submissionsLeft;
  state.maxSubmissions = s.maxSubmissions;
  state.roundScore = s.roundScore;
  state.maxCharms = s.maxCharms;
  state.phase = s.phase;
  state.writer = s.writer;
  state.wordsPlayed = s.wordsPlayed;
  state.longestWord = s.longestWord;
  state.bestWordScore = s.bestWordScore;
  state.floorsCleared = s.floorsCleared;
  state.lengthBonuses = s.lengthBonuses;
  state.letterBonuses = s.letterBonuses || {};

  // Sets
  state.usedWords = new Set(s.usedWords);
  state.usedLetters = new Set(s.usedLetters);

  // Arrays
  state.wordsThisRound = s.wordsThisRound;
  state.selectedCells = [];
  state.wordHistory = s.wordHistory || [];

  // Charms — reconstruct from ALL_CHARMS by ID
  state.charms = (s.charmIds || [])
    .map(id => Game.ALL_CHARMS.find(c => c.id === id))
    .filter(Boolean);

  // Ink cards — reconstruct from definitions
  const INK_CARD_DEFS = {
    fresh_page: { id: 'fresh_page', name: 'Fresh Page', flavor: 'Start over. No judgment.', desc: 'Re-roll the entire grid.', cost: 3 },
    extra_ink: { id: 'extra_ink', name: 'Extra Ink', flavor: 'Just a few more words...', desc: '+2 bonus submissions this round.', cost: 4 },
    muse_whisper: { id: 'muse_whisper', name: "Muse's Whisper", flavor: 'Psst — try this one.', desc: 'Highlights the best word on the grid.', cost: 2 }
  };
  state.inkCards = (s.inkCardIds || [])
    .map(id => INK_CARD_DEFS[id] ? { ...INK_CARD_DEFS[id] } : null)
    .filter(Boolean);

  // Dice bag
  state.diceBag = s.diceBag;

  // Grid — reconnect die references
  if (s.grid) {
    state.grid = [];
    for (let r = 0; r < 4; r++) {
      const row = [];
      for (let c = 0; c < 4; c++) {
        const saved = s.grid[r][c];
        row.push({
          letter: saved.letter,
          row: saved.row,
          col: saved.col,
          used: saved.used || false,
          isWild: saved.isWild || false,
          wildLetter: saved.wildLetter || null,
          die: state.diceBag[saved.dieIndex] || state.diceBag[0]
        });
      }
      state.grid.push(row);
    }
  }

  // Active twist
  state.activeTwist = s.activeTwistIndex >= 0
    ? Game.STORY_TWISTS[s.activeTwistIndex] || null
    : null;

  return state;
}

// ── Public API ──

function saveRun(state) {
  try {
    localStorage.setItem(KEYS.run, serializeState(state));
  } catch (e) {
    console.warn('Failed to save run:', e);
  }
}

function loadRun() {
  try {
    const json = localStorage.getItem(KEYS.run);
    if (!json) return null;
    return deserializeState(json);
  } catch (e) {
    console.warn('Failed to load run:', e);
    return null;
  }
}

function clearRun() {
  localStorage.removeItem(KEYS.run);
}

function hasRun() {
  return localStorage.getItem(KEYS.run) !== null;
}

// ── Career Stats ──

const DEFAULT_STATS = {
  runsPlayed: 0,
  victories: 0,
  bestFloor: 0,
  bestScore: 0,
  totalWords: 0,
  longestWord: '',
  bestWordScore: 0
};

function loadStats() {
  try {
    const json = localStorage.getItem(KEYS.stats);
    if (!json) return { ...DEFAULT_STATS };
    return { ...DEFAULT_STATS, ...JSON.parse(json) };
  } catch (e) {
    return { ...DEFAULT_STATS };
  }
}

function updateStats(state) {
  const stats = loadStats();
  stats.runsPlayed++;
  if (state.phase === 'victory') stats.victories++;
  if (state.floorsCleared > stats.bestFloor) stats.bestFloor = state.floorsCleared;
  if (state.runScore > stats.bestScore) stats.bestScore = state.runScore;
  stats.totalWords += state.wordsPlayed;
  if (state.longestWord.length > stats.longestWord.length) stats.longestWord = state.longestWord;
  if (state.bestWordScore > stats.bestWordScore) stats.bestWordScore = state.bestWordScore;
  try {
    localStorage.setItem(KEYS.stats, JSON.stringify(stats));
  } catch (e) {
    console.warn('Failed to save stats:', e);
  }
}

// ── Settings ──

function loadSettings() {
  try {
    const json = localStorage.getItem(KEYS.settings);
    if (!json) return null;
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(KEYS.settings, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings:', e);
  }
}

// ── Tutorial ──

function hasSeenTutorial() {
  return localStorage.getItem(KEYS.tutorial) === 'true';
}

function markTutorialSeen() {
  localStorage.setItem(KEYS.tutorial, 'true');
}

window.Storage = {
  saveRun, loadRun, clearRun, hasRun,
  loadStats, updateStats,
  loadSettings, saveSettings,
  hasSeenTutorial, markTutorialSeen
};
