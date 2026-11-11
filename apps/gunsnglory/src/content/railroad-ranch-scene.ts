import type { MapDecoration } from '../game';
import { cowGulchDecorationCodes } from './cow-gulch';
import map from './new-mexico-09.json';

const stakeCollisionBox = Object.freeze({ x: 1920, y: 2612, width: 3840, height: 2534 });

const railroadRanchDecorationCodes: Readonly<Record<number, Omit<MapDecoration, 'cell'>>> = Object.freeze({
  ...cowGulchDecorationCodes,
  72: { asset: 'b_1x1_stake', collisionBoxFine: stakeCollisionBox },
  75: { asset: 'b_1x1_watertower' },
  117: { asset: 'b_1x1_tipi_small' },
});

/** Builds Railroad Ranch scenery from its original APK TDM object markers. */
export function createRailroadRanchMapScene() {
  const decorations = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
    const decoration = railroadRanchDecorationCodes[code];
    return decoration ? [{ ...decoration, cell: { x, y } }] : [];
  }));

  return { ...map.map, decorations };
}
