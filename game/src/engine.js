// Ember Court engine: the pure rules of the duel. No DOM, no sound, no time —
// the same seed and the same moves always give the same state, so the screenshot
// scenes and the tests can replay a game exactly.
//
// A duel: two heroes with 30 Health. Each turn a side gains one mana crystal (up
// to 10), refills its mana, draws a card and may play cards and attack. Creatures
// stay on the table and attack on later turns (Rush creatures attack at once).
// Taunt creatures must be attacked before any other target. A hero reduced to
// 0 Health loses. An empty deck deals growing fatigue damage on every draw.

import { CARDS, buildDeck } from './cards.js';
import { createRandom, shuffle } from './rng.js';

export const MAX_HP = 30;
export const MAX_MANA = 10;
export const MAX_HAND = 10;
export const MAX_BOARD = 7;
export const START_HAND = 3;

export const OTHER = { player: 'ai', ai: 'player' };

function makeSide(name, heroArt, rand) {
  const deck = shuffle(buildDeck(), rand);
  return {
    name, heroArt,
    hp: MAX_HP, maxHp: MAX_HP,
    mana: 0, maxMana: 0,
    deck, hand: [], board: [],
    fatigue: 0,
  };
}

export function createGame(seed) {
  const rand = createRandom(seed);
  const state = {
    seed,
    turn: 1,
    active: 'player',
    phase: 'play',
    winner: null,
    sides: {
      player: makeSide('You, the Ember Warden', 'warden', rand),
      ai: makeSide('Pyra, the Cinder Queen', 'pyra', rand),
    },
    log: [],
    stats: { played: { player: 0, ai: 0 }, damage: { player: 0, ai: 0 }, turns: 0 },
    nextUid: 1,
    rand,
  };
  drawCards(state, 'player', START_HAND, true);
  drawCards(state, 'ai', START_HAND, true);
  state.sides.player.maxMana = 1;
  state.sides.player.mana = 1;
  pushLog(state, 'The duel begins. You hold the first turn.');
  return state;
}

export function pushLog(state, text) {
  state.log.push(text);
  if (state.log.length > 40) state.log.splice(0, state.log.length - 40);
}

function makeCardInstance(state, defId) {
  const def = CARDS[defId];
  return {
    uid: state.nextUid,
    def: defId,
    name: def.name,
    kind: def.kind,
    cost: def.cost,
    attack: def.attack ?? 0,
    health: def.health ?? 0,
    maxHealth: def.health ?? 0,
    taunt: !!def.taunt,
    rush: !!def.rush,
    canAttack: false,
  };
}

export function drawCards(state, side, count, silent = false) {
  const me = state.sides[side];
  const events = [];
  for (let i = 0; i < count; i += 1) {
    if (state.phase === 'over') break;
    if (me.deck.length === 0) {
      me.fatigue += 1;
      events.push({ type: 'fatigue', side, amount: me.fatigue });
      damageHero(state, side, me.fatigue, 'fatigue');
      if (!silent) pushLog(state, `${me.name} takes ${me.fatigue} fatigue damage.`);
      continue;
    }
    const defId = me.deck.pop();
    if (me.hand.length >= MAX_HAND) {
      events.push({ type: 'burn', side, def: defId });
      if (!silent) pushLog(state, `${me.name} burns ${CARDS[defId].name} (hand full).`);
    } else {
      me.hand.push(makeCardInstance(state, defId));
      state.nextUid += 1;
      events.push({ type: 'draw', side, def: defId });
    }
  }
  return events;
}

export function findCreature(state, uid) {
  for (const side of ['player', 'ai']) {
    const found = state.sides[side].board.find((c) => c.uid === uid);
    if (found) return { side, card: found };
  }
  return null;
}

function removeDead(state, side) {
  const board = state.sides[side].board;
  const dead = [];
  for (let i = board.length - 1; i >= 0; i -= 1) {
    if (board[i].health <= 0) dead.push(board.splice(i, 1)[0]);
  }
  return dead;
}

function checkDeaths(state) {
  const events = [];
  for (const side of ['player', 'ai']) {
    for (const dead of removeDead(state, side)) {
      events.push({ type: 'death', side, card: dead });
      pushLog(state, `${dead.name} is destroyed.`);
    }
  }
  return events;
}

