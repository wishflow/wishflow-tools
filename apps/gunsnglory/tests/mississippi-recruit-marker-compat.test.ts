import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGameForMississippi11Replay,
  createBrowserGameForMississippi12Replay,
  createBrowserGameForMississippi13Replay,
  createBrowserGameForMississippi14Replay,
  createBrowserGameForMississippi15Replay,
  createBrowserGameForMississippi16Replay,
} from '../src/bootstrap/browser';
import { mississippi11CampaignContentVersionFor } from '../src/content/mississippi-11-campaign';
import { createMississippi11MapUnits } from '../src/content/mississippi-11-units';
import map11 from '../src/content/mississippi-11.json';
import { mississippi12CampaignContentVersionFor } from '../src/content/mississippi-12-campaign';
import { createMississippi12MapUnits } from '../src/content/mississippi-12-units';
import map12 from '../src/content/mississippi-12.json';
import { mississippi13CampaignContentVersionFor } from '../src/content/mississippi-13-content-version';
import { createMississippi13MapUnits } from '../src/content/mississippi-13-units';
import map13 from '../src/content/mississippi-13.json';
import { mississippi14CampaignContentVersionFor } from '../src/content/mississippi-14-content-version';
import { createMississippi14MapUnits } from '../src/content/mississippi-14-units';
import map14 from '../src/content/mississippi-14.json';
import { mississippi15CampaignContentVersionFor } from '../src/content/mississippi-15-content-version';
import { createMississippi15MapUnits } from '../src/content/mississippi-15-units';
import map15 from '../src/content/mississippi-15.json';
import { mississippi16CampaignContentVersionFor } from '../src/content/mississippi-16-content-version';
import { createMississippi16MapUnits } from '../src/content/mississippi-16-units';
import map16 from '../src/content/mississippi-16.json';
import type { CampaignMapUnitTypeId } from '../src/content/campaign-map-unit-placements';
import type { ScenarioUnit } from '../src/game';

const unlockByGlobalLevel = new Map<number, string>([
  [30, 'campaign-oregon-10'],
  [40, 'campaign-dakota-10'],
  [50, 'campaign-nevada-10'],
  [60, 'campaign-alaska-10'],
]);

const recruitTypeByMarker = new Map<number, ScenarioUnit['type']>([
  [96, 'gunslinger'],
  [97, 'mexican'],
  [98, 'cannon'],
  [99, 'indian'],
  [100, 'sniper'],
  [101, 'grandpa'],
]);

const recruitTypeIds = new Set<ScenarioUnit['type']>([
  'gunslinger', 'mexican', 'cannon', 'indian', 'sniper', 'grandpa',
]);

function milestoneUnlocked(completedScenarioIds: readonly string[], level: number): boolean {
  return completedScenarioIds.includes(unlockByGlobalLevel.get(level)!);
}

function isMississippiUnitUnlocked(
  unitTypeId: CampaignMapUnitTypeId,
  completedScenarioIds: readonly string[],
): boolean {
  if (unitTypeId >= 1 && unitTypeId <= 4) return true;
  if (unitTypeId === 5) return milestoneUnlocked(completedScenarioIds, 40);
  if (unitTypeId === 6) return milestoneUnlocked(completedScenarioIds, 30);
  if (unitTypeId === 35) return milestoneUnlocked(completedScenarioIds, 50);
  if (unitTypeId === 36) return milestoneUnlocked(completedScenarioIds, 60);
  return false;
}

function expectedRecruitMarkers(
  grid: readonly (readonly number[])[],
  completedScenarioIds: readonly string[],
) {
  return grid.flatMap((row, y) => row.flatMap((marker, x) => {
    const type = recruitTypeByMarker.get(marker);
    if (!type) return [];
    const unitTypeId = (marker - 95) as CampaignMapUnitTypeId;
    if (!isMississippiUnitUnlocked(unitTypeId, completedScenarioIds)) return [];
    return [{ type, activity: 4, cell: { x, y } }];
  })).sort((left, right) => (
    left.cell.y - right.cell.y || left.cell.x - right.cell.x
  ));
}

