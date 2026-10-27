import { cowGulchContent } from './cow-gulch';
import { cowGulchPreviewWave } from './cow-gulch-preview-wave';

/** A controlled no-defender variant used to verify the one-life defeat path. */
export const cowGulchDefeatContent = {
  ...cowGulchContent,
  id: 'cow-gulch-defeat',
  units: [],
  previewWave: {
    ...cowGulchPreviewWave,
    initialLives: 1,
  },
} as const;
