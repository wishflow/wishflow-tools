import type { GamblerScenarioDefinition, GamblerUnitType, ScenarioUnit } from '../game';
import { createCampaignMapUnitPlacements, type CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import {
  createActiveGunslinger,
  createActiveMexicanUnit,
  createNewMexicoMapUnits,
  createSleepingPyromaniac,
  createSleepingSalesman,
} from './new-mexico-unit-entities';
import { createActiveFortKaboomUnit } from './fort-kaboom-unit-designs';
import map from './oregon-11.json';
import { createOregon11MapScene } from './oregon-11-scene';

const GAMBLER_PRIZE_TYPES = [1, 2, 3, 4, 5, 6, 35, 36] as const satisfies readonly GamblerUnitType[];
const TEMPLATE_CELL = Object.freeze({ x: 0, y: 0 });

export function assertOregon11GamblerCasinoPair(
  units: readonly ScenarioUnit[],
  decorations: readonly { asset: string }[],
): void {
  const gamblerCount = units.filter(({ type }) => type === 'gambler').length;
  const casinoCount = decorations.filter(({ asset }) => asset === 'b_3x2_casino').length;
  if (gamblerCount !== casinoCount) {
    throw new Error(`Loot Lakes Gambler/Casino count mismatch: ${gamblerCount} Gambler(s), ${casinoCount} Casino(s)`);
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

/** Builds Loot Lakes' fresh TDM units and the unlock-gated Gambler/Casino pair. */
export function createOregon11MapContent(
  isUnitUnlocked: (unitTypeId: CampaignMapUnitTypeId) => boolean,
): {
  units: ScenarioUnit[];
  scene: ReturnType<typeof createOregon11MapScene>;
  gambler?: GamblerScenarioDefinition;
} {
  const placements = createCampaignMapUnitPlacements(map.originalTileGrid);
  const gamblerPlacement = placements.find(({ activity, unitTypeId }) => activity === 5 && unitTypeId === 9);
  const gamblerUnlocked = isUnitUnlocked(9) && gamblerPlacement !== undefined;
  const units = createNewMexicoMapUnits(map.originalTileGrid, isUnitUnlocked);
  const scene = createOregon11MapScene(gamblerUnlocked);

  assertOregon11GamblerCasinoPair(units, scene.decorations ?? []);
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
