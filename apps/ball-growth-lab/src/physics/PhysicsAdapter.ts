import type { Point } from '../types';

export interface PhysicsAdapter {
  step(deltaSeconds: number): void;
  dispose(): void;
}

export interface SolverTuning {
  velocityIterations: number;
  positionIterations: number;
  allowedLinearError?: number;
}

export const DEFAULT_SOLVER_TUNING: SolverTuning = { velocityIterations: 6, positionIterations: 2 };

export function shareBirthMomentum(first: Point, second: Point): { first: Point; second: Point; child: Point } {
  const child = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
  return {
    first: { x: first.x - child.x / 2, y: first.y - child.y / 2 },
    second: { x: second.x - child.x / 2, y: second.y - child.y / 2 },
    child,
  };
}
