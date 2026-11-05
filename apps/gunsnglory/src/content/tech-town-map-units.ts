import map from './new-mexico-04.json';

export type TechTownUnitTypeId = 1 | 2 | 3 | 4 | 5 | 6 | 9 | 35 | 36;

export interface TechTownMapUnitPlacement {
  sourceCode: number;
  unitTypeId: TechTownUnitTypeId;
  activity: 4 | 5;
  cell: { x: number; y: number };
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
