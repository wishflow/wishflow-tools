import type { GameRuntime } from '../core/game';
import type { GameSnapshot } from '../core/types';

export const gameSession: {
  runtime: GameRuntime | null;
  modeId: string;
  progression: 'adventure' | 'none';
  plantIds: string[];
  onSnapshot: ((snapshot: GameSnapshot) => void) | null;
} = {
  runtime: null,
  modeId: 'adventure',
  progression: 'adventure',
  plantIds: [],
  onSnapshot: null,
};
