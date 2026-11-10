export type CampaignMapUnitTypeId = 1 | 2 | 3 | 4 | 5 | 6 | 9 | 35 | 36;

export interface CampaignMapUnitPlacement {
  sourceCode: number;
  unitTypeId: CampaignMapUnitTypeId;
  activity: 4 | 5;
  cell: { x: number; y: number };
}

export interface CampaignTrainPlacement {
  sourceCode: 83 | 84;
  unitTypeId: 10 | 11 | 12;
  activity: 4 | 5;
  asset: 'lok_hori_1of2' | 'lok_hori_2of2' | 'lok_wagon_hori';
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

/** Decodes the original two-engine horizontal train followed by one or more wagons. */
export function createHorizontalTrainPlacements(
  tileGrid: readonly (readonly number[])[],
): CampaignTrainPlacement[] {
  const starts = tileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === 83 && row[x + 1] === 83 && row[x + 2] === 84 ? [{ x, y }] : []
  )));
  const engineCount = tileGrid.reduce((count, row) => count + row.filter((code) => code === 83).length, 0);
  const wagonCount = tileGrid.reduce((count, row) => count + row.filter((code) => code === 84).length, 0);

  if (starts.length !== 1 || engineCount !== 2 || wagonCount < 1) {
    throw new Error('Campaign TDM must contain one horizontal train with two engines and at least one wagon');
  }

  const { x: startX, y } = starts[0]!;
  const row = tileGrid[y]!;
  const endX = startX + 2 + wagonCount;
  if (row.slice(startX, endX).some((code, offset) => code !== (offset < 2 ? 83 : 84))) {
    throw new Error('Campaign TDM train markers must form one contiguous horizontal group');
  }

  const placements: CampaignTrainPlacement[] = [];
  for (let index = 0; index < 2 + wagonCount; index += 1) {
    const unitTypeId: CampaignTrainPlacement['unitTypeId'] = index === 0 ? 10 : index === 1 ? 11 : 12;
    const asset: CampaignTrainPlacement['asset'] = index === 0
      ? 'lok_hori_1of2'
      : index === 1 ? 'lok_hori_2of2' : 'lok_wagon_hori';
    placements.push({
      sourceCode: index < 2 ? 83 : 84,
      unitTypeId,
      activity: index < 2 ? 5 : 4,
      asset,
      cell: { x: startX + index, y },
    });
  }
  return placements;
}
