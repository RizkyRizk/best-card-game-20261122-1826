# Ember Court — a duel of cinder and flame

A make.fun **best-card-game-20261122-1826** entry: a complete, original card
battler that runs offline in a desktop browser from static files, with no
network request. $50 pot, top 10 share it (1st $12). Deadline **23 Nov 2026
13:26 WIB** (2026-11-23T06:26:00Z).

## The game

Two ember-lords duel with 30 Health each. Every turn you gain a mana crystal
(up to 10), refill your mana and draw a card from a 30-card deck. Play
creatures onto your table, cast spells, and strike the Cinder Queen down to 0
Health before she does the same to you.

- **14 original cards**: 10 ember creatures (Spark Imp, Cinder Pup, Ash Guard,
  Flame Acolyte, Molten Hound, Ember Knight, Blaze Phoenix, Ash Golem, Storm
  Roc, Ember Dragon) and 4 spells (Fireball, Ember Mend, Cinder Volley, Scry
  the Flames).
- **Taunt** creatures must be attacked first. **Rush** creatures strike at
  once. Everything else rests a turn (summoning sickness).
- **Fatigue**: when your deck runs out, drawing hurts more every turn.
- A greedy-heuristic AI opponent (lethal check, on-curve plays, favourable
  trades, face damage). AI-vs-AI: first player wins 130/200 over 10.3 turns
  on average — a real but not overwhelming edge.
- Title screen, how-to-play, live table with both hands, mana crystals, HP
  bars, end screens with duel statistics, synthesized WebAudio sounds, and
  keyboard play (1–9 pick a card, Space ends the turn).

## How to play

Serve the game and open it in desktop Chrome:

```sh
node serve.ts        # http://localhost:8080
```

Click **Begin the Duel**. Click a card in your hand — creatures go straight
onto your table, Fireball asks you to pick a target — then click one of your
creatures and click what it attacks. Press **Space** to end your turn.

## Screenshots

Four real renders of the game's own code, taken in headless Chromium from the
`?shot=` scenes in `game/src/shots.js` (each scene plays the real rules
forward with the AI on both sides from a fixed seed):

| File | Scene |
| --- | --- |
| `screenshots/1-title.jpg` | Title screen over a mid-game table |
| `screenshots/2-play.jpg` | Turn 7, a close duel (23 vs 22 HP) |
| `screenshots/3-win.jpg` | Victory screen, 11 turns |
| `screenshots/4-loss.jpg` | Defeat screen, 8 turns |

Retake them with:

```sh
node ~/workspace/makefun-kit/shot-tool/shots.mjs . screenshots
```

## Files

- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to `/output`
  and writes `dossier.json` with the vendored make.fun library. Two runs write
  identical bytes (copy-only, no generation).
- `vendor/makefun-game.ts` — the kit's library, copied unchanged.
- `game/index.html` — the whole presentation (inline CSS, no network).
- `game/src/cards.js` — the 14-card pool and the 30-card decklist.
- `game/src/engine.js` — the pure rules: mana, combat, Taunt, Rush, fatigue.
- `game/src/ai.js` — the opponent heuristic.
- `game/src/shots.js` — the four screenshot scenes.
- `game/src/render.js` — DOM rendering and inline-SVG card art.
- `game/src/sound.js` — synthesized WebAudio blips.
- `game/src/main.js` — boot, input and the AI's turns.
- `tests/engine.test.mjs` — 14 tests: rules, determinism, AI legality, scenes.
  Run with `node --test tests/engine.test.mjs`.
- `tools/playtest.mjs` — headless-Chrome interactive playtest: begins a duel,
  plays cards, attacks and ends turns until the game ends.

## License

MIT — see `LICENSE`.
