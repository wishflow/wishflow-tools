import { cowGulchP1aSampleContent } from './cow-gulch';
import type { ScenarioContent } from '../game';

/** Debug-only screen fixture with enough cash to exercise the recruit confirmation path. */
export const recruitConfirmationUiSampleContent: ScenarioContent = {
  ...cowGulchP1aSampleContent,
  id: 'recruit-confirmation-ui-sample',
  contentVersion: 'gng-free-1.8.6-recruit-confirmation-ui-sample-v1',
  title: { en: 'Recruit confirmation UI sample', zh: '招募确认界面样本' },
  formalSettlementSupported: false,
  previewWave: {
    ...cowGulchP1aSampleContent.previewWave!,
    initialCash: 100,
  },
};
