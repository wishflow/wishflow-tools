import assert from 'node:assert/strict';
import test from 'node:test';
import { cowGulchContent } from '../src/content/cow-gulch';
import { createGame, type ScenarioContent } from '../src/game';

const settlerSpawnOffsets = [
  { x: -2560, y: -2080 },
  { x: 2560, y: -2080 },
  { x: -2560, y: 4000 },
  { x: 2560, y: 4000 },
] as const;

function javaRandom(seed: number) {
  let state = (BigInt(seed) ^ 0x5deece66dn) & ((1n << 48n) - 1n);
  const next = (bits: number) => {
    state = (state * 0x5deece66dn + 0xbn) & ((1n << 48n) - 1n);
    return Number(state >> BigInt(48 - bits));
  };

  return {
    nextInt(bound: number) {
      if ((bound & (bound - 1)) === 0) return Math.floor((bound * next(31)) / 0x8000_0000);
      let bits: number;
      let value: number;
      do {
        bits = next(31);
        value = bits % bound;
      } while (bits - value + (bound - 1) >= 0x8000_0000);
      return value;
    },
  };
}

function expectedSettlerGroup(seed: number, groupSize: number) {
  const random = javaRandom(seed);
  random.nextInt(1); // WaveManager selects the only pending pool request.
  random.nextInt(1); // EnemyDirector selects the only map spawn field.
  const speedPercent = 90 + random.nextInt(20); // One speed roll is shared by this request.
  const occupied = new Set<number>();
  const members: Array<{ type: number; speed: number; drawingOffsetFine: { x: number; y: number } }> = [];

  while (members.length < groupSize) {
    const slot = random.nextInt(4);
    if (occupied.has(slot)) continue;
    occupied.add(slot);
    members.push({
      type: random.nextInt(2) + 1,
      speed: Math.trunc((cowGulchContent.previewWave!.baseEnemySpeed * speedPercent) / 100),
      drawingOffsetFine: settlerSpawnOffsets[slot]!,
    });
    random.nextInt(2); // GameObjectEnemy chooses its color variant after gender.
  }
  return members;
}

test('Cow Gulch settler requests use one randomized speed and distinct random formation slots', async () => {
  const originalWave = cowGulchContent.campaignWaves![0]!;
  const seed = 1;

  for (let groupSize = 1; groupSize <= 4; groupSize += 1) {
    const requests = Array.from({ length: 10 }, (_, index) => index === groupSize - 1 ? 1 : 0);
    const scenario: ScenarioContent = {
      ...cowGulchContent,
      id: `p1b-settler-spawn-fixture-${groupSize}`,
      campaignWaveCount: 1,
      campaignWaves: [{
        ...originalWave,
        spawnPools: [{ spawnPointId: 0, intervalMs: 0, requests }],
      }],
      units: [],
    };
    const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
      scenarioId: scenario.id,
      mode: 'formal',
      randomSeed: seed,
    });
    const view = session.advance({ deltaMs: 0 });
    const expected = expectedSettlerGroup(seed, groupSize);

    const spawnEvent = view.events.find((event) => event.type === 'enemy-group-spawned');
    assert.equal(spawnEvent?.type, 'enemy-group-spawned');
    if (spawnEvent?.type === 'enemy-group-spawned') assert.equal(spawnEvent.groupSize, groupSize);
    assert.deepEqual(view.enemies.map(({ type, speed, drawingOffsetFine }) => ({
      type,
      speed,
      drawingOffsetFine,
    })), expected);
    assert.equal(new Set(view.enemies.map(({ speed }) => speed)).size, 1,
      'all members in one EnemyDirector request share its speed roll');
    assert.equal(new Set(view.enemies.map(({ drawingOffsetFine }) => JSON.stringify(drawingOffsetFine))).size, groupSize,
      'a request chooses each source formation slot at most once');
    assert.equal(new Set(view.enemies.map(({ groupId }) => groupId)).size, groupSize,
      'addEnemy increments the source unitGroupCounter after each settler');
    session.close();
  }
});
