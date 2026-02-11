# Age of War: Echoes

A single-player tactical lane warfare game inspired by the classic Age of War. Battle through 5 distinct ages, upgrade your base turrets, and command unique units to destroy the enemy base while defending your own.

## ✨ Features

- **5 Distinct Ages**: Progress through Hearth, Arcane, Beast, Runeforge, and Astral ages
- **Tactical Combat**: Melee and ranged units with special abilities (splash damage, pierce, debuffs, summons)
- **Queue-Based Spawning**: Strategic unit deployment with a 5-unit spawn queue
- **Base Turrets**: Upgrade your base turret through 3 levels per age (Mk I → Mk II → Mk III)
- **AI Opponent**: Dynamic AI that adapts tactics based on battlefield conditions
- **Config-Driven Balance**: All game balance in `gameConfig.json` for easy tuning
- **Progress Persistence**: Unlock higher ages and earn shards for meta-upgrades

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser and click **Play** to start!

## 🛠️ Tech Stack

- **Frontend**: Vite + React + TypeScript
- **Styling**: Tailwind CSS v4
- **Game Engine**: Phaser 3
- **Persistence**: localStorage

## 🎮 Gameplay

### Ages & Progression
- **5 Ages**: Hearth → Arcane → Beast → Runeforge → Astral
- Each age has unique units, turret upgrades, and economy bonuses
- **All games start at Hearth Age** (1st age) for balanced gameplay
- Advance to the next age during battle by spending gold

### Combat System
- **Melee Units**: Close-range fighters that engage enemies directly
- **Ranged Units**: Long-range attackers that can fire while advancing
- **Special Abilities**:
  - Splash damage (area of effect)
  - Pierce (hits multiple targets)
  - Debuffs (slow, weaken)
  - Execute effects (bonus damage to low-HP targets)
  - Summon abilities (deployable units)

### Economy
- **Player**: Starts with 75 gold, earns gold from killing enemy units (130% of enemy cost)
- **AI**: Passive income only
- No passive income for players - aggressive play is rewarded!

### Unit Spawning
- Buying a unit adds it to a spawn queue (max 5 units)
- Units spawn sequentially based on their spawn rate
- Plan ahead and manage your queue strategically

### Base Turrets
- **3 Upgrade Levels per Age**: Mk I → Mk II → Mk III
- Each upgrade increases damage, fire rate, range, and projectile speed
- Next age's base turret is stronger than previous age's max turret
- Turret range is capped to prevent cross-map sniping

## 🎛️ Controls

### Start Screen
- **Play**: Start a new battle
- **How to Play**: View game instructions
- **Audio**: Mute/unmute and adjust volume
- **Dev Mode** (development only): Toggle AI vs AI mode

### In-Game
- **Pause**: Click pause button or press `Esc`
- **Unit Spawning**: Click unit buttons to add to spawn queue
- **Age Advancement**: Click "Advance" button when you have enough gold
- **Turret Upgrade**: Click turret upgrade button to improve your base weapon

### Pause Menu
- **Resume**: Continue the battle (or click outside modal)
- **Audio Controls**: Adjust volume settings
- **Quit Game**: Return to start screen

## 🤖 AI System

The AI opponent features dynamic tactical decision-making:

- **Tactical Modes**: Defend, Stabilize, Tech, Pressure
- **Smart Decisions**: Chooses between advancing age, upgrading turret, or spawning units
- **Unit Composition**: Balances frontline and ranged units based on battlefield state

### Debug Console (Dev Mode Only)
- View AI decision logs and action traces
- Monitor age and turret status for both sides
- Toggle AI vs AI mode for testing
- Collapsible panel to keep viewport clean

## ⚙️ Configuration

All game balance is config-driven via `src/game/config/gameConfig.json`:

- **Unit Stats**: HP, damage, attack rate, speed, cost, cooldown
- **Special Effects**: Splash, pierce, debuffs, summons, execute effects
- **Age Advancement Costs**: Gold required to advance to next age
- **Turret Stats**: Damage, fire rate, range, projectile speed, upgrade costs
- **Economy**: Starting gold, gold bounties, base HP bonuses

### Key Files
- `src/game/config/gameConfig.json` - Main balance configuration
- `src/game/config/resolveConfig.ts` - Config resolver and validator
- `src/game/scenes/BattleScene.ts` - Core game loop and combat
- `src/game/systems/AiSystem.ts` - AI decision engine
- `src/game/constants/ages.ts` - Age and turret definitions

### Balance Notes
- Turret Mk II upgrade cost is auto-calculated (always > Mk I)
- Validation ensures proper turret upgrade progression
- Next age's base turret is enforced stronger than previous age's max turret

## 📦 Building & Development

### Development
```bash
npm install      # Install dependencies
npm run dev      # Start dev server (http://localhost:5173)
npm run lint     # Run ESLint
```

### Production Build
```bash
npm run build    # Build for production
npm run preview  # Preview production build
```

## 🧪 Automated Benchmark Runner

Run AI-vs-AI simulations for balance testing:

```bash
# Default benchmark (100 matches, 240s each)
npm run benchmark

# Quick benchmark (25 matches, 180s each)
npm run benchmark:quick

# Custom benchmark
npm run benchmark -- --matches 200 --seed 42 --duration-sec 300 --start-age 2 --economy-scale 2.2 --verbose

# Export results to JSON
npm run benchmark -- --json --out benchmark-results.json
```

### Benchmark Options
- `--matches <n>`: Number of matches (default: 100)
- `--seed <n>`: RNG seed for reproducibility (default: 12345)
- `--duration-sec <n>`: Max match duration (default: 240)
- `--start-age <n>`: Starting age 1-5 (default: 1 = Hearth)
- `--economy-scale <n>`: Multiplier for gold/income (default: 2.0)
- `--verbose`: Print each match summary
- `--json`: Output JSON only
- `--out <path>`: Write JSON to file

## 💾 Progress Persistence

Game progress is saved to browser localStorage (`age_of_war_progress_v1`):

- **Highest Age Unlocked**: Track which ages you've reached
- **Shards**: Currency earned from victories (3) and defeats (1)
- **Meta Upgrades**: Permanent upgrades using shards (income level, base HP level)

**Note**: All new games start at Hearth Age (1st age) regardless of progress, ensuring balanced gameplay for every match.

## 🌐 GitHub Pages Deployment

This repository includes automated deployment to GitHub Pages via `.github/workflows/deploy-pages.yml`.

### Setup
1. Go to repository **Settings → Pages**
2. Set **Source** to **GitHub Actions**
3. Push to `main` branch to trigger deployment

### Base Path Configuration

The build uses environment variables for deployment paths:

```typescript
// vite.config.ts
base: process.env.VITE_BASE_PATH ?? '/'
```

GitHub Actions automatically sets: `VITE_BASE_PATH=/<repo-name>/`

For custom builds:
```bash
# Bash/Linux/Mac
export VITE_BASE_PATH='/my-custom-path/'
npm run build

# PowerShell
$env:VITE_BASE_PATH='/my-custom-path/'
npm run build
```

Phaser asset loading uses the Vite base URL automatically via:
```typescript
// src/game/createPhaserGame.ts
loader.baseURL = import.meta.env.BASE_URL
```

## 🎵 Audio Credits

- **"Glorious Morning"** by Waterflame
- Track file: `public/assets/music/91476_Glorious_morning.mp3`

## 📝 License

This project is open source. See the repository for license details.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs via GitHub Issues
- Suggest new features or balance changes
- Submit pull requests
- Test and provide feedback on gameplay

---

Made with ❤️ using React, Phaser 3, and TypeScript
