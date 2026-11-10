import type { MapDecoration } from '../game';
import { cowGulchDecorationCodes } from './cow-gulch';
import map from './new-mexico-07.json';

const fortCollisionBox = Object.freeze({ x: -9408, y: -9600, width: 18048, height: 7680 });

const luckyLakeDecorationCodes: Readonly<Record<number, Omit<MapDecoration, 'cell'>>> = Object.freeze({
  ...cowGulchDecorationCodes,
  75: { asset: 'b_1x1_watertower' },
  94: { asset: 'tiles_railway_buffers_verti_up' },
  95: { asset: 'tiles_railway_buffers_verti_down' },
  112: { asset: 'b_3x2_saloon', anchorOffsetY: -0.3 },
  113: { asset: 'b_3x2_fort', anchorOffsetY: -0.3, collisionBoxFine: fortCollisionBox },
  114: { asset: 'b_2x1_tipi', anchorOffsetX: -0.5, anchorOffsetY: -0.3 },
  117: { asset: 'b_1x1_tipi_small' },
});

/** Builds Lucky Lake scenery and recruitment buildings from the original APK TDM codes. */
export function createLuckyLakeMapScene() {
  const decorations = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
    const decoration = luckyLakeDecorationCodes[code];
    return decoration ? [{ ...decoration, cell: { x, y } }] : [];
  }));

  return { ...map.map, decorations };
}
