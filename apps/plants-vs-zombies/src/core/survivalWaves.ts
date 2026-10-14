import { createRandom } from './random';
import type { SurvivalWavePlan, WaveDefinition, WaveSpawn, ZombieDefinition } from './types';

const MAX_ZOMBIES_IN_WAVE = 50;
const POOL_ONLY_ZOMBIES = new Set(['snorkel', 'dolphin-rider']);
const SPAWNED_ONLY_ZOMBIES = new Set(['backup-dancer', 'bobsled', 'imp']);
const NORMAL_SURVIVAL_ZOMBIES = new Set([
  'basic', 'flag', 'conehead', 'pole-vaulter', 'buckethead', 'newspaper', 'screen-door', 'football', 'dancer', 'backup-dancer', 'duckytube', 'snorkel',
]);

function isWaterTerrain(terrain: SurvivalWavePlan['terrain']): boolean {
  return terrain === 'pool' || terrain === 'fog';
}

function linearCurve(start: number, end: number, value: number, from: number, to: number): number {
  const ratio = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return Math.round(from + (to - from) * ratio);
}

/** Mirrors the candidate exclusions in Challenge::InitZombieWavesSurvival. */
export function canAppearInSurvival(
  id: string,
  plan: SurvivalWavePlan,
  flagsCompleted: number,
): boolean {
  if (SPAWNED_ONLY_ZOMBIES.has(id) || id === 'duckytube' || id === 'yeti') return false;
  if (POOL_ONLY_ZOMBIES.has(id) && !isWaterTerrain(plan.terrain)) return false;
  if (plan.terrain === 'roof' && (id === 'digger' || id === 'dancer')) return false;
  if (plan.terrain === 'night' && id === 'zamboni') return false;
  if (id === 'bungee' && plan.difficulty !== 'endless' && plan.terrain !== 'roof') return false;
  if (plan.difficulty === 'normal' && !NORMAL_SURVIVAL_ZOMBIES.has(id)) return false;
  if (id === 'red-eye-gargantuar' && flagsCompleted < 10) return false;
  return true;
}

function chooseStageZombieIds(
  plan: SurvivalWavePlan,
  stageIndex: number,
  flagsCompleted: number,
  seed: string,
  zombieDefinitions: ReadonlyMap<string, ZombieDefinition>,
): string[] {
  const random = createRandom('goty-survival-pool:' + seed + ':' + plan.terrain + ':' + plan.difficulty + ':' + stageIndex);
  const ids = new Set(['basic']);
  if (stageIndex === 0) {
    ids.add('conehead');
    if (plan.difficulty !== 'normal') ids.add('buckethead');
    return [...ids].filter((id) => zombieDefinitions.has(id));
  }

  // Later stages start with a newspaper zombie one time in five; otherwise they use a conehead.
  ids.add(random() < 0.2 ? 'newspaper' : 'conehead');
  const candidates = [...zombieDefinitions.values()]
    .filter((definition) => canAppearInSurvival(definition.id, plan, flagsCompleted))
    .map((definition) => definition.id)
    .filter((id) => !ids.has(id));
  let capacity = Math.min(stageIndex + 1, 9);
  while (capacity > 0 && candidates.length > 0) {
    const index = Math.floor(random() * candidates.length);
    const [id] = candidates.splice(index, 1);
    if (id) {
      ids.add(id);
      capacity -= 1;
    }
  }
  return [...ids].filter((id) => zombieDefinitions.has(id));
}

/** Returns a deterministic candidate set for inspection and simulation tools. */
export function getSurvivalStageZombieIds(
  plan: SurvivalWavePlan,
  stageIndex: number,
  seed: string,
  zombieDefinitions: ReadonlyMap<string, ZombieDefinition>,
): string[] {
  const flagsPerStage = plan.wavesPerStage / 10;
  return chooseStageZombieIds(plan, stageIndex, stageIndex * flagsPerStage, seed, zombieDefinitions);
}

function survivalWeight(definition: ZombieDefinition, flagsCompleted: number, flagWave: boolean): number {
  if (definition.id === 'red-eye-gargantuar' && !flagWave) return 1_000;
  if (definition.id === 'basic') {
    return linearCurve(10, 50, flagsCompleted, definition.pickWeight, Math.trunc(definition.pickWeight / 10));
  }
  if (definition.id === 'conehead') {
    return linearCurve(10, 50, flagsCompleted, definition.pickWeight, Math.trunc(definition.pickWeight / 4));
  }
  return definition.pickWeight;
}

