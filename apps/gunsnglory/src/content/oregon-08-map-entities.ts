import type { GamblerScenarioDefinition, GamblerUnitType, ScenarioUnit } from '../game';
import { createCampaignTrainUnits } from './campaign-train-units';
import {
  createCampaignMapUnitPlacements,
  createHorizontalTrainPlacementGroups,
  type CampaignMapUnitTypeId,
} from './campaign-map-unit-placements';
import { createActiveFortKaboomUnit } from './fort-kaboom-unit-designs';
import {
  createActiveGunslinger,
  createActiveMexicanUnit,
  createNewMexicoMapUnits,
  createSleepingPyromaniac,
  createSleepingSalesman,
} from './new-mexico-unit-entities';
import map from './oregon-08.json';
import { createOregon08MapScene } from './oregon-08-scene';

const GAMBLER_PRIZE_TYPES = [1, 2, 3, 4, 5, 6, 35, 36] as const satisfies readonly GamblerUnitType[];
const TEMPLATE_CELL = Object.freeze({ x: 0, y: 0 });

export function assertOregon08GamblerCasinoPair(
  units: readonly ScenarioUnit[],
  decorations: readonly { asset: string }[],
): void {
  const gamblerCount = units.filter(({ type }) => type === 'gambler').length;
  const casinoCount = decorations.filter(({ asset }) => asset === 'b_3x2_casino').length;
  if (gamblerCount !== casinoCount) {
    throw new Error(`Colt City Gambler/Casino count mismatch: ${gamblerCount} Gambler(s), ${casinoCount} Casino(s)`);
  }
}

function createGamblerPrizeTemplate(unitType: GamblerUnitType): ScenarioUnit {
  switch (unitType) {
    case 1: return createActiveGunslinger(TEMPLATE_CELL, 90);
    case 2: return createActiveMexicanUnit(TEMPLATE_CELL, 90);
    case 3: return createActiveFortKaboomUnit('cannon', TEMPLATE_CELL, 90);
    case 4: return createActiveFortKaboomUnit('indian', TEMPLATE_CELL, 90);
    case 5: return createActiveFortKaboomUnit('sniper', TEMPLATE_CELL, 90);
    case 6: return createActiveFortKaboomUnit('grandpa', TEMPLATE_CELL, 90);
    case 35: return createSleepingPyromaniac(TEMPLATE_CELL, 90);
    case 36: return createSleepingSalesman(TEMPLATE_CELL, 90);
  }
}

/** Builds fresh hires, the original horizontal train, and the unlock-gated Gambler/Casino pair. */
export function createOregon08MapContent(
  isUnitUnlocked: (unitTypeId: CampaignMapUnitTypeId) => boolean,
): {
  units: ScenarioUnit[];
  scene: ReturnType<typeof createOregon08MapScene>;
  gambler?: GamblerScenarioDefinition;
} {
  const mapUnits = createNewMexicoMapUnits(map.originalTileGrid, isUnitUnlocked);
  const trainUnits = createHorizontalTrainPlacementGroups(map.originalTileGrid).flatMap((placements, index) => (
    createCampaignTrainUnits(placements, `oregon-08-train-${index + 1}`)
  ));
  const placements = createCampaignMapUnitPlacements(map.originalTileGrid);
  const gamblerUnlocked = isUnitUnlocked(9);
  const gamblerPlacement = placements.find(({ activity, unitTypeId }) => activity === 5 && unitTypeId === 9);
  const units = [...mapUnits, ...trainUnits]
    .sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);
  const scene = createOregon08MapScene(gamblerUnlocked && gamblerPlacement !== undefined);

  assertOregon08GamblerCasinoPair(units, scene.decorations ?? []);
  if (!gamblerUnlocked || !gamblerPlacement) return { units, scene };

  const unlockedPrizeUnitTypes = GAMBLER_PRIZE_TYPES.filter(isUnitUnlocked);
  const prizeTemplates = Object.fromEntries(unlockedPrizeUnitTypes.map((unitType) => (
    [unitType, createGamblerPrizeTemplate(unitType)]
  ))) as Partial<Readonly<Record<GamblerUnitType, ScenarioUnit>>>;

  return {
    units,
    scene,
    gambler: {
      unlockedPrizeUnitTypes,
      cooldownMs: 299_000,
      prizeTemplates,
    },
  };
}
