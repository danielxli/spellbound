// playtest.js — Persistent playtest script. Run with: node playtest.js
// Simulates runs with two AI profiles: "average" and "smart" player.

const fs = require('fs');
global.window = {};
eval(fs.readFileSync('js/dice.js', 'utf8'));
const GameDice = window.GameDice; global.GameDice = GameDice;
const wordText = fs.readFileSync('words_filtered.txt', 'utf8');
const allWords = wordText.split('\n').map(w => w.trim().toUpperCase()).filter(w => w.length >= 3);
const wordSet = new Set(allWords);
class TrieNode { constructor() { this.children = {}; this.isWord = false; } }
class Trie {
  constructor() { this.root = new TrieNode(); }
  insert(word) { let n = this.root; for (const c of word) { if (!n.children[c]) n.children[c] = new TrieNode(); n = n.children[c]; } n.isWord = true; }
  check(str) { let n = this.root; for (const c of str) { if (!n.children[c]) return 'none'; n = n.children[c]; } return n.isWord ? 'word' : 'prefix'; }
}
const trie = new Trie();
for (const w of allWords) trie.insert(w);
const GD = { isValidWord: w => wordSet.has(w.toUpperCase()), checkPrefix: s => trie.check(s.toUpperCase()), wordSet };
global.GameDictionary = GD; window.GameDictionary = GD;
eval(fs.readFileSync('js/game.js', 'utf8'));
const Game = window.Game;
const NUM_FLOORS = Game.FLOORS.length;

// ═══════════════════════════════════════════
// AI Profiles
// ═══════════════════════════════════════════

const PROFILES = {
  average: {
    name: 'Average',
    maxWordLen: 5,           // rarely finds long words
    wordPickTopN: 5,         // picks randomly from top N words
    earlyFinishChance: 0.4,  // 40% chance to stop when target met
    useExtraInkThreshold: 500, // uses Extra Ink on easier pages
    shopPrioritize: false,   // buys in presented order
    interestAware: false,    // doesn't manage interest brackets
    sellCharms: false,       // never sells charms
    shakeWhenStuck: true,    // will shake even with 1 sub left sometimes
    skipBadWords: false,     // doesn't filter out low-value 3-letter words
  },
  smart: {
    name: 'Smart',
    maxWordLen: 7,           // hunts for long words
    wordPickTopN: 1,         // always picks the best word
    earlyFinishChance: 1.0,  // always finishes early for gold
    useExtraInkThreshold: 1000, // saves Extra Ink for hard pages
    shopPrioritize: true,    // sorts shop by priority
    interestAware: true,     // skips cheap buys that lose interest
    sellCharms: true,        // sells weak charms for better ones
    shakeWhenStuck: true,    // shakes strategically
    skipBadWords: true,      // skips low-value 3L words when better options exist
  }
};

// ── Word finder ──
function findWords(grid, maxLen) {
  const found = [];
  function dfs(r, c, vis, cells, word) {
    const cell = grid[r][c]; if (cell.isWild) return;
    const nw = word + cell.letter, nc = [...cells, cell], nv = new Set(vis); nv.add(`${r},${c}`);
    const st = trie.check(nw); if (st === 'none') return;
    if (st === 'word' && nw.length >= 3) {
      const ch = nc.reduce((s, cl) => s + (GameDice.LETTER_CHIPS[cl.letter]||2) + (cl.die.bonusChips||0), 0);
      found.push({ word: nw, cells: [...nc], score: ch * GameDice.getWordLengthMult(nw.length) });
    }
    if (nw.length >= maxLen) return;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue; const nr = r+dr, nc2 = c+dc;
      if (nr<0||nr>3||nc2<0||nc2>3||nv.has(`${nr},${nc2}`)) continue;
      dfs(nr, nc2, nv, nc, nw);
    }
  }
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) dfs(r, c, new Set(), [], '');
  const best = {};
  for (const f of found) if (!best[f.word] || f.score > best[f.word].score) best[f.word] = f;
  return Object.values(best).sort((a, b) => b.score - a.score);
}

