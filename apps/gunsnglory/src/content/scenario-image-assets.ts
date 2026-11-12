import type { ScenarioContent } from '../game';

/** Collects image assets referenced by scenario layers and map units for the startup preload list. */
export function collectScenarioImageAssetNames(scenarios: readonly ScenarioContent[]): string[] {
  return [...new Set(scenarios.flatMap((scenario) => [
    ...scenario.map.background.map(({ asset }) => asset),
    ...scenario.map.streets.map(({ asset }) => asset),
    ...(scenario.map.decorations ?? []).map(({ asset }) => asset),
    ...scenario.units.flatMap(({ asset, positionAssetSequence }) => [
      asset,
      ...(positionAssetSequence?.assets ?? []),
    ]),
  ]))];
}