function damageHero(state, side, amount, source) {
  const me = state.sides[side];
  me.hp -= amount;
  const events = [{ type: 'damage', kind: 'hero', side, amount, source }];
  if (me.hp <= 0) {
    me.hp = 0;
    state.phase = 'over';
    state.winner = OTHER[side];
    events.push({ type: 'win', winner: state.winner });
    pushLog(state, `${me.name} falls. ${state.sides[state.winner].name} wins the duel!`);
  }
  return events;
}

function damageCreature(state, uid, amount, source) {
  const found = findCreature(state, uid);
  if (!found) return [];
  found.card.health -= amount;
  const events = [{ type: 'damage', kind: 'minion', side: found.side, uid, amount, source }];
  events.push(...checkDeaths(state));
  return events;
}

/** The target a move names: { kind: 'hero', side } or { kind: 'minion', uid }. */
export function targetSide(state, target) {
  if (!target) return null;
  if (target.kind === 'hero') return target.side;
  const found = findCreature(state, target.uid);
  return found ? found.side : null;
}

function targetName(state, target) {
  if (!target) return 'nothing';
  if (target.kind === 'hero') return state.sides[target.side].name;
  const found = findCreature(state, target.uid);
  return found ? found.card.name : 'nothing';
}

function spellNeedsTarget(defId) {
  return defId === 'fireball';
}

function spellTargetIsLegal(state, side, defId, target) {
  if (defId === 'fireball') {
    if (!target) return false;
    if (target.kind === 'hero') return true;
    return findCreature(state, target.uid) !== null;
  }
  return target === null || target === undefined;
}

function attackTargetIsLegal(state, side, uid, target) {
  const found = findCreature(state, uid);
  if (!found || found.side !== side || !found.card.canAttack) return false;
  if (!target) return false;
  const foe = OTHER[side];
  const taunts = state.sides[foe].board.filter((c) => c.taunt);
  if (target.kind === 'hero') {
    if (target.side !== foe) return false;
    return taunts.length === 0;
  }
  const t = findCreature(state, target.uid);
  if (!t || t.side !== foe) return false;
  if (taunts.length > 0 && !t.card.taunt) return false;
  return true;
}

export function isLegal(state, side, move) {
  if (state.phase !== 'play' || state.active !== side) return false;
  const me = state.sides[side];
  if (move.type === 'end') return true;
  if (move.type === 'play') {
    const card = me.hand[move.handIndex];
    if (!card) return false;
    if (card.cost > me.mana) return false;
    const def = CARDS[card.def];
    if (def.kind === 'creature' && me.board.length >= MAX_BOARD) return false;
    if (def.kind === 'spell' && !spellTargetIsLegal(state, side, card.def, move.target)) return false;
    return true;
  }
  if (move.type === 'attack') {
    return attackTargetIsLegal(state, side, move.uid, move.target);
  }
  return false;
}

/** All legal moves for `side` right now (attacks and plays first, end last). */
export function legalMoves(state, side) {
  const moves = [];
  const me = state.sides[side];
  const foe = OTHER[side];
  for (let i = 0; i < me.hand.length; i += 1) {
    const card = me.hand[i];
    if (card.cost > me.mana) continue;
    const def = CARDS[card.def];
    if (def.kind === 'creature') {
      if (me.board.length < MAX_BOARD) moves.push({ type: 'play', handIndex: i, target: null });
    } else if (def.kind === 'spell' && spellNeedsTarget(card.def)) {
      moves.push({ type: 'play', handIndex: i, target: { kind: 'hero', side: foe } });
      for (const c of state.sides[foe].board) moves.push({ type: 'play', handIndex: i, target: { kind: 'minion', uid: c.uid } });
      for (const c of me.board) moves.push({ type: 'play', handIndex: i, target: { kind: 'minion', uid: c.uid } });
    } else {
      moves.push({ type: 'play', handIndex: i, target: null });
    }
  }
  for (const c of me.board) {
    if (!c.canAttack) continue;
    const taunts = state.sides[foe].board.filter((t) => t.taunt);
    if (taunts.length > 0) {
      for (const t of taunts) moves.push({ type: 'attack', uid: c.uid, target: { kind: 'minion', uid: t.uid } });
    } else {
      moves.push({ type: 'attack', uid: c.uid, target: { kind: 'hero', side: foe } });
      for (const t of state.sides[foe].board) moves.push({ type: 'attack', uid: c.uid, target: { kind: 'minion', uid: t.uid } });
    }
  }
  moves.push({ type: 'end' });
  return moves;
}

