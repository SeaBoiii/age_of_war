# Age of War: Echoes

Single-player 1-lane tug-of-war strategy game inspired by Age of War.

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (UI)
- Phaser 3 (game loop + rendering)
- localStorage persistence (tech unlocks + meta upgrades)

## Features (MVP)

- Player base (left) vs AI base (right) with HP and age-scaled base turrets, including turret upgrades per age.
- Passive gold income + kill rewards.
- Unit spawning with costs and per-unit cooldowns.
- Melee and ranged combat with projectiles and splash/pierce abilities.
- 5 ages with unique rosters and configurable per-age economy/turret settings:
  - Hearth: Swordsman, Archer, Spearman
  - Arcane: Shield Acolyte, Battlemage, Hexer
  - Beast: Wolf Rider, Treant, Wyvern
  - Runeforge: Golem, Rune Gunner, Turret Caster
  - Astral: Portal Knight, Starcaller, Void Reaper
- AI using the same economy/spawn/age rules with defensive and mix heuristics.
- Start screen (Play + How to Play + meta upgrades + start-age selection).
- End screen (Win/Lose + Restart/Menu).
- Looping background music with in-game sound toggle.
- Responsive layout for desktop/mobile.

## Audio Credits

- "Glorious Morning" by Waterflame
- Track file: `public/assets/music/91476_Glorious_morning.mp3`

## Run Locally

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## GitHub Pages Deployment

The repo includes `.github/workflows/deploy-pages.yml`.

- Push to `main` triggers build + deploy to Pages.
- Workflow builds `dist/` and publishes it via GitHub Pages artifact actions.

### Required GitHub repo settings

1. Open repo `Settings -> Pages`.
2. Set `Source` to `GitHub Actions`.

## Base Path / Repo Name Handling

Vite reads base path from `VITE_BASE_PATH`:

- `vite.config.ts` uses:
  - `base: process.env.VITE_BASE_PATH ?? '/'`
- GitHub Actions sets:
  - `VITE_BASE_PATH=/<repo-name>/`

### If repo name changes

No code change is needed in workflow because it uses `${{ github.event.repository.name }}` automatically.

### If you want a custom base path manually

```bash
# PowerShell
$env:VITE_BASE_PATH='/my-custom-path/'
npm run build
```

## Phaser Asset Base URL

Phaser is configured with Vite base URL:

- `src/game/createPhaserGame.ts` uses `loader.baseURL = import.meta.env.BASE_URL`

This keeps local asset loading compatible with GitHub Pages subpaths.

## Project Structure

```text
src/
  game/
    constants/
    scenes/
    systems/
  state/
  ui/
    components/
    hooks/
```

## Extending Units

Unit definitions are data-driven in:

- `src/game/constants/units.ts`

Add/update units there (cost/stats/traits/projectile), then include unit IDs in each age config in `src/game/constants/ages.ts`.

## Persistence

Saved in localStorage key:

- `age_of_war_progress_v1`

Stores:

- highest unlocked age
- shard currency
- meta upgrades (income/base HP)
- selected start age

## Acceptance Checklist

- [x] Starts locally (`npm install`, `npm run dev`)
- [x] Gameplay loop works with win/lose
- [x] Builds (`npm run build`)
- [x] GitHub Pages workflow included
- [x] Base paths handled for Pages
- [x] Responsive UI
- [x] No remote assets/services required


