// ui.js — Rendering, input handling, screen management, animations, narrator

let state = null;
let shopItems = [];
let lastGold = 0;
let narratorTimer = null;
let rerolledPositions = new Set(); // track which cells just re-rolled for animation

// ── Helpers ──
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Initialization ──
async function init() {
  const startBtn = document.querySelector('#title-screen .btn');
  if (startBtn) { startBtn.classList.add('btn-disabled'); startBtn.textContent = 'Loading dictionary...'; }

  await GameDictionary.initDictionary();

  if (startBtn) { startBtn.classList.remove('btn-disabled'); startBtn.textContent = 'Begin Writing'; }

  state = Game.createGameState();
  createDustMotes();
  render();

  document.addEventListener('keydown', handleKeydown);
}

function handleKeydown(e) {
  if (state.phase === 'playing' && !scoringAnimationActive) {
    if (e.key === 'Enter') doSubmitWord();
    else if (e.key === 'Escape' || e.key === 'Backspace') clearSelection();
  }
  // Space/Enter/Escape to skip scoring animation
  if (scoringAnimationActive && (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape')) {
    const overlay = document.querySelector('.scoring-overlay');
    if (overlay) overlay.click();
  }
}

// ── Dust motes (ambient particles) ──
function createDustMotes() {
  const app = document.getElementById('app');
  for (let i = 0; i < 15; i++) {
    const mote = document.createElement('div');
    mote.className = 'dust-mote';
    mote.style.left = Math.random() * 100 + '%';
    mote.style.top = Math.random() * 100 + '%';
    mote.style.animationDelay = Math.random() * 8 + 's';
    mote.style.animationDuration = (6 + Math.random() * 4) + 's';
    mote.style.width = (2 + Math.random() * 2) + 'px';
    mote.style.height = mote.style.width;
    app.appendChild(mote);
  }
}

// ── Narrator ──
function narrate(text) {
  const bar = document.getElementById('narrator-bar');
  if (!bar) return;
  bar.innerHTML = `<div class="narrator-text">${text}</div>`;
  clearTimeout(narratorTimer);
  narratorTimer = setTimeout(() => { bar.innerHTML = ''; }, 4000);
}

function narrateWordReaction(result) {
  const N = Game.NARRATOR;
  const word = result.word;
  const score = result.score;

  // Pick reaction based on word quality
  if (word.length >= 7) narrate(pick(N.wordHuge));
  else if (word.length >= 6) narrate(pick(N.wordLong));
  else if (word.length >= 4) narrate(pick(N.wordMedium));
  else narrate(pick(N.wordShort));

  // Override with big score reaction
  if (score >= 200) {
    setTimeout(() => narrate(pick(N.bigScore)), 800);
  }

  // Check if close to target
  const target = Game.getTarget(state);
  const pct = state.roundScore / target;
  if (pct >= 0.75 && pct < 1.0 && state.submissionsLeft <= 2) {
    setTimeout(() => narrate(pick(N.closeToTarget)), 1200);
  }
}

// ── Main render ──
function render() {
  const titleScreen = document.getElementById('title-screen');
  const gameScreen = document.getElementById('game-screen');
  const shopScreen = document.getElementById('shop-screen');

  titleScreen.style.display = 'none';
  gameScreen.style.display = 'none';
  shopScreen.style.display = 'none';

  // Clear overlays & intros
  document.querySelectorAll('.overlay, .gold-reward-overlay, .floor-intro, .twist-reveal, .page-turn').forEach(el => el.remove());

  switch (state.phase) {
    case 'title':
      titleScreen.style.display = 'flex';
      break;
    case 'playing':
      gameScreen.style.display = 'flex';
      renderGame();
      break;
    case 'shop':
      shopScreen.style.display = 'flex';
      renderShop();
      break;
    case 'pageResult':
      gameScreen.style.display = 'flex';
      renderGame();
      showPageResult();
      break;
    case 'gameOver':
      showGameOver();
      break;
    case 'victory':
      showVictory();
      break;
  }
}

// ── Start Game — with floor intro ──
function startGame() {
  state = Game.createGameState();
  showFloorIntro(() => {
    state.phase = 'playing';
    Game.startRound(state);
    render();
    animateGridEntrance();
  });
}

// ── Floor Intro Screen ──
function showFloorIntro(onContinue) {
  const floor = Game.FLOORS[state.floor];

  const div = document.createElement('div');
  div.className = 'floor-intro';
  div.id = 'floor-intro';
  div.innerHTML = `
    <div class="floor-number">Floor ${floor.num}</div>
    <div class="floor-title">"${floor.name}"</div>
    <div class="floor-genre-label">${floor.genre}</div>
    <div class="floor-divider"></div>
    <div class="floor-intro-text">${floor.intro}</div>
    <div class="floor-opening-line">${floor.opening_line}</div>
    <button class="btn btn-gold" id="floor-intro-btn">Begin Writing</button>
  `;

  document.getElementById('app').appendChild(div);

  document.getElementById('floor-intro-btn').addEventListener('click', () => {
    div.classList.add('floor-intro-exit');
    setTimeout(() => {
      div.remove();
      onContinue();
    }, 450);
  });
}

// ── Story Twist Reveal ──
function showTwistReveal(twist, onContinue) {
  const div = document.createElement('div');
  div.className = 'twist-reveal';
  div.innerHTML = `
    <div class="twist-label">Story Twist</div>
    <div class="twist-title">${twist.name}</div>
    <div class="twist-description">${twist.desc}</div>
    <button class="btn btn-red btn-small" id="twist-continue-btn">Face the Challenge</button>
  `;
  document.getElementById('app').appendChild(div);

  document.getElementById('twist-continue-btn').addEventListener('click', () => {
    div.classList.add('floor-intro-exit');
    setTimeout(() => { div.remove(); onContinue(); }, 400);
  });
}

// ── Page turn transition ──
function showPageTurn(onComplete) {
  const div = document.createElement('div');
  div.className = 'page-turn';
  div.innerHTML = '<div class="page-turn-sheet"></div>';
  document.getElementById('app').appendChild(div);
  setTimeout(() => { div.remove(); if (onComplete) onComplete(); }, 700);
}

// ── Grid entrance animation ──
function animateGridEntrance() {
  const cells = document.querySelectorAll('.die-cell');
  cells.forEach((cell, i) => {
    cell.classList.add('entering');
    cell.style.animationDelay = (i * 35) + 'ms';
  });
  // Clean up class after animation
  setTimeout(() => {
    cells.forEach(c => { c.classList.remove('entering'); c.style.animationDelay = ''; });
  }, 800);
}

// ── Animate re-rolled dice ──
function animateRerolledDice(positions) {
  // positions is a Set of "row,col" strings
  const cells = document.querySelectorAll('.die-cell');
  cells.forEach((cell, i) => {
    const r = Math.floor(i / 4);
    const c = i % 4;
    if (positions.has(`${r},${c}`)) {
      cell.classList.add('rerolling');
      cell.style.animationDelay = (Math.random() * 100) + 'ms';
    }
  });
  setTimeout(() => {
    cells.forEach(c => { c.classList.remove('rerolling'); c.style.animationDelay = ''; });
  }, 600);
}

// ── Charm trigger animation ──
function flashCharms(triggeredCharmIds) {
  if (!triggeredCharmIds || triggeredCharmIds.length === 0) return;
  const pips = document.querySelectorAll('.charm-pip');
  pips.forEach(pip => {
    const name = pip.textContent;
    if (triggeredCharmIds.some(id => {
      const charm = state.charms.find(c => c.id === id);
      return charm && charm.name === name;
    })) {
      pip.classList.add('triggering');
      setTimeout(() => pip.classList.remove('triggering'), 500);
    }
  });
}

// ── Screen shake for big scores ──
function triggerScreenShake() {
  const gs = document.getElementById('game-screen');
  gs.classList.add('screen-shake');
  setTimeout(() => gs.classList.remove('screen-shake'), 300);
}

// ── Victory particles ──
function spawnVictoryParticles() {
  const colors = ['#ffd700', '#d4a04a', '#e8c47a', '#fff', '#f0e6d2'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'victory-particle';
    p.style.left = (10 + Math.random() * 80) + '%';
    p.style.bottom = '0';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.setProperty('--drift', (Math.random() * 60 - 30) + 'px');
    p.style.animationDelay = (Math.random() * 800) + 'ms';
    p.style.animationDuration = (1 + Math.random() * 1) + 's';
    p.style.width = (3 + Math.random() * 5) + 'px';
    p.style.height = p.style.width;
    document.getElementById('app').appendChild(p);
    setTimeout(() => p.remove(), 3000);
  }
}

// ── Gold change animation ──
function animateGoldChange() {
  const el = document.getElementById('gold-display');
  if (el) {
    el.classList.add('gold-pop');
    setTimeout(() => el.classList.remove('gold-pop'), 400);
  }
}

// ── Render Game Screen ──
function renderGame() {
  const floorInfo = Game.getFloorInfo(state);
  const target = Game.getTarget(state);

  // Header
  document.getElementById('floor-name').textContent = `Floor ${floorInfo.num} — "${floorInfo.name}"`;
  document.getElementById('floor-genre').textContent = floorInfo.genre;
  document.getElementById('page-name').textContent = Game.PAGE_NAMES[state.page];
  document.getElementById('gold-display').textContent = `${state.gold} gold`;

  // Gold animation
  if (state.gold !== lastGold) {
    animateGoldChange();
    lastGold = state.gold;
  }

  // Score with counting animation
  const scoreEl = document.getElementById('score-current');
  scoreEl.textContent = state.roundScore;
  scoreEl.classList.add('counting');
  setTimeout(() => scoreEl.classList.remove('counting'), 400);

  document.getElementById('score-target').innerHTML = `Target: <span>${target}</span>`;

  const pct = Math.min(100, (state.roundScore / target) * 100);
  const fill = document.getElementById('progress-fill');
  fill.style.width = pct + '%';
  fill.className = 'progress-fill';
  if (pct >= 100) fill.classList.add('complete');
  else if (pct >= 70) fill.classList.add('close');

  document.getElementById('submissions-left').textContent = `${state.submissionsLeft} submissions left`;

  // Twist banner
  const twistEl = document.getElementById('twist-banner');
  if (state.activeTwist) {
    twistEl.style.display = 'block';
    twistEl.innerHTML = `<div class="twist-name">${state.activeTwist.name}</div><div class="twist-desc">${state.activeTwist.desc}</div>`;
  } else {
    twistEl.style.display = 'none';
  }

  renderWordDisplay();
  renderGrid();
  renderActions();
  renderWordHistory();
  renderCharms();
  renderInkCards();
  renderSkipButton();
}

function renderWordDisplay() {
  const el = document.getElementById('word-display');
  const cells = state.selectedCells;

  if (cells.length === 0) {
    el.innerHTML = '<span class="placeholder">Trace adjacent letters to form a word...</span>';
    el.className = 'word-display';
    return;
  }

  const word = cells.map(c => c.isWild ? (c.wildLetter || '★') : c.letter).join('');
  const status = GameDictionary.checkPrefix(word);

  const parts = cells.map(c => c.isWild ? (c.wildLetter || '★') : c.letter);
  el.innerHTML = parts.map((p, i) =>
    `<span class="word-letter" style="animation-delay: ${i * 40}ms">${p}</span>`
  ).join('');

  el.className = 'word-display';
  if (status === 'word') el.classList.add('valid-word');
  else if (status === 'prefix') el.classList.add('valid-prefix');
  else el.classList.add('invalid');
}

function renderGrid() {
  const container = document.getElementById('grid-container');
  container.innerHTML = '';

  const { LETTER_CHIPS, LETTER_TIERS } = window.GameDice;
  const selectedSet = new Set(state.selectedCells.map(c => `${c.row},${c.col}`));
  const lastCell = state.selectedCells[state.selectedCells.length - 1];

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const cell = state.grid[r][c];
      const key = `${r},${c}`;
      const isSelected = selectedSet.has(key);
      const selIndex = state.selectedCells.findIndex(sc => sc.row === r && sc.col === c);
      const isAdjacentToLast = lastCell && !isSelected && GameDice.areAdjacent(lastCell.row, lastCell.col, r, c);

      const div = document.createElement('div');
      div.className = 'die-cell';
      if (isSelected) div.classList.add('selected');
      if (isAdjacentToLast) div.classList.add('adjacent-hint');
      if (cell.die.type !== 'standard') div.classList.add('die-' + cell.die.type);

      // Apply rerolling animation to cells that just changed
      if (rerolledPositions.has(key)) {
        div.classList.add('rerolling');
        div.style.animationDelay = (Math.random() * 80) + 'ms';
      }

      const tier = LETTER_TIERS[cell.letter] || 'common';
      const chips = LETTER_CHIPS[cell.letter] || 2;
      const totalChips = chips + (cell.die.bonusChips || 0);
      const displayLetter = cell.isWild ? '★' : (cell.letter === 'QU' ? 'Qu' : cell.letter);
      const isQu = cell.letter === 'QU';
      const isUpgraded = (cell.die.bonusChips || 0) > 0;

      if (isUpgraded) div.classList.add('die-upgraded');

      div.innerHTML = `
        <span class="die-letter tier-${tier}${isQu ? ' die-qu' : ''}">${displayLetter}</span>
        <span class="die-chips">${totalChips}</span>
        ${isSelected ? `<span class="selection-order">${selIndex + 1}</span>` : ''}
      `;

      div.addEventListener('click', () => onCellClick(r, c));
      div.addEventListener('touchend', (e) => { e.preventDefault(); onCellClick(r, c); });

      container.appendChild(div);
    }
  }

  // Clear rerolled positions after render
  if (rerolledPositions.size > 0) {
    setTimeout(() => { rerolledPositions.clear(); }, 500);
  }
}

