// Ember Court renderer: turns engine state into DOM. The stage is a fixed
// 1280x720 area scaled to the window, so a screenshot frame is always the same
// layout. All art is inline SVG drawn by this file — no network, no files.

import { CARDS } from './cards.js';
import { MAX_MANA, OTHER } from './engine.js';

// Simple geometric pictograms, one per card. Each is SVG inner markup in a 24x24 box.
export const ICONS = {
  imp: '<path d="M12 2 C10 6 6 8 6 13 a6 6 0 0 0 12 0 C18 8 14 6 12 2 Z"/><path d="M12 9.5 C11 11 9.5 12 9.5 14 a2.5 2.5 0 0 0 5 0 C14.5 12 13 11 12 9.5 Z" fill="rgba(255,255,255,.55)"/>',
  pup: '<ellipse cx="12" cy="16.5" rx="4.6" ry="3.6"/><circle cx="6.2" cy="10.5" r="1.9"/><circle cx="10" cy="7.6" r="1.9"/><circle cx="14" cy="7.6" r="1.9"/><circle cx="17.8" cy="10.5" r="1.9"/>',
  guard: '<path d="M12 2 L20 5 V11 C20 17 16.5 21 12 22 C7.5 21 4 17 4 11 V5 Z"/><path d="M8.3 11.6 L11 14.3 L15.8 9.4" fill="none" stroke="rgba(0,0,0,.4)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  acolyte: '<path d="M12 2 L14.6 9 L22 9 L16.2 13.4 L18.2 21 L12 16.4 L5.8 21 L7.8 13.4 L2 9 L9.4 9 Z"/>',
  hound: '<path d="M13 2 L5 13 H11 L9.5 22 L19 10 H13.5 Z"/>',
  knight: '<path d="M12 1.5 L14.4 3.8 V12.5 H9.6 V3.8 Z"/><rect x="6.5" y="13" width="11" height="2.4" rx="1"/><rect x="10.9" y="15.4" width="2.2" height="5" rx="1"/><circle cx="12" cy="22" r="1.4"/>',
  phoenix: '<path d="M3 19 C7 11 13 6 21 4 C19 10 15 16 10 20 C7.5 21.5 4.5 21 3 19 Z"/><path d="M6.5 19 C9.5 15 12.5 12 16.5 10" fill="none" stroke="rgba(0,0,0,.4)" stroke-width="1.6" stroke-linecap="round"/>',
  golem: '<path d="M2 20 L9 5 L13 12 L16.5 8 L22 20 Z"/><path d="M9 5 L10.5 8.5 L7.5 8.5 Z" fill="rgba(255,255,255,.5)"/>',
  roc: '<path d="M20 4 C10 6 5 12 4 20 C12 19 18 14 20 4 Z"/><path d="M5.5 18.5 L18.5 5.5" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="1.6" stroke-linecap="round"/>',
  dragon: '<path d="M12 4 C10.5 7.5 7 9.5 7 13.5 a5 5 0 0 0 10 0 C17 9.5 13.5 7.5 12 4 Z"/><path d="M7.5 6 L9.5 9.5 L5.5 9 Z"/><path d="M16.5 6 L14.5 9.5 L18.5 9 Z"/><circle cx="10" cy="13" r="1" fill="rgba(0,0,0,.5)"/><circle cx="14" cy="13" r="1" fill="rgba(0,0,0,.5)"/>',
  fireball: '<circle cx="12" cy="14.5" r="6"/><path d="M12 2.5 C11 4.8 9.2 5.8 9.2 8 a2.8 2.8 0 0 0 5.6 0 C14.8 5.8 13 4.8 12 2.5 Z" fill="rgba(255,255,255,.6)"/>',
  mend: '<path d="M12 21 C5 15.5 2.5 11.5 2.5 8 C2.5 5 4.8 3 7.3 3 C9.3 3 11 4.2 12 6 C13 4.2 14.7 3 16.7 3 C19.2 3 21.5 5 21.5 8 C21.5 11.5 19 15.5 12 21 Z"/>',
  volley: '<path d="M6 4 L8 8 L6 12 L4 8 Z"/><path d="M12 2.5 L14.5 8 L12 13.5 L9.5 8 Z"/><path d="M18 4.5 L20 8.5 L18 12.5 L16 8.5 Z"/><circle cx="12" cy="18.5" r="1.6"/>',
  scry: '<path d="M2 12 C5 6.5 8.5 4.5 12 4.5 C15.5 4.5 19 6.5 22 12 C19 17.5 15.5 19.5 12 19.5 C8.5 19.5 5 17.5 2 12 Z"/><circle cx="12" cy="12" r="3.6" fill="rgba(0,0,0,.35)"/><circle cx="12" cy="12" r="1.8" fill="rgba(255,255,255,.85)"/>',
  warden: '<path d="M12 2 L20 5 V11 C20 17 16.5 21 12 22 C7.5 21 4 17 4 11 V5 Z"/><path d="M12 6.5 C11 8.5 9 9.5 9 12 a3 3 0 0 0 6 0 C15 9.5 13 8.5 12 6.5 Z" fill="rgba(255,255,255,.5)"/>',
  pyra: '<path d="M12 2 C10 6 6 8 6 13 a6 6 0 0 0 12 0 C18 8 14 6 12 2 Z"/><path d="M4 20 L6 17 L8 20 L10 17 L12 20 L14 17 L16 20 L18 17 L20 20 Z"/>',
};