// ── Charm value scoring (higher = better to keep) ──
function charmValue(charm, state) {
  const rarityScore = { common: 1, uncommon: 2, rare: 3, legendary: 4 };
  let val = (rarityScore[charm.rarity] || 1) * 3;
  if (charm.id === 'beginners_luck') {
    const power = Math.max(0, 3 - state.floorsCleared);
    if (power <= 0) return 0;
    val = power * 2;
  }
  if (charm.scaling) val += 2;
  if (charm.penalty) val -= 1;
  if (charm.desc && charm.desc.includes('x2')) val += 3;
  if (charm.desc && charm.desc.includes('x3')) val += 5;
  if (charm.desc && charm.desc.includes('x4')) val += 6;
  if (charm.desc && charm.desc.includes('x5')) val += 7;
  if (charm.id === 'double_take') val += 8;
  if (charm.id === 'echo_chamber') val += 5;
  if (charm.id === 'golden_quill') val += 8;
  return val;
}

// ── Simulate one round ──
function simRound(state, profile) {
  Game.startRound(state);
  const wp = [];
  const target = Game.getTarget(state);
  let sixUsed = false;
  let shakes = 0;
  let inkCardsUsed = 0;

  // Use Extra Ink at round start
  const extraInkIdx = state.inkCards.findIndex(c => c.id === 'extra_ink');
  if (extraInkIdx >= 0 && target >= profile.useExtraInkThreshold) {
    Game.useInkCard(state, extraInkIdx);
    inkCardsUsed++;
  }

  while (state.submissionsLeft > 0) {
    // Early finish check
    if (state.roundScore >= target && wp.length > 0) {
      if (Math.random() < profile.earlyFinishChance) break;
      // Average player keeps going — might overshoot or waste subs
    }

    const maxLen = sixUsed ? Math.min(profile.maxWordLen, 5) : profile.maxWordLen;
    let avail = findWords(state.grid, maxLen).filter(w => {
      if (state.activeTwist?.name === 'The Sequel' && state.usedWords.has(w.word)) return false;
      if (state.activeTwist?.name === 'Banned Books' && w.word.length === 3) return false;
      if (state.activeTwist?.name === 'Purple Prose' && w.word.length < 5) return false;
      return true;
    });

    // Smart player skips low-value 3-letter words when better options exist
    if (profile.skipBadWords && avail.length > 1) {
      const nonTrivial = avail.filter(w => w.word.length >= 4);
      if (nonTrivial.length > 0) avail = nonTrivial;
    }

    // Average player sometimes picks a random 4-letter word instead of best
    if (!profile.skipBadWords && avail.length > 1 && Math.random() < 0.3) {
      const fours = avail.filter(w => w.word.length === 4);
      if (fours.length > 0) avail = [fours[0], ...avail.filter(w => w.word.length !== 4)];
    }

    if (!avail.length) {
      const freshIdx = state.inkCards.findIndex(c => c.id === 'fresh_page');
      if (freshIdx >= 0) {
        Game.useInkCard(state, freshIdx);
        inkCardsUsed++;
        continue;
      }
      if (state.submissionsLeft > 1) { state.submissionsLeft--; GameDice.shakeGrid(state.grid); state.selectedCells = []; shakes++; continue; }
      break;
    }

    // Word selection: smart picks best, average picks from top N
    let pick;
    if (profile.wordPickTopN <= 1) {
      pick = avail[0];
    } else {
      const topN = avail.slice(0, Math.min(profile.wordPickTopN, avail.length));
      pick = topN[Math.floor(Math.random() * topN.length)];
    }

    if (pick.word.length >= 6) sixUsed = true;
    state.selectedCells = pick.cells;
    const r = Game.submitWord(state);
    if (r.success) wp.push({ word: pick.word, score: r.result.score, len: pick.word.length }); else break;
  }

  const unusedSubs = state.submissionsLeft;
  return { wordsPlayed: wp, roundScore: state.roundScore, unusedSubs, shakes, inkCardsUsed };
}

