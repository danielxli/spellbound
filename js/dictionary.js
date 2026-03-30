// dictionary.js — Word list + Trie for prefix validation
// Loads ~358K English words from words_filtered.txt (3-15 letters, alpha only)

class TrieNode {
  constructor() {
    this.children = {};
    this.isWord = false;
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children[ch]) node.children[ch] = new TrieNode();
      node = node.children[ch];
    }
    node.isWord = true;
  }

  search(word) {
    const node = this._traverse(word);
    return node !== null && node.isWord;
  }

  startsWith(prefix) {
    return this._traverse(prefix) !== null;
  }

  // Returns: 'word' | 'prefix' | 'none'
  check(str) {
    const node = this._traverse(str);
    if (!node) return 'none';
    if (node.isWord) return 'word';
    return 'prefix';
  }

  _traverse(str) {
    let node = this.root;
    for (const ch of str) {
      if (!node.children[ch]) return null;
      node = node.children[ch];
    }
    return node;
  }
}

const dictionary = new Trie();
const wordSet = new Set();
let dictionaryReady = false;

async function initDictionary() {
  try {
    const resp = await fetch('words_filtered.txt');
    const text = await resp.text();
    const words = text.split('\n').map(w => w.trim().toUpperCase()).filter(w => w.length >= 3);
    for (const word of words) {
      dictionary.insert(word);
      wordSet.add(word);
    }
    dictionaryReady = true;
    console.log(`Dictionary loaded: ${wordSet.size} words`);
  } catch (err) {
    console.error('Failed to load dictionary:', err);
    // Fallback: load a minimal embedded set so the game still works
    console.warn('Using minimal fallback dictionary');
    const fallback = ['THE','AND','FOR','ARE','BUT','NOT','YOU','ALL','CAN','HER','WAS','ONE','OUR','OUT','ACE','ACT','ADD','AGE','AGO','AID','AIM','AIR','ALE','ALL','AND','ANT','ANY','APE','ARC','ARE','ARK','ARM','ART','ASH','ATE','AWE','AXE','BAD','BAG','BAN','BAR','BAT','BAY','BED','BIG','BIT','BOW','BOX','BOY','BUD','BUG','BUS','BUT','BUY','CAB','CAN','CAP','CAR','CAT','COP','COW','CRY','CUB','CUP','CUT','DAD','DAM','DAY','DID','DIG','DIM','DIP','DOC','DOG','DOT','DRY','DUB','DUE','DUG','DYE','EAR','EAT','EEL','EGG','ELF','ELM','EMU','END','ERA','EVE','EWE','EYE','FAN','FAR','FAT','FAX','FED','FEW','FIG','FIN','FIT','FIX','FLY','FOG','FOR','FOX','FRY','FUN','FUR','GAP','GAS','GAY','GEL','GEM','GET','GIG','GIN','GNU','GOD','GOT','GUM','GUN','GUT','GUY','GYM','HAD','HAM','HAS','HAT','HAY','HEN','HER','HEW','HID','HIM','HIP','HIS','HIT','HOG','HOP','HOT','HOW','HUB','HUE','HUG','HUM','HUT','ICE','ICY','ILL','IMP','INK','INN','ION','IRE','IRK','IVY','JAB','JAG','JAM','JAR','JAW','JAY','JET','JIG','JOB','JOG','JOT','JOY','JUG','JUT','KEG','KEN','KEY','KID','KIN','KIT','LAB','LAD','LAG','LAP','LAW','LAX','LAY','LED','LEG','LET','LID','LIE','LIT','LOG','LOT','LOW','LUG','MAD','MAN','MAP','MAR','MAT','MAW','MAY','MEN','MET','MID','MIX','MOB','MOM','MOP','MOW','MUD','MUG','NAB','NAG','NAP','NET','NEW','NIL','NIT','NOD','NOR','NOT','NOW','NUB','NUN','NUT','OAK','OAR','OAT','ODD','ODE','OFF','OFT','OHM','OIL','OLD','ONE','OPT','ORB','ORE','OUR','OUT','OWE','OWL','OWN','PAD','PAN','PAP','PAR','PAT','PAW','PAY','PEA','PEG','PEN','PEP','PER','PET','PEW','PIE','PIG','PIN','PIT','PLY','POD','POP','POT','POW','PRY','PUB','PUG','PUN','PUP','PUS','PUT','RAG','RAM','RAN','RAP','RAT','RAW','RAY','RED','REF','RIB','RID','RIG','RIM','RIP','ROB','ROD','ROT','ROW','RUB','RUG','RUM','RUN','RUT','RYE','SAC','SAD','SAG','SAP','SAT','SAW','SAY','SEA','SET','SEW','SHE','SHY','SIN','SIP','SIR','SIS','SIT','SIX','SKI','SKY','SLY','SOB','SOD','SON','SOP','SOT','SOW','SOY','SPA','SPY','STY','SUB','SUM','SUN','SUP'];
    for (const word of fallback) {
      dictionary.insert(word);
      wordSet.add(word);
    }
    dictionaryReady = true;
  }
}

function isValidWord(word) {
  return wordSet.has(word.toUpperCase());
}

function checkPrefix(str) {
  return dictionary.check(str.toUpperCase());
}

// Export for use
window.GameDictionary = { initDictionary, isValidWord, checkPrefix, wordSet };
