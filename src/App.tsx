import { GameShell } from './ui/components/GameShell';

function App() {
  return (
    <div className="min-h-screen px-3 py-4 sm:px-5 sm:py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="rounded-xl border border-white/15 bg-slate-900/60 p-4 backdrop-blur">
          <h1 className="font-serif text-2xl text-amber-200 sm:text-3xl">Age of War: Echoes</h1>
          <p className="mt-1 text-sm text-slate-300 sm:text-base">
            Single-player 1-lane strategy built with React, Tailwind v4, and Phaser 3.
          </p>
        </header>

        <GameShell />
      </div>
    </div>
  );
}

export default App;
