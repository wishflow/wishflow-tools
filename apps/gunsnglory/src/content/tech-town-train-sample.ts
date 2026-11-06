import map from './new-mexico-04.json';
import { createTechTownMapScene } from './tech-town-scene';
import { createTechTownTrainUnits } from './tech-town-units';
import type { ScenarioContent } from '../game';

/** Isolated developer fixture for inspecting and moving the original map04 train. */
export function createTechTownTrainTestContent(): ScenarioContent {
  return {
    id: 'tech-town-train-sample',
    contentVersion: 'gng-free-1.8.6-tech-town-train-test-v1',
    title: { en: 'Tech Town · Train test', zh: 'Tech Town · 列车测试' },
    map: createTechTownMapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createTechTownTrainUnits(),
    maxUpgrades: 0,
    recruitableUnits: [],
  };
}

export const techTownTrainTestContent = createTechTownTrainTestContent();
