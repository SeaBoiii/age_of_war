import { useEffect, useRef, useState } from 'react';
import { AGE_DEFINITIONS } from '../../game/constants/ages';
import { gameBridge } from '../../state/gameBridge';
import type { GameUiState } from '../../state/types';
import { BotIcon, ChevronDownIcon, ChevronUpIcon } from './UiIcons';

interface DebugConsoleProps {
  state: GameUiState;
}

export function DebugConsole({ state }: DebugConsoleProps) {
  const [collapsed, setCollapsed] = useState(false);
  const logsRef = useRef<HTMLDivElement | null>(null);

  const playerAge = AGE_DEFINITIONS[state.playerAgeIndex]?.label ?? `Age ${state.playerAgeIndex + 1}`;
  const aiAge = AGE_DEFINITIONS[state.aiAgeIndex]?.label ?? `Age ${state.aiAgeIndex + 1}`;
  const latestMessage = state.debugLogs[state.debugLogs.length - 1] ?? 'No debug events yet.';

  useEffect(() => {
    if (!logsRef.current || collapsed) {
      return;
    }

    logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [state.debugLogs.length, collapsed]);

  return (
    <div className="ui-soft-panel mt-3 rounded-lg p-2 text-[11px] text-cyan-100 shadow-lg">
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-cyan-300/20 pb-2">
        <span className="inline-flex items-center gap-1.5 font-semibold tracking-wide text-cyan-200">
          <BotIcon className="h-3.5 w-3.5" />
          DEV DEBUG CONSOLE
        </span>

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

          <button
            type="button"
            className="inline-flex items-center gap-1 rounded border border-cyan-300/35 bg-slate-800/70 px-2 py-0.5 text-[10px] text-cyan-100 transition hover:bg-slate-700/80"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? 'Expand debug console' : 'Collapse debug console'}
            title={collapsed ? 'Expand debug console' : 'Collapse debug console'}
          >
            {collapsed ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronUpIcon className="h-3.5 w-3.5" />}
            {collapsed ? 'v' : '^'}
          </button>
        </div>
      </div>

      <div className="mb-2 rounded border border-cyan-300/15 bg-slate-900/70 px-2 py-1 text-[10px] text-cyan-100">
        Latest: {latestMessage}
      </div>

      {!collapsed && (
        <>
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

          <div
            ref={logsRef}
            className="max-h-40 overflow-y-auto rounded border border-cyan-300/15 bg-slate-900/70 p-2 font-mono text-[10px] leading-relaxed"
          >
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
        </>
      )}
    </div>
  );
}
