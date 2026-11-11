export type CampaignMapUnitTypeId = 1 | 2 | 3 | 4 | 5 | 6 | 9 | 35 | 36;

export interface CampaignMapUnitPlacement {
  sourceCode: number;
  unitTypeId: CampaignMapUnitTypeId;
  activity: 4 | 5;
  cell: { x: number; y: number };
}

export interface CampaignTrainPlacement {
  sourceCode: 83 | 84 | 91 | 92 | 93;
  unitTypeId: 10 | 11 | 12 | 20 | 21 | 22;
  activity: 4 | 5;
  movementAxis: 'horizontal' | 'vertical';
  asset:
    | 'lok_hori_1of2' | 'lok_hori_2of2' | 'lok_wagon_hori'
    | 'lok_verti_1of2' | 'lok_verti_2of2' | 'lok_wagon_verti';
  cell: { x: number; y: number };
}

function unitMetadataForCode(code: number): Omit<CampaignMapUnitPlacement, 'sourceCode' | 'cell'> | undefined {
  if (code >= 96 && code <= 101) {
    return { unitTypeId: (code - 95) as CampaignMapUnitTypeId, activity: 4 };
  }
  if (code >= 104 && code <= 109) {
    return { unitTypeId: (code - 103) as CampaignMapUnitTypeId, activity: 5 };
  }
  if (code === 130 || code === 131) {
    return { unitTypeId: (code - 95) as CampaignMapUnitTypeId, activity: 4 };
  }
  if (code === 132) return { unitTypeId: 9, activity: 5 };
  return undefined;
}

/** Decodes the fresh-game unit objects encoded by the original campaign TDM markers. */
export function createCampaignMapUnitPlacements(
  tileGrid: readonly (readonly number[])[],
): CampaignMapUnitPlacement[] {
  return tileGrid.flatMap((row, y) => row.flatMap((code, x) => {
    const metadata = unitMetadataForCode(code);
    return metadata ? [{ sourceCode: code, ...metadata, cell: { x, y } }] : [];
  }));
}

/** Decodes every independent two-engine horizontal train encoded in a campaign TDM. */
export function createHorizontalTrainPlacementGroups(
  tileGrid: readonly (readonly number[])[],
): CampaignTrainPlacement[][] {
  const groups: CampaignTrainPlacement[][] = [];

  for (const [y, row] of tileGrid.entries()) {
    let x = 0;
    while (x < row.length) {
      if (row[x] === 84) {
        throw new Error('Campaign TDM horizontal train has an isolated wagon marker');
      }
      if (row[x] !== 83) {
        x += 1;
        continue;
      }
      if (row[x + 1] !== 83 || row[x + 2] !== 84) {
        throw new Error('Campaign TDM horizontal train must start with two engines and at least one wagon');
      }

      let endX = x + 2;
      while (row[endX] === 84) endX += 1;

      const placements: CampaignTrainPlacement[] = [];
      for (let index = x; index < endX; index += 1) {
        const groupIndex = index - x;
        const unitTypeId: CampaignTrainPlacement['unitTypeId'] = groupIndex === 0 ? 10 : groupIndex === 1 ? 11 : 12;
        const asset: CampaignTrainPlacement['asset'] = groupIndex === 0
          ? 'lok_hori_1of2'
          : groupIndex === 1 ? 'lok_hori_2of2' : 'lok_wagon_hori';
        placements.push({
          sourceCode: groupIndex < 2 ? 83 : 84,
          unitTypeId,
          activity: groupIndex < 2 ? 5 : 4,
          movementAxis: 'horizontal',
          asset,
          cell: { x: index, y },
        });
      }
      groups.push(placements);
      x = endX;
    }
  }

  if (groups.length === 0) {
    throw new Error('Campaign TDM must contain at least one horizontal train with two engines and a wagon');
  }
  return groups;
}

/** Decodes every independent horizontal train; legacy callers require exactly one. */
export function createHorizontalTrainPlacements(
  tileGrid: readonly (readonly number[])[],
): CampaignTrainPlacement[] {
  const groups = createHorizontalTrainPlacementGroups(tileGrid);
  if (groups.length !== 1) {
    throw new Error(`Campaign TDM must contain one horizontal train; found ${groups.length}`);
  }
  return groups[0]!;
}

/** Decodes every vertical train, whose wagons precede its two locomotive pieces. */
export function createVerticalTrainPlacementGroups(
  tileGrid: readonly (readonly number[])[],
): CampaignTrainPlacement[][] {
  const isWagon = (code: number | undefined) => code === 92 || code === 93;
  const isTrainMarker = (code: number | undefined) => isWagon(code) || code === 91;
  const consumed = new Set<string>();
  const groups: CampaignTrainPlacement[][] = [];

  for (let y = 0; y < tileGrid.length; y += 1) {
    const row = tileGrid[y]!;
    for (let x = 0; x < row.length; x += 1) {
      if (!isWagon(row[x]) || isWagon(tileGrid[y - 1]?.[x])) continue;

      let endY = y;
      while (isWagon(tileGrid[endY]?.[x])) endY += 1;
      if (tileGrid[endY]?.[x] !== 91 || tileGrid[endY + 1]?.[x] !== 91) {
        throw new Error('Campaign TDM vertical train must have contiguous wagons followed by two engines');
      }

      const placements: CampaignTrainPlacement[] = [];
      for (let wagonY = y; wagonY < endY; wagonY += 1) {
        const sourceCode = tileGrid[wagonY]![x] as 92 | 93;
        placements.push({
          sourceCode,
          unitTypeId: 22,
          activity: sourceCode === 92 ? 4 : 5,
          movementAxis: 'vertical',
          asset: 'lok_wagon_verti',
          cell: { x, y: wagonY },
        });
      }
      placements.push({
        sourceCode: 91,
        unitTypeId: 20,
        activity: 5,
        movementAxis: 'vertical',
        asset: 'lok_verti_2of2',
        cell: { x, y: endY },
      });
      placements.push({
        sourceCode: 91,
        unitTypeId: 21,
        activity: 5,
        movementAxis: 'vertical',
        asset: 'lok_verti_1of2',
        cell: { x, y: endY + 1 },
      });

      for (let consumedY = y; consumedY <= endY + 1; consumedY += 1) {
        consumed.add(`${x},${consumedY}`);
      }
      groups.push(placements);
    }
  }

  for (let y = 0; y < tileGrid.length; y += 1) {
    for (let x = 0; x < tileGrid[y]!.length; x += 1) {
      if (isTrainMarker(tileGrid[y]![x]) && !consumed.has(`${x},${y}`)) {
        throw new Error('Campaign TDM vertical train has an isolated or invalid train marker');
      }
    }
  }

  if (groups.length === 0) {
    throw new Error('Campaign TDM must contain at least one vertical train with wagons and two engines');
  }
  return groups;
}

/** Decodes the original vertical train; legacy callers require exactly one. */
export function createVerticalTrainPlacements(
  tileGrid: readonly (readonly number[])[],
): CampaignTrainPlacement[] {
  const groups = createVerticalTrainPlacementGroups(tileGrid);
  if (groups.length !== 1) {
    throw new Error(`Campaign TDM must contain one vertical train; found ${groups.length}`);
  }
  return groups[0]!;
}