// ── Simulate shop ──
function simShop(state, profile) {
  const items = Game.generateShopItems(state);
  const bought = [];
  const sold = [];
  const goldBefore = state.gold;

  if (profile.shopPrioritize) {
    const ro = { legendary:0, rare:1, uncommon:2, common:3 };
    items.sort((a,b) => {
      const to = { charm:0, shop_die:1, letter_upgrade:2, length_upgrade:3, die_enchant:4, ink_card:5 };
      const ta=to[a.type]??9, tb=to[b.type]??9;
      if(ta!==tb) return ta-tb;
      if(a.type==='charm'&&b.type==='charm') return (ro[a.data.rarity]??9)-(ro[b.data.rarity]??9);
      return 0;
    });
  }

  for (const item of items) {
    // Charm slot management
    if (item.type === 'charm' && state.charms.length >= state.maxCharms) {
      if (profile.sellCharms) {
        const newVal = charmValue(item.data, state);
        let worstIdx = -1, worstVal = Infinity;
        for (let i = 0; i < state.charms.length; i++) {
          const v = charmValue(state.charms[i], state);
          if (v < worstVal) { worstVal = v; worstIdx = i; }
        }
        if (worstIdx >= 0 && newVal > worstVal + 3) {
          const sellResult = Game.sellCharm(state, worstIdx);
          if (sellResult) sold.push({ name: sellResult.name, refund: sellResult.refund });
        }
      }
    }

    if (state.gold < item.cost) continue;
    if (item.type === 'charm' && state.charms.length >= state.maxCharms) continue;

    // Interest awareness (smart only)
    if (profile.interestAware) {
      const currentInterest = Math.min(5, Math.floor(state.gold / 5));
      const afterInterest = Math.min(5, Math.floor((state.gold - item.cost) / 5));
      if (afterInterest < currentInterest && item.type !== 'charm' && item.cost <= 5) continue;
    }

    const r = Game.buyShopItem(state, item);
    if (r.success) {
      if (item.type === 'charm') bought.push({ type: 'charm', name: item.data.name, rarity: item.data.rarity, cost: item.cost });
      else if (item.type === 'length_upgrade') bought.push({ type: 'word_up', name: `${item.data.length}L +mult`, cost: item.cost });
      else if (item.type === 'letter_upgrade') bought.push({ type: 'letter_up', name: `${item.data.letter} +1c`, cost: item.cost });
      else if (item.type === 'die_enchant') bought.push({ type: 'enchant', name: item.data.name, cost: item.cost });
      else if (item.type === 'shop_die') bought.push({ type: 'die', name: item.data.name, cost: item.cost });
      else if (item.type === 'ink_card') bought.push({ type: 'ink', name: item.data.name, cost: item.cost });
      else bought.push({ type: item.type, name: '?', cost: item.cost });
      if (r.pickDieReplace && r.shopDie) {
        // AI replaces the weakest standard die
        for (let i = 0; i < 16; i++) { if (state.diceBag[i] && state.diceBag[i].type === 'standard') { Game.replaceDie(state, i, r.shopDie); break; } }
      }
      if (r.pickDie && r.enchant) {
        for (let i = 0; i < 16; i++) { if (state.diceBag[i] && state.diceBag[i].type === 'standard') { Game.enchantDie(state, i, r.enchant); break; } }
      }
    }
  }
  return { bought, sold, goldBefore, goldAfter: state.gold };
}

// ── Simulate full run ──
function simRun(profile) {
  const state = Game.createGameState();
  const log = {
    floorsCleared: 0, wordsPlayed: 0, totalScore: 0, victory: false,
    charms: [], diedAt: null,
    allWords: [],
    goldHistory: [],
    shopHistory: [],
    pageDetails: [],
    lengthUpgrades: 0,
    lengthUpgradesByLen: {},
    letterUpgrades: 0,
    inkCards: 0,
    charmsSold: 0,
    totalGoldEarned: 0,
    totalGoldSpent: 0,
    longestWord: '',
    bestWord: null,
  };

  for (let floor = 0; floor < NUM_FLOORS; floor++) {
    for (let page = 0; page < 3; page++) {
      state.floor = floor; state.page = page;
      const target = Game.getTarget(state);
      const { wordsPlayed, roundScore, unusedSubs, shakes } = simRound(state, profile);

      log.wordsPlayed += wordsPlayed.length;
      log.totalScore += roundScore;
      for (const w of wordsPlayed) {
        log.allWords.push({ ...w, floor: floor+1, page: ['O','R','F'][page] });
        if (!log.bestWord || w.score > log.bestWord.score) log.bestWord = { word: w.word, score: w.score };
        if (w.word.length > log.longestWord.length) log.longestWord = w.word;
      }

      log.pageDetails.push({ floor: floor+1, page: ['Opening','Rising','Final'][page], target, score: roundScore, passed: roundScore >= target, words: wordsPlayed.length, unusedSubs, shakes });

      const er = Game.endRound(state);
      if (er.passed) log.totalGoldEarned += er.totalGold;
      log.goldHistory.push(state.gold);

      if (!er.passed) {
        log.diedAt = `F${floor+1} ${['Opening','Rising','Final'][page]}`;
        log.floorsCleared = state.floorsCleared;
        log.charms = state.charms.map(c => `${c.name} (${c.rarity})`);
        return log;
      }

      Game.advancePage(state);
      if (state.phase === 'victory') { log.victory = true; log.floorsCleared = NUM_FLOORS; log.charms = state.charms.map(c => `${c.name} (${c.rarity})`); return log; }

      const shop = simShop(state, profile);
      log.shopHistory.push({ floor: floor+1, page: ['Opening','Rising','Final'][page], ...shop });
      log.totalGoldSpent += shop.goldBefore - shop.goldAfter;
      log.charmsSold += shop.sold.length;
      for (const b of shop.bought) {
        if (b.type === 'word_up') { log.lengthUpgrades++; const len = b.name.replace('L +mult',''); log.lengthUpgradesByLen[len] = (log.lengthUpgradesByLen[len]||0)+1; }
        else if (b.type === 'letter_up') log.letterUpgrades++;
        else if (b.type === 'ink') log.inkCards++;
      }
    }
  }
  log.floorsCleared = state.floorsCleared;
  log.charms = state.charms.map(c => `${c.name} (${c.rarity})`);
  return log;
}

