import * as THREE from 'three';
import type { BicyclePartId } from './locales';

export type BicycleLayer = 'frame' | 'steering' | 'frontWheel' | 'rearWheel' | 'drivetrain' | 'frontBrake' | 'rearBrake' | 'seatAccessories';

export type BicycleMaterials = {
  frame: THREE.MeshPhysicalMaterial;
  silver: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  leather: THREE.MeshStandardMaterial;
  black: THREE.MeshStandardMaterial;
  reflector: THREE.MeshStandardMaterial;
  cable: THREE.MeshStandardMaterial;
};

export type BrakeMechanism = {
  pads: THREE.Group[];
  levers: THREE.Group[];
  leverRest: number[];
  padRest: number[];
};

export type BicycleModel = {
  root: THREE.Group;
  layers: Record<BicycleLayer, THREE.Group>;
  steeringPivot: THREE.Group;
  frontWheelSpin: THREE.Group;
  rearWheelSpin: THREE.Group;
  cassetteSpin: THREE.Group;
  crankPivot: THREE.Group;
  chainCurves: THREE.CatmullRomCurve3[];
  chainMeshes: THREE.Mesh[];
  chainLinks: THREE.InstancedMesh;
  frontBrakeMechanism: BrakeMechanism;
  rearBrakeMechanism: BrakeMechanism;
  frontRotor: THREE.Group;
  rearRotor: THREE.Group;
  cassetteRings: THREE.Mesh[];
  sideStand: THREE.Group;
  partRoots: Map<BicyclePartId, THREE.Object3D>;
  interactiveTargets: THREE.Object3D[];
  layerRestPositions: Record<BicycleLayer, THREE.Vector3>;
  explodeOffsets: Record<BicycleLayer, THREE.Vector3>;
};

const V = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);
const WHEEL_RADIUS = 0.349;
const RIM_RADIUS = 0.311;
const REAR_AXLE = V(0, WHEEL_RADIUS, 0);
const FRONT_AXLE = V(1.08, WHEEL_RADIUS, 0);
const BOTTOM_BRACKET = V(0.43, 0.279, 0);
const SEAT_TOP = V(0.278, 0.776, 0);
const HEAD_TOP = V(0.828, 0.84, 0);
const HEAD_BOTTOM = V(0.78, 0.70, 0);
const STEERING_PIVOT = V(0.804, 0.77, 0);
const CRANK_LENGTH = 0.17;
const GEAR_TEETH = [32, 28, 24, 21, 18, 15, 13, 11];
const CHAIN_PITCH_RADIUS = 0.0127;
const CHAINRING_RADIUS = (42 * CHAIN_PITCH_RADIUS) / (Math.PI * 2);

function markPart<T extends THREE.Object3D>(object: T, id: BicyclePartId, partRoots: Map<BicyclePartId, THREE.Object3D>) {
  object.userData.partId = id;
  partRoots.set(id, object);
  return object;
}

function group(parent: THREE.Object3D, id: BicyclePartId, partRoots: Map<BicyclePartId, THREE.Object3D>) {
  const item = markPart(new THREE.Group(), id, partRoots);
  parent.add(item);
  return item;
}

function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, id?: BicyclePartId, partRoots?: Map<BicyclePartId, THREE.Object3D>) {
  const item = new THREE.Mesh(geometry, material);
  if (id && partRoots) markPart(item, id, partRoots);
  item.castShadow = true;
  item.receiveShadow = true;
  parent.add(item);
  return item;
}

function cylinderBetween(parent: THREE.Object3D, start: THREE.Vector3, end: THREE.Vector3, radius: number, material: THREE.Material, id: BicyclePartId, partRoots: Map<BicyclePartId, THREE.Object3D>, radialSegments = 12) {
  const axis = new THREE.Vector3().subVectors(end, start);
  const item = mesh(parent, new THREE.CylinderGeometry(radius, radius, axis.length(), radialSegments), material, id, partRoots);
  item.position.copy(start).add(end).multiplyScalar(0.5);
  item.quaternion.setFromUnitVectors(V(0, 1, 0), axis.normalize());
  return item;
}

function tubeBetween(parent: THREE.Object3D, points: THREE.Vector3[], radius: number, material: THREE.Material, id: BicyclePartId, partRoots: Map<BicyclePartId, THREE.Object3D>, segments = 18) {
  const curve = new THREE.CatmullRomCurve3(points);
  return mesh(parent, new THREE.TubeGeometry(curve, segments, radius, 8, false), material, id, partRoots);
}

