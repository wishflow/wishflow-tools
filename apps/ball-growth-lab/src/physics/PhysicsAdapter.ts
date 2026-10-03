import type { Point } from '../types';

export interface PhysicsAdapter {
  step(deltaSeconds: number): void;
  dispose(): void;
}

export interface SolverTuning {
  velocityIterations: number;
  positionIterations: number;
  allowedLinearError?: number;
  maxTravelPerSubstep?: number;
}

export const DEFAULT_SOLVER_TUNING: SolverTuning = { velocityIterations: 6, positionIterations: 2 };

/**
 * Samples a unit-mass offspring velocity from the parents' post-impact speeds.
 * Speed is uniform in v² so expected offspring kinetic energy equals the
 * average kinetic energy of the two parents. Positive gravity points downward.
 */
export function createBirthVelocity(
  firstSpeed: number,
  secondSpeed: number,
  gravity: number,
  random: () => number,
): Point {
  const firstSpeedSquared = Math.max(0, firstSpeed) ** 2;
  const secondSpeedSquared = Math.max(0, secondSpeed) ** 2;
  const speedSquared = Math.min(firstSpeedSquared, secondSpeedSquared)
    + random() * Math.abs(firstSpeedSquared - secondSpeedSquared);
  const angle = gravity > 0
    ? ((270 + (random() * 2 - 1) * 45) * Math.PI) / 180
    : random() * Math.PI * 2;
  const speed = Math.sqrt(speedSquared);
  if (speed === 0) return { x: 0, y: 0 };
  return { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
}

/** Legacy birth redistribution used only by the experimental Planck baseline. */
export function shareBirthMomentum(first: Point, second: Point): { first: Point; second: Point; child: Point } {
  const child = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
  return {
    first: { x: first.x - child.x / 2, y: first.y - child.y / 2 },
    second: { x: second.x - child.x / 2, y: second.y - child.y / 2 },
    child,
  };
}

/**
 * Legacy energy redistribution for the experimental Rapier baseline. Redistributes
 * two equal-mass bodies into three while preserving total momentum and mechanical
 * energy, including the newborn's gravitational potential.
 * Returns null when there is not enough available kinetic energy to create the
 * newborn at childY without adding energy to the simulation.
 */
export function distributeBirthEnergy(
  first: Point,
  second: Point,
  gravity: number,
  childY: number,
  rotation: number,
): { first: Point; second: Point; child: Point } | null {
  const momentum = { x: first.x + second.x, y: first.y + second.y };
  const initialKineticEnergy = (first.x ** 2 + first.y ** 2 + second.x ** 2 + second.y ** 2) / 2;
  const childPotentialEnergy = -gravity * childY;
  const targetKineticEnergy = initialKineticEnergy - childPotentialEnergy;
  const minimumKineticEnergy = (momentum.x ** 2 + momentum.y ** 2) / 6;
  const relativeKineticEnergy = targetKineticEnergy - minimumKineticEnergy;

  if (relativeKineticEnergy < -1e-9) return null;

  const centerVelocity = { x: momentum.x / 3, y: momentum.y / 3 };
  const relativeSpeed = Math.sqrt((2 * Math.max(0, relativeKineticEnergy)) / 3);
  const velocities = Array.from({ length: 3 }, (_, index) => {
    const angle = rotation + (index * Math.PI * 2) / 3;
    return {
      x: centerVelocity.x + Math.cos(angle) * relativeSpeed,
      y: centerVelocity.y + Math.sin(angle) * relativeSpeed,
    };
  });

  return { first: velocities[0], second: velocities[1], child: velocities[2] };
}