function renderActions() {
  const el = document.getElementById('actions-row');
  const word = state.selectedCells.map(c => c.isWild ? (c.wildLetter || '★') : c.letter).join('');
  const isValid = word.length >= 3 && GameDictionary.isValidWord(word);
  const canShake = state.submissionsLeft > 0;

  el.innerHTML = `
    <button class="btn btn-small ${state.selectedCells.length === 0 ? 'btn-disabled' : 'btn-red'}" onclick="clearSelection()">Clear</button>
    <button class="btn btn-small btn-gold ${!isValid ? 'btn-disabled' : ''}" onclick="doSubmitWord()">Submit</button>
    <button class="btn btn-small ${!canShake ? 'btn-disabled' : ''}" onclick="doShakeGrid()" title="Re-roll the entire grid (costs 1 submission)">Shake</button>
  `;

  renderFinishButton();
}

function renderFinishButton() {
  const el = document.getElementById('finish-row');
  const target = Game.getTarget(state);
  const hasWords = state.wordsThisRound.length > 0;
  const meetsTarget = state.roundScore >= target;
  const active = hasWords && meetsTarget;

  if (!active) {
    el.innerHTML = '';
    el.className = 'finish-row';
    return;
  }

  // Only set content if not already showing (avoid re-triggering animation)
  if (!el.querySelector('.finish-btn')) {
    const bonus = state.submissionsLeft * 2;
    el.innerHTML = `
      <button class="finish-btn" onclick="endRoundEarly()">
        <span class="finish-label">Finish Page</span>
        <span class="finish-bonus">+${bonus} bonus gold for ${state.submissionsLeft} unused submission${state.submissionsLeft !== 1 ? 's' : ''}</span>
      </button>
    `;
    el.className = 'finish-row active';
  } else {
    // Update bonus text in case submissions changed
    const bonusEl = el.querySelector('.finish-bonus');
    if (bonusEl) {
      const bonus = state.submissionsLeft * 2;
      bonusEl.textContent = `+${bonus} bonus gold for ${state.submissionsLeft} unused submission${state.submissionsLeft !== 1 ? 's' : ''}`;
    }
  }
}

