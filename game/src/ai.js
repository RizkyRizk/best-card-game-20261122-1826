// Ember Court AI: a greedy heuristic that plays a decent game — it takes lethal
// when it sees it, plays its cards on curve, removes what threatens it, and
// otherwise goes for the enemy hero. The same chooser drives both sides in the
// screenshot scenes, so those frames show real play.

import { CARDS } from './cards.js';
import { OTHER, applyMove, legalMoves } from './engine.js';

function creatureValue(card) {
  let value = card.attack + card.health;
  if (card.taunt) value += 1.5;
  if (card.rush) value += 1;
  return value - card.cost * 0.4;
}

/** Pick the single best move for `side` right now, or { type: 'end' }. */
export function chooseMove(state, side) {
  const me = state.sides[side];
  const foe = state.sides[OTHER[side]];
  const moves = legalMoves(state, side);

  // 1. Lethal: any attack or Fireball that ends the game now.
  for (const move of moves) {
    if (move.type === 'attack' && move.target.kind === 'hero') {
      const attacker = me.board.find((c) => c.uid === move.uid);
      if (attacker && attacker.attack >= foe.hp) return move;
    }
    if (move.type === 'play') {
      const card = me.hand[move.handIndex];
      if (card && card.def === 'fireball' && move.target.kind === 'hero' && foe.hp <= 5) return move;
    }
  }

  // 2. Play cards: the best affordable play first.
  const plays = moves.filter((m) => m.type === 'play');
  let bestPlay = null;
  let bestPlayScore = 0;
  for (const move of plays) {
    const card = me.hand[move.handIndex];
    const def = CARDS[card.def];
    let score = 0;
    if (def.kind === 'creature') {
      score = creatureValue(card);
      if (me.board.length >= 6) score -= 2;
    } else if (card.def === 'fireball') {
      if (move.target.kind === 'minion') {
        const target = foe.board.find((c) => c.uid === move.target.uid);
        if (target && target.health <= 5 && target.attack >= 3) score = 6;
        else if (target && target.health <= 5) score = 3.5;
        else continue;
      } else if (foe.hp <= 10) {
        score = 4;
      } else {
        continue;
      }
    } else if (card.def === 'mend') {
      if (me.hp <= 18) score = 5;
      else continue;
    } else if (card.def === 'volley') {
      const weak = foe.board.filter((c) => c.health <= 2).length;
      if (foe.board.length >= 2 && weak >= 1) score = 5;
      else if (foe.board.length >= 3) score = 4;
      else continue;
    } else if (card.def === 'scry') {
      if (me.hand.length <= 4) score = 3;
      else continue;
    }
    if (score > bestPlayScore) {
      bestPlayScore = score;
      bestPlay = move;
    }
  }
  if (bestPlay) return bestPlay;

  // 3. Attacks: trade up when it is free, otherwise go for the hero.
  const attacks = moves.filter((m) => m.type === 'attack');
  attacks.sort((a, b) => {
    const ca = me.board.find((c) => c.uid === a.uid);
    const cb = me.board.find((c) => c.uid === b.uid);
    return (cb?.attack ?? 0) - (ca?.attack ?? 0);
  });
  for (const move of attacks) {
    const attacker = me.board.find((c) => c.uid === move.uid);
    if (!attacker) continue;
    if (move.target.kind === 'hero') {
      // Trade up first: kill a dangerous creature without dying.
      for (const target of foe.board) {
        if (target.attack >= 4 && target.health <= attacker.attack && target.attack < attacker.health) {
          return { type: 'attack', uid: attacker.uid, target: { kind: 'minion', uid: target.uid } };
        }
      }
      return move;
    }
    return move;
  }

  return { type: 'end' };
}

/** Drive `side` through its whole turn, returning every move applied. */
export function driveTurn(state, side, maxMoves = 60) {
  const applied = [];
  for (let i = 0; i < maxMoves; i += 1) {
    if (state.phase !== 'play' || state.active !== side) break;
    const move = chooseMove(state, side);
    if (move.type === 'end') break;
    applied.push({ move, events: applyMove(state, move) });
  }
  return applied;
}
