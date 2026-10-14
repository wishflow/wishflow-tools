import * as THREE from 'three';

export const CHAIN_PITCH = 0.0127;
export const CHAIN_LINK_COUNT = 116;
export const CHAIN_TARGET_LENGTH = CHAIN_PITCH * CHAIN_LINK_COUNT;
export const CHAINRING_TEETH = 40;
export const CASSETTE_TEETH = [32, 28, 24, 21, 18, 16, 14, 12] as const;
export const CHAINRING_RADIUS = CHAIN_PITCH / (2 * Math.sin(Math.PI / CHAINRING_TEETH));
export const DERAILLEUR_UPPER_CENTER = new THREE.Vector2(-0.074, 0.270);
export const DERAILLEUR_LOWER_CENTER = new THREE.Vector2(-0.020, 0.180);
export const DERAILLEUR_PULLEY_RADIUS = CHAIN_PITCH / (2 * Math.sin(Math.PI / 13));
export const DERAILLEUR_BASE_Z = 0.0442;
export const CHAINRING_Z = 0.05;

type RouteSegment =
  | { kind: 'line'; start: THREE.Vector3; end: THREE.Vector3; length: number }
  | { kind: 'arc'; center: THREE.Vector2; radius: number; startAngle: number; sweep: number; z: number; length: number };

export class BicycleChainCurve extends THREE.Curve<THREE.Vector3> {
  readonly length: number;
  private readonly segments: RouteSegment[];

  constructor(segments: RouteSegment[]) {
    super();
    this.segments = segments;
    this.length = segments.reduce((total, segment) => total + segment.length, 0);
  }

  override getLength() {
    return this.length;
  }

  override getLengths(divisions = this.arcLengthDivisions) {
    return Array.from({ length: divisions + 1 }, (_, index) => this.length * index / divisions);
  }

  override getPoint(t: number, target = new THREE.Vector3()) {
    let remaining = THREE.MathUtils.clamp(t, 0, 1) * this.length;
    for (const segment of this.segments) {
      if (remaining <= segment.length || segment === this.segments[this.segments.length - 1]) {
        const fraction = segment.length > 0 ? THREE.MathUtils.clamp(remaining / segment.length, 0, 1) : 0;
        if (segment.kind === 'line') return target.copy(segment.start).lerp(segment.end, fraction);
        const angle = segment.startAngle + segment.sweep * fraction;
        return target.set(
          segment.center.x + Math.cos(angle) * segment.radius,
          segment.center.y + Math.sin(angle) * segment.radius,
          segment.z,
        );
      }
      remaining -= segment.length;
    }
    return target.set(0, 0, 0);
  }
}

type ChainCircle = { center: THREE.Vector2; radius: number; z: number };
type Tangent = { normal: THREE.Vector2; start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector2; length: number };

function externalTangent(from: ChainCircle, to: ChainCircle): Tangent {
  const delta = to.center.clone().sub(from.center);
  const distance = delta.length();
  const direction = delta.clone().multiplyScalar(1 / distance);
  const ratio = (from.radius - to.radius) / distance;
  if (Math.abs(ratio) >= 1) throw new Error('自行车链路相邻圆相交，无法建立外公切线。');
  const normal = direction.clone().multiplyScalar(ratio)
    .add(new THREE.Vector2(-direction.y, direction.x).multiplyScalar(Math.sqrt(1 - ratio * ratio)));
  const start = new THREE.Vector3(
    from.center.x + normal.x * from.radius,
    from.center.y + normal.y * from.radius,
    from.z,
  );
  const end = new THREE.Vector3(
    to.center.x + normal.x * to.radius,
    to.center.y + normal.y * to.radius,
    to.z,
  );
  const planar = delta.clone().addScaledVector(normal, to.radius - from.radius);
  return { normal, start, end, direction: planar.normalize(), length: start.distanceTo(end) };
}

function directedSweep(start: THREE.Vector2, end: THREE.Vector2, counterClockwise: boolean) {
  const from = Math.atan2(start.y, start.x);
  const to = Math.atan2(end.y, end.x);
  return counterClockwise
    ? THREE.MathUtils.euclideanModulo(to - from, Math.PI * 2)
    : THREE.MathUtils.euclideanModulo(from - to, Math.PI * 2);
}

