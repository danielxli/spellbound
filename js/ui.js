// ui.js — Rendering, input handling, screen management, animations, narrator

const GAME_VERSION = '0.7.0';

let state = null;
let shopItems = [];
let lastGold = 0;
let narratorTimer = null;
let rerolledPositions = new Set(); // track which cells just re-rolled for animation
let selectedCharacter = 'novelist';
let roundTimer = null; // setInterval for journalist countdown

// ── Helpers ──
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Initialization ──
async function init() {
  // Show loading screen
  document.getElementById('loading-screen').style.display = 'flex';
  document.getElementById('title-screen').style.display = 'none';

  document.getElementById('loading-status').textContent = 'Loading dictionary...';
  await GameDictionary.initDictionary();

  document.getElementById('loading-status').textContent = 'Preparing your desk...';
  Settings.init();

  state = Game.createGameState();
  createDustMotes();

  // Build character selector
  renderCharacterSelect();

  // Check for saved run
  if (Storage.hasRun()) {
    const titleBtns = document.getElementById('title-buttons');
    const resumeBtn = document.createElement('button');
    resumeBtn.className = 'btn btn-gold';
    resumeBtn.textContent = 'Resume Writing';
    resumeBtn.onclick = resumeGame;
    titleBtns.insertBefore(resumeBtn, titleBtns.firstChild);
    document.getElementById('start-btn').textContent = 'New Run';
  }

  // Show career stats
  const stats = Storage.loadStats();
  if (stats.runsPlayed > 0) {
    document.getElementById('title-stats').textContent = `${stats.runsPlayed} runs · Best floor: ${stats.bestFloor} · Best score: ${stats.bestScore}`;
  }

  // Show run history
  renderRunHistory();

  // Set version
  document.getElementById('title-version').textContent = `v${GAME_VERSION}`;

  // Transition to title
  document.getElementById('loading-screen').style.display = 'none';
  render();

  document.addEventListener('keydown', handleKeydown);

  // Register service worker for PWA/offline — auto-update on new version
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'activated') {
            // New SW active — reload to get fresh assets
            window.location.reload();
          }
        });
      });
    }).catch(() => {});
  }
}

function resumeGame() {
  const loaded = Storage.loadRun();
  if (!loaded || !loaded.grid) {
    Storage.clearRun();
    startGame();
    return;
  }
  state = loaded;
  selectedCharacter = state.writer || 'novelist';
  GameAudio.ensureContext();
  render();
  if (state.phase === 'playing') startTimerIfNeeded();
}