function local(point: THREE.Vector3, origin: THREE.Vector3) {
  return point.clone().sub(origin);
}

function createWheelSpokes(parent: THREE.Object3D, material: THREE.Material, id: BicyclePartId, partRoots: Map<BicyclePartId, THREE.Object3D>) {
  const spokeRoot = group(parent, id, partRoots);
  const geometry = new THREE.CylinderGeometry(0.00135, 0.00135, 1, 6, 1, true);
  const spokes = new THREE.InstancedMesh(geometry, material, 32);
  spokes.castShadow = true;
  const axis = V(0, 1, 0);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  let index = 0;

  for (const side of [-1, 1]) {
    const hubFlange = side * 0.035;
    for (let spoke = 0; spoke < 16; spoke += 1) {
      const hubAngle = (spoke / 16) * Math.PI * 2 + (side > 0 ? Math.PI / 16 : 0);
      const crossed = (spoke % 2 === 0 ? 1 : -1) * (Math.PI / 4);
      const rimAngle = hubAngle + crossed;
      const from = V(Math.cos(hubAngle) * 0.024, Math.sin(hubAngle) * 0.024, hubFlange);
      const to = V(Math.cos(rimAngle) * (RIM_RADIUS - 0.009), Math.sin(rimAngle) * (RIM_RADIUS - 0.009), side * 0.006);
      const direction = new THREE.Vector3().subVectors(to, from);
      quaternion.setFromUnitVectors(axis, direction.clone().normalize());
      matrix.compose(from.add(to).multiplyScalar(0.5), quaternion, V(1, direction.length(), 1));
      spokes.setMatrixAt(index, matrix);
      index += 1;
    }
  }
  spokes.instanceMatrix.needsUpdate = true;
  spokes.userData.partId = id;
  spokeRoot.add(spokes);
  return spokeRoot;
}

function createTireTread(parent: THREE.Object3D, material: THREE.Material) {
  const tread = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.0035, 0.032), material, 120);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const zTurn = new THREE.Vector3(0, 0, 1);
  for (let index = 0; index < 120; index += 1) {
    const angle = (index / 120) * Math.PI * 2;
    position.set(Math.cos(angle) * 0.348, Math.sin(angle) * 0.348, 0);
    rotation.setFromAxisAngle(zTurn, angle + Math.PI / 2);
    matrix.compose(position, rotation, scale);
    tread.setMatrixAt(index, matrix);
  }
  tread.instanceMatrix.needsUpdate = true;
  parent.add(tread);
}

function createRotor(parent: THREE.Object3D, id: BicyclePartId, material: THREE.Material, darkMaterial: THREE.Material, partRoots: Map<BicyclePartId, THREE.Object3D>) {
  const rotor = group(parent, id, partRoots);
  mesh(rotor, new THREE.RingGeometry(0.047, 0.08, 64), material);
  mesh(rotor, new THREE.TorusGeometry(0.08, 0.0022, 6, 64), material);
  mesh(rotor, new THREE.TorusGeometry(0.047, 0.0022, 6, 48), material);
  const perforations = new THREE.InstancedMesh(new THREE.CircleGeometry(0.003, 8), darkMaterial, 20);
  const matrix = new THREE.Matrix4();
  const dummy = new THREE.Object3D();
  for (let index = 0; index < 20; index += 1) {
    const angle = (index / 20) * Math.PI * 2;
    dummy.position.set(Math.cos(angle) * 0.064, Math.sin(angle) * 0.064, 0.001);
    dummy.updateMatrix();
    matrix.copy(dummy.matrix);
    perforations.setMatrixAt(index, matrix);
  }
  perforations.instanceMatrix.needsUpdate = true;
  rotor.add(perforations);
  return rotor;
}

