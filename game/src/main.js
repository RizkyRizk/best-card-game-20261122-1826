// Ember Court boot and input: title screen, human turns, the AI's turns with
// a readable pace, and the ?shot= scenes for screenshots.
//
// URL parameters:
//   ?shot=title|play|win|loss   stage a fixed scene and set window.__shotReady
//   &seed=N                     the scene's seed (defaults are fixed per scene)

import { CARDS } from './cards.js';
import { applyMove, createGame, isLegal, OTHER } from './engine.js';
import { chooseMove } from './ai.js';
import { stageShot } from './shots.js';
import { fitStage, floatNumber, render } from './render.js';
import { isMuted, setMuted, sfx } from './sound.js';

const RECORD_KEY = 'ember-court.record';

function loadRecord() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECORD_KEY) ?? 'null');
    if (raw && typeof raw.wins === 'number' && typeof raw.losses === 'number') return raw;
  } catch {
    // A browser without storage just starts at 0-0.
  }
  return { wins: 0, losses: 0 };
}

function saveRecord(record) {
  try {
    localStorage.setItem(RECORD_KEY, JSON.stringify(record));
  } catch {
    // Storage is a nicety, not a rule.
  }
}

const ui = {
  state: null,
  screen: 'title',
  selected: null,
  record: loadRecord(),
  aiBusy: false,
  hintTimer: null,
  returnTo: 'title',
};

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const shotMode = shotName === 'title' || shotName === 'play' || shotName === 'win' || shotName === 'loss';

if (shotMode) document.body.classList.add('shot');

function showHint(text, ms = 2600) {
  const hint = document.getElementById('hint');
  hint.textContent = text;
  hint.style.display = 'block';
  clearTimeout(ui.hintTimer);
  ui.hintTimer = setTimeout(() => { hint.style.display = 'none'; }, ms);
}

function refresh(lastEvents = []) {
  render(ui);
  if (!shotMode) {
    for (const ev of lastEvents) {
      if (ev.type === 'damage' && ev.amount > 0) {
        floatNumber(ev.kind === 'hero' ? { kind: 'hero', side: ev.side } : { kind: 'minion', uid: ev.uid }, ev.amount, 'damage');
      }
      if (ev.type === 'heal' && ev.amount > 0) {
        floatNumber({ kind: 'hero', side: ev.side }, ev.amount, 'heal');
      }
    }
  }
}

function noteGameOver() {
  if (ui.state.phase !== 'over') return;
  if (ui.state.winner === 'player') {
    ui.record.wins += 1;
    sfx.win();
  } else {
    ui.record.losses += 1;
    sfx.lose();
  }
  saveRecord(ui.record);
  ui.screen = 'over';
}

function humanMove(move) {
  if (ui.aiBusy || ui.screen !== 'play') return;
  if (!isLegal(ui.state, 'player', move)) return;
  const events = applyMove(ui.state, move);
  sfxFor(events);
  ui.selected = null;
  noteGameOver();
  refresh(events);
  if (ui.state.phase === 'play' && ui.state.active === 'ai') runAiTurn();
}

function sfxFor(events) {
  for (const ev of events) {
    if (ev.type === 'summon' || ev.type === 'cast') sfx.play();
    else if (ev.type === 'attack') sfx.attack();
    else if (ev.type === 'damage') sfx.damage();
    else if (ev.type === 'heal') sfx.heal();
  }
}

function runAiTurn() {
  ui.aiBusy = true;
  refresh();
  const step = () => {
    if (ui.state.phase !== 'play' || ui.state.active !== 'ai') {
      ui.aiBusy = false;
      refresh();
      return;
    }
    const move = chooseMove(ui.state, 'ai');
    if (move.type === 'end') {
      const events = applyMove(ui.state, { type: 'end' });
      sfx.turn();
      ui.aiBusy = false;
      refresh(events);
      return;
    }
    const events = applyMove(ui.state, move);
    sfxFor(events);
    noteGameOver();
    refresh(events);
    if (ui.state.phase === 'play' && ui.state.active === 'ai') {
      setTimeout(step, 520);
    } else {
      ui.aiBusy = false;
    }
  };
  setTimeout(step, 650);
}

function tryPlayHand(index) {
  const card = ui.state.sides.player.hand[index];
  if (!card) return;
  const def = CARDS[card.def];
  if (def.kind === 'creature') {
    // Creatures go straight onto the table when there is room.
    if (ui.state.sides.player.board.length >= 7) {
      showHint('Your table is full — 7 creatures at most.');
      return;
    }
    humanMove({ type: 'play', handIndex: index, target: null });
    return;
  }
  if (card.def === 'fireball') {
    ui.selected = { kind: 'hand', index };
    showHint('Fireball: choose a target — the Queen, or any creature.');
    refresh();
    return;
  }
  humanMove({ type: 'play', handIndex: index, target: null });
}

