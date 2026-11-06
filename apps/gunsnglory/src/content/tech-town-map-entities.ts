import type { MapDecoration, ScenarioUnit } from '../game';
import { createTechTownMapScene } from './tech-town-scene';
import { createTechTownBaseUnits, createTechTownTrainUnits } from './tech-town-units';
import type { TechTownUnitTypeId } from './tech-town-map-units';

type TechTownScene = ReturnType<typeof createTechTownMapScene>;

/** Fails fast if an APK Gambler map object has no matching Casino. */
export function assertTechTownGamblerCasinoPair(
  units: readonly ScenarioUnit[],
  decorations: readonly MapDecoration[],
): void {
  const gamblerCount = units.filter(({ type }) => type === 'gambler').length;
  const casinoCount = decorations.filter(({ asset }) => asset === 'b_3x2_casino').length;
  if (gamblerCount !== casinoCount) {
    throw new Error(`Tech Town Gambler/Casino count mismatch: ${gamblerCount} Gambler(s), ${casinoCount} Casino(s)`);
  }
}

/** Builds both sides of the conditional map entity pair from one unlock snapshot. */
export function createTechTownMapContent(
  isUnitUnlocked: (unitTypeId: TechTownUnitTypeId) => boolean,
): { units: ScenarioUnit[]; scene: TechTownScene } {
  const gamblerUnlocked = isUnitUnlocked(9);
  const units = [
    ...createTechTownBaseUnits((unitTypeId) => (
      unitTypeId === 9 ? gamblerUnlocked : isUnitUnlocked(unitTypeId)
    )),
    ...createTechTownTrainUnits(),
  ];
  const scene = createTechTownMapScene({ gamblerUnlocked });
  assertTechTownGamblerCasinoPair(units, scene.decorations ?? []);
  return { units, scene };
}