function createWheel(parent: THREE.Object3D, prefix: 'front' | 'rear', materials: BicycleMaterials, partRoots: Map<BicyclePartId, THREE.Object3D>) {
  const id = (suffix: string) => `${prefix}${suffix}` as BicyclePartId;
  const spin = new THREE.Group();
  spin.name = `${prefix}.wheelSpin`;
  parent.add(spin);

  const tireGroup = group(spin, id('Tire'), partRoots);
  mesh(tireGroup, new THREE.TorusGeometry(0.33, 0.019, 14, 112), materials.rubber);
  createTireTread(tireGroup, materials.black);

  const rimGroup = group(spin, id('Rim'), partRoots);
  mesh(rimGroup, new THREE.TorusGeometry(RIM_RADIUS, 0.0042, 8, 96), materials.silver);
  mesh(rimGroup, new THREE.TorusGeometry(RIM_RADIUS - 0.006, 0.0015, 6, 96), materials.metal);

  createWheelSpokes(spin, materials.metal, id('Spokes'), partRoots);

  const hubGroup = group(spin, id('Hub'), partRoots);
  const hubShell = mesh(hubGroup, new THREE.CylinderGeometry(0.022, 0.022, 0.078, 24), materials.silver);
  hubShell.rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) {
    const flange = mesh(hubGroup, new THREE.CylinderGeometry(0.030, 0.030, 0.005, 32), materials.metal);
    flange.rotation.x = Math.PI / 2;
    flange.position.z = side * 0.034;
  }

  const axleGroup = group(spin, id('Axle'), partRoots);
  const axle = mesh(axleGroup, new THREE.CylinderGeometry(0.0065, 0.0065, 0.12, 12), materials.metal);
  axle.rotation.x = Math.PI / 2;

  const reflectorGroup = group(spin, 'reflector', partRoots);
  for (const angle of [Math.PI / 3, (Math.PI * 4) / 3]) {
    const reflector = mesh(reflectorGroup, new THREE.BoxGeometry(0.018, 0.04, 0.008), materials.reflector);
    reflector.position.set(Math.cos(angle) * 0.33, Math.sin(angle) * 0.33, 0.023);
    reflector.rotation.z = angle;
  }

  return { spin, rotor: null as THREE.Group | null };
}

function createChainCurve(rearRadius: number) {
  const front = V(BOTTOM_BRACKET.x, BOTTOM_BRACKET.y, 0.118);
  const rear = V(REAR_AXLE.x, REAR_AXLE.y, 0.118);
  const points: THREE.Vector3[] = [];
  points.push(V(rear.x + rearRadius * 0.15, rear.y + rearRadius, rear.z));
  points.push(V(front.x - CHAINRING_RADIUS * 0.18, front.y + CHAINRING_RADIUS, front.z));
  for (let step = 1; step <= 12; step += 1) {
    const angle = Math.PI / 2 - (step / 12) * Math.PI;
    points.push(V(front.x + Math.cos(angle) * CHAINRING_RADIUS, front.y + Math.sin(angle) * CHAINRING_RADIUS, front.z));
  }
  points.push(V(rear.x + rearRadius * 0.15, rear.y - rearRadius, rear.z));
  for (let step = 1; step <= 12; step += 1) {
    const angle = -Math.PI / 2 - (step / 12) * Math.PI;
    points.push(V(rear.x + Math.cos(angle) * rearRadius, rear.y + Math.sin(angle) * rearRadius, rear.z));
  }
  return new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.04);
}

function createSpokesAsset() {
  return GEAR_TEETH.map((teeth) => (teeth * CHAIN_PITCH_RADIUS) / (Math.PI * 2));
}