function onStageClick(event) {
  if (shotMode) return;
  const el = event.target.closest('[data-action]');
  if (!el) {
    ui.selected = null;
    refresh();
    return;
  }
  const action = el.dataset.action;
  if (action === 'begin') {
    sfx.click();
    ui.state = createGame((Math.random() * 0xffffffff) >>> 0);
    ui.screen = 'play';
    ui.selected = null;
    refresh();
    return;
  }
  if (action === 'howto') {
    ui.returnTo = ui.screen;
    ui.screen = 'howto';
    refresh();
    return;
  }
  if (action === 'close-howto') {
    ui.screen = ui.returnTo;
    refresh();
    return;
  }
  if (action === 'play-again') {
    sfx.click();
    ui.state = createGame((Math.random() * 0xffffffff) >>> 0);
    ui.screen = 'play';
    ui.selected = null;
    refresh();
    return;
  }
  if (action === 'to-title') {
    ui.state = createGame((Math.random() * 0xffffffff) >>> 0);
    ui.screen = 'title';
    ui.selected = null;
    refresh();
    return;
  }
  if (action === 'toggle-sound') return; // handled below, on the topbar button itself
  if (action === 'end-turn') {
    if (ui.state.active === 'player' && ui.state.phase === 'play' && !ui.aiBusy) {
      ui.selected = null;
      humanMove({ type: 'end' });
    }
    return;
  }
  if (ui.screen !== 'play' || ui.state.phase !== 'play' || ui.aiBusy) return;

  if (action === 'select-hand') {
    const index = Number(el.dataset.index);
    const card = ui.state.sides.player.hand[index];
    if (!card) return;
    if (ui.selected?.kind === 'hand' && ui.selected.index === index) {
      ui.selected = null;
      refresh();
      return;
    }
    if (ui.state.active !== 'player') return;
    if (card.cost > ui.state.sides.player.mana) {
      showHint(`${card.name} costs ${card.cost} mana — you have ${ui.state.sides.player.mana}.`);
      return;
    }
    sfx.click();
    tryPlayHand(index);
    return;
  }
  if (action === 'select-board') {
    const uid = Number(el.dataset.uid);
    const mine = ui.state.sides.player.board.find((c) => c.uid === uid);
    if (mine) {
      if (ui.selected?.kind === 'board' && ui.selected.uid === uid) {
        ui.selected = null;
        refresh();
        return;
      }
      if (!mine.canAttack) {
        showHint(`${mine.name} cannot attack yet — it just entered the table.`);
        return;
      }
      ui.selected = { kind: 'board', uid };
      showHint('Choose a target for ' + mine.name + '.');
      refresh();
      return;
    }
    // An enemy creature: a target, if something is selected.
    if (ui.selected) {
      const target = { kind: 'minion', uid };
      if (ui.selected.kind === 'hand') {
        humanMove({ type: 'play', handIndex: ui.selected.index, target });
      } else {
        humanMove({ type: 'attack', uid: ui.selected.uid, target });
      }
    }
    return;
  }
  if (action === 'target-hero') {
    if (!ui.selected) return;
    const target = { kind: 'hero', side: el.dataset.side };
    if (target.side === 'player' && ui.selected.kind === 'hand') return;
    if (ui.selected.kind === 'hand') {
      humanMove({ type: 'play', handIndex: ui.selected.index, target });
    } else {
      humanMove({ type: 'attack', uid: ui.selected.uid, target });
    }
  }
}

function onKey(event) {
  if (shotMode) return;
  if (event.key === 'Escape') {
    ui.selected = null;
    refresh();
    return;
  }
  if (ui.screen !== 'play' || ui.state.phase !== 'play' || ui.aiBusy) return;
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    if (ui.state.active === 'player') humanMove({ type: 'end' });
    return;
  }
  const n = Number(event.key);
  if (Number.isInteger(n) && n >= 1 && n <= 9) {
    const index = n - 1;
    if (ui.state.sides.player.hand[index]) {
      const card = ui.state.sides.player.hand[index];
      if (card.cost <= ui.state.sides.player.mana) tryPlayHand(index);
    }
  }
}

function boot() {
  fitStage();
  window.addEventListener('resize', fitStage);
  document.getElementById('stage').addEventListener('click', onStageClick);
  window.addEventListener('keydown', onKey);
  document.getElementById('btn-howto').addEventListener('click', () => {
    if (shotMode) return;
    ui.returnTo = ui.screen;
    ui.screen = 'howto';
    refresh();
  });
  document.getElementById('btn-sound').addEventListener('click', (event) => {
    setMuted(!isMuted());
    event.currentTarget.textContent = `Sound: ${isMuted() ? 'off' : 'on'}`;
  });

  if (shotMode) {
    const staged = stageShot(shotName);
    ui.state = staged.state;
    ui.screen = staged.screen;
    if (ui.state.phase === 'over') {
      ui.record = { wins: ui.state.winner === 'player' ? 1 : 0, losses: ui.state.winner === 'ai' ? 1 : 0 };
    }
    refresh();
    // Let the layout settle, then signal the screenshot tool.
    requestAnimationFrame(() => setTimeout(() => { window.__shotReady = true; }, 350));
    return;
  }

  ui.state = createGame((Math.random() * 0xffffffff) >>> 0);
  ui.screen = 'title';
  refresh();
}

boot();
