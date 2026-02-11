import { AGE_DEFINITIONS } from '../../game/constants/ages';
import { gameBridge } from '../../state/gameBridge';
import type { GameUiState } from '../../state/types';

interface DebugConsoleProps {
  state: GameUiState;
}

export function DebugConsole({ state }: DebugConsoleProps) {
  const playerAge = AGE_DEFINITIONS[state.playerAgeIndex]?.label ?? `Age ${state.playerAgeIndex + 1}`;
  const aiAge = AGE_DEFINITIONS[state.aiAgeIndex]?.label ?? `Age ${state.aiAgeIndex + 1}`;

  return (
    <div className="pointer-events-auto absolute bottom-3 right-3 z-30 w-[min(460px,calc(100%-1.5rem))] rounded-lg border border-cyan-300/35 bg-slate-950/80 p-2 text-[11px] text-cyan-100 shadow-lg">
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-cyan-300/20 pb-1">
        <span className="font-semibold tracking-wide text-cyan-200">DEV DEBUG CONSOLE</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`rounded border px-2 py-0.5 text-[10px] transition ${
              state.debugAiVsAi
                ? 'border-emerald-300/45 bg-emerald-400/20 text-emerald-100'
                : 'border-cyan-300/35 bg-slate-800/70 text-cyan-100 hover:bg-slate-700/80'
            }`}
            onClick={() =>
              gameBridge.dispatch({
                type: 'set_debug_ai_vs_ai',
                value: !state.debugAiVsAi,
              })
            }
          >
            AI vs AI: {state.debugAiVsAi ? 'On' : 'Off'}
          </button>
          <span className="text-cyan-300/90">logs: {state.debugLogs.length}</span>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-2 gap-1 text-[10px] text-cyan-200">
        <div>Player Age: {playerAge}</div>
        <div>AI Age: {aiAge}</div>
        <div>
          Player Turret: L{state.playerTurretLevel + 1}/{state.playerTurretMaxLevel + 1}
        </div>
        <div>
          AI Turret: L{state.aiTurretLevel + 1}/{state.aiTurretMaxLevel + 1}
        </div>
        <div className="col-span-2 text-cyan-300/90">
          Mode: {state.debugAiVsAi ? 'AI vs AI (dev)' : 'Player vs AI'}
        </div>
      </div>

      <div className="mb-2 rounded border border-cyan-300/15 bg-slate-900/70 px-2 py-1 text-[10px] text-cyan-100">
        Message: {state.battleMessage}
      </div>

      <div className="max-h-40 overflow-y-auto rounded border border-cyan-300/15 bg-slate-900/70 p-2 font-mono text-[10px] leading-relaxed">
        {state.debugLogs.length === 0 ? (
          <div className="text-cyan-300/70">No debug events yet.</div>
        ) : (
          state.debugLogs.map((entry, index) => (
            <div key={`${index}-${entry}`} className="whitespace-pre-wrap break-words">
              {entry}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