function renderWordHistory() {
  const el = document.getElementById('word-history');
  el.innerHTML = '';

  const entries = [...(state.wordHistory || [])].reverse();
  for (const entry of entries) {
    const div = document.createElement('div');
    div.className = 'word-entry';
    div.innerHTML = `
      <div>
        <span class="word-text">${entry.word}</span>
        ${entry.patterns.length > 0 ? `<span class="word-patterns"> ${entry.patterns.join(' · ')}</span>` : ''}
      </div>
      <span class="word-score">+${entry.score}</span>
    `;
    el.appendChild(div);
  }
}

function renderCharms() {
  const el = document.getElementById('charms-bar');
  el.innerHTML = '';
  for (const charm of state.charms) {
    const pip = document.createElement('span');
    pip.className = `charm-pip rarity-${charm.rarity}`;
    pip.textContent = charm.name;
    pip.setAttribute('data-tooltip', charm.desc);
    pip.setAttribute('data-charm-id', charm.id);
    el.appendChild(pip);
  }
}

function renderInkCards() {
  const el = document.getElementById('ink-cards-bar');
  el.innerHTML = '';
  state.inkCards.forEach((card, i) => {
    const btn = document.createElement('button');
    btn.className = 'ink-card-btn';
    btn.textContent = card.name;
    btn.title = card.desc;
    btn.addEventListener('click', () => useInkCard(i));
    el.appendChild(btn);
  });
}

