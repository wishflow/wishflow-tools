import map from './new-mexico-04.json';
import { createTechTownMapScene } from './tech-town-scene';
import { techTownRouteDefinitions } from './tech-town-routes';
import { createTechTownTrainUnits } from './tech-town-units';
import type { ScenarioContent } from '../game';

/** Isolated developer fixture for inspecting the original train and its Gatling wagons. */
export function createTechTownTrainTestContent(): ScenarioContent {
  const route = techTownRouteDefinitions[2]!;
  return {
    id: 'tech-town-train-sample',
    contentVersion: 'gng-free-1.8.6-tech-town-gatling-test-v3',
    title: { en: 'Tech Town · Train and Gatling test', zh: 'Tech Town · 列车与加特林测试' },
    map: createTechTownMapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createTechTownTrainUnits(),
    maxUpgrades: 3,
    recruitableUnits: [],
    previewWave: {
      number: 1,
      initialLives: 10,
      initialCash: 350,
      spawn: route.spawn,
      routes: [route],
      baseEnemySpeed: 1200,
      speedMultiplierMin: 100,
      speedMultiplierCount: 1,
      escapePenalty: 1,
      redirects: route.redirects,
      exit: route.exit,
      enemy: {
        hitPoints: 1_000_000,
        cashReward: 0,
        penetration: { light: 100, fire: 100, heavy: 100, poison: 100 },
      },
    },
  };
}

export const techTownTrainTestContent = createTechTownTrainTestContent();
