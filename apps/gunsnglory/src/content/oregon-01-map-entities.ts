import type { CampaignMapUnitPlacement, CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import { createCampaignMapUnitPlacements } from './campaign-map-unit-placements';
import { createActiveFortKaboomUnit } from './fort-kaboom-unit-designs';
import map from './oregon-01.json';
import { createOregon01MapScene } from './oregon-01-scene';
import {
  createActiveGunslinger,
  createActiveMexicanUnit,
  createGambler,
  createSleepingPyromaniac,
  createSleepingSalesman,
} from './new-mexico-unit-entities';
import type { GamblerScenarioDefinition, GamblerUnitType, MapDecoration, ScenarioUnit } from '../game';

const GAMBLER_PRIZE_TYPES = [1, 2, 3, 4, 5, 6, 35, 36] as const satisfies readonly GamblerUnitType[];
const TEMPLATE_CELL = Object.freeze({ x: 0, y: 0 });

export function assertOregon01GamblerCasinoPair(
  units: readonly ScenarioUnit[],
  decorations: readonly MapDecoration[],
): void {
  const gamblerCount = units.filter(({ type }) => type === 'gambler').length;
  const casinoCount = decorations.filter(({ asset }) => asset === 'b_3x2_casino').length;
  if (gamblerCount !== casinoCount) {
    throw new Error(`Eastwood Forest Gambler/Casino count mismatch: ${gamblerCount} Gambler(s), ${casinoCount} Casino(s)`);
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

/** Builds Eastwood's fresh hires and conditional Gambler/Casino pair from one saved-unlock view. */
export function createOregon01MapContent(
  isUnitUnlocked: (unitTypeId: CampaignMapUnitTypeId) => boolean,
): {
  units: ScenarioUnit[];
  scene: ReturnType<typeof createOregon01MapScene>;
  gambler?: GamblerScenarioDefinition;
} {
  const gamblerUnlocked = isUnitUnlocked(9);
  const activePlacements = createCampaignMapUnitPlacements(map.originalTileGrid)
    .filter((placement): placement is CampaignMapUnitPlacement & { activity: 5; unitTypeId: 1 | 2 } => (
      placement.activity === 5 && (placement.unitTypeId === 1 || placement.unitTypeId === 2)
    ));
  const activeCounters = new Map<1 | 2, number>();
  const units = activePlacements.map(({ unitTypeId, cell }) => {
    const index = (activeCounters.get(unitTypeId) ?? 0) + 1;
    activeCounters.set(unitTypeId, index);
    return unitTypeId === 1
      ? createActiveGunslinger(cell, index)
      : createActiveMexicanUnit(cell, index);
  });
  const gamblerPlacement = createCampaignMapUnitPlacements(map.originalTileGrid)
    .find(({ activity, unitTypeId }) => activity === 5 && unitTypeId === 9);
  if (gamblerUnlocked && gamblerPlacement) units.push(createGambler(gamblerPlacement.cell));

  const scene = createOregon01MapScene(gamblerUnlocked && gamblerPlacement !== undefined);
  assertOregon01GamblerCasinoPair(units, scene.decorations ?? []);

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
