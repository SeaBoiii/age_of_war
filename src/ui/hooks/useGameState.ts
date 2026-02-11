import { useSyncExternalStore } from 'react';
import { gameBridge } from '../../state/gameBridge';
import type { GameUiState } from '../../state/types';

export function useGameState(): GameUiState {
  return useSyncExternalStore(
    (listener) => gameBridge.subscribe(listener),
    () => gameBridge.getState(),
  );
}