function renderSkipButton() {
  const el = document.getElementById('skip-row');
  if (state.page < 2 && state.wordsThisRound.length === 0) {
    el.innerHTML = `<button class="btn btn-small" onclick="doSkipPage()">Skip Page (+8 gold bookmark)</button>`;
  } else {
    el.innerHTML = '';
  }
}

// ── Cell Click Handler ──
function onCellClick(r, c) {
  if (state.phase !== 'playing') return;

  const cell = state.grid[r][c];
  const selectedIdx = state.selectedCells.findIndex(sc => sc.row === r && sc.col === c);

  if (selectedIdx === state.selectedCells.length - 1 && selectedIdx >= 0) {
    state.selectedCells.pop();
    renderWordDisplay(); renderGrid(); renderActions(); renderSkipButton();
    return;
  }

  if (selectedIdx >= 0) {
    state.selectedCells = state.selectedCells.slice(0, selectedIdx + 1);
    renderWordDisplay(); renderGrid(); renderActions(); renderSkipButton();
    return;
  }

  if (state.selectedCells.length > 0) {
    const last = state.selectedCells[state.selectedCells.length - 1];
    if (!GameDice.areAdjacent(last.row, last.col, r, c)) return;
  }

  if (cell.isWild) {
    const letter = prompt('Wild die! Enter a letter (A-Z):');
    if (!letter || !/^[A-Za-z]$/.test(letter)) return;
    cell.wildLetter = letter.toUpperCase();
  }

  state.selectedCells.push(cell);
  renderWordDisplay(); renderGrid(); renderActions(); renderSkipButton();
}

// ── Word finder for Muse's Whisper ──
function findBestWord(grid) {
  const { LETTER_CHIPS, getWordLengthMult } = window.GameDice;
  let best = null;
  let bestScore = 0;

  function dfs(r, c, visited, cells, word) {
    const cell = grid[r][c];
    const letter = cell.isWild ? 'E' : cell.letter; // treat wild as E for search
    const newWord = word + letter;
    const newCells = [...cells, cell];
    const newVisited = new Set(visited);
    newVisited.add(`${r},${c}`);

    const status = GameDictionary.checkPrefix(newWord);
    if (status === 'none') return;

    if (status === 'word' && newWord.length >= 3) {
      const chips = newCells.reduce((s, cl) => s + (LETTER_CHIPS[cl.letter] || 2), 0);
      const score = chips * getWordLengthMult(newWord.length);
      if (score > bestScore) {
        bestScore = score;
        best = { word: newWord, cells: [...newCells] };
      }
    }

    // Don't search too deep
    if (newWord.length >= 8) return;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr > 3 || nc < 0 || nc > 3) continue;
        if (newVisited.has(`${nr},${nc}`)) continue;
        dfs(nr, nc, newVisited, newCells, newWord);
      }
    }
  }

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      dfs(r, c, new Set(), [], '');
    }
  }

  return best;
}

function clearSelection() {
  state.selectedCells = [];
  renderWordDisplay(); renderGrid(); renderActions(); renderSkipButton();
}

// ── Shake Grid — with animation ──
function doShakeGrid() {
  if (state.submissionsLeft <= 0) return;
  state.submissionsLeft--;
  state.selectedCells = [];

  // Mark all positions for animation
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      rerolledPositions.add(`${r},${c}`);

  GameDice.shakeGrid(state.grid);
  narrate(pick(Game.NARRATOR.shake));

  // Shake the grid container
  const container = document.getElementById('grid-container');
  container.classList.add('shaking');
  setTimeout(() => container.classList.remove('shaking'), 400);

  if (state.submissionsLeft <= 0) {
    setTimeout(() => finishRound(), 800);
  }

  renderGame();
}

// ── Submit Word — with step-by-step scoring animation ──
let scoringAnimationActive = false;

function doSubmitWord() {
  if (state.selectedCells.length < 3 || scoringAnimationActive) return;

  // Snapshot used cell positions BEFORE submit clears them
  const usedPositions = new Set(state.selectedCells.map(c => `${c.row},${c.col}`));

  const result = Game.submitWord(state);

  if (!result.success) {
    showToast(result.reason);
    return;
  }

  if (!state.wordHistory) state.wordHistory = [];
  state.wordHistory.push(result.result);

  // Set rerolled positions for dice animation after scoring completes
  rerolledPositions = usedPositions;

  // Block input and run the scoring animation
  scoringAnimationActive = true;
  runScoringAnimation(result.result).then(() => {
    scoringAnimationActive = false;

    // Screen shake for big scores
    if (result.result.score >= 150) triggerScreenShake();

    // Narrator
    narrateWordReaction(result.result);

    // Check if round is over
    if (state.submissionsLeft <= 0) {
      setTimeout(() => finishRound(), 600);
    }

    renderGame();
  });
}

