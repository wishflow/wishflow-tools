const highDensityVehicleAssets = new Set([
  'b_2x1_shack',
  'wagon',
  'wagon_turn',
  'horse_wagon',
  'horse_wagon_white',
  'horse_wagon_turn',
  'horse_wagon_turn_white',
]);

export function gameAssetRelativePath(assetName: string): string {
  const densityDirectory = highDensityVehicleAssets.has(assetName) ? 'hdpi/' : '';
  return `${densityDirectory}${assetName}.png`;
}

export function gameAssetLogicalSize(
  assetName: string,
  sourceSize: { width: number; height: number },
): { width: number; height: number } {
  if (assetName === 'b_2x1_shack') {
    return { width: sourceSize.width * (2 / 3), height: sourceSize.height * (2 / 3) };
  }
  return { ...sourceSize };
}
