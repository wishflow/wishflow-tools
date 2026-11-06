import { cowGulchP1aSampleContent } from './cow-gulch';
import { createTechTownMapContent } from './tech-town-map-entities';
import type { ScenarioContent, ScenarioUnit } from '../game';

const gamblerTemplate: ScenarioUnit = (() => {
  const unit = createTechTownMapContent(() => true).units.find(({ type }) => type === 'gambler');
  if (!unit) throw new Error('Gambler UI sample requires the original Gambler map unit');
  return unit;
})();

/** Debug-only Cow Gulch clone for exercising the APK Gambler interaction. */
export function createGamblerUiSample(initialCash = 50): ScenarioContent {
  if (!Number.isSafeInteger(initialCash) || initialCash < 0) {
    throw new RangeError('Gambler UI sample cash must be a non-negative integer');
  }

  const cell = { x: 6, y: 6 };
  const render = { x: cell.x, y: cell.y - 0.375, width: 1, height: 1.375 };
  const gambler = {
    ...gamblerTemplate,
    id: 'gambler-ui-sample-unit',
    cell,
    render,
    hitArea: { ...render },
  };

  return {
    ...cowGulchP1aSampleContent,
    id: initialCash < 50 ? 'gambler-ui-low-cash-sample' : 'gambler-ui-sample',
    contentVersion: 'gng-free-1.8.6-gambler-ui-sample-v1',
    title: {
      en: initialCash < 50 ? 'Gambler · Low cash sample' : 'Gambler UI sample',
      zh: initialCash < 50 ? '赌徒 · 现金不足样本' : '赌徒界面样本',
    },
    map: {
      ...cowGulchP1aSampleContent.map,
      decorations: [
        ...(cowGulchP1aSampleContent.map.decorations ?? []),
        { asset: 'b_3x2_casino', cell: { x: 7, y: 6 }, anchorOffsetY: -0.3 },
      ],
    },
    units: [
      ...cowGulchP1aSampleContent.units.filter(({ type }) => type === 'gunslinger'),
      gambler,
    ],
    recruitableUnits: [],
    gambler: {
      unlockedPrizeUnitTypes: [1],
      cooldownMs: 299_000,
    },
    previewWave: {
      ...cowGulchP1aSampleContent.previewWave!,
      initialCash,
    },
  };
}

export const gamblerUiSampleContent = createGamblerUiSample();
export const gamblerUiLowCashSampleContent = createGamblerUiSample(49);
