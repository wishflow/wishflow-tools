import cowGulchMap from './cow-gulch.json';
import { cowGulchPreviewWave } from './cow-gulch-preview-wave';
import type { ScenarioContent } from '../game';

export const cowGulchContent: ScenarioContent = {
  ...cowGulchMap,
  previewWave: cowGulchPreviewWave,
};
