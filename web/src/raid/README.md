# Raid Project 01: Abyss Core

This folder contains the first playable web prototype of a standalone raid game. It is intentionally separate from the main 1v1 battle engine.

## Architecture

- `types.ts`: raid-only state and action contracts.
- `engine.ts`: deterministic state transitions, costs, telegraph response rules, phase change, BREAK, and score calculation. The optional random function is injected so rule tests can be deterministic.
- `RaidGame.tsx`: raid screen, action selection, resource display, result summary, and a separate local best-score key.
- `raid.css`: isolated responsive UI styles and combat effects.

The menu/App connection is a thin route only. The raid engine does not call the main `useBattleGame`, `battleMath`, `abilitySystem`, or progression storage.

## Prototype loop

1. Read the next boss telegraph.
2. Select a command.
3. Resolve player damage/resource gain and the boss response as one state transition.
4. Match Counter to Charge/Rage, or Feather to Void, to prevent the incoming hit.
5. Build BREAK for a burst turn. Defeat phase one to trigger Deep Abyss phase two.
6. Phase two adapts to repeated choices; vary the action sequence to reduce pressure.

## Data boundaries

- Prototype best score uses `raidPrototypeV1BestScore`; it does not read or overwrite `raidBossBestScore`.
- No existing character/progression save keys are touched.
- The older raid implementation and its assets remain in the repository as reference material. They are not the screen used by this project.
- Balance numbers are provisional and should be tuned from repeated playtests rather than treated as canonical character stats.

## Iteration priorities

### Run 2
- Watch several full runs and tune time-to-clear, incoming damage, MP recovery, and BREAK frequency.
- Add a focused, deterministic test for every action under every telegraph, including low-resource and near-defeat boundaries.
- Improve action feedback so misses and successful reads are instantly legible; check mobile tap spacing and screen-height behavior.
- Consider short combat-history/event records to make later balancing evidence-based.

### Run 3
- Use playtest findings to refine phase-two adaptation and reduce dominant action loops.
- Add additional presentation only if the combat decisions are already working.

### Runs 4-5
- Add replay variety and polish the complete victory/defeat flow, then perform regression and browser checks.
- Keep all raid logic here unless a deliberate, reviewed integration with the main battle engine is required. Do not change existing progression storage or production deployment settings as part of raid iteration.