export function icon(name, color) {
  const body = ICONS[name] ?? ICONS.imp;
  return `<svg viewBox="0 0 24 24" fill="${color}" aria-hidden="true">${body}</svg>`;
}

function esc(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function manaPips(side) {
  let pips = '';
  for (let i = 0; i < MAX_MANA; i += 1) {
    const cls = i < side.mana ? 'pip full' : i < side.maxMana ? 'pip' : 'pip locked';
    pips += `<span class="${cls}"></span>`;
  }
  return `<div class="mana-row">${pips}<span>${side.mana}/${side.maxMana} mana</span></div>`;
}

function heroPanel(state, sideKey, active) {
  const side = state.sides[sideKey];
  const isEnemy = sideKey === 'ai';
  const art = isEnemy ? 'pyra' : 'warden';
  const color = isEnemy ? '#ff6b35' : '#f2c94c';
  const pct = Math.max(0, (side.hp / side.maxHp) * 100);
  return `<div class="hero ${isEnemy ? 'enemy' : ''} ${active ? 'active-turn' : ''}" data-action="target-hero" data-side="${sideKey}">
    <div class="portrait">${icon(art, color)}</div>
    <div class="hero-info">
      <div class="hero-name">${esc(side.name)}</div>
      <div class="hpbar"><i style="width:${pct}%"></i><span>${side.hp} / ${side.maxHp} HP</span></div>
      ${manaPips(side)}
    </div>
  </div>`;
}

function cardHtml(card, opts = {}) {
  const def = CARDS[card.def];
  const mini = opts.mini ? ' mini' : '';
  const classes = ['card'];
  if (def.kind === 'spell') classes.push('spell');
  if (card.taunt) classes.push('taunt');
  if (def.kind === 'creature' && !card.canAttack && opts.onBoard) classes.push('sick-card');
  if (opts.canAttack) classes.push('can-attack');
  if (opts.selected) classes.push('selected');
  if (opts.playable) classes.push('playable');
  if (opts.cantPlay) classes.push('cant-play');
  if (opts.targetable) classes.push('targetable');
  const artBg = `background: radial-gradient(circle at 50% 28%, ${def.color}66, rgba(20,8,4,.75) 75%)`;
  const stats = def.kind === 'creature'
    ? `<span class="atk">${card.attack}</span><span class="hp">${card.health}</span>` : '';
  const sick = def.kind === 'creature' && !card.canAttack && opts.onBoard
    ? '<div class="sick">Resting</div>' : '';
  const action = opts.action ?? '';
  const extra = opts.extra ?? '';
  return `<div class="${classes.join(' ')}${mini}" ${action} ${extra}>
    <span class="cost">${card.cost}</span>
    <div class="art" style="${artBg}">${icon(def.art, def.color)}</div>
    <div class="name">${esc(card.name)}</div>
    <div class="text">${esc(def.text || def.flavor)}</div>
    ${stats}${sick}
  </div>`;
}

function boardHtml(state, sideKey, selected) {
  const board = state.sides[sideKey].board;
  if (board.length === 0) return '<span class="board-empty">No creatures on the table yet.</span>';
  return board.map((card) => {
    const canAttack = state.active === sideKey && state.phase === 'play' && card.canAttack;
    const isSelected = selected?.kind === 'board' && selected.uid === card.uid;
    const targetable = !!selected && selected.kind !== 'board'
      ? isTargetable(state, selected, { kind: 'minion', uid: card.uid })
      : selected?.kind === 'board'
        ? isTargetable(state, selected, { kind: 'minion', uid: card.uid })
        : false;
    return cardHtml(card, {
      mini: true, onBoard: true, canAttack,
      selected: isSelected, targetable,
      action: `data-action="select-board" data-uid="${card.uid}"`,
    });
  }).join('');
}

function handHtml(state, selected) {
  const hand = state.sides.player.hand;
  return hand.map((card, index) => {
    const def = CARDS[card.def];
    const myTurn = state.active === 'player' && state.phase === 'play';
    const affordable = card.cost <= state.sides.player.mana;
    const boardFull = def.kind === 'creature' && state.sides.player.board.length >= 7;
    const playable = myTurn && affordable && !boardFull;
    const isSelected = selected?.kind === 'hand' && selected.index === index;
    return cardHtml(card, {
      selected: isSelected,
      playable: playable && !isSelected,
      cantPlay: myTurn && !playable,
      action: `data-action="select-hand" data-index="${index}"`,
    });
  }).join('');
}

/** Is `target` a legal target for the currently selected hand card or attacker? */
export function isTargetable(state, selected, target) {
  if (!selected) return false;
  if (selected.kind === 'hand') {
    const card = state.sides.player.hand[selected.index];
    if (!card) return false;
    if (card.def !== 'fireball') return false;
    if (target.kind === 'hero') return target.side === 'ai';
    const found = state.sides.ai.board.some((c) => c.uid === target.uid)
      || state.sides.player.board.some((c) => c.uid === target.uid);
    return found;
  }
  if (selected.kind === 'board') {
    const attacker = state.sides.player.board.find((c) => c.uid === selected.uid);
    if (!attacker || !attacker.canAttack) return false;
    const taunts = state.sides.ai.board.filter((c) => c.taunt);
    if (target.kind === 'hero') return target.side === 'ai' && taunts.length === 0;
    const t = state.sides.ai.board.find((c) => c.uid === target.uid);
    if (!t) return false;
    if (taunts.length > 0 && !t.taunt) return false;
    return true;
  }
  return false;
}

function overlayHtml(ui) {
  const { state, screen, record } = ui;
  if (screen === 'title') {
    return `<div class="overlay">
      <h1>EMBER COURT</h1>
      <h2>A duel of cinder and flame</h2>
      <div class="rules">
        Two ember-lords enter. One leaves. You have <b>30 Health</b> and a deck of 30 cards.<br>
        Each turn you gain a mana crystal (up to 10) and draw a card. Play creatures onto your
        table, cast spells, and strike the Cinder Queen down to 0 Health before she does the same to you.<br>
        <b>Taunt</b> creatures must be attacked first. <b>Rush</b> creatures strike at once.
        Click a card, then click where it goes. Keys <b>1–9</b> pick a card, <b>Space</b> ends your turn.
      </div>
      <div class="btn-row">
        <button class="big-btn" type="button" data-action="begin">Begin the Duel</button>
        <button class="ghost-btn" type="button" data-action="howto">How to Play</button>
      </div>
      <div class="record">Duels won: ${record.wins} &nbsp;•&nbsp; Duels lost: ${record.losses}</div>
    </div>`;
  }
  if (screen === 'howto') {
    return `<div class="overlay">
      <h1 style="font-size:44px">HOW TO PLAY</h1>
      <div class="rules" style="text-align:left">
        <b>Goal:</b> reduce Pyra, the Cinder Queen, from 30 Health to 0.<br>
        <b>Mana:</b> you start with 1 crystal and gain one more each turn, up to 10. Mana refills every turn. A card costs the blue number in its corner.<br>
        <b>Creatures:</b> played onto your table. They cannot attack the turn they are played (summoning sickness), except <b>Rush</b> creatures. Their attack is the orange number, their Health the red one. When creatures fight, both deal damage to each other.<br>
        <b>Taunt:</b> a creature with a golden border must be attacked before any other target.<br>
        <b>Spells:</b> Fireball deals 5 damage to anything you choose. Ember Mend restores 6 Health to you. Cinder Volley hits every enemy creature for 2. Scry the Flames draws 2 cards.<br>
        <b>Fatigue:</b> when your deck runs out, drawing hurts you more every turn.<br>
        <b>Controls:</b> click a card in your hand, then click its target. Click one of your creatures, then click what it attacks. Press <b>Space</b> to end your turn.
      </div>
      <div class="btn-row"><button class="big-btn" type="button" data-action="close-howto">Back</button></div>
    </div>`;
  }
  if (screen === 'over') {
    const won = state.winner === 'player';
    const stats = state.stats;
    return `<div class="overlay ${won ? 'win' : 'loss'}">
      <h1>${won ? 'VICTORY' : 'DEFEAT'}</h1>
      <h2>${won ? 'The Cinder Queen bows to the Ember Warden.' : 'The embers fade. The Queen keeps her court.'}</h2>
      <div class="stats">
        The duel lasted <b>${state.turn} turn${state.turn === 1 ? '' : 's'}</b> &nbsp;•&nbsp;
        You played <b>${stats.played.player} cards</b> and dealt <b>${stats.damage.player} damage</b><br>
        Pyra played <b>${stats.played.ai} cards</b> and dealt <b>${stats.damage.ai} damage</b>
      </div>
      <div class="btn-row">
        <button class="big-btn" type="button" data-action="play-again">Duel Again</button>
        <button class="ghost-btn" type="button" data-action="to-title">Title Screen</button>
      </div>
      <div class="record">Duels won: ${record.wins} &nbsp;•&nbsp; Duels lost: ${record.losses}</div>
    </div>`;
  }
  return '';
}

/** Rebuild every zone from the current UI state. */
export function render(ui) {
  const { state, selected, screen } = ui;
  const myTurn = state.active === 'player' && state.phase === 'play';

  document.getElementById('opp-zone').innerHTML =
    heroPanel(state, 'ai', state.active === 'ai')
    + `<div class="opp-hand">${state.sides.ai.hand.map(() => '<div class="card-back">' + icon('imp', '#f2c94c') + '</div>').join('')}</div>`
    + `<div class="deck-pile"><div class="card-back">${icon('imp', '#f2c94c')}</div>Deck: ${state.sides.ai.deck.length}</div>`;

  document.getElementById('opp-board').innerHTML = boardHtml(state, 'ai', selected);

  const lastLog = state.log[state.log.length - 1] ?? '';
  document.getElementById('gamelog').textContent = lastLog;
  document.getElementById('banner').textContent = state.phase === 'over'
    ? (state.winner === 'player' ? 'Victory!' : 'Defeat')
    : myTurn ? `Your turn — Turn ${state.turn}` : `Cinder Queen’s turn…`;
  document.getElementById('turn-label').textContent = state.phase === 'over'
    ? 'Duel over'
    : `Turn ${state.turn} — ${myTurn ? 'Your move' : 'Pyra is thinking'}`;
  const endBtn = document.getElementById('end-turn');
  endBtn.disabled = !myTurn || screen !== 'play';
  endBtn.textContent = myTurn ? 'End Turn' : 'Enemy turn…';

  document.getElementById('my-board').innerHTML = boardHtml(state, 'player', selected);

  document.getElementById('my-zone').innerHTML =
    heroPanel(state, 'player', myTurn)
    + `<div id="my-hand">${handHtml(state, selected)}</div>`
    + `<div class="deck-pile"><div class="card-back">${icon('imp', '#f2c94c')}</div>Deck: ${state.sides.player.deck.length}</div>`
    + `<div class="hand-count">${state.sides.player.hand.length} / 10 cards</div>`;

  document.getElementById('overlay-root').innerHTML = overlayHtml(ui);
  document.getElementById('status').textContent = lastLog;

  // Mark legal targets for the current selection.
  if (selected && screen === 'play') {
    for (const el of document.querySelectorAll('[data-action="target-hero"]')) {
      const target = { kind: 'hero', side: el.dataset.side };
      if (isTargetable(state, selected, target)) el.classList.add('targetable');
    }
    for (const el of document.querySelectorAll('[data-action="select-board"]')) {
      const target = { kind: 'minion', uid: Number(el.dataset.uid) };
      if (isTargetable(state, selected, target)) el.classList.add('targetable');
    }
  }
}

/** Float a damage or heal number over a hero panel or a board card. */
export function floatNumber(target, amount, kind = 'damage') {
  const stage = document.getElementById('stage');
  let el = null;
  if (target.kind === 'hero') {
    el = document.querySelector(`[data-action="target-hero"][data-side="${target.side}"]`);
  } else {
    el = document.querySelector(`[data-action="select-board"][data-uid="${target.uid}"]`);
  }
  if (!el) return;
  const stageRect = stage.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  const span = document.createElement('span');
  span.className = `float-num${kind === 'heal' ? ' heal' : ''}`;
  span.textContent = kind === 'heal' ? `+${amount}` : `-${amount}`;
  span.style.left = `${rect.left - stageRect.left + rect.width / 2}px`;
  span.style.top = `${rect.top - stageRect.top + rect.height / 2 - 10}px`;
  stage.appendChild(span);
  setTimeout(() => span.remove(), 950);
}

/** Scale the fixed 1280x720 stage to the window. */
export function fitStage() {
  const stage = document.getElementById('stage');
  const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  stage.style.transform = `scale(${scale})`;
}