function handleKeydown(e) {
  // Pause overlay takes priority
  if (e.key === 'Escape' && document.getElementById('pause-overlay')) {
    closePause();
    return;
  }
  if (e.key === 'Escape' && document.getElementById('settings-overlay')) {
    closeSettings();
    return;
  }
  if (e.key === 'Escape' && document.getElementById('stats-overlay')) {
    closeStatsScreen();
    return;
  }

  if (state.phase === 'playing' && !scoringAnimationActive) {
    if (e.key === 'Enter') doSubmitWord();
    else if (e.key === 'Backspace') clearSelection();
    else if (e.key === 'Escape') {
      if (state.selectedCells.length > 0) clearSelection();
      else showPause();
    }
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
    mote.style.width = (3 + Math.random() * 3) + 'px';
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
// ── Character Selection ──
function renderCharacterSelect() {
  const el = document.getElementById('character-select');
  el.innerHTML = '';
  for (const [key, char] of Object.entries(Game.CHARACTERS)) {
    const card = document.createElement('div');
    card.className = 'char-card' + (selectedCharacter === key ? ' selected' : '');
    card.innerHTML = `
      <div class="char-name">${char.name}</div>
      <div class="char-desc">${char.desc}</div>
    `;
    card.addEventListener('click', () => {
      selectedCharacter = key;
      renderCharacterSelect();
    });
    el.appendChild(card);
  }
}

// ── Run History ──
function renderRunHistory() {
  const el = document.getElementById('run-history');
  const history = Storage.loadHistory();
  if (history.length === 0) { el.innerHTML = ''; return; }

  let html = '<div class="history-title">Recent Runs</div><div class="history-list">';
  for (const run of history.slice(0, 10)) {
    const date = new Date(run.date);
    const dateStr = `${date.getMonth()+1}/${date.getDate()}`;
    const charName = Game.CHARACTERS[run.character]?.name || 'Novelist';
    const charTag = run.character === 'journalist' ? 'J' : 'N';
    const result = run.victory
      ? '<span class="history-victory">VICTORY</span>'
      : `<span class="history-death">Floor ${run.floorsCleared}</span>`;
    html += `<div class="history-row">
      <span class="history-date">${dateStr}</span>
      <span class="history-char">${charTag}</span>
      ${result}
      <span class="history-score">${run.score.toLocaleString()}</span>
      <span class="history-words">${run.wordsPlayed}w</span>
    </div>`;
  }
  html += '</div>';
  el.innerHTML = html;
}

function render() {
  const loadingScreen = document.getElementById('loading-screen');
  const titleScreen = document.getElementById('title-screen');
  const gameScreen = document.getElementById('game-screen');
  const shopScreen = document.getElementById('shop-screen');

  loadingScreen.style.display = 'none';
  titleScreen.style.display = 'none';
  gameScreen.style.display = 'none';
  shopScreen.style.display = 'none';

  // Clear overlays & intros
  document.querySelectorAll('.overlay, .gold-reward-overlay, .floor-intro, .page-select, .twist-reveal, .page-turn').forEach(el => el.remove());

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
  Storage.clearRun();
  state = Game.createGameState();
  state.writer = selectedCharacter;
  const char = Game.CHARACTERS[state.writer] || Game.CHARACTERS.novelist;
  state.maxSubmissions = char.submissions;
  GameAudio.ensureContext();
  showFloorIntro(() => {
    showPageSelect(() => {
      state.phase = 'playing';
      Game.startRound(state);
      render();
      animateGridEntrance();
      GameAudio.playDeal();
      startTimerIfNeeded();
      Storage.saveRun(state);
    });
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
    GameAudio.playTransition();
    div.classList.add('floor-intro-exit');
    setTimeout(() => {
      div.remove();
      onContinue();
    }, 450);
  });
}

// ── Pre-Page Screen (Balatro blind-select style) ──
function showPageSelect(onContinue) {
  const floor = Game.FLOORS[state.floor];
  const pageNames = ['Opening Page', 'Rising Page', 'Final Page'];
  const targets = [floor.opening, floor.rising, floor.final];

  const div = document.createElement('div');
  div.className = 'page-select';
  div.id = 'page-select';

  let pagesHTML = '';
  for (let i = 0; i < 3; i++) {
    const isCleared = i < state.page;
    const isCurrent = i === state.page;
    const isFuture = i > state.page;
    const statusClass = isCleared ? 'cleared' : isCurrent ? 'current' : 'future';
    const statusLabel = isCleared ? 'Defeated' : isCurrent ? 'Next' : '';

    pagesHTML += `
      <div class="page-select-card ${statusClass}">
        ${statusLabel ? `<div class="page-select-status">${statusLabel}</div>` : '<div class="page-select-status empty"></div>'}
        <div class="page-select-name">${pageNames[i]}</div>
        <div class="page-select-target">
          ${isCleared ? '<span class="page-check">&#10003;</span>' : `Score at least<br><span class="page-target-num">${targets[i].toLocaleString()}</span>`}
        </div>
      </div>
    `;
  }

  div.innerHTML = `
    <div class="page-select-header">
      <div class="page-select-floor">Floor ${floor.num} — "${floor.name}"</div>
      <div class="page-select-genre">${floor.genre}</div>
    </div>
    <div class="page-select-cards">
      ${pagesHTML}
    </div>
    <div class="page-select-narrative">${floor.intro}</div>
    <button class="btn btn-gold" id="page-select-btn">Begin Writing</button>
  `;

  document.getElementById('app').appendChild(div);

  document.getElementById('page-select-btn').addEventListener('click', () => {
    GameAudio.playTransition();
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
    GameAudio.playTransition();
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
    const size = 3 + Math.random() * 5;
    p.style.width = size + 'px';
    if (Math.random() > 0.5) {
      p.style.height = (size * 1.8) + 'px';
      p.style.borderRadius = '1px';
      p.style.transform = `rotate(${Math.floor(Math.random() * 360)}deg)`;
    } else {
      p.style.height = size + 'px';
    }
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

  const char = Game.CHARACTERS[state.writer] || Game.CHARACTERS.novelist;
  const subsEl = document.getElementById('submissions-left');
  if (char.timed) {
    const secs = Math.ceil(state.timerRemaining);
    subsEl.innerHTML = `<span id="timer-display" class="timer-display${secs <= 10 ? ' timer-urgent' : ''}${secs <= 5 ? ' timer-critical' : ''}">${secs}s</span> · ${state.wordsThisRound.length} words`;
  } else {
    subsEl.textContent = `${state.submissionsLeft} submissions left`;
  }

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

      // Apply visual class based on die bonuses
      const dieVisual = GameDice.getDieVisualClass(cell.die);
      if (dieVisual) div.classList.add(dieVisual);

      // Apply rerolling animation to cells that just changed
      if (rerolledPositions.has(key)) {
        div.classList.add('rerolling');
        div.style.animationDelay = (Math.random() * 80) + 'ms';
      }

      const tier = LETTER_TIERS[cell.letter] || 'common';
      const chips = LETTER_CHIPS[cell.letter] || 2;
      const letterBonus = state.letterBonuses[cell.letter] || 0;
      const totalChips = chips + (cell.die.bonusChips || 0) + letterBonus;
      const displayLetter = cell.isWild ? '★' : (cell.letter === 'QU' ? 'Qu' : cell.letter);
      const isQu = cell.letter === 'QU';
      const dieMult = cell.die.bonusMult || 0;

      div.innerHTML = `
        <span class="die-letter tier-${tier}${isQu ? ' die-qu' : ''}">${displayLetter}</span>
        <span class="die-chips">${totalChips}</span>
        ${dieMult > 0 ? `<span class="die-mult-badge">+${dieMult}m</span>` : ''}
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
  const char = Game.CHARACTERS[state.writer] || Game.CHARACTERS.novelist;
  const canShake = char.timed ? (state.timerRemaining > 0) : (state.submissionsLeft > 0);
  const shakeTitle = char.timed ? 'Re-roll the entire grid' : 'Re-roll the entire grid (costs 1 submission)';

  el.innerHTML = `
    <button class="btn btn-small ${state.selectedCells.length === 0 ? 'btn-disabled' : 'btn-red'}" onclick="clearSelection()">Clear</button>
    <button class="btn btn-small btn-gold ${!isValid ? 'btn-disabled' : ''}" onclick="doSubmitWord()">Submit</button>
    <button class="btn btn-small ${!canShake ? 'btn-disabled' : ''}" onclick="doShakeGrid()" title="${shakeTitle}">Shake</button>
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
    const char = Game.CHARACTERS[state.writer] || Game.CHARACTERS.novelist;
    let bonusText;
    if (char.timed) {
      const bonus = Math.floor(state.timerRemaining / 10);
      bonusText = `+${bonus} bonus gold (${Math.floor(state.timerRemaining)}s left)`;
    } else {
      const bonus = state.submissionsLeft;
      bonusText = `+${bonus} bonus gold for ${state.submissionsLeft} unused submission${state.submissionsLeft !== 1 ? 's' : ''}`;
    }
    el.innerHTML = `
      <button class="finish-btn" onclick="endRoundEarly()">
        <span class="finish-label">Finish Page</span>
        <span class="finish-bonus">${bonusText}</span>
      </button>
    `;
    el.className = 'finish-row active';
  } else {
    // Update bonus text in case submissions changed
    const bonusEl = el.querySelector('.finish-bonus');
    if (bonusEl) {
      const bonus = state.submissionsLeft;
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

    // Show current value for scaling charms
    let label = charm.name;
    if (charm.scaling) {
      if (charm.id === 'beginners_luck') {
        const power = Math.max(0, 3 - state.floorsCleared);
        label += ` (x${power})`;
      } else if (charm.id === 'wordsmith') {
        label += ` (+${state.longWordCount}m)`;
      } else if (charm.id === 'ink_well') {
        label += ` (+${state.usedLetters.size}c)`;
      } else if (charm.id === 'scribes_callus') {
        label += ` (+${state.pagesCleared * 2}c)`;
      } else if (charm.id === 'vocabulary') {
        label += ` (+${Math.floor(state.usedWords.size / 5)}m)`;
      }
    }

    pip.textContent = label;
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
  // Skip/bookmark removed
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
    showWildPicker(cell, () => {
      state.selectedCells.push(cell);
      GameAudio.playTap();
      GameAudio.haptic('light');
      renderWordDisplay(); renderGrid(); renderActions(); renderSkipButton();
    });
    return;
  }

  state.selectedCells.push(cell);
  GameAudio.playTap();
  GameAudio.haptic('light');
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
  const char = Game.CHARACTERS[state.writer] || Game.CHARACTERS.novelist;
  if (char.timed) {
    if (state.timerRemaining <= 0) return;
  } else {
    if (state.submissionsLeft <= 0) return;
    state.submissionsLeft--;
  }
  state.selectedCells = [];

  // Mark all positions for animation
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      rerolledPositions.add(`${r},${c}`);

  GameDice.shakeGrid(state.grid);
  GameAudio.playShake();
  GameAudio.haptic('medium');
  narrate(pick(Game.NARRATOR.shake));
  Storage.saveRun(state);

  // Shake the grid container
  const container = document.getElementById('grid-container');
  container.classList.add('shaking');
  setTimeout(() => container.classList.remove('shaking'), 400);

  if (!char.timed && state.submissionsLeft <= 0) {
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
    GameAudio.playInvalid();
    showToast(result.reason);
    return;
  }

  GameAudio.playSubmit();
  GameAudio.haptic('medium');

  if (!state.wordHistory) state.wordHistory = [];
  state.wordHistory.push(result.result);

  // Set rerolled positions for dice animation after scoring completes
  rerolledPositions = usedPositions;

  // Block input and run the scoring animation
  scoringAnimationActive = true;
  runScoringAnimation(result.result).then(() => {
    scoringAnimationActive = false;

    // Screen shake + haptic for big scores
    if (result.result.score >= 150) {
      triggerScreenShake();
      GameAudio.haptic('heavy');
    }

    // Narrator
    narrateWordReaction(result.result);

    // Auto-save after word submit
    Storage.saveRun(state);

    // Check if round is over (novelist: out of submissions)
    const ch = Game.CHARACTERS[state.writer] || Game.CHARACTERS.novelist;
    if (!ch.timed && state.submissionsLeft <= 0) {
      setTimeout(() => finishRound(), 600);
    }

    renderGame();
  });
}

// ── Step-by-step scoring animation (Balatro-style, improved tick-up) ──
function runScoringAnimation(result) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'scoring-overlay';

    const letters = result.letterDetails;
    const hasCharms = result.charmTriggers.length > 0;
    const hasPatterns = result.patterns.length > 0;

    // Check if any letters have die mult bonuses
    const dieMults = letters.filter(l => l.dieMult > 0);

    overlay.innerHTML = `
      <div class="scoring-card">
        <div class="scoring-letters">
          ${letters.map((l, i) => `
            <div class="scoring-tile" id="stile-${i}">
              <div class="tile-letter tier-${l.tier}">${l.letter}</div>
              <div class="tile-chips" id="schip-${i}">+${l.chips}</div>
              ${l.dieMult > 0 ? `<div class="tile-mult" id="smult-die-${i}">+${l.dieMult} mult</div>` : ''}
            </div>
          `).join('')}
        </div>
        <div class="scoring-length-mult" id="slength">
          ${result.word.length} letters → ×${result.baseMult} base mult
        </div>
        <div class="scoring-divider"></div>
        <div class="scoring-totals">
          <span class="scoring-chips-total" id="schips-total">0</span>
          <span class="scoring-x">×</span>
          <span class="scoring-mult-total" id="smult-total">${result.baseMult}</span>
        </div>
        <div class="scoring-charms" id="scharms"></div>
        <div class="scoring-patterns" id="spatterns">
          ${result.patterns.map(p => `<span class="pattern-badge">${p}</span>`).join('')}
        </div>
        <div class="scoring-final" id="sfinal"></div>
      </div>
    `;

    document.getElementById('app').appendChild(overlay);

    // Animation timeline
    const LETTER_DELAY = animDelay(140); // slightly slower for readability
    const CHARM_DELAY = animDelay(350);  // slower for charm triggers
    let t = animDelay(250); // start delay

    let runningChips = 0;
    let runningMult = result.baseMult;
    let runningMultMult = 1;
    const multEl = () => document.getElementById('smult-total');
    const chipsEl = () => document.getElementById('schips-total');

    // Helper to bump an element (no forced reflow)
    function bumpEl(el) {
      if (!el) return;
      el.classList.remove('bump');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.classList.add('bump');
        });
      });
    }

    // Step 1: Reveal letters one by one, accumulating chips + die mult
    letters.forEach((l, i) => {
      setTimeout(() => {
        const tile = document.getElementById(`stile-${i}`);
        const chip = document.getElementById(`schip-${i}`);
        if (tile) tile.classList.add('revealed');

        setTimeout(() => {
          // Show chip value flying up
          if (chip) chip.classList.add('shown');
          runningChips += l.chips;
          GameAudio.playChipCount(600 + i * 80);
          const cel = chipsEl();
          if (cel) {
            cel.textContent = runningChips;
            bumpEl(cel);
          }

          // If die has mult bonus, show it after a beat
          if (l.dieMult > 0) {
            setTimeout(() => {
              const multBadge = document.getElementById(`smult-die-${i}`);
              if (multBadge) multBadge.classList.add('shown');
              runningMult += l.dieMult;
              const mel = multEl();
              if (mel) {
                mel.textContent = formatMult(runningMult * runningMultMult);
                bumpEl(mel);
              }
              GameAudio.playCharm();
            }, animDelay(80));
          }
        }, animDelay(80));
      }, t + i * LETTER_DELAY);
    });

    t += letters.length * LETTER_DELAY + animDelay(250);

    // Step 2: Show length mult
    setTimeout(() => {
      const el = document.getElementById('slength');
      if (el) el.classList.add('shown');
    }, t);

    t += animDelay(350);

    // Step 3: Show charm triggers one by one, updating totals
    result.charmTriggers.forEach((charm, i) => {
      setTimeout(() => {
        const charmsDiv = document.getElementById('scharms');
        if (!charmsDiv) return;

        // Build effect badges
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
          <span class="charm-effects-row">${effects.join(' ')}</span>
        `;
        charmsDiv.appendChild(entry);

        // Trigger animation + sound
        requestAnimationFrame(() => entry.classList.add('shown'));
        GameAudio.playCharm();

        // After entry appears, tick up the relevant counter
        setTimeout(() => {
          // Update chips total
          if (charm.chipDelta !== 0) {
            runningChips += charm.chipDelta;
            const cel = chipsEl();
            if (cel) {
              cel.textContent = Math.max(0, runningChips);
              bumpEl(cel);
            }
          }

          // Update mult total
          if (charm.multDelta > 0) {
            runningMult += charm.multDelta;
          }
          if (charm.multMultDelta > 0) {
            runningMultMult *= charm.multMultDelta;
          }
          if (charm.multDelta !== 0 || charm.multMultDelta > 0) {
            const mel = multEl();
            if (mel) {
              mel.textContent = formatMult(runningMult * runningMultMult);
              bumpEl(mel);
            }
          }
        }, animDelay(150));
      }, t + i * CHARM_DELAY);
    });

    t += result.charmTriggers.length * CHARM_DELAY + animDelay(250);

    // Step 4: Show patterns
    if (hasPatterns) {
      setTimeout(() => {
        const el = document.getElementById('spatterns');
        if (el) el.classList.add('shown');
      }, t);
      t += animDelay(200);
    }

    // Step 5: Final score slam — show chips × mult = score
    setTimeout(() => {
      const el = document.getElementById('sfinal');
      if (el) {
        el.innerHTML = `<span class="final-chips">${result.totalChips}</span> <span class="final-x">×</span> <span class="final-mult">${formatMult(result.totalMult)}</span> <span class="final-eq">=</span> <span class="final-score">+${result.score}</span>`;
        el.classList.add('shown');
      }
      GameAudio.playScoreSlam();
    }, t);

    t += animDelay(500);

    // Step 6: Auto-dismiss (longer for big scores)
    const dismissDelay = result.score >= 500 ? animDelay(800) : animDelay(500);
    const totalDuration = t + dismissDelay;
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

function formatMult(val) {
  return val % 1 === 0 ? val : val.toFixed(1);
}

function endRoundEarly() {
  if (state.wordsThisRound.length === 0) return;
  finishRound();
}

function finishRound() {
  stopTimer();
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
  Storage.saveRun(state);
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
        <span class="reward-label">${r.bonusLabel}</span>
        <span class="reward-value">+${r.bonusGold}</span>
      </div>
      ${r.interest > 0 ? `<div class="gold-reward-row" id="gr-interest">
        <span class="reward-label">Interest (${Math.floor((state.gold - r.totalGold) / 5 * 5)}g × $1/5)</span>
        <span class="reward-value">+${r.interest}</span>
      </div>` : ''}
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
  let t = animDelay(150);
  const step = animDelay(200);

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

  if (r.interest > 0) {
    t += step;
    setTimeout(() => {
      const el = document.getElementById('gr-interest');
      if (el) el.classList.add('shown');
    }, t);
  }

  t += step + 50;
  setTimeout(() => {
    const el = document.getElementById('gr-total');
    if (el) el.classList.add('shown');
    GameAudio.playGold();
  }, t);

  t += 300;
  setTimeout(() => {
    const el = document.getElementById('gr-narrate');
    if (el) { el.style.transition = 'opacity 0.5s'; el.style.opacity = '1'; }
    const btn = document.getElementById('gr-continue');
    if (btn) { btn.style.transition = 'opacity 0.4s'; btn.style.opacity = '1'; }
  }, t);
}

function proceedFromResult() {
  Game.advancePage(state);

  if (state.phase === 'victory') {
    Storage.clearRun();
    Storage.updateStats(state);
    render();
    return;
  }

  if (state.phase === 'shop') {
    shopItems = Game.generateShopItems(state);
    shopItems.forEach(item => item.sold = false);
  }

  Storage.saveRun(state);
  GameAudio.playTransition();

  // Page turn transition
  showPageTurn(() => render());
}

// ── Shop Screen ──
const SHOP_ICONS = {
  charm: '✦', letter_upgrade: '✎', die_enchant: '◈', length_upgrade: '↑', ink_card: '🪶', remove_die: '✂', shop_die: '⬡'
};

function renderShop() {
  const floorInfo = Game.getFloorInfo(state);
  document.getElementById('shop-title').textContent = 'The Ink & Quill Cart';
  document.getElementById('shop-floor-info').textContent = `Floor ${floorInfo.num} — ${Game.PAGE_NAMES[state.page]} next`;
  document.getElementById('shop-gold').innerHTML = `<span class="shop-gold-amount">${state.gold}</span> gold`;

  const container = document.getElementById('shop-items');
  container.innerHTML = '';

  shopItems.forEach((item, i) => {
    const canAfford = state.gold >= item.cost;
    const div = document.createElement('div');
    div.className = 'shop-item' + (item.sold ? ' sold' : '') + (!canAfford && !item.sold ? ' cant-afford' : '');
    div.dataset.type = item.type;
    if (item.type === 'charm' && item.data.rarity) div.dataset.rarity = item.data.rarity;

    let typeName = item.type.replace('_', ' ');
    let name = '', desc = '', flavor = '', icon = SHOP_ICONS[item.type] || '•';

    switch (item.type) {
      case 'charm':
        name = item.data.name;
        desc = item.data.desc;
        flavor = item.data.flavor;
        typeName = item.data.rarity;
        break;
      case 'die_enchant':
        name = item.data.name;
        desc = item.data.desc;
        flavor = item.data.flavor;
        typeName = 'enchantment';
        break;
      case 'remove_die':
        name = item.data.name;
        desc = 'Remove a standard die from your bag.';
        flavor = `Current bag: ${state.diceBag.length} dice`;
        typeName = 'bag surgery';
        break;
      case 'ink_card':
        name = item.data.name;
        desc = item.data.desc;
        flavor = item.data.flavor;
        typeName = 'ink card';
        break;
      case 'length_upgrade':
        name = item.data.name;
        desc = `${item.data.length}-letter words: +1 mult (×${GameDice.LENGTH_MULT[item.data.length] || 1}+${item.data.currentBonus} → ×${GameDice.LENGTH_MULT[item.data.length] || 1}+${item.data.newBonus})`;
        flavor = item.data.flavor;
        typeName = 'word upgrade';
        break;
      case 'letter_upgrade':
        name = item.data.name;
        desc = `${item.data.letter === 'QU' ? 'Qu' : item.data.letter}: ${item.data.baseChips}+${item.data.currentBonus} → ${item.data.baseChips}+${item.data.newBonus} chips`;
        flavor = item.data.flavor;
        typeName = 'letter upgrade';
        break;
      case 'shop_die':
        name = item.data.name;
        desc = item.data.desc;
        flavor = item.data.flavor;
        typeName = 'die';
        icon = `<span class="shop-die-preview tier-${item.data.tier}">${item.data.displayLetter}</span>`;
        break;
    }

    const costDisplay = item.sold
      ? '<span class="shop-cost-sold">SOLD</span>'
      : `<span class="shop-cost-badge">${item.cost}g</span>`;

    div.innerHTML = `
      <div class="shop-item-icon">${icon}</div>
      <div class="shop-item-info">
        <div class="shop-item-header">
          <span class="shop-item-name">${name}</span>
          <span class="shop-item-type">${typeName}</span>
        </div>
        <div class="shop-item-desc">${desc}</div>
        ${flavor ? `<div class="shop-item-flavor">"${flavor}"</div>` : ''}
      </div>
      <div class="shop-item-cost">${costDisplay}</div>
    `;

    if (!item.sold) {
      div.addEventListener('click', () => buyItem(i));
    }
    container.appendChild(div);
  });

  // Show current build
  const charmsEl = document.getElementById('shop-charms');
  charmsEl.innerHTML = '';

  // Charms
  if (state.charms.length > 0) {
    const header = document.createElement('div');
    header.className = 'build-section-header';
    header.innerHTML = `Charms <span class="build-count">${state.charms.length}/${state.maxCharms}</span>`;
    charmsEl.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'build-charms-grid';
    state.charms.forEach((charm, i) => {
      const refund = Math.ceil(charm.cost / 2);
      const card = document.createElement('div');
      card.className = `build-charm-card rarity-${charm.rarity}`;
      card.innerHTML = `
        <div class="build-charm-name">${charm.name}</div>
        <div class="build-charm-desc">${charm.desc}</div>
        <div class="build-charm-sell">sell +${refund}g</div>
      `;
      card.addEventListener('click', () => {
        const result = Game.sellCharm(state, i);
        if (result) {
          GameAudio.playGold();
          showToast(`Sold ${result.name} for ${result.refund} gold`);
          Storage.saveRun(state);
          renderShop();
        }
      });
      grid.appendChild(card);
    });
    charmsEl.appendChild(grid);
  } else {
    charmsEl.innerHTML = '<div class="build-empty">No charms yet — buy one above!</div>';
  }
}

function buyItem(index) {
  const item = shopItems[index];
  if (item.sold || state.gold < item.cost) return;

  const result = Game.buyShopItem(state, item);
  if (result.success) {
    if (result.pickDieReplace) {
      item.sold = true;
      showDieReplacePicker(result.shopDie);
      renderShop();
      return;
    }
    if (result.pickDie) {
      item.sold = true;
      showEnchantPicker(result.enchant);
      renderShop();
      return;
    }
    item.sold = true;
    showToast(result.msg);
    GameAudio.playGold();
  } else {
    showToast(result.reason);
  }
  Storage.saveRun(state);
  renderShop();
}

// ── Enchant Picker: choose which die to enchant ──
function showEnchantPicker(enchant) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="overlay-card" style="max-width: 440px;">
      <h2>${enchant.name}</h2>
      <p style="color: var(--cream-dim); font-size: 13px;">${enchant.desc} Choose a standard die to enchant.</p>
      <div id="enchant-picker-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; width: 100%;"></div>
    </div>
  `;
  document.getElementById('app').appendChild(overlay);

  const grid = document.getElementById('enchant-picker-grid');
  const { LETTER_TIERS } = window.GameDice;

  state.diceBag.forEach((die, i) => {
    if (i >= 16) return;
    const sampleLetter = die.faces[0] === 'Q' ? 'QU' : die.faces[0];
    const tier = LETTER_TIERS[sampleLetter] || 'common';
    const faces = die.faces.map(f => f === 'Q' ? 'Qu' : f).join(' ');
    const alreadyEnchanted = die.type !== 'standard';

    const div = document.createElement('div');
    div.className = 'die-cell';
    div.style.position = 'relative';
    if (alreadyEnchanted) {
      div.classList.add('die-' + die.type);
      div.style.opacity = '0.4';
      div.style.cursor = 'not-allowed';
    } else {
      div.style.cursor = 'pointer';
    }

    div.innerHTML = `
      <span class="die-letter tier-${tier}" style="font-size: 14px;">${faces}</span>
      ${alreadyEnchanted ? `<span style="position:absolute;bottom:1px;left:50%;transform:translateX(-50%);font-size:7px;color:var(--amber);">${die.type}</span>` : ''}
    `;
    div.title = alreadyEnchanted
      ? `Already enchanted (${die.type})`
      : `${faces} — click to enchant`;

    if (!alreadyEnchanted) {
      div.addEventListener('click', () => {
        Game.enchantDie(state, i, enchant);
        overlay.remove();
        showToast(`${enchant.name} applied! [${faces}] is now ${enchant.type}`);
        renderShop();
      });
    }

    grid.appendChild(div);
  });
}

// ── Die Replacement Picker: choose which die to swap out ──
function showDieReplacePicker(shopDie) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="overlay-card" style="max-width: 460px;">
      <h2>Replace a Die</h2>
      <div class="die-replace-preview">
        <span class="die-replace-new tier-${shopDie.tier}">${shopDie.displayLetter}</span>
        <div class="die-replace-info">
          <strong>${shopDie.name}</strong>
          ${shopDie.bonusChips > 0 ? `<span class="chips-effect">+${shopDie.bonusChips} chips</span>` : ''}
          ${shopDie.bonusMult > 0 ? `<span class="mult-effect">+${shopDie.bonusMult} mult</span>` : ''}
        </div>
      </div>
      <p style="color: var(--cream-dim); font-size: 12px;">Choose a die from your bag to replace:</p>
      <div id="die-replace-grid" class="die-replace-grid"></div>
    </div>
  `;
  document.getElementById('app').appendChild(overlay);

  const grid = document.getElementById('die-replace-grid');
  const { LETTER_TIERS, LETTER_CHIPS } = window.GameDice;

  state.diceBag.forEach((die, i) => {
    const sampleLetter = die.fixedLetter || (die.faces[0] === 'Q' ? 'QU' : die.faces[0]);
    const tier = LETTER_TIERS[sampleLetter] || 'common';
    const displayLetter = sampleLetter === 'QU' ? 'Qu' : sampleLetter;
    const isFixed = die.type === 'fixed';
    const baseChips = LETTER_CHIPS[sampleLetter] || 2;
    const totalChips = baseChips + (die.bonusChips || 0);
    const dieVisual = GameDice.getDieVisualClass(die);

    const div = document.createElement('div');
    div.className = 'die-replace-cell' + (dieVisual ? ' ' + dieVisual : '');

    let facesLabel;
    if (isFixed) {
      facesLabel = `Fixed ${displayLetter}`;
    } else {
      facesLabel = die.faces.map(f => f === 'Q' ? 'Qu' : f).join(' ');
    }

    div.innerHTML = `
      <span class="die-letter tier-${tier}" style="font-size: 20px;">${isFixed ? displayLetter : die.faces.map(f => f === 'Q' ? 'Qu' : f).join('')}</span>
      <span class="die-replace-stats">${totalChips}c${(die.bonusMult || 0) > 0 ? ' +' + die.bonusMult + 'm' : ''}</span>
      <span class="die-replace-type">${die.type === 'standard' ? 'std' : die.type}</span>
    `;

    div.addEventListener('click', () => {
      Game.replaceDie(state, i, shopDie);
      overlay.remove();
      GameAudio.playGold();
      showToast(`Replaced die with ${shopDie.name}!`);
      Storage.saveRun(state);
      renderShop();
    });

    grid.appendChild(div);
  });
}

function leaveShop() {
  state.phase = 'playing';

  const beginRound = () => {
    Game.startRound(state);
    state.wordHistory = [];

    // Check if final page has a twist to reveal
    if (state.page === 2 && state.activeTwist) {
      showTwistReveal(state.activeTwist, () => {
        render();
        animateGridEntrance();
        GameAudio.playDeal();
        startTimerIfNeeded();
        Storage.saveRun(state);
      });
    } else {
      render();
      animateGridEntrance();
      GameAudio.playDeal();
      startTimerIfNeeded();
      Storage.saveRun(state);
    }
  };

  if (state.page === 0) {
    // New floor — show floor intro, then page select
    showFloorIntro(() => {
      showPageSelect(beginRound);
    });
  } else {
    // Same floor, next page — show page select
    showPageSelect(beginRound);
  }
}

// ── Game Over — with narrative ──
function showGameOver() {
  stopTimer();
  Storage.clearRun();
  Storage.updateStats(state);
  Storage.addRunToHistory(state);
  GameAudio.playGameOver();

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
  stopTimer();
  Storage.clearRun();
  Storage.updateStats(state);
  Storage.addRunToHistory(state);
  GameAudio.playVictory();

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
  stopTimer();
  state = Game.createGameState();
  // Reset title screen buttons
  const titleBtns = document.getElementById('title-buttons');
  titleBtns.innerHTML = '<button class="btn btn-gold" id="start-btn" onclick="startGame()">Begin Writing</button>';
  // Update stats display
  const stats = Storage.loadStats();
  if (stats.runsPlayed > 0) {
    document.getElementById('title-stats').textContent = `${stats.runsPlayed} runs · Best floor: ${stats.bestFloor} · Best score: ${stats.bestScore}`;
  }
  renderCharacterSelect();
  renderRunHistory();
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

// ── Wild Card Picker (replaces prompt) ──
function showWildPicker(cell, onPick) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'wild-picker-overlay';
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  overlay.innerHTML = `
    <div class="overlay-card" style="max-width: 340px;">
      <h2>Wild Die!</h2>
      <p style="color: var(--cream-dim); font-size: 13px;">Choose a letter:</p>
      <div class="wild-picker-grid">
        ${letters.map(l => `<button class="wild-letter-btn" data-letter="${l}">${l}</button>`).join('')}
      </div>
    </div>
  `;
  document.getElementById('app').appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-letter]');
    if (btn) {
      cell.wildLetter = btn.dataset.letter;
      overlay.remove();
      onPick();
    }
  });
}

// ── Pause Menu ──
function showPause() {
  if (state.phase !== 'playing' || scoringAnimationActive) return;
  if (document.getElementById('pause-overlay')) return;
  stopTimer();

  const div = document.createElement('div');
  div.className = 'overlay';
  div.id = 'pause-overlay';
  div.innerHTML = `
    <div class="overlay-card" style="max-width: 320px;">
      <h2>Paused</h2>
      <div style="display: flex; flex-direction: column; gap: 10px; width: 100%; align-items: center;">
        <button class="btn btn-gold" onclick="closePause()">Resume</button>
        <button class="btn btn-small" onclick="closePause(); showStatsScreen();">View Build</button>
        <button class="btn btn-small" onclick="closePause(); showSettings();">Settings</button>
        <button class="btn btn-small btn-red" onclick="confirmQuit()">Quit Run</button>
      </div>
    </div>
  `;
  document.getElementById('app').appendChild(div);
}

function closePause() {
  const el = document.getElementById('pause-overlay');
  if (el) el.remove();
  if (state.phase === 'playing') startTimerIfNeeded();
}

function confirmQuit() {
  const el = document.getElementById('pause-overlay');
  if (!el) return;
  el.querySelector('.overlay-card').innerHTML = `
    <h2>Quit Run?</h2>
    <p style="color: var(--cream-dim); font-size: 14px; text-align: center;">Your progress will be lost.</p>
    <div style="display: flex; flex-direction: column; gap: 10px; width: 100%; align-items: center;">
      <button class="btn btn-red" onclick="quitRun()">Quit</button>
      <button class="btn btn-small" onclick="closePause(); showPause();">Cancel</button>
    </div>
  `;
}

function quitRun() {
  stopTimer();
  Storage.clearRun();
  Storage.updateStats(state);
  Storage.addRunToHistory(state);
  closePause();
  goToTitle();
}

// ── Settings Overlay ──
function showSettings() {
  if (document.getElementById('settings-overlay')) return;

  const s = Settings.getAll();
  const div = document.createElement('div');
  div.className = 'overlay';
  div.id = 'settings-overlay';
  div.innerHTML = `
    <div class="overlay-card" style="max-width: 360px;">
      <h2>Settings</h2>
      <div class="settings-list">
        <div class="settings-row">
          <label>SFX Volume</label>
          <input type="range" min="0" max="100" value="${Math.round(s.sfxVolume * 100)}" id="setting-sfx">
        </div>
        <div class="settings-row">
          <label>Haptics</label>
          <button class="settings-toggle ${s.hapticsOn ? 'on' : ''}" id="setting-haptics">${s.hapticsOn ? 'ON' : 'OFF'}</button>
        </div>
        <div class="settings-row">
          <label>Animation Speed</label>
          <button class="settings-toggle ${s.animSpeed === 2 ? 'on' : ''}" id="setting-anim">${s.animSpeed === 2 ? 'FAST' : 'NORMAL'}</button>
        </div>
      </div>
      <button class="btn btn-gold" onclick="closeSettings()">Done</button>
      <div style="font-size: 10px; color: var(--text-dark); margin-top: 4px;">v${GAME_VERSION}</div>
    </div>
  `;
  document.getElementById('app').appendChild(div);

  // Wire up controls
  document.getElementById('setting-sfx').addEventListener('input', (e) => {
    Settings.set('sfxVolume', e.target.value / 100);
  });
  document.getElementById('setting-haptics').addEventListener('click', (e) => {
    const on = !Settings.get('hapticsOn');
    Settings.set('hapticsOn', on);
    e.target.textContent = on ? 'ON' : 'OFF';
    e.target.classList.toggle('on', on);
  });
  document.getElementById('setting-anim').addEventListener('click', (e) => {
    const fast = Settings.get('animSpeed') !== 2;
    Settings.set('animSpeed', fast ? 2 : 1);
    e.target.textContent = fast ? 'FAST' : 'NORMAL';
    e.target.classList.toggle('on', fast);
  });
}

function closeSettings() {
  const el = document.getElementById('settings-overlay');
  if (el) el.remove();
}

// ── Journalist Timer ──
function startTimerIfNeeded() {
  stopTimer();
  const char = Game.CHARACTERS[state.writer] || Game.CHARACTERS.novelist;
  if (!char.timed || state.phase !== 'playing') return;
  roundTimer = setInterval(() => {
    if (state.phase !== 'playing' || scoringAnimationActive) return;
    state.timerRemaining = Math.max(0, state.timerRemaining - 0.1);
    updateTimerDisplay();
    if (state.timerRemaining <= 0) {
      stopTimer();
      finishRound();
    }
  }, 100);
}

function stopTimer() {
  if (roundTimer) { clearInterval(roundTimer); roundTimer = null; }
}

function updateTimerDisplay() {
  const el = document.getElementById('timer-display');
  if (!el) return;
  const secs = Math.ceil(state.timerRemaining);
  el.textContent = `${secs}s`;
  el.className = 'timer-display';
  if (secs <= 10) el.classList.add('timer-urgent');
  if (secs <= 5) el.classList.add('timer-critical');
}

// ── Animation speed helper ──
function animDelay(ms) {
  return ms / Settings.get('animSpeed');
}

// ── Stats Screen: letter scores + word multipliers ──
function showStatsScreen() {
  if (document.getElementById('stats-overlay')) return;

  const { LETTER_CHIPS, LETTER_TIERS, LENGTH_MULT } = window.GameDice;

  // Build letter table — group by tier
  const tiers = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const tierLabels = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };

  let letterRows = '';
  for (const tier of tiers) {
    const letters = Object.keys(LETTER_TIERS).filter(l => LETTER_TIERS[l] === tier && l !== 'Q');
    if (letters.length === 0) continue;
    letterRows += `<tr class="stats-tier-header"><td colspan="3">${tierLabels[tier]}</td></tr>`;
    for (const letter of letters) {
      const base = LETTER_CHIPS[letter] || 2;
      const bonus = (state.letterBonuses && state.letterBonuses[letter]) || 0;
      const display = letter === 'QU' ? 'Qu' : letter;
      const bonusStr = bonus > 0 ? `<span class="stats-bonus">+${bonus}</span>` : '';
      letterRows += `<tr class="tier-${tier}"><td class="stats-letter">${display}</td><td class="stats-value">${base}${bonusStr}</td><td class="stats-total">${base + bonus}</td></tr>`;
    }
  }

  // Build word length table
  let lengthRows = '';
  for (let len = 3; len <= 10; len++) {
    const baseMult = LENGTH_MULT[len] || 1;
    const bonus = (state.lengthBonuses && state.lengthBonuses[len]) || 0;
    const bonusStr = bonus > 0 ? `<span class="stats-bonus">+${bonus}</span>` : '';
    lengthRows += `<tr><td class="stats-letter">${len} letters</td><td class="stats-value">${baseMult}${bonusStr}</td><td class="stats-total">${baseMult + bonus}x</td></tr>`;
  }

  const div = document.createElement('div');
  div.className = 'overlay';
  div.id = 'stats-overlay';
  div.innerHTML = `
    <div class="overlay-card stats-screen" style="max-width: 400px; max-height: 80vh; overflow-y: auto;">
      <h2>Your Build</h2>

      <div class="stats-section">
        <h3>Word Length Multipliers</h3>
        <table class="stats-table">
          <thead><tr><th>Length</th><th>Base</th><th>Total</th></tr></thead>
          <tbody>${lengthRows}</tbody>
        </table>
      </div>

      <div class="stats-section">
        <h3>Letter Chip Values</h3>
        <table class="stats-table">
          <thead><tr><th>Letter</th><th>Base</th><th>Total</th></tr></thead>
          <tbody>${letterRows}</tbody>
        </table>
      </div>

      <button class="btn btn-gold" onclick="closeStatsScreen()">Close</button>
    </div>
  `;
  document.getElementById('app').appendChild(div);
}

function closeStatsScreen() {
  const el = document.getElementById('stats-overlay');
  if (el) el.remove();
}

// Global exports
window.startGame = startGame;
window.clearSelection = clearSelection;
window.doSubmitWord = doSubmitWord;
window.doShakeGrid = doShakeGrid;
window.endRoundEarly = endRoundEarly;
window.proceedFromResult = proceedFromResult;
window.leaveShop = leaveShop;
window.goToTitle = goToTitle;
window.showPause = showPause;
window.closePause = closePause;
window.confirmQuit = confirmQuit;
window.quitRun = quitRun;
window.showSettings = showSettings;
window.closeSettings = closeSettings;
window.showStatsScreen = showStatsScreen;
window.closeStatsScreen = closeStatsScreen;
window.resumeGame = resumeGame;

// Start
document.addEventListener('DOMContentLoaded', init);