function actualRecruitMarkers(units: readonly ScenarioUnit[]) {
  return units.filter(({ type, activity }) => activity === 4 && recruitTypeIds.has(type))
    .map(({ type, activity, cell }) => ({ type, activity, cell }))
    .sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);
}

const maps = [
  {
    name: 'Traveller’s Town',
    scenarioId: 'campaign-mississippi-11',
    grid: map11.originalTileGrid,
    contentVersionFor: mississippi11CampaignContentVersionFor,
    replay: createBrowserGameForMississippi11Replay,
    create: (completed: readonly string[]) => createMississippi11MapUnits(
      (unitTypeId) => isMississippiUnitUnlocked(unitTypeId, completed),
    ),
  },
  {
    name: 'Steam Valley',
    scenarioId: 'campaign-mississippi-12',
    grid: map12.originalTileGrid,
    contentVersionFor: mississippi12CampaignContentVersionFor,
    replay: createBrowserGameForMississippi12Replay,
    create: (completed: readonly string[]) => createMississippi12MapUnits(
      (unitTypeId) => isMississippiUnitUnlocked(unitTypeId, completed),
    ),
  },
  {
    name: 'Golden River',
    scenarioId: 'campaign-mississippi-13',
    grid: map13.originalTileGrid,
    contentVersionFor: mississippi13CampaignContentVersionFor,
    replay: createBrowserGameForMississippi13Replay,
    create: (completed: readonly string[]) => createMississippi13MapUnits(completed),
  },
];

test('M11–M13 fresh maps and v2 replay factories preserve every TDM recruit marker and unlock snapshot', async () => {
  for (const map of maps) {
    for (let mask = 0; mask < 16; mask += 1) {
      const completed = [...unlockByGlobalLevel.entries()]
        .filter(([, scenarioId], index) => (mask & (1 << index)) !== 0)
        .map(([, scenarioId]) => scenarioId);
      assert.deepEqual(
        actualRecruitMarkers(map.create(completed)),
        expectedRecruitMarkers(map.grid, completed),
        `${map.name} mask=${mask}`,
      );
      const contentVersion = map.contentVersionFor(completed);
      const session = await map.replay(contentVersion).open({
        scenarioId: map.scenarioId,
        contentVersion,
        mode: 'free',
        difficulty: 'easy',
        randomSeed: 1701 + mask,
      });
      try {
        assert.deepEqual(
          actualRecruitMarkers(session.observe().units),
          expectedRecruitMarkers(map.grid, completed),
          `${map.name} replay mask=${mask}`,
        );
      } finally {
        session.close();
      }
    }
  }
});

