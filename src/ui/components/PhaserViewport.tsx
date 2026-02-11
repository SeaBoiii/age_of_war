import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import { createPhaserGame } from '../../game/createPhaserGame';
import { gameBridge } from '../../state/gameBridge';

export function PhaserViewport() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) {
      return;
    }

    gameRef.current = createPhaserGame(containerRef.current, gameBridge);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}
