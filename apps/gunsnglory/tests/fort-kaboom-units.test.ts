import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { cowGulchPreviewWave } from '../src/content/cow-gulch-preview-wave';
import { fortKaboomUnitDesigns, type FortKaboomUnitDesign, type FortKaboomUnitType } from '../src/content/fort-kaboom-unit-designs';
import { createGame, type GameSession, type ScenarioContent, type ScenarioUnit } from '../src/game';

const assetsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../public/assets');
const damagePenetration = { light: 100, fire: 50, heavy: 25, poison: 75 } as const;
const shotSoundAssets: Readonly<Record<string, readonly string[]>> = {
  sound_cannon: ['sound_cannon', 'sound_cannon2'],
  sound_fire_arrow: ['sound_fire_arrow', 'sound_fire_arrow2'],
  sound_rifle: ['sound_rifle'],
  sound_rocket_explosion: ['sound_rocket_explosion_1', 'sound_rocket_explosion_2'],
};

const expected: Readonly<Record<FortKaboomUnitType, {
  speed: number;
  price: number;
  damage: number;
  damageType: string;
  range: number;
  reload: number;
  projectileSpeed: number;
  area: number;
  postDamage: number;
  postDamageDurationMs: number;
  damageStyle: number;
  hireSound: string;
  shotSound: string;
  awakeHeight: number;
  sleepingHeight: number;
}>> = {
  cannon: {
    speed: 1000, price: 150, damage: 1250, damageType: 'heavy', range: 46080,
    reload: 2500, projectileSpeed: 1600, area: 1920, postDamage: 0, postDamageDurationMs: 0,
    damageStyle: 4, hireSound: 'sound_deserter_yes_sir', shotSound: 'sound_cannon',
    awakeHeight: 32, sleepingHeight: 32,
  },
  indian: {
    speed: 1500, price: 125, damage: 400, damageType: 'fire', range: 38400,
    reload: 1500, projectileSpeed: 800, area: 0, postDamage: 12, postDamageDurationMs: 5000,
    damageStyle: 2, hireSound: 'sound_indian_hugh', shotSound: 'sound_fire_arrow',
    awakeHeight: 44, sleepingHeight: 36,
  },
  sniper: {
    speed: 1500, price: 90, damage: 1000, damageType: 'light', range: 69120,
    reload: 2250, projectileSpeed: 1000, area: 0, postDamage: 0, postDamageDurationMs: 0,
    damageStyle: 0, hireSound: 'sound_sniper_laughing', shotSound: 'sound_rifle',
    awakeHeight: 44, sleepingHeight: 44,
  },
  grandpa: {
    speed: 2000, price: 130, damage: 300, damageType: 'heavy', range: 46080,
    reload: 4000, projectileSpeed: 1000, area: 7680, postDamage: 12, postDamageDurationMs: 500,
    damageStyle: 6, hireSound: 'sound_grandpa_coughing', shotSound: 'sound_rocket_explosion',
    awakeHeight: 44, sleepingHeight: 44,
  },
};

