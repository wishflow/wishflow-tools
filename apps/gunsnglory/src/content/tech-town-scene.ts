import map from './new-mexico-04.json';
import type { MapDecoration } from '../game';

const techTownDecorationCodes: Readonly<Record<number, Omit<MapDecoration, 'cell'>>> = Object.freeze({
  68: { asset: 'e_1x1_cactus_a' },
  69: { asset: 'e_1x1_rocks_a' },
  70: { asset: 'e_1x1_rocks_b' },
  71: { asset: 'e_1x1_tree' },
  72: { asset: 'b_1x1_stake' },
  73: { asset: 'e_1x1_cactus_b' },
  74: { asset: 'b_1x1_windmill' },
  75: { asset: 'b_1x1_watertower' },
  76: { asset: 'e_1x1_bush' },
  77: { asset: 'e_1x2_bones' },
  86: { asset: 'tiles_railway_buffers_hori_left' },
  87: { asset: 'tiles_railway_buffers_hori_right' },
  112: { asset: 'b_3x2_saloon', anchorOffsetY: -0.3 },
  113: { asset: 'b_3x2_fort', anchorOffsetY: -0.3 },
  114: { asset: 'b_2x1_tipi', anchorOffsetX: -0.5, anchorOffsetY: -0.3 },
  116: { asset: 'b_2x1_shack', anchorOffsetX: -0.5 },
  117: { asset: 'b_1x1_tipi_small' },
  126: { asset: 'e_1x1_rocks_water' },
});

const casinoDecoration: Omit<MapDecoration, 'cell'> = Object.freeze({
  asset: 'b_3x2_casino',
  anchorOffsetY: -0.3,
});

const trainMarkerCodes = [83, 83, 84, 84, 84] as const;
const trainAssets = [
  'lok_hori_1of2',
  'lok_hori_2of2',
  'lok_wagon_hori',
  'lok_wagon_hori',
  'lok_wagon_hori',
] as const;

function techTownTrainDecorationsByCell(): ReadonlyMap<string, Omit<MapDecoration, 'cell'>> {
  const starts = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === trainMarkerCodes[0]
      && row.slice(x, x + trainMarkerCodes.length).every((marker, offset) => marker === trainMarkerCodes[offset])
      ? [{ x, y }]
      : []
  )));
  const markerCount = map.originalTileGrid.reduce(
    (count, row) => count + row.filter((code) => trainMarkerCodes.includes(code as typeof trainMarkerCodes[number])).length,
    0,
  );
  if (starts.length !== 1 || markerCount !== trainMarkerCodes.length) {
    throw new Error('Tech Town horizontal train TDM markers do not match the original five-part sequence');
  }

  const { x: startX, y } = starts[0]!;
  return new Map(trainAssets.map((asset, index) => [
    `${startX + index},${y}`,
    { asset },
  ]));
}

export function createTechTownMapScene(options: { gamblerUnlocked?: boolean } = {}) {
  const trainDecorations = techTownTrainDecorationsByCell();
  // Code 132 is the conditional Gambler unit and belongs to the stage's unit model.
  // Codes 105, 130 and 131 create units; they are not static scene decorations.
  const decorations = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
    const decoration = trainDecorations.get(`${x},${y}`)
      ?? (code === 150
        ? options.gamblerUnlocked ? casinoDecoration : undefined
        : techTownDecorationCodes[code]);
    return decoration ? [{ ...decoration, cell: { x, y } }] : [];
  }));

  return {
    ...map.map,
    decorations,
  };
}
