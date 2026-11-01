const highDensityVehicleAssets = new Set([
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