// ── Step-by-step scoring animation (Balatro-style) ──
function runScoringAnimation(result) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'scoring-overlay';

    const letters = result.letterDetails;
    const hasCharms = result.charmTriggers.length > 0;
    const hasPatterns = result.patterns.length > 0;

    overlay.innerHTML = `
      <div class="scoring-card">
        <div class="scoring-letters">
          ${letters.map((l, i) => `
            <div class="scoring-tile" id="stile-${i}">
              <div class="tile-letter tier-${l.tier}">${l.letter}</div>
              <div class="tile-chips" id="schip-${i}">+${l.chips}</div>
            </div>
          `).join('')}
        </div>
        <div class="scoring-length-mult" id="slength">
          ${result.word.length} letters → ×${result.baseMult} base mult
        </div>
        <div class="scoring-totals">
          <span class="scoring-chips-total" id="schips-total">0</span>
          <span class="scoring-x">×</span>
          <span class="scoring-mult-total" id="smult-total">${result.baseMult}</span>
        </div>
        <div class="scoring-charms" id="scharms"></div>
        <div class="scoring-patterns" id="spatterns">
          ${result.patterns.map(p => `<span class="pattern-badge">${p}</span>`).join('')}
        </div>
        <div class="scoring-final" id="sfinal">+${result.score}</div>
      </div>
    `;

    document.getElementById('app').appendChild(overlay);

    // Animation timeline
    const LETTER_DELAY = 120; // ms between each letter
    const CHARM_DELAY = 300;  // ms between each charm
    let t = 200; // start delay

    let runningChips = 0;
    const multEl = () => document.getElementById('smult-total');
    const chipsEl = () => document.getElementById('schips-total');

    // Step 1: Reveal letters one by one, accumulating chips
    letters.forEach((l, i) => {
      setTimeout(() => {
        const tile = document.getElementById(`stile-${i}`);
        const chip = document.getElementById(`schip-${i}`);
        if (tile) tile.classList.add('revealed');
        setTimeout(() => {
          if (chip) chip.classList.add('shown');
          runningChips += l.chips;
          const cel = chipsEl();
          if (cel) {
            cel.textContent = runningChips;
            cel.classList.remove('bump');
            void cel.offsetWidth; // force reflow
            cel.classList.add('bump');
          }
        }, 100);
      }, t + i * LETTER_DELAY);
    });

    t += letters.length * LETTER_DELAY + 200;

    // Step 2: Show length mult
    setTimeout(() => {
      const el = document.getElementById('slength');
      if (el) el.classList.add('shown');
    }, t);

    t += 300;

    // Step 3: Show charm triggers one by one, updating totals
    let currentBonusChips = 0;
    let currentBonusMult = 0;
    let currentMultMult = 1;

    result.charmTriggers.forEach((charm, i) => {
      setTimeout(() => {
        const charmsDiv = document.getElementById('scharms');
        if (!charmsDiv) return;

        // Build effect text
        const effects = [];
        if (charm.chipDelta > 0) effects.push(`<span class="charm-entry-effect chips-effect">+${charm.chipDelta} chips</span>`);
        if (charm.chipDelta < 0) effects.push(`<span class="charm-entry-effect chips-effect">${charm.chipDelta} chips</span>`);
        if (charm.multDelta > 0) effects.push(`<span class="charm-entry-effect mult-effect">+${charm.multDelta} mult</span>`);
        if (charm.multMultDelta > 0) effects.push(`<span class="charm-entry-effect mult-effect">×${charm.multMultDelta} mult</span>`);
        if (charm.goldDelta > 0) effects.push(`<span class="charm-entry-effect gold-effect">+${charm.goldDelta} gold</span>`);

        const entry = document.createElement('div');
        entry.className = 'scoring-charm-entry';
        entry.innerHTML = `
          <span class="charm-entry-name">${charm.name}</span>
          <span>${effects.join(' ')}</span>
        `;
        charmsDiv.appendChild(entry);

        // Trigger animation
        requestAnimationFrame(() => entry.classList.add('shown'));

        // Update running totals
        currentBonusChips += charm.chipDelta;
        currentBonusMult += charm.multDelta;
        if (charm.multMultDelta > 0) currentMultMult *= charm.multMultDelta;

        const cel = chipsEl();
        if (cel && charm.chipDelta !== 0) {
          cel.textContent = result.baseChips + currentBonusChips;
          cel.classList.remove('bump');
          void cel.offsetWidth;
          cel.classList.add('bump');
        }

        const mel = multEl();
        if (mel && (charm.multDelta !== 0 || charm.multMultDelta > 0)) {
          const currentMult = (result.baseMult + currentBonusMult) * currentMultMult;
          mel.textContent = currentMult % 1 === 0 ? currentMult : currentMult.toFixed(1);
          mel.classList.remove('bump');
          void mel.offsetWidth;
          mel.classList.add('bump');
        }
      }, t + i * CHARM_DELAY);
    });

    t += result.charmTriggers.length * CHARM_DELAY + 200;

    // Step 4: Show patterns
    if (hasPatterns) {
      setTimeout(() => {
        const el = document.getElementById('spatterns');
        if (el) el.classList.add('shown');
      }, t);
      t += 200;
    }

    // Step 5: Final score slam
    setTimeout(() => {
      const el = document.getElementById('sfinal');
      if (el) el.classList.add('shown');
    }, t);

    t += 400;

    // Step 6: Dismiss
    const totalDuration = t + 500;
    setTimeout(() => {
      overlay.style.transition = 'opacity 0.3s';
      overlay.style.opacity = '0';
      setTimeout(() => { overlay.remove(); resolve(); }, 300);
    }, totalDuration);

    // Also allow click to skip
    overlay.addEventListener('click', () => {
      overlay.remove();
      resolve();
    });
  });
}

