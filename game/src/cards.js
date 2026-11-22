// Ember Court: the card pool. Fourteen original cards, all invented for this game:
// ten ember creatures and four ember spells. No card copies a commercial game.
//
// Keywords:
//   taunt — enemies must attack this creature before any other target.
//   rush  — this creature can attack the turn it is played.

export const CARDS = {
  imp: {
    id: 'imp', name: 'Spark Imp', kind: 'creature', cost: 1, attack: 2, health: 1,
    text: '', art: 'imp', color: '#ff9a3d',
    flavor: 'It bites first and apologises never.',
  },
  pup: {
    id: 'pup', name: 'Cinder Pup', kind: 'creature', cost: 1, attack: 1, health: 2,
    text: '', art: 'pup', color: '#ffb347',
    flavor: 'Loyal, warm, and slightly on fire.',
  },
  guard: {
    id: 'guard', name: 'Ash Guard', kind: 'creature', cost: 2, attack: 2, health: 3,
    text: 'Taunt', taunt: true, art: 'guard', color: '#9aa5b1',
    flavor: 'The wall that walks.',
  },
  acolyte: {
    id: 'acolyte', name: 'Flame Acolyte', kind: 'creature', cost: 2, attack: 3, health: 2,
    text: '', art: 'acolyte', color: '#ff6b35',
    flavor: 'She tends the court’s everlasting fire.',
  },
  hound: {
    id: 'hound', name: 'Molten Hound', kind: 'creature', cost: 3, attack: 4, health: 3,
    text: '', art: 'hound', color: '#e8483f',
    flavor: 'Its bark warns. Its bite is worse.',
  },
  knight: {
    id: 'knight', name: 'Ember Knight', kind: 'creature', cost: 3, attack: 3, health: 4,
    text: 'Taunt', taunt: true, art: 'knight', color: '#c0392b',
    flavor: 'Sworn to the flame, shield first.',
  },
  phoenix: {
    id: 'phoenix', name: 'Blaze Phoenix', kind: 'creature', cost: 4, attack: 4, health: 3,
    text: '', art: 'phoenix', color: '#ff7b00',
    flavor: 'Every ending is a beginning.',
  },
  golem: {
    id: 'golem', name: 'Ash Golem', kind: 'creature', cost: 5, attack: 5, health: 6,
    text: 'Taunt', taunt: true, art: 'golem', color: '#7f8c8d',
    flavor: 'Carved from the mountain.',
  },
  roc: {
    id: 'roc', name: 'Storm Roc', kind: 'creature', cost: 5, attack: 6, health: 4,
    text: 'Rush', rush: true, art: 'roc', color: '#5dade2',
    flavor: 'It strikes before the thunder arrives.',
  },
  dragon: {
    id: 'dragon', name: 'Ember Dragon', kind: 'creature', cost: 7, attack: 8, health: 8,
    text: '', art: 'dragon', color: '#b03a2e',
    flavor: 'The court bows when it flies.',
  },
  fireball: {
    id: 'fireball', name: 'Fireball', kind: 'spell', cost: 3,
    text: 'Deal 5 damage.', art: 'fireball', color: '#ff5722',
    flavor: 'The court’s oldest argument.',
  },
  mend: {
    id: 'mend', name: 'Ember Mend', kind: 'spell', cost: 2,
    text: 'Restore 6 Health to your hero.', art: 'mend', color: '#58d68d',
    flavor: 'Warmth, applied where it hurts.',
  },
  volley: {
    id: 'volley', name: 'Cinder Volley', kind: 'spell', cost: 4,
    text: 'Deal 2 damage to all enemy creatures.', art: 'volley', color: '#f39c12',
    flavor: 'Rain, but make it burning.',
  },
  scry: {
    id: 'scry', name: 'Scry the Flames', kind: 'spell', cost: 2,
    text: 'Draw 2 cards.', art: 'scry', color: '#8e7cc3',
    flavor: 'The fire shows what is coming.',
  },
};

/** The 30-card deck every duellist brings: two copies of most cards, three of the cheapest. */
export const DECKLIST = {
  imp: 3, pup: 2, guard: 2, acolyte: 3, hound: 3, knight: 2, phoenix: 2,
  golem: 2, roc: 1, dragon: 1, fireball: 3, mend: 2, volley: 2, scry: 2,
};

export function buildDeck() {
  const deck = [];
  for (const [id, count] of Object.entries(DECKLIST)) {
    for (let i = 0; i < count; i += 1) deck.push(id);
  }
  return deck;
}

export function deckSize() {
  return Object.values(DECKLIST).reduce((a, b) => a + b, 0);
}
