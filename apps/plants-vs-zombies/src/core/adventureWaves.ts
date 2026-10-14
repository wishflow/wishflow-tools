import { createRandom } from './random';
import type { AdventureWavePlan, WaveDefinition, WaveSpawn, ZombieDefinition } from './types';

const MAX_ZOMBIES_IN_WAVE = 50;

function effectiveWaveCount(plan: AdventureWavePlan, firstPlaythrough: boolean): number {
  if (plan.specialModeId === 'whack-a-zombie') return 8;
  if (plan.levelNumber === 10 || plan.levelNumber === 20 || plan.levelNumber === 30) return plan.waveCount;
  const waveCount = plan.waveCount;
  if (firstPlaythrough) return waveCount;
  return waveCount < 10 ? 20 : waveCount + 10;
}

function isFlagWave(plan: AdventureWavePlan, waveIndex: number, waveCount: number, firstPlaythrough: boolean): boolean {
  if (firstPlaythrough && plan.levelNumber === 1) return false;
  const wavesPerFlag = firstPlaythrough && waveCount < 10 ? waveCount : 10;
  return waveIndex % wavesPerFlag === wavesPerFlag - 1;
}

function basePointBudget(plan: AdventureWavePlan, waveIndex: number, firstPlaythrough: boolean): number {
  return !firstPlaythrough && plan.levelNumber !== 5
    ? Math.floor(waveIndex * 2 / 5) + 1
    : Math.floor(waveIndex / 3) + 1;
}

function waveMultiplier(plan: AdventureWavePlan): number {
  return plan.wavePointMultiplier ?? 1;
}

function append(spawns: WaveSpawn[], typeId: string, count = 1, rows?: [number, number]): void {
  const existing = spawns.find((spawn) => spawn.typeId === typeId && spawn.rowRange?.[0] === rows?.[0] && spawn.rowRange?.[1] === rows?.[1]);
  if (existing) existing.count = (existing.count ?? 1) + count;
  else spawns.push({ typeId, count, rowRange: rows });
}

function pickZombie(
  eligibleIds: string[],
  remainingPoints: number,
  waveNumber: number,
  definitions: ReadonlyMap<string, ZombieDefinition>,
  random: () => number,
): string | undefined {
  const affordable = eligibleIds.filter((id) => {
    const definition = definitions.get(id);
    return definition && definition.pickWeight > 0
      && definition.firstAllowedWave <= waveNumber
      && definition.waveCost <= remainingPoints;
  });
  if (affordable.length === 0) return undefined;
  const totalWeight = affordable.reduce((sum, id) => sum + (definitions.get(id)?.pickWeight ?? 0), 0);
  let pick = random() * totalWeight;
  for (const id of affordable) {
    pick -= definitions.get(id)?.pickWeight ?? 0;
    if (pick < 0) return id;
  }
  return affordable.at(-1);
}

/**
 * Reconstructs the GOTY Adventure wave queue from its per-level wave count,
 * spawn eligibility, intro-zombie rules, threat values, and a stable run seed.
 * The original game also varies the picker with player save state; callers
 * pass `firstPlaythrough` to select the corresponding campaign rules.
 */
export function createAdventureWaves(
  plan: AdventureWavePlan,
  rows: number,
  seed: string,
  firstPlaythrough: boolean,
  zombieDefinitions: ReadonlyMap<string, ZombieDefinition>,
): WaveDefinition[] {
  const waveCount = effectiveWaveCount(plan, firstPlaythrough);
  const random = createRandom('goty-adventure-waves:' + plan.levelNumber + ':' + seed);
  const queue: WaveDefinition[] = [];

  for (let waveIndex = 0; waveIndex < waveCount; waveIndex += 1) {
    const finalWave = waveIndex === waveCount - 1;
    const flagWave = isFlagWave(plan, waveIndex, waveCount, firstPlaythrough);
    let points = basePointBudget(plan, waveIndex, firstPlaythrough);
    const zombies: WaveSpawn[] = [];

    if (plan.specialModeId === 'bungee-blitz' && flagWave) {
      append(zombies, 'bungee', 5, [0, rows - 1]);
      if (!finalWave) {
        queue.push({ atTick: (waveIndex + 1) * 450, zombies });
        continue;
      }
    }

    if (flagWave) {
      const plainZombieCount = Math.min(points, 8);
      append(zombies, 'basic', plainZombieCount, [0, rows - 1]);
      append(zombies, 'flag', 1, [0, rows - 1]);
      points = Math.trunc(points * 2.5) - plainZombieCount - 1;
    }
    points *= waveMultiplier(plan);

    const addFixedZombie = (typeId: string, rowRange: [number, number]): void => {
      append(zombies, typeId, 1, rowRange);
      points -= zombieDefinitions.get(typeId)?.waveCost ?? 1;
    };

    const intro = plan.introZombieId;
    const isRareIntro = intro === 'digger' || intro === 'balloon';
    const shouldAddIntro = intro && (isRareIntro
      ? waveIndex + 1 === 7 || finalWave
      : waveIndex === Math.floor(waveCount / 2) || finalWave);
    if (shouldAddIntro && intro) addFixedZombie(intro, [0, rows - 1]);

    const yetiWave = Math.floor(waveCount / 2);
    if (plan.afterAdventureZombieId && !firstPlaythrough && waveIndex === yetiWave) {
      addFixedZombie(plan.afterAdventureZombieId, [0, rows - 1]);
    }

    if (finalWave) {
      for (const typeId of plan.eligibleZombieIds) {
        if (!zombies.some((spawn) => spawn.typeId === typeId)
          && typeId !== 'yeti') {
          addFixedZombie(typeId, typeId === 'duckytube' && rows > 3 ? [2, 3] : [0, rows - 1]);
        }
      }
    }

    const eligibleIds = plan.eligibleZombieIds.filter((id) => id !== 'basic' && id !== 'flag');
    let count = zombies.reduce((sum, spawn) => sum + (spawn.count ?? 1), 0);
    while (points > 0 && count < MAX_ZOMBIES_IN_WAVE) {
      const typeId = pickZombie(eligibleIds, points, waveIndex + 1, zombieDefinitions, random) ?? 'basic';
      const cost = zombieDefinitions.get(typeId)?.waveCost ?? 1;
      append(zombies, typeId, 1, typeId === 'duckytube' && rows > 3 ? [2, 3] : [0, rows - 1]);
      points -= cost;
      count += 1;
    }

    queue.push({ atTick: (waveIndex + 1) * 450, zombies });
  }

  return queue;
}
