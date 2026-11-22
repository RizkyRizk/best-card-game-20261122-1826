// The screenshot scenes behind ?shot=title|play|win|loss. Each one plays the real
// rules forward with the AI on both sides from a fixed seed, so every frame is what
// a real game looks like and the same seed always gives the same frame.

import { applyMove, createGame } from './engine.js';
import { chooseMove } from './ai.js';

const MAX_MOVES_PER_TURN = 60;
const MAX_TURNS = 40;

/** Play a full AI-vs-AI game from `seed`, stopping after `maxTurns` player turns. */
export function simulate(seed, maxTurns = MAX_TURNS) {
  const state = createGame(seed);
  while (state.phase === 'play' && state.turn <= maxTurns) {
    const side = state.active;
    for (let i = 0; i < MAX_MOVES_PER_TURN; i += 1) {
      if (state.phase !== 'play' || state.active !== side) break;
      const move = chooseMove(state, side);
      if (move.type === 'end') break;
      applyMove(state, move);
    }
    if (state.phase !== 'play') break;
    if (state.active === side) applyMove(state, { type: 'end' });
  }
  return state;
}

/** First seed from `start` where `predicate` holds on the finished game. */
export function findSeed(predicate, start, count = 200) {
  for (let seed = start; seed < start + count; seed += 1) {
    const state = simulate(seed);
    if (state.phase === 'over' && predicate(state)) return seed;
  }
  return null;
}

function boardRichness(state) {
  return state.sides.player.board.length + state.sides.ai.board.length;
}

/**
 * Set up the named scene and return the state plus the screen to draw over it.
 * Seeds are fixed, so a scene never changes between runs.
 */
export function stageShot(name) {
  if (name === 'play') {
    // A mid-game board: both sides have creatures out, hands are full, mana is
    // high — and the duel is still close, so the frame reads as a fight.
    let best = null;
    let bestScore = -1;
    for (let seed = 1; seed <= 120; seed += 1) {
      const state = simulate(seed, 6);
      if (state.phase !== 'play') continue;
      if (state.sides.player.hp < 10 || state.sides.ai.hp < 10) continue;
      const score = boardRichness(state) * 10 + state.sides.player.hand.length
        + state.sides.ai.hand.length + Math.min(state.sides.player.hp, state.sides.ai.hp);
      if (score > bestScore) {
        bestScore = score;
        best = state;
      }
    }
    if (best) return { state: best, screen: 'play' };
    return { state: simulate(7, 6), screen: 'play' };
  }
  if (name === 'win') {
    const seed = findSeed((s) => s.winner === 'player' && s.turn >= 6 && s.turn <= 12, 11);
    return { state: simulate(seed ?? 11), screen: 'over' };
  }
  if (name === 'loss') {
    const seed = findSeed((s) => s.winner === 'ai' && s.turn >= 6 && s.turn <= 12, 23);
    return { state: simulate(seed ?? 23), screen: 'over' };
  }
  // Title: a lively board behind the title screen.
  return { state: simulate(5, 5), screen: 'title' };
}
