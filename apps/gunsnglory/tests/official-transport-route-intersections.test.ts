import assert from 'node:assert/strict';
import test from 'node:test';
import * as officialCampaign from '../src/content/official-campaign';
import { officialCampaignStages } from '../src/content/official-campaign';
import type { Direction, ScenarioContent, WaveRouteDefinition } from '../src/game';

interface RouteCellDirections {
  incoming: Direction;
  outgoing: Direction;
}

interface IntersectionGroup {
  level: number;
  scenarioId: string;
  spawns: readonly [number, number];
  cells: readonly { x: number; y: number }[];
  overlappingVehicleWaves: readonly {
    number: number;
    coveredWagon: boolean;
    stagecoach: boolean;
  }[];
}

function isScenario(value: unknown): value is ScenarioContent {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<ScenarioContent>;
  return typeof candidate.id === 'string'
    && Boolean(candidate.previewWave?.routes?.length)
    && Array.isArray(candidate.campaignWaves);
}

function expandRoute(route: WaveRouteDefinition): Map<string, RouteCellDirections> {
  const vector: Readonly<Record<Direction, readonly [number, number]>> = {
    east: [1, 0],
    south: [0, 1],
    west: [-1, 0],
    north: [0, -1],
  };
  const cells: { x: number; y: number }[] = [{ ...route.spawn.cell }];
  const directions: Direction[] = [];
  let current = { ...route.spawn.cell };
  let direction = route.spawn.direction;

  for (const target of [...route.redirects, { cell: route.exit, directions: [] }]) {
    const [deltaX, deltaY] = vector[direction];
    const distance = Math.abs(target.cell.x - current.x) + Math.abs(target.cell.y - current.y);
    assert.ok(distance <= 64, `${route.spawn.cell.x},${route.spawn.cell.y} route segment stays bounded`);
    assert.ok((current.x === target.cell.x || current.y === target.cell.y)
      && Math.sign(target.cell.x - current.x) === deltaX
      && Math.sign(target.cell.y - current.y) === deltaY,
    `route continues ${direction} from (${current.x},${current.y}) to (${target.cell.x},${target.cell.y})`);

    while (current.x !== target.cell.x || current.y !== target.cell.y) {
      current = { x: current.x + deltaX, y: current.y + deltaY };
      cells.push(current);
      directions.push(direction);
    }
    if (target.directions.length > 0) direction = target.directions[0]!;
  }

  return new Map(cells.map((cell, index) => [
    `${cell.x},${cell.y}`,
    {
      incoming: directions[index - 1] ?? route.spawn.direction,
      outgoing: directions[index] ?? directions.at(-1) ?? route.spawn.direction,
    },
  ]));
}

function isHorizontal(direction: Direction): boolean {
  return direction === 'east' || direction === 'west';
}

function opposite(direction: Direction): Direction {
  const opposites: Readonly<Record<Direction, Direction>> = {
    east: 'west',
    west: 'east',
    north: 'south',
    south: 'north',
  };
  return opposites[direction];
}

