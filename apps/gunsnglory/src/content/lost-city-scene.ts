import type { MapDecoration } from '../game';
import { cowGulchDecorationCodes } from './cow-gulch';
import map from './new-mexico-10.json';

const stakeCollisionBox = Object.freeze({ x: 1920, y: 2612, width: 3840, height: 2534 });
const fortCollisionBox = Object.freeze({ x: -9408, y: -9600, width: 18048, height: 7680 });

const lostCityDecorationCodes: Readonly<Record<number, Omit<MapDecoration, 'cell'>>> = Object.freeze({
  ...cowGulchDecorationCodes,
  72: { asset: 'b_1x1_stake', collisionBoxFine: stakeCollisionBox },
  75: { asset: 'b_1x1_watertower' },
  112: { asset: 'b_3x2_saloon', anchorOffsetY: -0.3 },
  113: { asset: 'b_3x2_fort', anchorOffsetY: -0.3, collisionBoxFine: fortCollisionBox },
  114: { asset: 'b_2x1_tipi', anchorOffsetX: -0.5, anchorOffsetY: -0.3 },
  117: { asset: 'b_1x1_tipi_small' },
});

/** Builds Lost City scenery and recruit buildings from the original APK TDM. */
export function createLostCityMapScene() {
  const decorations = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
    const decoration = lostCityDecorationCodes[code];
    return decoration ? [{ ...decoration, cell: { x, y } }] : [];
  }));

  return { ...map.map, decorations };
}
