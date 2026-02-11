# Age of War: Echoes

Single-player 1-lane tug-of-war strategy game inspired by Age of War.

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (UI)
- Phaser 3 (game loop + rendering)
- localStorage (progress persistence)

## Current Gameplay

- 5 ages with per-age unit roster, economy, and turret progression:
  - Hearth, Arcane, Beast, Runeforge, Astral
- Config-driven balance from `src/game/config/gameConfig.json`:
  - unit cost/stats/effects by age
  - age advance costs
  - base weapon/turret base values per age
- Base turrets are rendered and upgradeable (3 levels per age):
  - Mk I -> Mk II -> Mk III
  - next age base turret is enforced to be stronger than previous age max turret
  - turret range is age-scaled and capped so it does not cross map midpoint
- Queue-based spawning:
  - buying a unit adds it to a spawn queue
  - spawn timing uses unit spawn rate (`cooldownSec` in config)
  - max queue size is 5
- Economy model:
  - player starts at 75 gold
  - player passive income is disabled
  - player earns gold by kills only: `ceil(enemyCost * 1.3)`
  - AI earns passive income only
- Combat:
  - melee + projectile combat
  - support for splash, pierce, debuffs, execute-style effects, and summon effects
  - ranged movement behavior allows firing while advancing

## Menus and Controls

- Start screen:
  - Play
  - Difficulty selector placeholder (non-functional)
  - How to Play
  - audio mute/unmute icon + volume slider
  - in dev mode, AI vs AI toggle
- In-game:
  - Pause button in HUD or `Esc` key to pause
  - pause menu supports:
    - Resume
    - click outside modal to resume
    - mute/unmute + volume (shared state with start screen)
    - Quit Game (returns to start screen and resets match state)
- End screen:
  - Victory/Defeat
  - Restart
  - Menu

## AI and Debug (Dev Only)

- AI can decide between:
  - advancing age
  - upgrading turret
  - spawning frontline/ranged combinations
- Tactical mode switching is implemented (`defend`, `stabilize`, `tech`, `pressure`).
- Dev debug console is rendered outside the game viewport and hidden in production:
  - latest message banner
  - collapsible panel (`^`/`v`)
  - age/turret status for player and AI
  - AI decision logs and action traces
  - AI vs AI toggle

## Balance Notes

- Turret upgrade pricing is age-tuned via `baseWeapon.upgradeCost` in `src/game/config/gameConfig.json`.
- Mk II upgrade cost is auto-derived in resolver and is always more expensive than Mk I.
- Validation for turret levels/cost ordering is in `src/game/constants/ages.ts`.

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Automated Benchmark Runner

Run repeated AI-vs-AI simulations from terminal:

```bash
# default benchmark
npm run benchmark

# quick run
npm run benchmark:quick

# custom run
npm run benchmark -- --matches 200 --seed 42 --duration-sec 300 --start-age 2 --economy-scale 2.2 --verbose
```

Optional JSON output:

```bash
npm run benchmark -- --json --out benchmark-results.json
```

## Config and Core Files

- `src/game/config/gameConfig.json`: main per-age game balance config
- `src/game/config/resolveConfig.ts`: resolves JSON config into runtime definitions
- `src/game/scenes/BattleScene.ts`: core match loop, economy, queueing, base/turret combat
- `src/game/systems/AiSystem.ts`: AI tactical decision engine
- `src/ui/components/StartScreen.tsx`: start menu UI
- `src/ui/components/PauseMenu.tsx`: pause/settings menu UI
- `src/ui/components/DebugConsole.tsx`: dev-only debug panel

## Persistence

Saved in localStorage key:

- `age_of_war_progress_v1`

Currently stores:

- highest unlocked age
- shard currency
- meta upgrade levels
- selected start age (data preserved even while start-age menu is currently not exposed)

## GitHub Pages Deployment

This repo includes `.github/workflows/deploy-pages.yml`.

- Push to `main` triggers build + deploy to Pages.
- Workflow builds `dist/` and publishes it via GitHub Pages artifact actions.

Required repo setting:

1. Open `Settings -> Pages`.
2. Set `Source` to `GitHub Actions`.

## Base Path / Repo Name Handling

`vite.config.ts` uses:

- `base: process.env.VITE_BASE_PATH ?? '/'`

GitHub Actions sets:

- `VITE_BASE_PATH=/<repo-name>/`

Custom local build base path (PowerShell):

```bash
$env:VITE_BASE_PATH='/my-custom-path/'
npm run build
```

Phaser uses Vite base URL for assets via:

- `src/game/createPhaserGame.ts` (`loader.baseURL = import.meta.env.BASE_URL`)

## Audio Credits

- "Glorious Morning" by Waterflame
- Track file: `public/assets/music/91476_Glorious_morning.mp3`
