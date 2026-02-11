import { GameShell } from './ui/components/GameShell';
import { CrestIcon, SparkIcon } from './ui/components/UiIcons';

function App() {
  return (
    <div className="min-h-screen px-3 py-4 sm:px-5 sm:py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="ui-glass-panel ui-pop relative overflow-hidden rounded-2xl p-4 sm:p-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/8 to-transparent" />
          <div className="pointer-events-none absolute -right-6 top-0 h-24 w-24 rounded-full bg-sky-300/15 blur-2xl" />
          <div className="pointer-events-none absolute -left-5 bottom-0 h-16 w-16 rounded-full bg-amber-300/15 blur-2xl" />

          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="ui-shadow-warm rounded-xl border border-amber-200/35 bg-amber-100/10 p-2 text-amber-100">
                <CrestIcon className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div>
                <h1 className="ui-title text-2xl text-amber-200 sm:text-3xl">Age of War: Echoes</h1>
                <p className="mt-0.5 text-sm text-slate-300 sm:text-base">
                  Tactical lane warfare with age progression, turret tech, and queue-based spawns.
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <span className="ui-tag inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold">
                <SparkIcon className="h-3.5 w-3.5" />
                Config-Driven Balance
              </span>
              <span className="ui-tag inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold">
                React + Phaser
              </span>
            </div>
          </div>
        </header>

        <GameShell />
      </div>
    </div>
  );
}

export default App;