// ═══════════════════════════════════════════
// Print helpers
// ═══════════════════════════════════════════

function printProfileResults(profileKey, results, N, verbose) {
  const profile = PROFILES[profileKey];
  const victories = results.filter(r => r.victory).length;
  const avgFloor = (results.reduce((s,r) => s+r.floorsCleared, 0)/N).toFixed(1);
  const avgWords = (results.reduce((s,r) => s+r.wordsPlayed, 0)/N).toFixed(0);
  const avgScore = Math.round(results.reduce((s,r) => s+r.totalScore, 0)/N);
  const avgGoldE = Math.round(results.reduce((s,r) => s+r.totalGoldEarned, 0)/N);
  const avgGoldS = Math.round(results.reduce((s,r) => s+r.totalGoldSpent, 0)/N);

  console.log(`\n╔══ ${profile.name.toUpperCase()} PLAYER (${N} runs) ══╗`);
  console.log(`  Win rate:   ${victories}/${N} (${Math.round(victories/N*100)}%)`);
  console.log(`  Avg floor:  ${avgFloor}`);
  console.log(`  Avg words:  ${avgWords}/run`);
  console.log(`  Avg score:  ${avgScore}`);
  console.log(`  Avg gold:   ${avgGoldE} earned, ${avgGoldS} spent`);

  // Word stats
  const allLenDist = {};
  let allWordScores = [];
  for (const r of results) for (const w of r.allWords) {
    allLenDist[w.len] = (allLenDist[w.len]||0) + 1;
    allWordScores.push(w.score);
  }
  allWordScores.sort((a,b) => a-b);
  const totalW = allWordScores.length;
  if (totalW > 0) {
    const median = allWordScores[Math.floor(totalW/2)];
    const p90 = allWordScores[Math.floor(totalW*0.9)];
    console.log(`  Word dist:  ${Object.entries(allLenDist).sort((a,b)=>a[0]-b[0]).map(([l,c])=>`${l}L:${Math.round(c/totalW*100)}%`).join(' ')}`);
    console.log(`  Scores:     median ${median} | p90 ${p90} | max ${allWordScores[totalW-1]}`);
  }

  // Upgrade stats
  console.log(`  Upgrades:   ${(results.reduce((s,r)=>s+r.lengthUpgrades,0)/N).toFixed(1)} word, ${(results.reduce((s,r)=>s+r.letterUpgrades,0)/N).toFixed(1)} letter, ${(results.reduce((s,r)=>s+r.inkCards,0)/N).toFixed(1)} ink`);
  console.log(`  Charms:     ${(results.reduce((s,r)=>s+r.charms.length,0)/N).toFixed(1)}/run, ${(results.reduce((s,r)=>s+r.charmsSold,0)/N).toFixed(1)} sold`);

  // Survival
  console.log(`  Survival:`);
  for (let f = 1; f <= NUM_FLOORS; f++) {
    const survived = results.filter(r => r.floorsCleared >= f).length;
    const pct = Math.round(survived / N * 100);
    const bar = '█'.repeat(Math.round(pct / 2));
    console.log(`    F${f}  ${bar.padEnd(50)} ${String(pct).padStart(3)}%  (${survived}/${N})${f===NUM_FLOORS?' <- Victory':''}`);
  }

  // Pass rates
  console.log(`  Pass rates:`);
  for (let f = 1; f <= NUM_FLOORS; f++) for (const p of ['Opening','Rising','Final']) {
    const pgs = results.flatMap(r=>r.pageDetails).filter(ps=>ps.floor===f&&ps.page===p);
    if (!pgs.length) continue;
    const passed = pgs.filter(ps=>ps.passed).length;
    const avg = Math.round(pgs.reduce((s,ps)=>s+ps.score,0)/pgs.length);
    const avgWords = (pgs.reduce((s,ps)=>s+ps.words,0)/pgs.length).toFixed(1);
    const avgUnused = (pgs.reduce((s,ps)=>s+ps.unusedSubs,0)/pgs.length).toFixed(1);
    const pct = Math.round(passed/pgs.length*100);
    console.log(`    F${f} ${p.padEnd(7)}: ${String(passed).padStart(2)}/${String(pgs.length).padStart(2)} (${String(pct).padStart(3)}%) avg ${String(avg).padStart(6)}/${String(pgs[0].target).padStart(5)} | ${avgWords}w, ${avgUnused} saved ${pct>=80?'OK':pct>=40?'~ ':'X '}`);
  }

  // Verbose: per-run details
  if (verbose) {
    console.log(`\n  ── Run Log ──`);
    for (let i = 0; i < N; i++) {
      const r = results[i];
      const status = r.victory ? '  VICTORY' : `  ${r.diedAt}`;
      console.log(`  Run ${String(i+1).padStart(2)}: ${status} | Floor ${r.floorsCleared} | ${r.wordsPlayed}w | Score ${r.totalScore} | Best: "${r.bestWord?.word}" (${r.bestWord?.score})`);
    }
  }
}