function createBrake(
  parent: THREE.Object3D,
  which: 'front' | 'rear',
  origin: THREE.Vector3,
  materials: BicycleMaterials,
  partRoots: Map<BicyclePartId, THREE.Object3D>,
  steeringOrigin?: THREE.Vector3,
): BrakeMechanism {
  const id: BicyclePartId = which === 'front' ? 'frontCaliper' : 'rearCaliper';
  const toParent = (point: THREE.Vector3) => steeringOrigin ? local(point, steeringOrigin) : point.clone();
  const caliper = group(parent, id, partRoots);
  const caliperCenter = V(origin.x, origin.y + 0.015, 0.075);
  tubeBetween(caliper, [toParent(V(origin.x - 0.04, origin.y + 0.01, 0.045)), toParent(V(origin.x, origin.y + 0.02, 0.075)), toParent(V(origin.x + 0.04, origin.y + 0.01, 0.105))], 0.012, materials.black, id, partRoots);
  const pads: THREE.Group[] = [];
  const padRest: number[] = [];
  for (const side of [-1, 1]) {
    const pad = group(caliper, 'brakePad', partRoots);
    const position = toParent(V(caliperCenter.x, caliperCenter.y, 0.06 + side * 0.012));
    pad.position.copy(position);
    const padBody = mesh(pad, new THREE.BoxGeometry(0.07, 0.038, 0.012), materials.black);
    padBody.position.x = 0;
    pads.push(pad);
    padRest.push(pad.position.z);
  }

  const leverGroups: THREE.Group[] = [];
  const leverRest: number[] = [];
  const sign = which === 'front' ? 1 : -1;
  const leverPivot = V(0.83, 1.015, sign * 0.265);
  const lever = group(parent, 'brakeLever', partRoots);
  lever.position.copy(toParent(leverPivot));
  lever.userData.brakeWhich = which;
  cylinderBetween(lever, V(0, 0, 0), V(-0.075, -0.105, 0), 0.0065, materials.metal, 'brakeLever', partRoots, 10);
  leverGroups.push(lever);
  leverRest.push(0);

  const cablePoints = which === 'front'
    ? [V(0.82, 1.0, sign * 0.27), V(0.72, 0.88, 0.18), V(0.78, 0.7, 0.1), V(0.91, 0.52, 0.07), V(1.08, 0.39, 0.075)]
    : [V(0.82, 1.0, sign * 0.27), V(0.62, 0.92, 0.16), V(0.54, 0.5, 0.12), V(0.33, 0.3, 0.09), V(0.04, 0.45, 0.075)];
  tubeBetween(parent, cablePoints.map(toParent), 0.0045, materials.cable, 'brakeCable', partRoots, 38);
  return { pads, levers: leverGroups, leverRest, padRest };
}

