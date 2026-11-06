import map from './new-mexico-04.json';

export type TechTownUnitTypeId = 1 | 2 | 3 | 4 | 5 | 6 | 9 | 35 | 36;

export interface TechTownMapUnitPlacement {
  sourceCode: number;
  unitTypeId: TechTownUnitTypeId;
  activity: 4 | 5;
  cell: { x: number; y: number };
}

export interface TechTownTrainPlacement {
  sourceCode: 83 | 84;
  unitTypeId: 10 | 11 | 12;
  activity: 4 | 5;
  asset: 'lok_hori_1of2' | 'lok_hori_2of2' | 'lok_wagon_hori';
  cell: { x: number; y: number };
}

const trainSourceCodes = [83, 83, 84, 84, 84] as const;
const trainUnitTypes = [10, 11, 12, 12, 12] as const;
const trainAssets = ['lok_hori_1of2', 'lok_hori_2of2', 'lok_wagon_hori', 'lok_wagon_hori', 'lok_wagon_hori'] as const;

/** Decodes the original contiguous five-part Tech Town train from TDM object codes. */
export function createTechTownTrainPlacements(
  tileGrid: readonly (readonly number[])[] = map.originalTileGrid,
): TechTownTrainPlacement[] {
  const starts = tileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === trainSourceCodes[0]
      && row.slice(x, x + trainSourceCodes.length).every((marker, offset) => marker === trainSourceCodes[offset])
      ? [{ x, y }]
      : []
  )));
  const trainMarkerCount = tileGrid.reduce(
    (count, row) => count + row.filter((code) => code === 83 || code === 84).length,
    0,
  );
  if (starts.length !== 1 || trainMarkerCount !== trainSourceCodes.length) {
    throw new Error('Tech Town TDM must contain exactly one contiguous five-part train');
  }

  const { x: startX, y } = starts[0]!;
  return trainSourceCodes.map((sourceCode, index) => ({
    sourceCode,
    unitTypeId: trainUnitTypes[index]!,
    activity: index < 2 ? 5 : 4,
    asset: trainAssets[index]!,
    cell: { x: startX + index, y },
  }));
}

function unitMetadataForCode(code: number): Omit<TechTownMapUnitPlacement, 'sourceCode' | 'cell'> | undefined {
  if (code >= 96 && code <= 101) {
    return { unitTypeId: (code - 95) as TechTownUnitTypeId, activity: 4 };
  }
  if (code >= 104 && code <= 109) {
    return { unitTypeId: (code - 103) as TechTownUnitTypeId, activity: 5 };
  }
  if (code === 130 || code === 131) {
    return { unitTypeId: (code - 95) as TechTownUnitTypeId, activity: 4 };
  }
  if (code === 132) return { unitTypeId: 9, activity: 5 };
  return undefined;
}

/**
 * Decodes the fresh-battle unit objects created from Tech Town's original TDM.
 * In-progress battles restore saved objects instead; the web game always starts
 * an unfinished level from this fresh-map state.
 */
export function createTechTownFreshGameUnitPlacements(
  tileGrid: readonly (readonly number[])[] = map.originalTileGrid,
): TechTownMapUnitPlacement[] {
  return tileGrid.flatMap((row, y) => row.flatMap((code, x) => {
    const metadata = unitMetadataForCode(code);
    return metadata ? [{ sourceCode: code, ...metadata, cell: { x, y } }] : [];
  }));
}
