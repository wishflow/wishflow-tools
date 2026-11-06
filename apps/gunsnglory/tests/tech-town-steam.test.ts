import assert from 'node:assert/strict';
import test from 'node:test';
import { createTechTownTrainTestContent } from '../src/content/tech-town-train-sample';
import { createTechTownTrainUnits } from '../src/content/tech-town-units';
import { createGame, type ScenarioContent } from '../src/game';

const previewWave: NonNullable<ScenarioContent['previewWave']> = {
  number: 1,
  initialLives: 10,
  initialCash: 0,
  spawn: { cell: { x: 0, y: 0 }, direction: 'east' },
  baseEnemySpeed: 100,
  speedMultiplierMin: 90,
  speedMultiplierCount: 20,
  escapePenalty: 1,
  redirects: [],
  exit: { x: 31, y: 23 },
};

async function openTrainSample(seed = 42, source = createTechTownTrainTestContent()) {
  const session = await createGame({ scenarios: { [source.id]: source } }).open({
    scenarioId: source.id,
    randomSeed: seed,
  });
  return { source, session };
}

function trainUnits(view: ReturnType<Awaited<ReturnType<typeof openTrainSample>>['session']['observe']>) {
  return view.units.filter(({ movementGroupId }) => movementGroupId === 'tech-town-train');
}

test('only the lead locomotive emits steam while each train segment has the train greeting', () => {
  const units = createTechTownTrainUnits();

  assert.deepEqual(units.filter(({ steamEmitter }) => steamEmitter).map(({ type }) => type), ['train-10']);
  assert.ok(units.every(({ selectionSound }) => selectionSound === 'sound_train'));
});

test('spawns the first cloud at the APK offset and advances its atlas animation in simulation time', async () => {
  const { session } = await openTrainSample();
  const engineBefore = trainUnits(session.observe())[0]!;

  const firstTick = trainUnits(session.advance({ deltaMs: 100 }))[0]!;
  const firstCloud = firstTick.steamClouds?.[0];
  assert.ok(firstCloud);
  assert.equal(firstCloud.positionFine.x, engineBefore.positionFine.x + 103);
  assert.equal(firstCloud.positionFine.y, engineBefore.positionFine.y - 7_584 - 600);
  assert.equal(firstCloud.remainingMs, 1_399);
  assert.equal(firstCloud.animationFrame, 0);

  session.advance({ deltaMs: 100 });
  session.advance({ deltaMs: 100 });
  const laterCloud = trainUnits(session.advance({ deltaMs: 100 }))[0]!.steamClouds?.[0];
  assert.ok(laterCloud);
  assert.equal(laterCloud.positionFine.y, engineBefore.positionFine.y - 7_584 - 2_400);
  assert.equal(laterCloud.remainingMs, 1_099);
  assert.equal(laterCloud.animationFrame, 1);
});

test('moving doubles the emitter countdown while an idle train does not', async () => {
  const moving = await openTrainSample(1);
  const idle = await openTrainSample(1);
  moving.session.advance({ deltaMs: 100 });
  idle.session.advance({ deltaMs: 100 });

  const engine = trainUnits(moving.session.observe())[0]!;
  moving.session.submitIntent({ type: 'select-at', x: engine.hitArea.x + 0.5, y: engine.hitArea.y + 0.5 });
  moving.session.advance({ deltaMs: 0 });
  moving.session.submitIntent({ type: 'move-unit', targetX: engine.cell.x + 4.5, targetY: engine.cell.y + 0.5 });

  let movingView = moving.session.observe();
  let idleView = idle.session.observe();
  for (let step = 0; step < 4; step += 1) {
    movingView = moving.session.advance({ deltaMs: 100 });
    idleView = idle.session.advance({ deltaMs: 100 });
  }

  assert.equal(trainUnits(movingView)[0]!.steamClouds?.length, 2);
  assert.equal(trainUnits(idleView)[0]!.steamClouds?.length, 1);
});

test('each train segment selection emits one immediate sound_train event with no cooldown', async () => {
  const { session } = await openTrainSample();

  for (const unit of trainUnits(session.observe())) {
    session.submitIntent({
      type: 'select-at',
      x: unit.hitArea.x + unit.hitArea.width / 2,
      y: unit.hitArea.y + unit.hitArea.height / 2,
    });
    const selected = session.advance({ deltaMs: 0 });
    assert.deepEqual(selected.events.filter((event) => event.type === 'sound-requested').map((event) => event.sound), ['sound_train']);
    assert.equal(session.advance({ deltaMs: 0 }).events.some((event) => event.type === 'sound-requested'), false,
      'the selection event is visible for one simulation frame');
  }
});

test('same seed and inputs replay the same steam clouds', async () => {
  const first = await openTrainSample(1234);
  const second = await openTrainSample(1234);

  for (const deltaMs of [100, 100, 100, 100, 100, 100, 100]) {
    first.session.advance({ deltaMs });
    second.session.advance({ deltaMs });
  }

  assert.deepEqual(
    trainUnits(first.session.observe())[0]!.steamClouds,
    trainUnits(second.session.observe())[0]!.steamClouds,
  );
});

test('steam countdown randomness does not consume the Game.Randomizer stream', async () => {
  const train = createTechTownTrainTestContent();
  const withWave = (id: string, removeSteam: boolean): ScenarioContent => ({
    ...train,
    id,
    contentVersion: `${train.contentVersion}-${id}`,
    units: train.units.map((unit) => {
      if (!removeSteam) return unit;
      const { steamEmitter: _steamEmitter, ...withoutSteam } = unit;
      return withoutSteam;
    }),
    previewWave,
  });
  const steam = await openTrainSample(77, withWave('steam-wave-sample', false));
  const control = await openTrainSample(77, withWave('plain-wave-sample', true));

  steam.session.advance({ deltaMs: 100 });
  control.session.advance({ deltaMs: 100 });
  steam.session.submitIntent({ type: 'start-wave' });
  control.session.submitIntent({ type: 'start-wave' });
  const steamEnemy = steam.session.advance({ deltaMs: 0 }).enemies[0]!;
  const controlEnemy = control.session.advance({ deltaMs: 0 }).enemies[0]!;

  assert.equal(steamEnemy.speed, controlEnemy.speed);
});

test('expired clouds are removed from the unit view', async () => {
  const { session } = await openTrainSample();
  const firstTick = trainUnits(session.advance({ deltaMs: 100 }))[0]!;
  const firstCloudId = firstTick.steamClouds?.[0]?.id;
  assert.ok(firstCloudId);

  let expired = trainUnits(session.observe())[0]!;
  for (let step = 0; step < 14; step += 1) expired = trainUnits(session.advance({ deltaMs: 100 }))[0]!;
  assert.equal(expired.steamClouds?.some(({ id }) => id === firstCloudId), false);
});