test('M14–M16 fresh maps and v2 replay factories preserve every TDM recruit marker and unlock snapshot', async () => {
  const maps = [
    {
      name: 'Riverside Mountains',
      scenarioId: 'campaign-mississippi-14',
      grid: map14.originalTileGrid,
      contentVersionFor: mississippi14CampaignContentVersionFor,
      replay: createBrowserGameForMississippi14Replay,
      create: createMississippi14MapUnits,
      includesDynamiteSnapshot: false,
    },
    {
      name: 'Railroad Canyon',
      scenarioId: 'campaign-mississippi-15',
      grid: map15.originalTileGrid,
      contentVersionFor: mississippi15CampaignContentVersionFor,
      replay: createBrowserGameForMississippi15Replay,
      create: createMississippi15MapUnits,
      includesDynamiteSnapshot: false,
    },
    {
      name: 'Highpoint Terrace',
      scenarioId: 'campaign-mississippi-16',
      grid: map16.originalTileGrid,
      contentVersionFor: mississippi16CampaignContentVersionFor,
      replay: createBrowserGameForMississippi16Replay,
      create: createMississippi16MapUnits,
      includesDynamiteSnapshot: true,
    },
  ];

  for (const map of maps) {
    const stateCount = map.includesDynamiteSnapshot ? 32 : 16;
    for (let mask = 0; mask < stateCount; mask += 1) {
      const completed = [...unlockByGlobalLevel.entries()]
        .filter(([, scenarioId], index) => (mask & (1 << index)) !== 0)
        .map(([, scenarioId]) => scenarioId);
      if (map.includesDynamiteSnapshot && (mask & 16) !== 0) completed.push('campaign-mississippi-10');
      assert.deepEqual(
        actualRecruitMarkers(map.create(completed)),
        expectedRecruitMarkers(map.grid, completed),
        `${map.name} fresh mask=${mask}`,
      );
      const contentVersion = map.contentVersionFor(completed);
      const session = await map.replay(contentVersion).open({
        scenarioId: map.scenarioId,
        contentVersion,
        mode: 'free',
        difficulty: 'easy',
        randomSeed: 1801 + mask,
      });
      try {
        assert.deepEqual(
          actualRecruitMarkers(session.observe().units),
          expectedRecruitMarkers(map.grid, completed),
          `${map.name} replay mask=${mask}`,
        );
      } finally {
        session.close();
      }
    }
  }
});

test('legacy M11–M16 replay factories keep the recorded v1 recruit list', async () => {
  const cases = [
    {
      name: 'Traveller’s Town',
      scenarioId: 'campaign-mississippi-11',
      version: 'gng-free-1.8.6-mississippi-11-formal-v1-pyro1-sales0',
      game: createBrowserGameForMississippi11Replay,
      retainedTypes: ['pyromaniac'],
    },
    {
      name: 'Steam Valley',
      scenarioId: 'campaign-mississippi-12',
      version: 'gng-free-1.8.6-mississippi-12-formal-v1-pyro1',
      game: createBrowserGameForMississippi12Replay,
      retainedTypes: ['pyromaniac'],
    },
    {
      name: 'Golden River',
      scenarioId: 'campaign-mississippi-13',
      version: 'gng-free-1.8.6-mississippi-13-formal-v1-pyro1-salesman1',
      game: createBrowserGameForMississippi13Replay,
      retainedTypes: ['pyromaniac', 'salesman'],
    },
    {
      name: 'Riverside Mountains',
      scenarioId: 'campaign-mississippi-14',
      version: 'gng-free-1.8.6-mississippi-14-formal-v1-pyro1-salesman1',
      game: createBrowserGameForMississippi14Replay,
      retainedTypes: ['pyromaniac', 'salesman'],
    },
    {
      name: 'Railroad Canyon',
      scenarioId: 'campaign-mississippi-15',
      version: 'gng-free-1.8.6-mississippi-15-formal-v1-pyro1-salesman1',
      game: createBrowserGameForMississippi15Replay,
      retainedTypes: ['pyromaniac', 'salesman'],
    },
    {
      name: 'Highpoint Terrace',
      scenarioId: 'campaign-mississippi-16',
      version: 'gng-free-1.8.6-mississippi-16-formal-v1-pyro1-salesman1-dynamite1',
      game: createBrowserGameForMississippi16Replay,
      retainedTypes: ['pyromaniac', 'salesman'],
    },
  ] as const;

  for (const item of cases) {
    const session = await item.game(item.version).open({
      scenarioId: item.scenarioId,
      contentVersion: item.version,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 1701,
    });
    try {
      assert.equal(session.startRecord.contentVersion, item.version, item.name);
      assert.deepEqual(actualRecruitMarkers(session.observe().units), [], `${item.name} has no newly-added base hires`);
      assert.deepEqual(
        session.observe().units.filter(({ type }) => type === 'pyromaniac' || type === 'salesman')
          .map(({ type }) => type).sort(),
        [...item.retainedTypes].sort(),
        `${item.name} retains its v1 special-unit snapshot`,
      );
    } finally {
      session.close();
    }
  }
});
