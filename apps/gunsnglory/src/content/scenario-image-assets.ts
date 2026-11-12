import type { ScenarioContent } from '../game';

/** Collects image assets referenced by scenario layers and map units for the startup preload list. */
export function collectScenarioImageAssetNames(scenarios: readonly ScenarioContent[]): string[] {
  return [...new Set(scenarios.flatMap((scenario) => [
    ...scenario.map.background.map(({ asset }) => asset),
    ...scenario.map.streets.map(({ asset }) => asset),
    ...(scenario.map.decorations ?? []).map(({ asset }) => asset),
    ...scenario.units.flatMap(({ asset, awakeAsset, positionAssetSequence }) => [
      asset,
      ...(awakeAsset ? [awakeAsset] : []),
      ...(positionAssetSequence?.assets ?? []),
    ]),
    ...(scenario.campaignUnitPool?.units ?? []).flatMap(({ template }) => template ? [
      template.asset,
      ...(template.awakeAsset ? [template.awakeAsset] : []),
      ...(template.positionAssetSequence?.assets ?? []),
    ] : []),
  ]))];
}