function endRoundEarly() {
  if (state.wordsThisRound.length === 0) return;
  finishRound();
}

function finishRound() {
  const result = Game.endRound(state);

  if (result.passed) {
    state.pageResult = result;
    narrate(pick(state.page === 2 ? Game.NARRATOR.floorCleared : Game.NARRATOR.pageCleared));
    state.phase = 'pageResult';
  } else {
    state.pageResult = result;
    narrate(pick(Game.NARRATOR.gameOver));
    state.phase = 'gameOver';
  }

  state.wordHistory = [];
  render();
}

// ── Skip Page ──
function doSkipPage() {
  if (state.page >= 2) return;
  showPageTurn(() => {
    Game.skipPage(state);
    state.page = Math.min(state.page, 2);
    Game.startRound(state);
    state.wordHistory = [];

    // Show twist reveal if landing on final page
    if (state.page === 2 && state.activeTwist) {
      showTwistReveal(state.activeTwist, () => {
        render();
        animateGridEntrance();
      });
    } else {
      render();
      animateGridEntrance();
    }
  });
}

// ── Use Ink Card ──
function useInkCard(index) {
  const card = state.inkCards[index];
  if (!card) return;

  if (card.id === 'muse_whisper') {
    state.inkCards.splice(index, 1);
    const hint = findBestWord(state.grid);
    if (hint) {
      // Highlight the cells by selecting them
      state.selectedCells = hint.cells;
      showToast(`The muse whispers: "${hint.word}"`);
    } else {
      showToast("The muse finds nothing... the grid is barren.");
    }
    renderGame();
    return;
  } else if (card.id === 'fresh_page') {
    // Mark all for animation
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        rerolledPositions.add(`${r},${c}`);
    Game.useInkCard(state, index);
    narrate('The page clears. New letters tumble into place.');
  } else {
    Game.useInkCard(state, index);
  }

  state.selectedCells = [];
  renderGame();
}

// ── Page Result Overlay ──
function showPageResult() {
  const r = state.pageResult;
  const floorInfo = Game.getFloorInfo(state);
  const isFloorComplete = state.page === 2;
  const narratorText = isFloorComplete ? pick(Game.NARRATOR.floorCleared) : pick(Game.NARRATOR.pageCleared);

  const div = document.createElement('div');
  div.className = 'gold-reward-overlay';
  div.innerHTML = `
    <div class="gold-reward-card">
      <div class="gold-reward-title" id="gr-title">${isFloorComplete ? 'Floor Complete!' : 'Page Complete!'}</div>
      <div class="gold-reward-row" id="gr-score">
        <span class="reward-label">Score</span>
        <span class="reward-value" style="color: var(--cream);">${r.roundScore} / ${r.target}</span>
      </div>
      <div class="gold-reward-row" id="gr-base">
        <span class="reward-label">Page reward</span>
        <span class="reward-value">+${r.baseGold}</span>
      </div>
      <div class="gold-reward-row" id="gr-bonus">
        <span class="reward-label">${r.bonusGold / 2} unused submission${r.bonusGold / 2 !== 1 ? 's' : ''} × 2</span>
        <span class="reward-value">+${r.bonusGold}</span>
      </div>
      <div class="gold-reward-total" id="gr-total">
        <span class="reward-label">Gold earned</span>
        <span class="reward-value">+${r.totalGold}</span>
      </div>
      <div style="opacity:0; font-family: 'Crimson Text', serif; font-style: italic; color: var(--cream-dim); font-size: 13px; text-align: center;" id="gr-narrate">${narratorText}</div>
      <button class="btn btn-gold" style="opacity:0;" id="gr-continue" onclick="proceedFromResult()">Continue</button>
    </div>
  `;
  document.getElementById('app').appendChild(div);

  // Animate the rows stepping in
  let t = 200;
  const step = 350;

  setTimeout(() => {
    const el = document.getElementById('gr-title');
    if (el) el.classList.add('shown');
  }, t);

  t += step;
  setTimeout(() => {
    const el = document.getElementById('gr-score');
    if (el) el.classList.add('shown');
  }, t);

  t += step;
  setTimeout(() => {
    const el = document.getElementById('gr-base');
    if (el) el.classList.add('shown');
  }, t);

  t += step;
  setTimeout(() => {
    const el = document.getElementById('gr-bonus');
    if (el) el.classList.add('shown');
  }, t);

  t += step + 100;
  setTimeout(() => {
    const el = document.getElementById('gr-total');
    if (el) el.classList.add('shown');
  }, t);

  t += 500;
  setTimeout(() => {
    const el = document.getElementById('gr-narrate');
    if (el) { el.style.transition = 'opacity 0.5s'; el.style.opacity = '1'; }
    const btn = document.getElementById('gr-continue');
    if (btn) { btn.style.transition = 'opacity 0.4s'; btn.style.opacity = '1'; }
  }, t);
}

