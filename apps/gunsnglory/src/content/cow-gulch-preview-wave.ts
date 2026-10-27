import type { PreviewWaveDefinition } from '../game';

/** One controlled first-wave settler sample; this is not the complete original wave schedule. */
export const cowGulchPreviewWave = Object.freeze({
  number: 1,
  initialLives: 50,
  spawn: { cell: { x: 0, y: 10 }, direction: 'east' },
  baseEnemySpeed: 500,
  speedMultiplierMin: 90,
  speedMultiplierCount: 20,
  escapePenalty: 1,
  redirects: [
    { cell: { x: 4, y: 10 }, directions: ['south'] },
    { cell: { x: 4, y: 13 }, directions: ['east'] },
    { cell: { x: 12, y: 13 }, directions: ['north'] },
    { cell: { x: 12, y: 6 }, directions: ['west'] },
    { cell: { x: 9, y: 6 }, directions: ['north'] },
    { cell: { x: 9, y: 2 }, directions: ['east'] },
    { cell: { x: 12, y: 2 }, directions: ['south'] },
    { cell: { x: 12, y: 3 }, directions: ['east'] },
    { cell: { x: 15, y: 3 }, directions: ['east'] },
  ],
  exit: { x: 16, y: 3 },
} as const satisfies PreviewWaveDefinition);