function makeRoute(rearTeeth: number, rearZ: number, cageAngle: number) {
  const lowerOffset = DERAILLEUR_LOWER_CENTER.clone().sub(DERAILLEUR_UPPER_CENTER).rotateAround(new THREE.Vector2(), cageAngle);
  const lowerCenter = DERAILLEUR_UPPER_CENTER.clone().add(lowerOffset);
  const circles: ChainCircle[] = [
    { center: new THREE.Vector2(0.4409365, 0.289), radius: CHAINRING_RADIUS, z: CHAINRING_Z },
    { center: lowerCenter, radius: DERAILLEUR_PULLEY_RADIUS, z: rearZ },
    { center: DERAILLEUR_UPPER_CENTER.clone(), radius: DERAILLEUR_PULLEY_RADIUS, z: rearZ },
    { center: new THREE.Vector2(0, 0.349), radius: CHAIN_PITCH / (2 * Math.sin(Math.PI / rearTeeth)), z: rearZ },
  ];
  const tangents = circles.map((circle, index) => externalTangent(circle, circles[(index + 1) % circles.length]));
  const segments: RouteSegment[] = [];
  circles.forEach((circle, index) => {
    const incoming = tangents[(index + tangents.length - 1) % tangents.length].normal;
    const outgoing = tangents[index];
    const counterClockwise = outgoing.normal.x * outgoing.direction.y - outgoing.normal.y * outgoing.direction.x > 0;
    const sweep = directedSweep(incoming, outgoing.normal, counterClockwise);
    const startAngle = Math.atan2(incoming.y, incoming.x);
    segments.push({
      kind: 'arc',
      center: circle.center,
      radius: circle.radius,
      startAngle,
      sweep: counterClockwise ? sweep : -sweep,
      z: circle.z,
      length: circle.radius * sweep,
    });
    const tangent = tangents[index];
    segments.push({ kind: 'line', start: tangent.start, end: tangent.end, length: tangent.length });
  });
  return { curve: new BicycleChainCurve(segments), lowerCenter, upperCenter: DERAILLEUR_UPPER_CENTER.clone() };
}

export function solveDerailleurCageAngle(rearTeeth: number, rearZ: number) {
  const lowerAngle = THREE.MathUtils.degToRad(-45);
  const upperAngle = THREE.MathUtils.degToRad(45);
  let low = lowerAngle;
  let high = upperAngle;
  const lowLength = makeRoute(rearTeeth, rearZ, low).curve.length;
  const highLength = makeRoute(rearTeeth, rearZ, high).curve.length;
  if (lowLength < CHAIN_TARGET_LENGTH || highLength > CHAIN_TARGET_LENGTH) {
    throw new Error(`后拨笼角无法张紧 ${rearTeeth}T 挡位链条：${lowLength}m…${highLength}m。`);
  }
  for (let iteration = 0; iteration < 48; iteration += 1) {
    const middle = (low + high) / 2;
    if (makeRoute(rearTeeth, rearZ, middle).curve.length > CHAIN_TARGET_LENGTH) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

export function makeChainRoute(rearTeeth: number, rearZ: number, cageAngle: number) {
  const route = makeRoute(rearTeeth, rearZ, cageAngle);
  const arcSpacingErrorMm = Math.abs(route.curve.length - CHAIN_TARGET_LENGTH) * 1000 / CHAIN_LINK_COUNT;
  return { ...route, arcSpacingErrorMm };
}

export function chainCircleContactErrorMm(curve: THREE.Curve<THREE.Vector3>, center: THREE.Vector2, radius: number) {
  let error = Number.POSITIVE_INFINITY;
  const point = new THREE.Vector3();
  for (let index = 0; index <= 2048; index += 1) {
    curve.getPointAt(index / 2048, point);
    error = Math.min(error, Math.abs(Math.hypot(point.x - center.x, point.y - center.y) - radius));
  }
  return error * 1000;
}