function findOfficialRouteIntersections(): readonly IntersectionGroup[] {
  const scenariosById = new Map<string, ScenarioContent>();
  for (const value of Object.values(officialCampaign)) {
    if (isScenario(value)) scenariosById.set(value.id, value);
  }

  const groups = new Map<string, IntersectionGroup>();
  for (const stage of officialCampaignStages) {
    const scenario = scenariosById.get(stage.scenarioId);
    const preview = scenario?.previewWave;
    if (!scenario || !preview?.routes?.length || !scenario.campaignWaves) continue;
    const spawns = [preview.spawn, ...(preview.additionalSpawns ?? [])];
    const expanded = preview.routes.map((route) => ({
      route,
      spawnId: spawns.findIndex((spawn) => (
        spawn.cell.x === route.spawn.cell.x
        && spawn.cell.y === route.spawn.cell.y
        && spawn.direction === route.spawn.direction
      )),
      cells: expandRoute(route),
    }));

    for (let firstIndex = 0; firstIndex < expanded.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < expanded.length; secondIndex += 1) {
        const first = expanded[firstIndex]!;
        const second = expanded[secondIndex]!;
        if (first.spawnId < 0 || second.spawnId < 0 || first.spawnId === second.spawnId) continue;

        const spawnIds = [first.spawnId, second.spawnId].sort((left, right) => left - right) as [number, number];
        const cells = new Set<string>();
        for (const [key, firstDirections] of first.cells) {
          const secondDirections = second.cells.get(key);
          if (!secondDirections) continue;

          const perpendicularTurns = firstDirections.incoming !== firstDirections.outgoing
            && secondDirections.incoming !== secondDirections.outgoing
            && isHorizontal(firstDirections.incoming) !== isHorizontal(secondDirections.incoming);
          const opposingTraffic = opposite(firstDirections.incoming) === secondDirections.incoming
            && opposite(firstDirections.outgoing) === secondDirections.outgoing;
          if (perpendicularTurns || opposingTraffic) cells.add(key);
        }
        if (cells.size === 0) continue;

        const overlappingVehicleWaves = scenario.campaignWaves.flatMap((wave) => {
          const firstPool = wave.spawnPools.find(({ spawnPointId }) => spawnPointId === spawnIds[0]);
          const secondPool = wave.spawnPools.find(({ spawnPointId }) => spawnPointId === spawnIds[1]);
          const coveredWagon = (firstPool?.requests[5] ?? 0) > 0 && (secondPool?.requests[5] ?? 0) > 0;
          const stagecoach = (firstPool?.requests[6] ?? 0) > 0 && (secondPool?.requests[6] ?? 0) > 0;
          return coveredWagon || stagecoach ? [{
            number: wave.number,
            coveredWagon,
            stagecoach,
          }] : [];
        });
        if (overlappingVehicleWaves.length === 0) continue;

        const key = `${stage.globalLevel}:${spawnIds.join(':')}`;
        const current = groups.get(key) ?? {
          level: stage.globalLevel,
          scenarioId: scenario.id,
          spawns: spawnIds,
          cells: [],
          overlappingVehicleWaves,
        };
        const mergedCells = new Map(current.cells.map((cell) => [`${cell.x},${cell.y}`, cell]));
        for (const cell of cells) {
          const [x, y] = cell.split(',').map(Number);
          mergedCells.set(cell, { x: x!, y: y! });
        }
        groups.set(key, {
          ...current,
          cells: [...mergedCells.values()].sort((left, right) => left.y - right.y || left.x - right.x),
        });
      }
    }
  }

  return [...groups.values()].sort((left, right) => left.level - right.level
    || left.spawns[0] - right.spawns[0]
    || left.spawns[1] - right.spawns[1]);
}

test('official same-wave perpendicular transport route intersections are inventoried', () => {
  assert.deepEqual(findOfficialRouteIntersections(), [
    {
      level: 11,
      scenarioId: 'campaign-mississippi-11',
      spawns: [0, 1],
      cells: [{ x: 5, y: 15 }],
      overlappingVehicleWaves: [
        { number: 3, coveredWagon: true, stagecoach: false },
        { number: 7, coveredWagon: true, stagecoach: true },
        { number: 8, coveredWagon: true, stagecoach: true },
      ],
    },
    {
      level: 14,
      scenarioId: 'campaign-mississippi-14',
      spawns: [0, 1],
      cells: [{ x: 5, y: 8 }, { x: 5, y: 9 }],
      overlappingVehicleWaves: [
        { number: 3, coveredWagon: true, stagecoach: true },
        { number: 6, coveredWagon: true, stagecoach: true },
        { number: 7, coveredWagon: true, stagecoach: true },
      ],
    },
    {
      level: 14,
      scenarioId: 'campaign-mississippi-14',
      spawns: [3, 5],
      cells: [{ x: 24, y: 19 }],
      overlappingVehicleWaves: [{ number: 7, coveredWagon: true, stagecoach: true }],
    },
    {
      level: 17,
      scenarioId: 'campaign-mississippi-17',
      spawns: [3, 5],
      cells: [{ x: 14, y: 21 }],
      overlappingVehicleWaves: [
        { number: 6, coveredWagon: true, stagecoach: true },
        { number: 7, coveredWagon: true, stagecoach: true },
        { number: 8, coveredWagon: true, stagecoach: true },
      ],
    },
    {
      level: 17,
      scenarioId: 'campaign-mississippi-17',
      spawns: [4, 5],
      cells: [{ x: 14, y: 21 }],
      overlappingVehicleWaves: [
        { number: 6, coveredWagon: true, stagecoach: true },
        { number: 7, coveredWagon: true, stagecoach: true },
        { number: 8, coveredWagon: true, stagecoach: true },
      ],
    },
    {
      level: 31,
      scenarioId: 'campaign-oregon-11',
      spawns: [1, 2],
      cells: [{ x: 20, y: 9 }, { x: 20, y: 10 }],
      overlappingVehicleWaves: [
        { number: 3, coveredWagon: true, stagecoach: true },
        { number: 4, coveredWagon: true, stagecoach: false },
        { number: 5, coveredWagon: true, stagecoach: true },
        { number: 7, coveredWagon: true, stagecoach: true },
        { number: 8, coveredWagon: true, stagecoach: true },
      ],
    },
  ]);
});
