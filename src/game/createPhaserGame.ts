import Phaser from 'phaser';
import { WORLD_HEIGHT, WORLD_WIDTH } from './constants/balance';
import { BattleScene } from './scenes/BattleScene';
import { GameBridge } from '../state/gameBridge';

export function createPhaserGame(parent: HTMLDivElement, bridge: GameBridge): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#0f172a',
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    scene: [new BattleScene(bridge)],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
    },
    loader: {
      baseURL: import.meta.env.BASE_URL,
    },
    render: {
      antialias: true,
    },
  });
}