function pngDimensions(name: string): { width: number; height: number } {
  const png = readFileSync(resolve(assetsDirectory, `${name}.png`));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${name} is a PNG image`);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

function makeUnit(design: FortKaboomUnitDesign, activity: 4 | 5): ScenarioUnit {
  const sleeping = activity === 4;
  const render = sleeping
    ? { x: 8, y: 8, width: 1, height: 1 }
    : { x: 8, y: 7.625, width: 1, height: 1.375 };
  const unit: ScenarioUnit = {
    id: `${design.type}-unit`,
    type: design.type,
    activity,
    ...(sleeping ? { hirePrice: design.hirePrice } : {}),
    asset: sleeping ? design.asset : design.awakeAsset,
    frame: sleeping ? design.sleepFrame : design.awakeFrame,
    ...(sleeping ? {
      awakeAsset: design.awakeAsset,
      awakeFrame: design.awakeFrame,
      awakeRender: { x: 8, y: 7.625, width: 1, height: 1.375 },
      awakeHitArea: { x: 8, y: 7.625, width: 1, height: 1.375 },
      hireSound: design.hireSound,
    } : {}),
    shotSound: design.shotSound,
    cell: { x: 8, y: 8 },
    movementSpeedFinePer100Ms: design.movementSpeedFinePer100Ms,
    render,
    hitArea: { ...render },
    weapon: { ...design.weapon },
  };
  return unit;
}

function makeScenario(
  type: FortKaboomUnitType,
  activity: 4 | 5,
  initialCash = 0,
  weaponOverride: Partial<FortKaboomUnitDesign['weapon']> = {},
): ScenarioContent {
  const design = fortKaboomUnitDesigns[type];
  const unit = makeUnit(design, activity);
  if (unit.weapon) Object.assign(unit.weapon, weaponOverride);
  return {
    id: `fort-kaboom-${type}-${activity}`,
    title: { en: 'Unit fixture', zh: '单位样本' },
    map: { width: 17, height: 17, tileSize: 32, background: [], streets: [] },
    units: [unit],
    previewWave: {
      ...cowGulchPreviewWave,
      initialCash,
      spawn: { cell: { x: 11, y: 8 }, direction: 'east' },
      additionalSpawns: [],
      redirects: [],
      baseEnemySpeed: 0,
      speedMultiplierMin: 100,
      speedMultiplierCount: 1,
      enemy: {
        hitPoints: 10000,
        cashReward: 1,
        penetration: damagePenetration,
      },
    },
  };
}

async function openScenario(scenario: ScenarioContent): Promise<GameSession> {
  return createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id, randomSeed: 42 });
}

function advanceUntil(
  session: GameSession,
  predicate: (view: ReturnType<GameSession['observe']>) => boolean,
  limitMs = 12_000,
): ReturnType<GameSession['observe']> {
  let elapsedMs = 0;
  let view = session.observe();
  while (elapsedMs < limitMs) {
    view = session.advance({ deltaMs: 100, tileSizePixels: 60 });
    elapsedMs += 100;
    if (predicate(view)) return view;
  }
  assert.fail(`Condition was not reached within ${limitMs}ms`);
}

test('matches APK unit rows, sprites, animation atlases, and sound resources', () => {
  for (const [type, design] of Object.entries(fortKaboomUnitDesigns) as [FortKaboomUnitType, FortKaboomUnitDesign][]) {
    const source = expected[type];
    assert.equal(design.type, type);
    assert.equal(design.movementSpeedFinePer100Ms, source.speed);
    assert.equal(design.hirePrice, source.price);
    assert.equal(design.weapon.damage, source.damage);
    assert.equal(design.weapon.damageType, source.damageType);
    assert.equal(design.weapon.rangeFine, source.range);
    assert.equal(design.weapon.reloadTimeMs, source.reload);
    assert.equal(design.weapon.projectileSpeed, source.projectileSpeed);
    assert.equal(design.weapon.areaDamageFine ?? 0, source.area);
    assert.equal(design.weapon.postDamage ?? 0, source.postDamage);
    assert.equal(design.weapon.postDamageDurationMs ?? 0, source.postDamageDurationMs);
    assert.equal(design.weapon.damageStyle, source.damageStyle);
    assert.equal(design.hireSound, source.hireSound);
    assert.equal(design.shotSound, source.shotSound);
    assert.ok(existsSync(resolve(assetsDirectory, 'sounds', `${design.hireSound}.ogg`)), `${type} greeting file exists`);
    for (const soundName of shotSoundAssets[design.shotSound] ?? []) {
      assert.ok(existsSync(resolve(assetsDirectory, 'sounds', `${soundName}.ogg`)), `${type} shot sound ${soundName} exists`);
    }

    const awake = pngDimensions(design.awakeAsset);
    const sleeping = pngDimensions(design.asset);
    const shooting = pngDimensions(`${design.awakeAsset}_shot`);
    assert.deepEqual(awake, { width: 96, height: source.awakeHeight * 5 }, `${type} walking atlas has 3×5 frames`);
    assert.deepEqual(sleeping, { width: 32, height: source.sleepingHeight }, `${type} sleep sprite dimensions are exact`);
    assert.deepEqual(shooting, { width: 64, height: source.awakeHeight * 5 }, `${type} shooting atlas has 2×5 frames`);
  }
});

test('hires each map unit for its original price, activates its sprite and requests its greeting', async () => {
  for (const [type, design] of Object.entries(fortKaboomUnitDesigns) as [FortKaboomUnitType, FortKaboomUnitDesign][]) {
    const scenario = makeScenario(type, 4, design.hirePrice);
    const session = await openScenario(scenario);
    session.submitIntent({ type: 'select-at', x: 8.5, y: 8.5 });
    session.advance({ deltaMs: 0 });
    session.submitIntent({ type: 'hire-map-unit', unitId: `${type}-unit`, commandId: `hire-${type}` });
    const view = session.advance({ deltaMs: 0 });

    assert.equal(view.units[0]?.activity, 5, `${type} becomes active`);
    assert.equal(view.units[0]?.asset, design.awakeAsset);
    assert.equal(view.wave?.cash, 0, `${type} costs its original price`);
    assert.ok(view.events.some((event) => event.type === 'map-unit-hired' && event.unitType === type));
    assert.ok(view.events.some((event) => event.type === 'sound-requested' && event.sound === design.hireSound));
  }
});

test('all four new units use the inherited player movement and firing animation rules with their original shot cues', async () => {
  for (const [type, design] of Object.entries(fortKaboomUnitDesigns) as [FortKaboomUnitType, FortKaboomUnitDesign][]) {
    const movementSession = await openScenario(makeScenario(type, 5));
    const initial = movementSession.observe().units[0]!;
    movementSession.submitIntent({ type: 'select-at', x: 8.5, y: 8.5 });
    movementSession.advance({ deltaMs: 0, tileSizePixels: 60 });
    movementSession.submitIntent({ type: 'move-unit', targetX: 9.5, targetY: 8.75 });
    const moved = movementSession.advance({ deltaMs: 100, tileSizePixels: 60 }).units[0]!;
    assert.equal(moved.positionFine.x - initial.positionFine.x, design.movementSpeedFinePer100Ms, `${type} moves at source speed`);
    assert.ok(moved.walkingAnimation, `${type} uses the original walking atlas`);

    const attackSession = await openScenario(makeScenario(type, 5));
    attackSession.submitIntent({ type: 'start-wave' });
    attackSession.advance({ deltaMs: 0 });
    const firstShot = advanceUntil(attackSession, (view) => view.events.some((event) => event.type === 'unit-fired'));
    assert.equal(firstShot.units[0]?.shootingAnimation?.asset, `${design.awakeAsset}_shot`);
    assert.ok(firstShot.events.some((event) => event.type === 'sound-requested'
      && event.sound === design.shotSound && 'positionFine' in event), `${type} requests its positional shot sound`);

    const afterBoundary = attackSession.advance({ deltaMs: 100 });
    attackSession.advance({ deltaMs: 1 });
    const afterStrictThreshold = attackSession.advance({ deltaMs: 1 });
    assert.equal(afterBoundary.units[0]?.shootingAnimation?.frame, 0);
    assert.equal(afterStrictThreshold.units[0]?.shootingAnimation?.frame, 1, `${type} follows its source 100ms frame threshold`);
  }
});

test('Native and Grandpa post damage use fire resistance, tick at 100ms, and stop at the APK duration', async () => {
  for (const [type, durationMs] of [['indian', 5000], ['grandpa', 500]] as const) {
    const scenario = makeScenario(type, 5, 0, { reloadTimeMs: 12_000 });
    const session = await openScenario(scenario);
    session.submitIntent({ type: 'start-wave' });
    session.advance({ deltaMs: 0 });
    const hit = advanceUntil(session, (view) => view.events.some((event) => event.type === 'enemy-hit'));
    const hitPointsAfterDirectHit = hit.enemies[0]!.hitPoints;
    const expectedPerTick = Math.trunc((12 * damagePenetration.fire) / 100);
    let view = hit;
    for (let elapsed = 0; elapsed < durationMs; elapsed += 100) {
      view = session.advance({ deltaMs: 100 });
    }
    assert.equal(view.enemies[0]?.hitPoints, hitPointsAfterDirectHit - (expectedPerTick * (durationMs / 100)));
    const afterExpiry = session.advance({ deltaMs: 100 });
    assert.equal(afterExpiry.enemies[0]?.hitPoints, view.enemies[0]?.hitPoints, `${type} stops post damage after ${durationMs}ms`);
  }
});
