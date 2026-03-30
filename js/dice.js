// dice.js — Boggle dice definitions and dice bag management

// Classic Boggle 4x4 dice (16 dice, 6 faces each)
const STANDARD_DICE = [
  ['A', 'A', 'E', 'E', 'G', 'N'],
  ['A', 'B', 'B', 'J', 'O', 'O'],
  ['A', 'C', 'H', 'O', 'P', 'S'],
  ['A', 'F', 'F', 'K', 'P', 'S'],
  ['A', 'O', 'O', 'T', 'T', 'W'],
  ['C', 'I', 'M', 'O', 'T', 'U'],
  ['D', 'E', 'I', 'L', 'R', 'X'],
  ['D', 'E', 'L', 'R', 'V', 'Y'],
  ['D', 'I', 'S', 'T', 'T', 'Y'],
  ['E', 'E', 'G', 'H', 'N', 'W'],
  ['E', 'E', 'I', 'N', 'S', 'U'],
  ['E', 'H', 'R', 'T', 'V', 'W'],
  ['E', 'I', 'O', 'S', 'S', 'T'],
  ['E', 'L', 'R', 'T', 'T', 'Y'],
  ['H', 'I', 'M', 'N', 'Q', 'U'],
  ['H', 'L', 'N', 'N', 'R', 'Z']
];

// Letter tier classification
const LETTER_TIERS = {
  E: 'common', A: 'common', I: 'common', O: 'common', N: 'common',
  R: 'common', S: 'common', T: 'common', L: 'common', U: 'common',
  D: 'uncommon', G: 'uncommon', B: 'uncommon', C: 'uncommon', M: 'uncommon', P: 'uncommon',
  F: 'rare', H: 'rare', V: 'rare', W: 'rare', Y: 'rare',
  K: 'epic', J: 'epic', X: 'epic',
  Q: 'legendary', QU: 'legendary', Z: 'legendary'
};

// Base chip values per letter (QU is a single die face worth 15)
const LETTER_CHIPS = {
  E: 2, A: 2, I: 2, O: 2, N: 2, R: 2, S: 2, T: 2, L: 2, U: 2,
  D: 4, G: 4, B: 4, C: 4, M: 4, P: 4,
  F: 6, H: 6, V: 6, W: 6, Y: 6,
  K: 10, J: 10, X: 10,
  Q: 15, QU: 15, Z: 15
};

// Word length multipliers
const LENGTH_MULT = {
  3: 1, 4: 2, 5: 4, 6: 7, 7: 12
};

function getWordLengthMult(length) {
  if (length >= 7) return 12;
  return LENGTH_MULT[length] || 1;
}

// Create a fresh dice bag (array of dice, each die is array of 6 faces)
function createStandardBag() {
  return STANDARD_DICE.map(faces => ({
    faces: [...faces],
    type: 'standard',
    bonusChips: 0,
    bonusMult: 0
  }));
}

// Roll a single die — returns a random face
// Q always becomes QU (displayed as "Qu" on the die)
function rollDie(die) {
  const idx = Math.floor(Math.random() * die.faces.length);
  const face = die.faces[idx];
  return face === 'Q' ? 'QU' : face;
}

// Deal 16 dice from the bag into a 4x4 grid
function dealGrid(bag) {
  // Shuffle bag, pick 16
  const shuffled = [...bag].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 16);

  const grid = [];
  for (let r = 0; r < 4; r++) {
    grid[r] = [];
    for (let c = 0; c < 4; c++) {
      const die = selected[r * 4 + c];
      grid[r][c] = {
        letter: rollDie(die),
        die: die,
        row: r,
        col: c,
        used: false
      };
    }
  }
  return grid;
}

// Re-roll specific cells in the grid (after word submission)
function rerollCells(grid, cells) {
  for (const { row, col } of cells) {
    const cell = grid[row][col];
    cell.letter = rollDie(cell.die);
    cell.used = false;
  }
}

// Re-roll every die in the grid in place (shake the board)
function shakeGrid(grid) {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      grid[r][c].letter = rollDie(grid[r][c].die);
    }
  }
}

// Check if two cells are adjacent (8-directional, Boggle rules)
function areAdjacent(r1, c1, r2, c2) {
  const dr = Math.abs(r1 - r2);
  const dc = Math.abs(c1 - c2);
  return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0);
}

// Special dice types for the shop
const SPECIAL_DICE = {
  ember: {
    name: 'Ember Die',
    flavor: 'Warm to the touch',
    type: 'ember',
    bonusChips: 5,
    bonusMult: 0,
    cost: 6
  },
  resonant: {
    name: 'Resonant Die',
    flavor: 'Hums when you hold it',
    type: 'resonant',
    bonusChips: 0,
    bonusMult: 2,
    cost: 7
  },
  gilded: {
    name: 'Gilded Die',
    flavor: 'Flecked with gold leaf',
    type: 'gilded',
    bonusChips: 0,
    bonusMult: 0,
    bonusGold: 2,
    cost: 5
  }
};

window.GameDice = {
  STANDARD_DICE, LETTER_TIERS, LETTER_CHIPS, LENGTH_MULT,
  getWordLengthMult, createStandardBag, rollDie, dealGrid,
  rerollCells, shakeGrid, areAdjacent, SPECIAL_DICE
};