// ═══════════════════════════════════════════
// Run simulations
// ═══════════════════════════════════════════
const N = 30;
const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');

console.log(`═══ SPELLBOUND PLAYTEST ═══`);
console.log(`${NUM_FLOORS} floors | Gold/page: ${Game.PAGE_GOLD.join('/')} | Runs: ${N} per profile`);
console.log(`Targets: ${Game.FLOORS.map(f=>`F${f.num}:${f.opening}/${f.rising}/${f.final}`).join('  ')}`);

const avgResults = [];
const smartResults = [];
for (let i = 0; i < N; i++) {
  avgResults.push(simRun(PROFILES.average));
  smartResults.push(simRun(PROFILES.smart));
}

printProfileResults('average', avgResults, N, verbose);
printProfileResults('smart', smartResults, N, verbose);

// ═══════════════════════════════════════════
// Side-by-side comparison
// ═══════════════════════════════════════════
console.log('\n╔══ COMPARISON ══╗');
const avgWins = avgResults.filter(r=>r.victory).length;
const smartWins = smartResults.filter(r=>r.victory).length;
const avgFloor = (avgResults.reduce((s,r)=>s+r.floorsCleared,0)/N).toFixed(1);
const smartFloor = (smartResults.reduce((s,r)=>s+r.floorsCleared,0)/N).toFixed(1);
const avgScore = Math.round(avgResults.reduce((s,r)=>s+r.totalScore,0)/N);
const smartScore = Math.round(smartResults.reduce((s,r)=>s+r.totalScore,0)/N);
const avgUnused = (avgResults.flatMap(r=>r.pageDetails).reduce((s,p)=>s+p.unusedSubs,0) / avgResults.flatMap(r=>r.pageDetails).length).toFixed(1);
const smartUnused = (smartResults.flatMap(r=>r.pageDetails).reduce((s,p)=>s+p.unusedSubs,0) / smartResults.flatMap(r=>r.pageDetails).length).toFixed(1);

console.log(`                   Average    Smart`);
console.log(`  Win rate:        ${String(Math.round(avgWins/N*100)).padStart(4)}%      ${String(Math.round(smartWins/N*100)).padStart(4)}%`);
console.log(`  Avg floor:       ${String(avgFloor).padStart(5)}      ${String(smartFloor).padStart(5)}`);
console.log(`  Avg score:       ${String(avgScore).padStart(5)}      ${String(smartScore).padStart(5)}`);
console.log(`  Avg saved subs:  ${String(avgUnused).padStart(5)}      ${String(smartUnused).padStart(5)}`);