/** Apply a legal move. Returns the events it caused (for animation and the log). */
export function applyMove(state, move) {
  const side = state.active;
  const me = state.sides[side];
  const foe = OTHER[side];
  const events = [];
  if (move.type === 'end') {
    events.push(...endTurn(state));
    return events;
  }
  if (move.type === 'play') {
    const card = me.hand[move.handIndex];
    me.mana -= card.cost;
    me.hand.splice(move.handIndex, 1);
    state.stats.played[side] += 1;
    const def = CARDS[card.def];
    if (def.kind === 'creature') {
      card.canAttack = !!card.rush;
      me.board.push(card);
      events.push({ type: 'summon', side, card });
      pushLog(state, `${me.name} plays ${card.name} (${card.attack}/${card.health}).`);
    } else if (card.def === 'fireball') {
      const amount = 5;
      state.stats.damage[side] += amount;
      events.push({ type: 'cast', side, card, target: move.target });
      pushLog(state, `${me.name} hurls a Fireball at ${targetName(state, move.target)} for ${amount}.`);
      if (move.target.kind === 'hero') events.push(...damageHero(state, move.target.side, amount, 'fireball'));
      else events.push(...damageCreature(state, move.target.uid, amount, 'fireball'));
    } else if (card.def === 'mend') {
      const healed = Math.min(6, me.maxHp - me.hp);
      me.hp += healed;
      events.push({ type: 'cast', side, card, target: null }, { type: 'heal', side, amount: healed });
      pushLog(state, `${me.name} mends for ${healed} Health.`);
    } else if (card.def === 'volley') {
      events.push({ type: 'cast', side, card, target: null });
      pushLog(state, `${me.name} calls down a Cinder Volley.`);
      for (const c of [...state.sides[foe].board]) {
        state.stats.damage[side] += 2;
        events.push(...damageCreature(state, c.uid, 2, 'volley'));
      }
    } else if (card.def === 'scry') {
      events.push({ type: 'cast', side, card, target: null });
      pushLog(state, `${me.name} scries the flames and draws 2 cards.`);
      events.push(...drawCards(state, side, 2));
    }
    return events;
  }
  if (move.type === 'attack') {
    const found = findCreature(state, move.uid);
    const attacker = found.card;
    attacker.canAttack = false;
    if (move.target.kind === 'hero') {
      const amount = attacker.attack;
      state.stats.damage[side] += amount;
      events.push({ type: 'attack', side, uid: attacker.uid, target: move.target, amount });
      pushLog(state, `${attacker.name} strikes ${state.sides[move.target.side].name} for ${amount}.`);
      events.push(...damageHero(state, move.target.side, amount, 'attack'));
    } else {
      const target = findCreature(state, move.target.uid).card;
      const amount = attacker.attack;
      const back = target.attack;
      state.stats.damage[side] += amount;
      events.push({ type: 'attack', side, uid: attacker.uid, target: move.target, amount });
      pushLog(state, `${attacker.name} attacks ${target.name} for ${amount}.`);
      target.health -= amount;
      attacker.health -= back;
      events.push({ type: 'damage', kind: 'minion', side: foe, uid: target.uid, amount, source: 'attack' });
      events.push({ type: 'damage', kind: 'minion', side, uid: attacker.uid, amount: back, source: 'attack' });
      events.push(...checkDeaths(state));
    }
    return events;
  }
  return events;
}

function startTurn(state, side) {
  const me = state.sides[side];
  me.maxMana = Math.min(MAX_MANA, me.maxMana + 1);
  me.mana = me.maxMana;
  for (const c of me.board) c.canAttack = true;
  state.stats.turns += 1;
  pushLog(state, side === 'player'
    ? `Your turn ${state.turn} begins with ${me.mana} mana.`
    : `${me.name} begins turn ${state.turn} with ${me.mana} mana.`);
  return drawCards(state, side, 1);
}

function endTurn(state) {
  const events = [];
  const next = OTHER[state.active];
  if (next === 'player') state.turn += 1;
  state.active = next;
  events.push({ type: 'turn', side: next, turn: state.turn });
  events.push(...startTurn(state, next));
  return events;
}