export function createBicycleModel(materials: BicycleMaterials) {
  const root = new THREE.Group();
  root.name = 'UrbanCommuterBicycle';
  const partRoots = new Map<BicyclePartId, THREE.Object3D>();
  const layers: Record<BicycleLayer, THREE.Group> = {
    frame: new THREE.Group(),
    steering: new THREE.Group(),
    frontWheel: new THREE.Group(),
    rearWheel: new THREE.Group(),
    drivetrain: new THREE.Group(),
    frontBrake: new THREE.Group(),
    rearBrake: new THREE.Group(),
    seatAccessories: new THREE.Group(),
  };
  for (const [name, layer] of Object.entries(layers)) {
    layer.name = `layer.${name}`;
    layer.userData.layer = name;
    root.add(layer);
  }

  const { frame, steering: steeringPlaceholder, frontWheel: frontWheelPlaceholder, rearWheel, drivetrain, frontBrake: frontBrakePlaceholder, rearBrake: rearBrakePlaceholder, seatAccessories } = layers;
  const steeringPivot = new THREE.Group();
  steeringPivot.name = 'SteeringPivot';
  steeringPivot.position.copy(STEERING_PIVOT);
  root.add(steeringPivot);
  const steering = steeringPlaceholder;
  const frontWheelLayer = frontWheelPlaceholder;
  const frontBrakeLayer = frontBrakePlaceholder;
  const rearBrakeLayer = rearBrakePlaceholder;
  steeringPivot.add(steering, frontWheelLayer, frontBrakeLayer);
  root.add(rearBrakeLayer);

  // Main frame, built from individually selectable tubes and junctions.
  cylinderBetween(frame, REAR_AXLE, BOTTOM_BRACKET, 0.014, materials.frame, 'chainStay', partRoots);
  cylinderBetween(frame, V(REAR_AXLE.x, REAR_AXLE.y + 0.012, -0.035), V(BOTTOM_BRACKET.x, BOTTOM_BRACKET.y + 0.02, -0.035), 0.012, materials.frame, 'chainStay', partRoots);
  cylinderBetween(frame, REAR_AXLE, SEAT_TOP, 0.013, materials.frame, 'seatStay', partRoots);
  cylinderBetween(frame, V(REAR_AXLE.x, REAR_AXLE.y + 0.012, -0.035), V(SEAT_TOP.x, SEAT_TOP.y, -0.035), 0.011, materials.frame, 'seatStay', partRoots);
  cylinderBetween(frame, BOTTOM_BRACKET, SEAT_TOP, 0.023, materials.frame, 'seatTube', partRoots);
  cylinderBetween(frame, SEAT_TOP, HEAD_TOP, 0.021, materials.frame, 'topTube', partRoots);
  cylinderBetween(frame, BOTTOM_BRACKET, HEAD_BOTTOM, 0.027, materials.frame, 'downTube', partRoots);
  cylinderBetween(frame, HEAD_BOTTOM, HEAD_TOP, 0.031, materials.frame, 'headTube', partRoots);
  const bracket = group(frame, 'bottomBracket', partRoots);
  const bracketShell = mesh(bracket, new THREE.CylinderGeometry(0.036, 0.036, 0.13, 24), materials.silver);
  bracketShell.rotation.x = Math.PI / 2;
  bracket.position.copy(BOTTOM_BRACKET);
  for (const endpoint of [REAR_AXLE, SEAT_TOP, HEAD_TOP, HEAD_BOTTOM]) {
    const dropout = group(frame, endpoint === REAR_AXLE ? 'dropout' : 'frame', partRoots);
    const lug = mesh(dropout, new THREE.SphereGeometry(0.032, 14, 10), materials.frame);
    lug.position.copy(endpoint);
  }

  // Rotating headset and front fork share the inclined steering axis.
  for (const y of [HEAD_BOTTOM.y + 0.012, HEAD_TOP.y - 0.012]) {
    const bearing = group(steering, 'headset', partRoots);
    const ring = mesh(bearing, new THREE.TorusGeometry(0.036, 0.005, 8, 24), materials.silver);
    ring.rotation.x = Math.PI / 2;
    bearing.position.copy(local(V((HEAD_BOTTOM.x + HEAD_TOP.x) / 2, y, 0), STEERING_PIVOT));
  }
  const forkCrown = group(steering, 'fork', partRoots);
  cylinderBetween(forkCrown, local(V(0.78, 0.70, -0.05), STEERING_PIVOT), local(V(0.78, 0.70, 0.05), STEERING_PIVOT), 0.025, materials.silver, 'fork', partRoots);
  for (const side of [-1, 1]) {
    const curvePoints = [V(0.78, 0.70, side * 0.045), V(0.79, 0.59, side * 0.043), V(0.91, 0.42, side * 0.04), V(1.08, 0.349, side * 0.035)];
    tubeBetween(steering, curvePoints.map((point) => local(point, STEERING_PIVOT)), 0.013, materials.silver, 'fork', partRoots, 24);
  }
  const steerer = group(steering, 'fork', partRoots);
  cylinderBetween(steerer, local(V(0.79, 0.68, 0), STEERING_PIVOT), local(V(0.834, 0.89, 0), STEERING_PIVOT), 0.014, materials.silver, 'fork', partRoots);

  // Stem and the 680 mm flat handlebar.
  const stem = group(steering, 'stem', partRoots);
  cylinderBetween(stem, local(HEAD_TOP, STEERING_PIVOT), local(V(0.84, 0.995, 0), STEERING_PIVOT), 0.018, materials.silver, 'stem', partRoots);
  const handlebar = group(steering, 'handlebar', partRoots);
  tubeBetween(handlebar, [V(0.84, 1.03, -0.34), V(0.84, 1.03, -0.27), V(0.84, 1.035, 0), V(0.84, 1.03, 0.27), V(0.84, 1.03, 0.34)].map((point) => local(point, STEERING_PIVOT)), 0.011, materials.metal, 'handlebar', partRoots, 32);
  for (const side of [-1, 1]) {
    const grip = group(steering, 'grip', partRoots);
    tubeBetween(grip, [V(0.84, 1.03, side * 0.255), V(0.84, 1.03, side * 0.34)].map((point) => local(point, STEERING_PIVOT)), 0.018, materials.leather, 'grip', partRoots, 8);
  }

  // Separate front and rear wheel assemblies; the front assembly turns with the fork.
  frontWheelLayer.position.copy(local(FRONT_AXLE, STEERING_PIVOT));
  const frontWheel = createWheel(frontWheelLayer, 'front', materials, partRoots);
  const frontWheelSpin = frontWheel.spin;
  frontWheelSpin.userData.control = 'frontWheel';
  const frontRotor = createRotor(frontWheelSpin, 'frontRotor', materials.silver, materials.black, partRoots);
  frontRotor.position.z = 0.057;
  rearWheel.position.copy(REAR_AXLE);
  const rearWheelBuild = createWheel(rearWheel, 'rear', materials, partRoots);
  const rearWheelSpin = rearWheelBuild.spin;
  const rearRotor = createRotor(rearWheelSpin, 'rearRotor', materials.silver, materials.black, partRoots);
  rearRotor.position.z = 0.057;

  // Brakes are separate visibility layers; their discs remain attached to their rotating wheels.
  const frontBrakeMechanism = createBrake(frontBrakeLayer, 'front', FRONT_AXLE, materials, partRoots, STEERING_PIVOT);
  const rearBrakeMechanism = createBrake(rearBrakeLayer, 'rear', REAR_AXLE, materials, partRoots);
  for (const mechanism of [frontBrakeMechanism, rearBrakeMechanism]) {
    for (const pad of mechanism.pads) pad.userData.control = 'brake';
    for (const lever of mechanism.levers) lever.userData.control = 'brake';
  }

  // Seat assembly and commuter accessories.
  const seatPost = group(seatAccessories, 'seatPost', partRoots);
  cylinderBetween(seatPost, V(SEAT_TOP.x, SEAT_TOP.y - 0.03, 0), V(SEAT_TOP.x - 0.037, 0.894, 0), 0.014, materials.silver, 'seatPost', partRoots);
  const saddle = group(seatAccessories, 'saddle', partRoots);
  const saddleBody = mesh(saddle, new THREE.CapsuleGeometry(0.072, 0.13, 4, 12), materials.leather);
  saddleBody.rotation.z = -Math.PI / 2;
  saddleBody.position.set(SEAT_TOP.x - 0.037, 0.9, 0);
  const saddleRails = group(seatAccessories, 'saddle', partRoots);
  cylinderBetween(saddleRails, V(SEAT_TOP.x - 0.06, 0.858, -0.045), V(SEAT_TOP.x - 0.04, 0.858, 0.045), 0.0035, materials.metal, 'saddle', partRoots);

  // Drive train with eight visible sprockets and a moving chain-link belt.
  const cassetteSpin = new THREE.Group();
  cassetteSpin.name = 'CassetteSpin';
  cassetteSpin.position.copy(REAR_AXLE);
  drivetrain.add(cassetteSpin);
  const cassetteRings: THREE.Mesh[] = [];
  const radii = createSpokesAsset();
  for (const [index, radius] of radii.entries()) {
    const gearGroup = group(cassetteSpin, 'cassette', partRoots);
    gearGroup.position.z = 0.091 + index * 0.006;
    const ring = mesh(gearGroup, new THREE.TorusGeometry(radius, 0.0035, 6, 40), materials.metal, 'cassette', partRoots);
    ring.rotation.z = 0;
    cassetteRings.push(ring);
    for (let tooth = 0; tooth < GEAR_TEETH[index]; tooth += 1) {
      const angle = (tooth / GEAR_TEETH[index]) * Math.PI * 2;
      const pin = mesh(gearGroup, new THREE.BoxGeometry(0.009, 0.005, 0.003), materials.metal);
      pin.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      pin.rotation.z = angle;
    }
  }

  const crankPivot = new THREE.Group();
  crankPivot.position.copy(BOTTOM_BRACKET);
  crankPivot.position.z = 0.118;
  crankPivot.name = 'CrankPivot';
  drivetrain.add(crankPivot);
  crankPivot.userData.control = 'crank';
  const chainring = group(crankPivot, 'chainring', partRoots);
  mesh(chainring, new THREE.TorusGeometry(CHAINRING_RADIUS, 0.0045, 6, 72), materials.metal);
  mesh(chainring, new THREE.TorusGeometry(CHAINRING_RADIUS * 0.72, 0.003, 6, 56), materials.black);
  const teeth = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.011, 0.006), materials.metal, 42);
  const toothMatrix = new THREE.Matrix4();
  const toothDummy = new THREE.Object3D();
  for (let index = 0; index < 42; index += 1) {
    const angle = (index / 42) * Math.PI * 2;
    toothDummy.position.set(Math.cos(angle) * (CHAINRING_RADIUS + 0.004), Math.sin(angle) * (CHAINRING_RADIUS + 0.004), 0);
    toothDummy.rotation.z = angle;
    toothDummy.updateMatrix();
    toothMatrix.copy(toothDummy.matrix);
    teeth.setMatrixAt(index, toothMatrix);
  }
  chainring.add(teeth);
  const crankArms = group(crankPivot, 'crank', partRoots);
  for (const side of [-1, 1]) {
    const angle = side > 0 ? 0 : Math.PI;
    const endpoint = V(Math.cos(angle) * CRANK_LENGTH, Math.sin(angle) * CRANK_LENGTH, side * 0.09);
    cylinderBetween(crankArms, V(0, 0, side * 0.07), endpoint, 0.012, materials.black, 'crank', partRoots);
    const pedal = group(crankArms, 'pedal', partRoots);
    const pedalBody = mesh(pedal, new THREE.BoxGeometry(0.1, 0.02, 0.05), materials.black);
    pedalBody.position.copy(endpoint).add(V(0, 0, side * 0.015));
  }

  const chainCurves = radii.map((radius) => createChainCurve(radius));
  const chainMeshes = chainCurves.map((curve, index) => {
    const chain = group(drivetrain, 'chain', partRoots);
    const chainMesh = mesh(chain, new THREE.TubeGeometry(curve, 160, 0.0032, 6, true), materials.black, 'chain', partRoots);
    chain.visible = index === 0;
    return chainMesh;
  });
  const chainLinksGroup = group(drivetrain, 'chain', partRoots);
  chainLinksGroup.userData.control = 'chain';
  const chainLinks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.018, 0.007, 0.005), materials.silver, 72);
  chainLinks.castShadow = true;
  chainLinksGroup.add(chainLinks);

  const derailleur = group(drivetrain, 'derailleur', partRoots);
  tubeBetween(derailleur, [V(-0.025, 0.30, 0.115), V(-0.11, 0.255, 0.13), V(-0.09, 0.18, 0.13)], 0.012, materials.black, 'derailleur', partRoots, 12);
  for (const point of [V(-0.08, 0.24, 0.13), V(-0.08, 0.185, 0.13)]) {
    const pulley = mesh(derailleur, new THREE.TorusGeometry(0.022, 0.003, 6, 16), materials.metal, 'derailleur', partRoots);
    pulley.position.copy(point);
  }

  // Mudguards, a small rear rack, reflectors, and a foldable side stand.
  for (const [prefix, center] of [['rear', REAR_AXLE], ['front', FRONT_AXLE]] as const) {
    const fender = group(seatAccessories, 'fender', partRoots);
    const fenderPoints: THREE.Vector3[] = [];
    for (let step = 0; step <= 28; step += 1) {
      const angle = Math.PI * (0.13 + (0.74 * step) / 28);
      fenderPoints.push(V(center.x + Math.cos(angle) * 0.378, center.y + Math.sin(angle) * 0.378, 0.045));
    }
    tubeBetween(fender, fenderPoints, 0.008, materials.silver, 'fender', partRoots, 64);
    const braces = group(fender, 'fender', partRoots);
    cylinderBetween(braces, V(center.x - 0.28, center.y + 0.08, 0.045), V(center.x - 0.30, center.y + 0.02, 0.01), 0.003, materials.metal, 'fender', partRoots);
    cylinderBetween(braces, V(center.x + 0.28, center.y + 0.08, 0.045), V(center.x + 0.30, center.y + 0.02, 0.01), 0.003, materials.metal, 'fender', partRoots);
    if (prefix === 'front') {
      const lamp = group(seatAccessories, 'reflector', partRoots);
      const lens = mesh(lamp, new THREE.SphereGeometry(0.022, 12, 8), materials.reflector, 'reflector', partRoots);
      lens.position.set(1.08, 0.57, 0.01);
    }
  }

  const rack = group(seatAccessories, 'rack', partRoots);
  for (const side of [-1, 1]) {
    tubeBetween(rack, [V(-0.24, 0.76, side * 0.06), V(-0.22, 0.79, side * 0.06), V(0.18, 0.79, side * 0.06), V(0.21, 0.76, side * 0.06)], 0.007, materials.silver, 'rack', partRoots, 24);
    cylinderBetween(rack, V(-0.19, 0.77, side * 0.06), V(-0.03, 0.49, side * 0.045), 0.006, materials.silver, 'rack', partRoots);
    cylinderBetween(rack, V(0.17, 0.77, side * 0.06), V(0.02, 0.46, side * 0.045), 0.006, materials.silver, 'rack', partRoots);
  }
  for (const [z, colorMaterial] of [[0.04, materials.reflector], [-0.04, materials.reflector]] as const) {
    const reflector = group(seatAccessories, 'reflector', partRoots);
    const lens = mesh(reflector, new THREE.BoxGeometry(0.045, 0.025, 0.012), colorMaterial, 'reflector', partRoots);
    lens.position.set(-0.22, 0.7, z);
  }

  const sideStand = group(seatAccessories, 'sideStand', partRoots);
  sideStand.position.copy(BOTTOM_BRACKET);
  cylinderBetween(sideStand, V(0, 0, 0), V(0.12, -0.245, 0.09), 0.008, materials.black, 'sideStand', partRoots);
  const standFoot = mesh(sideStand, new THREE.BoxGeometry(0.045, 0.014, 0.025), materials.black, 'sideStand', partRoots);
  standFoot.position.set(0.12, -0.247, 0.09);
  sideStand.visible = false;

  // Extra pickups make the actual steering, cranks, chain, wheel rims, and levers draggable.
  const interactiveTargets: THREE.Object3D[] = [];
  const transparentHitMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const addHit = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, position: THREE.Vector3, control: string, partId: BicyclePartId) => {
    const target = mesh(parent, geometry, transparentHitMaterial, partId, partRoots);
    target.position.copy(position);
    target.userData.control = control;
    target.userData.hitTarget = true;
    interactiveTargets.push(target);
    return target;
  };
  addHit(steering, new THREE.SphereGeometry(0.12, 12, 8), local(V(0.84, 1.03, 0), STEERING_PIVOT), 'steer', 'handlebar');
  addHit(crankPivot, new THREE.TorusGeometry(0.17, 0.045, 8, 28), V(0, 0, 0), 'crank', 'crank');
  addHit(drivetrain, new THREE.SphereGeometry(0.09, 12, 8), V(0.2, 0.37, 0.12), 'chain', 'chain');
  addHit(frontWheelLayer, new THREE.TorusGeometry(0.33, 0.05, 6, 48), V(0, 0, 0.13), 'frontWheel', 'frontTire');
  addHit(rearWheel, new THREE.TorusGeometry(0.33, 0.05, 6, 48), V(0, 0, 0.13), 'rearWheel', 'rearTire');

  const layerRestPositions = Object.fromEntries(Object.entries(layers).map(([key, layer]) => [key, layer.position.clone()])) as Record<BicycleLayer, THREE.Vector3>;
  const explodeOffsets: Record<BicycleLayer, THREE.Vector3> = {
    frame: V(0, 0, 0),
    steering: V(-0.08, 0.26, -0.37),
    frontWheel: V(0.2, -0.02, 0.55),
    rearWheel: V(-0.22, 0.04, -0.55),
    drivetrain: V(0.02, -0.2, 0.46),
    frontBrake: V(0.25, 0.12, -0.2),
    rearBrake: V(-0.18, -0.1, 0.2),
    seatAccessories: V(-0.07, 0.31, 0.08),
  };

  return {
    root,
    layers,
    steeringPivot,
    frontWheelSpin,
    rearWheelSpin,
    cassetteSpin,
    crankPivot,
    chainCurves,
    chainMeshes,
    chainLinks,
    frontBrakeMechanism,
    rearBrakeMechanism,
    frontRotor,
    rearRotor,
    cassetteRings,
    sideStand,
    partRoots,
    interactiveTargets,
    layerRestPositions,
    explodeOffsets,
  } satisfies BicycleModel;
}

export function updateChainLinks(model: BicycleModel, gearIndex: number, phase: number) {
  const curve = model.chainCurves[gearIndex];
  const dummy = new THREE.Object3D();
  const tangent = new THREE.Vector3();
  const xAxis = V(1, 0, 0);
  for (let index = 0; index < model.chainLinks.count; index += 1) {
    const position = ((index / model.chainLinks.count + phase) % 1 + 1) % 1;
    curve.getPointAt(position, dummy.position);
    curve.getTangentAt(position, tangent);
    dummy.quaternion.setFromUnitVectors(xAxis, tangent);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    model.chainLinks.setMatrixAt(index, dummy.matrix);
  }
  model.chainLinks.instanceMatrix.needsUpdate = true;
}
