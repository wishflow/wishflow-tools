import { cowGulchP1aSampleContent } from './cow-gulch';
import { cowGulchPreviewWave } from './cow-gulch-preview-wave';

/** A controlled no-defender variant used to verify the one-life defeat path. */
export const cowGulchDefeatContent = {
  ...cowGulchP1aSampleContent,
  id: 'cow-gulch-defeat',
  formalSettlementSupported: false,
  units: [],
  previewWave: {
    ...cowGulchPreviewWave,
    initialLives: 1,
  },
} as const;