function proceedFromResult() {
  const wasPage = state.page;
  Game.advancePage(state);

  if (state.phase === 'victory') {
    render();
    return;
  }

  if (state.phase === 'shop') {
    shopItems = Game.generateShopItems(state);
    shopItems.forEach(item => item.sold = false);
  }

  // Page turn transition
  showPageTurn(() => render());
}

// ── Shop Screen ──
function renderShop() {
  const floorInfo = Game.getFloorInfo(state);
  document.getElementById('shop-title').textContent = 'The Ink & Quill Cart';
  document.getElementById('shop-floor-info').textContent = `Floor ${floorInfo.num} — ${Game.PAGE_NAMES[state.page]} next`;
  document.getElementById('shop-gold').textContent = `${state.gold} gold`;

  const container = document.getElementById('shop-items');
  container.innerHTML = '';

  shopItems.forEach((item, i) => {
    const canAfford = state.gold >= item.cost;
    const div = document.createElement('div');
    div.className = 'shop-item' + (item.sold ? ' sold' : '') + (!canAfford && !item.sold ? ' cant-afford' : '');

    let typeName = item.type.replace('_', ' ');
    let name = '', desc = '', flavor = '';

    switch (item.type) {
      case 'charm':
        name = item.data.name;
        desc = item.data.desc;
        flavor = item.data.flavor;
        typeName = `charm · ${item.data.rarity}`;
        break;
      case 'die':
        name = item.data.name;
        desc = `Faces: ${item.data.faces.join(' ')} — ${item.data.flavor}`;
        flavor = item.data.bonusChips ? `+${item.data.bonusChips} chips per letter` : item.data.bonusMult ? `+${item.data.bonusMult} mult per word` : '';
        break;
      case 'remove_die':
        name = 'Bag Surgery';
        desc = 'Remove a standard die from your bag.';
        flavor = `Current bag: ${state.diceBag.length} dice`;
        break;
      case 'ink_card':
        name = item.data.name;
        desc = item.data.desc;
        flavor = item.data.flavor;
        typeName = 'ink card';
        break;
      case 'length_upgrade':
        name = item.data.name;
        desc = `${item.data.length}-letter words gain +1 base mult (×${GameDice.LENGTH_MULT[item.data.length] || 1}+${item.data.currentBonus} → ×${GameDice.LENGTH_MULT[item.data.length] || 1}+${item.data.newBonus})`;
        flavor = item.data.flavor;
        typeName = 'word upgrade';
        break;
      case 'die_upgrade':
        name = item.data.name;
        desc = `Pick a die in your bag — it gains +${item.data.chipBonus} chips permanently`;
        flavor = item.data.flavor;
        typeName = 'die upgrade';
        break;
    }

    div.innerHTML = `
      <div class="shop-item-info">
        <div class="shop-item-type">${typeName}</div>
        <div class="shop-item-name">${name}</div>
        <div class="shop-item-desc">${desc}</div>
        ${flavor ? `<div class="shop-item-flavor">"${flavor}"</div>` : ''}
      </div>
      <div class="shop-item-cost">${item.sold ? 'SOLD' : item.cost + ' g'}</div>
    `;

    if (!item.sold) {
      div.addEventListener('click', () => buyItem(i));
    }
    container.appendChild(div);
  });

  // Show current charms
  const charmsEl = document.getElementById('shop-charms');
  charmsEl.innerHTML = '';
  if (state.charms.length > 0) {
    charmsEl.innerHTML = `<h3>Your Charms (${state.charms.length}/${state.maxCharms})</h3>`;
    const grid = document.createElement('div');
    grid.className = 'charms-grid';
    for (const charm of state.charms) {
      const card = document.createElement('div');
      card.className = 'charm-card';
      card.textContent = `${charm.name} — ${charm.desc}`;
      grid.appendChild(card);
    }
    charmsEl.appendChild(grid);
  }
}

function buyItem(index) {
  const item = shopItems[index];
  if (item.sold || state.gold < item.cost) return;

  const result = Game.buyShopItem(state, item);
  if (result.success) {
    if (result.pickDie) {
      // Show die picker overlay
      item.sold = true;
      showDiePicker(result.chipBonus);
      renderShop();
      return;
    }
    item.sold = true;
    showToast(result.msg);
  } else {
    showToast(result.reason);
  }
  renderShop();
}

