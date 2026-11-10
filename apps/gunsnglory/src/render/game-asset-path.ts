const highDensityMapAtlases = new Set([
  'tiles_water',
  'tiles_waterside',
  'tiles_waterside_var',
  'tiles_desert',
  'tiles_desert_var',
  'tiles_canyon',
  'tiles_canyon_floor',
  'tiles_canyon_floor_var',
  'tiles_canyon_wall_var',
  'tiles_shadow',
  'tiles_shadow_var',
  'tiles_path',
  'tiles_path_var',
  'tiles_bridge_verti',
  'tiles_bridge_hori',
  'tiles_bridge_pier_left',
  'tiles_bridge_pier_right',
  'tiles_railway_hori',
  'tiles_railway_verti',
]);

const highDensityMapDecorations = new Set([
  'b_3x2_fort',
  'b_3x2_saloon',
  'b_3x2_casino',
  'b_2x1_tipi',
  'b_2x1_shack',
  'b_1x1_windmill',
  'b_1x1_stake',
  'b_1x1_watertower',
  'b_1x1_tipi_small',
  'lok_hori_1of2',
  'lok_hori_2of2',
  'lok_wagon_hori',
  'lok_verti_1of2',
  'lok_verti_2of2',
  'lok_wagon_verti',
  'tiles_railway_buffers_hori_left',
  'tiles_railway_buffers_hori_right',
  'tiles_railway_buffers_verti_up',
  'tiles_railway_buffers_verti_down',
  'e_1x1_bush',
  'e_1x1_cactus_a',
  'e_1x1_cactus_b',
  'e_1x1_rocks_a',
  'e_1x1_rocks_b',
  'e_1x1_rocks_water',
  'e_1x1_tree',
  'e_1x2_bones',
]);

const highDensityVehicleAssets = new Set([
  'wagon',
  'wagon_turn',
  'stagecoach',
  'stagecoach_turn',
  'goldtransport',
  'goldtransport_turn',
  'horse_wagon',
  'horse_wagon_white',
  'horse_wagon_turn',
  'horse_wagon_turn_white',
]);

const highDensityMapFrameAssets = new Set(['gng_frame']);
const highDensityGamblerAssets = new Set(['card_back', 'card_front', 'card_symbols', 'card_numbers']);

export function gameAssetRelativePath(assetName: string): string {
  const densityDirectory = highDensityMapAtlases.has(assetName)
    || highDensityMapDecorations.has(assetName)
    || highDensityVehicleAssets.has(assetName)
    || highDensityMapFrameAssets.has(assetName)
    || highDensityGamblerAssets.has(assetName)
    ? 'hdpi/'
    : '';
  return `${densityDirectory}${assetName}.png`;
}

/** Source rectangles for map tile atlases are authored in 32px mdpi coordinates. */
export function gameAssetSourceScale(assetName: string): number {
  return highDensityMapAtlases.has(assetName) ? 1.5 : 1;
}

export function gameAssetLogicalSize(
  assetName: string,
  sourceSize: { width: number; height: number },
): { width: number; height: number } {
  if (highDensityMapDecorations.has(assetName)) {
    return { width: sourceSize.width * (2 / 3), height: sourceSize.height * (2 / 3) };
  }
  return { ...sourceSize };
}
