import * as officialCampaign from '../../src/content/official-campaign';
import type { ScenarioContent } from '../../src/game';

export type OfficialCampaignRegion = 'new-mexico' | 'mississippi' | 'oregon' | 'dakota-nevada';
export type OfficialWagonType = 'covered-wagon' | 'stagecoach';

export interface OfficialWagonRouteCase {
  globalLevel: number;
  region: OfficialCampaignRegion;
  scenario: ScenarioContent;
  waveNumber: number;
  spawnPointId: number;
  wagonType: OfficialWagonType;
  requestIndex: 5 | 6;
  branchCells: readonly { x: number; y: number }[];
}

export interface OfficialWagonRouteCoverage {
  officialStageCount: number;
  missingScenarioIds: readonly string[];
  requestPoolRowCount: number;
  uniqueRequestCaseCount: number;
  missingRouteCaseCount: number;
  branchCases: readonly OfficialWagonRouteCase[];
  regionCounts: Readonly<Record<OfficialCampaignRegion, {
    uniqueRequestCaseCount: number;
    branchCaseCount: number;
  }>>;
}

function isOfficialScenarioContent(value: unknown): value is ScenarioContent {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<ScenarioContent>;
  return typeof candidate.id === 'string'
    && Boolean(candidate.previewWave)
    && Array.isArray(candidate.campaignWaves);
}

function campaignRegion(globalLevel: number): OfficialCampaignRegion {
  if (globalLevel <= 10) return 'new-mexico';
  if (globalLevel <= 20) return 'mississippi';
  if (globalLevel <= 31) return 'oregon';
  return 'dakota-nevada';
}

function sameSpawn(
  left: { cell: { x: number; y: number }; direction: string },
  right: { cell: { x: number; y: number }; direction: string } | undefined,
): boolean {
  return Boolean(right
    && left.cell.x === right.cell.x
    && left.cell.y === right.cell.y
    && left.direction === right.direction);
}

export function inspectOfficialWagonRouteCoverage(): OfficialWagonRouteCoverage {
  const scenariosById = new Map<string, ScenarioContent>();
  for (const value of Object.values(officialCampaign)) {
    if (isOfficialScenarioContent(value)) scenariosById.set(value.id, value);
  }

  const regionCounts: Record<OfficialCampaignRegion, {
    uniqueRequestCaseCount: number;
    branchCaseCount: number;
  }> = {
    'new-mexico': { uniqueRequestCaseCount: 0, branchCaseCount: 0 },
    mississippi: { uniqueRequestCaseCount: 0, branchCaseCount: 0 },
    oregon: { uniqueRequestCaseCount: 0, branchCaseCount: 0 },
    'dakota-nevada': { uniqueRequestCaseCount: 0, branchCaseCount: 0 },
  };
  const firstRequestByCase = new Map<string, OfficialWagonRouteCase>();
  let requestPoolRowCount = 0;
  let missingRouteCaseCount = 0;
  const missingScenarioIds: string[] = [];

  for (const stage of officialCampaign.officialCampaignStages) {
    const scenario = scenariosById.get(stage.scenarioId);
    if (!scenario?.previewWave || !scenario.campaignWaves) {
      missingScenarioIds.push(stage.scenarioId);
      continue;
    }

    const preview = scenario.previewWave;
    const spawns = [preview.spawn, ...(preview.additionalSpawns ?? [])];
    const routes = preview.routes?.length ? preview.routes : [{
      spawn: preview.spawn,
      redirects: preview.redirects,
      exit: preview.exit,
    }];
    const sourceGrid = scenario.originalTileGrid ?? scenario.map.originalTileGrid;

    for (const wave of [...scenario.campaignWaves].sort((left, right) => left.number - right.number)) {
      for (const pool of wave.spawnPools) {
        const coveredWagonCount = pool.requests[5] ?? 0;
        const stagecoachCount = pool.requests[6] ?? 0;
        if (coveredWagonCount <= 0 && stagecoachCount <= 0) continue;
        requestPoolRowCount += 1;

        const requestedTypes: readonly {
          wagonType: OfficialWagonType;
          requestIndex: 5 | 6;
          requestCount: number;
        }[] = [
          { wagonType: 'covered-wagon', requestIndex: 5, requestCount: coveredWagonCount },
          { wagonType: 'stagecoach', requestIndex: 6, requestCount: stagecoachCount },
        ];

        for (const request of requestedTypes) {
          if (request.requestCount <= 0) continue;
          const key = `${scenario.id}:${pool.spawnPointId}:${request.wagonType}`;
          if (firstRequestByCase.has(key)) continue;

          const spawn = spawns[pool.spawnPointId];
          const matchingRoutes = routes.filter((route) => sameSpawn(route.spawn, spawn));
          if (matchingRoutes.length === 0) {
            missingRouteCaseCount += 1;
          }

          const branchCells = new Map<string, { x: number; y: number }>();
          for (const route of matchingRoutes) {
            for (const redirect of route.redirects) {
              const tdmCode = sourceGrid?.[redirect.cell.y]?.[redirect.cell.x];
              if (tdmCode !== undefined && tdmCode >= 56 && tdmCode <= 65) {
                branchCells.set(`${redirect.cell.x},${redirect.cell.y}`, { ...redirect.cell });
              }
            }
          }

          firstRequestByCase.set(key, {
            globalLevel: stage.globalLevel,
            region: campaignRegion(stage.globalLevel),
            scenario,
            waveNumber: wave.number,
            spawnPointId: pool.spawnPointId,
            wagonType: request.wagonType,
            requestIndex: request.requestIndex,
            branchCells: [...branchCells.values()].sort((left, right) => left.y - right.y || left.x - right.x),
          });
        }
      }
    }
  }

  const requestCases = [...firstRequestByCase.values()];
  for (const routeCase of requestCases) {
    const counts = regionCounts[routeCase.region];
    counts.uniqueRequestCaseCount += 1;
    if (routeCase.branchCells.length > 0) counts.branchCaseCount += 1;
  }

  return {
    officialStageCount: officialCampaign.officialCampaignStages.length,
    missingScenarioIds,
    requestPoolRowCount,
    uniqueRequestCaseCount: requestCases.length,
    missingRouteCaseCount,
    branchCases: requestCases.filter(({ branchCells }) => branchCells.length > 0),
    regionCounts,
  };
}