// ── Die Picker: choose which die to upgrade ──
function showDiePicker(chipBonus) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="overlay-card" style="max-width: 440px;">
      <h2>Sharpen a Die</h2>
      <p style="color: var(--cream-dim); font-size: 13px;">Choose a die to upgrade. It gains +${chipBonus} chips permanently on every face.</p>
      <div id="die-picker-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; width: 100%;"></div>
    </div>
  `;
  document.getElementById('app').appendChild(overlay);

  const grid = document.getElementById('die-picker-grid');
  const { LETTER_CHIPS, LETTER_TIERS } = window.GameDice;

  // Show all dice in the bag (first 16)
  state.diceBag.forEach((die, i) => {
    if (i >= 16) return; // only show grid-eligible dice
    const sampleLetter = die.faces[0] === 'Q' ? 'QU' : die.faces[0];
    const tier = LETTER_TIERS[sampleLetter] || 'common';
    const baseChips = LETTER_CHIPS[sampleLetter] || 2;
    const currentBonus = die.bonusChips || 0;
    const faces = die.faces.map(f => f === 'Q' ? 'Qu' : f).join(' ');

    const div = document.createElement('div');
    div.className = 'die-cell';
    div.style.cursor = 'pointer';
    div.style.position = 'relative';
    if (currentBonus > 0) {
      div.style.borderColor = '#d4a04a';
      div.style.boxShadow = '0 0 8px rgba(212,160,74,0.3)';
    }
    div.innerHTML = `
      <span class="die-letter tier-${tier}" style="font-size: 16px;">${faces}</span>
      <span class="die-chips">${currentBonus > 0 ? `+${currentBonus}` : ''}</span>
    `;
    div.title = `Faces: ${faces} | Current bonus: +${currentBonus} chips | Will become: +${currentBonus + chipBonus}`;

    div.addEventListener('click', () => {
      Game.upgradeDie(state, i, chipBonus);
      overlay.remove();
      showToast(`Die upgraded! +${die.bonusChips} chips on [${faces}]`);
      renderShop();
    });

    grid.appendChild(div);
  });
}

function leaveShop() {
  state.phase = 'playing';

  // Check if next page is a Final Page — show twist reveal
  if (state.page === 2) {
    Game.startRound(state);
    state.wordHistory = [];

    if (state.activeTwist) {
      showTwistReveal(state.activeTwist, () => {
        render();
        animateGridEntrance();
      });
    } else {
      render();
      animateGridEntrance();
    }
  } else if (state.page === 0) {
    // New floor — show floor intro
    showFloorIntro(() => {
      Game.startRound(state);
      state.wordHistory = [];
      render();
      animateGridEntrance();
    });
  } else {
    Game.startRound(state);
    state.wordHistory = [];
    render();
    animateGridEntrance();
  }
}

// ── Game Over — with narrative ──
function showGameOver() {
  const r = state.pageResult;
  const floorInfo = Game.getFloorInfo(state);
  const deathQuote = pick(Game.NARRATOR.gameOver);

  const div = document.createElement('div');
  div.className = 'overlay';
  div.innerHTML = `
    <div class="overlay-card game-over">
      <h2>The Story Falls Apart</h2>
      <p style="color: var(--cream-dim); font-style: italic; font-family: 'Crimson Text', serif; line-height: 1.6;">${deathQuote}</p>
      <div class="result-score">${r.roundScore} / ${r.target}</div>
      <div class="result-target">Floor ${floorInfo.num} — ${Game.PAGE_NAMES[state.page]}</div>
      <div class="stats-grid">
        <div class="stat-item"><strong>${state.wordsPlayed}</strong> words written</div>
        <div class="stat-item"><strong>${state.floorsCleared}</strong> floors cleared</div>
        <div class="stat-item"><strong>${state.longestWord || '—'}</strong> longest word</div>
        <div class="stat-item"><strong>${state.bestWordScore}</strong> best word score</div>
        <div class="stat-item"><strong>${state.runScore}</strong> total score</div>
        <div class="stat-item"><strong>${state.gold}</strong> gold earned</div>
      </div>
      <button class="btn btn-gold" onclick="startGame()">Try Again</button>
      <button class="btn btn-small" onclick="goToTitle()">Main Menu</button>
    </div>
  `;
  document.getElementById('app').appendChild(div);
}

// ── Victory — with particles and narrative ──
function showVictory() {
  const div = document.createElement('div');
  div.className = 'overlay';
  div.innerHTML = `
    <div class="overlay-card victory">
      <h2>The Last Chapter</h2>
      <p style="color: var(--cream); font-size: 16px; line-height: 1.8; font-family: 'Crimson Text', serif;">
        The final page turns itself. The ink settles. The story is complete.<br><br>
        You have written your way to the top of the Endless Library.<br>
        The cats purr. The lamps dim. Somewhere, a new writer opens the door.
      </p>
      <div class="result-score" style="font-size: 42px;">Final Score: ${state.runScore}</div>
      <div class="stats-grid">
        <div class="stat-item"><strong>${state.wordsPlayed}</strong> words written</div>
        <div class="stat-item"><strong>${state.floorsCleared}</strong> floors cleared</div>
        <div class="stat-item"><strong>${state.longestWord || '—'}</strong> longest word</div>
        <div class="stat-item"><strong>${state.bestWordScore}</strong> best word score</div>
      </div>
      <button class="btn btn-gold" onclick="startGame()">Write Another Story</button>
      <button class="btn btn-small" onclick="goToTitle()">Main Menu</button>
    </div>
  `;
  document.getElementById('app').appendChild(div);

  // Burst of particles
  setTimeout(spawnVictoryParticles, 300);
  setTimeout(spawnVictoryParticles, 900);
}

function goToTitle() {
  state = Game.createGameState();
  render();
}

// ── Enhanced Score Popup ──
// showScorePopup replaced by runScoringAnimation

// ── Toast messages ──
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      padding: 10px 20px; background: var(--bg-card); border: 1px solid var(--amber-dim);
      border-radius: 8px; color: var(--cream); font-size: 13px; z-index: 400;
      transition: opacity 0.3s; pointer-events: none;
      font-family: 'Crimson Text', serif;
    `;
    document.getElementById('app').appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// Global exports
window.startGame = startGame;
window.clearSelection = clearSelection;
window.doSubmitWord = doSubmitWord;
window.doShakeGrid = doShakeGrid;
window.endRoundEarly = endRoundEarly;
window.proceedFromResult = proceedFromResult;
window.leaveShop = leaveShop;
window.doSkipPage = doSkipPage;
window.goToTitle = goToTitle;

// Start
document.addEventListener('DOMContentLoaded', init);