function pickZombie(
  ids: string[],
  points: number,
  waveNumber: number,
  flagsCompleted: number,
  flagWave: boolean,
  countsThisWave: ReadonlyMap<string, number>,
  countsThisStage: ReadonlyMap<string, number>,
  plan: SurvivalWavePlan,
  zombieDefinitions: ReadonlyMap<string, ZombieDefinition>,
  random: () => number,
): ZombieDefinition | undefined {
  const choices = ids.flatMap((id) => {
    const definition = zombieDefinitions.get(id);
    if (!definition) return [];

    // Original endless mode handles bungee zombies before its normal cost and first-wave checks.
    if (definition.id === 'bungee' && plan.difficulty === 'endless') {
      if (!flagWave) return [];
    } else {
      const endlessAdvance = plan.difficulty === 'endless'
        ? linearCurve(18, 50, flagsCompleted, 0, 15)
        : 0;
      const firstAllowedWave = Math.max(1, definition.firstAllowedWave - endlessAdvance);
      if (firstAllowedWave > waveNumber || definition.waveCost > points) return [];
    }

    if (definition.id === 'gargantuar' || definition.id === 'zamboni') {
      const maximum = linearCurve(10, 50, flagsCompleted, 2, 50);
      if ((countsThisWave.get(id) ?? 0) >= maximum) return [];
    } else if (definition.id === 'red-eye-gargantuar') {
      if (flagWave) {
        const maximum = linearCurve(14, 100, flagsCompleted, 1, 50);
        if ((countsThisWave.get(id) ?? 0) >= maximum) return [];
      } else {
        const maximum = linearCurve(10, 110, flagsCompleted, 1, 50);
        if ((countsThisStage.get(id) ?? 0) >= maximum) return [];
      }
    }

    const weight = survivalWeight(definition, flagsCompleted, flagWave);
    return weight > 0 ? [{ definition, weight }] : [];
  });
  const totalWeight = choices.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) return undefined;
  let pick = random() * totalWeight;
  for (const choice of choices) {
    pick -= choice.weight;
    if (pick < 0) return choice.definition;
  }
  return choices.at(-1)?.definition;
}

function addSpawn(
  spawns: WaveSpawn[],
  definition: ZombieDefinition,
  count: number,
  plan: SurvivalWavePlan,
  rows: number,
  random: () => number,
): void {
  const possibleRows = isWaterTerrain(plan.terrain)
    ? POOL_ONLY_ZOMBIES.has(definition.id)
      ? [2, 3]
      : [0, 1, 4, 5].filter((row) => row < rows)
    : Array.from({ length: rows }, (_, row) => row);
  for (let index = 0; index < count; index += 1) {
    const row = possibleRows[Math.floor(random() * possibleRows.length)] ?? 0;
    const existing = spawns.find((spawn) => spawn.typeId === definition.id && spawn.row === row);
    if (existing) existing.count = (existing.count ?? 1) + 1;
    else spawns.push({ typeId: definition.id, row, count: 1 });
  }
}

/** Reconstructs a GOTY Survival stage from the source's stage setup and wave picker rules. */
export function createSurvivalStageWaves(
  plan: SurvivalWavePlan,
  stageIndex: number,
  seed: string,
  rows: number,
  zombieDefinitions: ReadonlyMap<string, ZombieDefinition>,
): WaveDefinition[] {
  const flagsPerStage = plan.wavesPerStage / 10;
  const flagsCompleted = stageIndex * flagsPerStage;
  const allowedZombieIds = chooseStageZombieIds(plan, stageIndex, flagsCompleted, seed, zombieDefinitions);
  const random = createRandom('goty-survival-waves:' + seed + ':' + plan.terrain + ':' + plan.difficulty + ':' + stageIndex);
  const waves: WaveDefinition[] = [];
  const countsThisStage = new Map<string, number>();

  for (let waveIndex = 0; waveIndex < plan.wavesPerStage; waveIndex += 1) {
    const flagWave = waveIndex % 10 === 9;
    let points = stageIndex === 0
      ? Math.floor(waveIndex / 3) + 1
      : Math.floor((stageIndex * plan.wavesPerStage + waveIndex) * 2 / 5) + 1;
    const spawns: WaveSpawn[] = [];
    const countsThisWave = new Map<string, number>();
    const add = (id: string, count: number): void => {
      const definition = zombieDefinitions.get(id);
      if (!definition) return;
      addSpawn(spawns, definition, count, plan, rows, random);
      countsThisWave.set(id, (countsThisWave.get(id) ?? 0) + count);
      countsThisStage.set(id, (countsThisStage.get(id) ?? 0) + count);
      points -= definition.waveCost * count;
    };

    if (flagWave) {
      const plainCount = Math.min(points, 8);
      points = Math.trunc(points * 2.5);
      add('basic', plainCount);
      add('flag', 1);
    }

    let zombieCount = spawns.reduce((sum, spawn) => sum + (spawn.count ?? 1), 0);
    while (points > 0 && zombieCount < MAX_ZOMBIES_IN_WAVE) {
      const selected = pickZombie(
        allowedZombieIds,
        points,
        waveIndex + 1,
        flagsCompleted,
        flagWave,
        countsThisWave,
        countsThisStage,
        plan,
        zombieDefinitions,
        random,
      ) ?? zombieDefinitions.get('basic');
      if (!selected) break;
      add(selected.id, 1);
      zombieCount += 1;
    }
    waves.push({ atTick: (stageIndex * plan.wavesPerStage + waveIndex + 1) * 450, zombies: spawns });
  }
  return waves;
}
