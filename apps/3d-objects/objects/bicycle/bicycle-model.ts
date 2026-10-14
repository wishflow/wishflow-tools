import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CHAIN_LINK_COUNT, CHAIN_PITCH, CASSETTE_TEETH, DERAILLEUR_BASE_Z, DERAILLEUR_PULLEY_RADIUS, makeChainRoute, solveDerailleurCageAngle, chainCircleContactErrorMm } from './chain-geometry';
import type { BicyclePartId } from './locales';

export type BicycleLayer = 'frame' | 'steering' | 'frontWheel' | 'rearWheel' | 'drivetrain' | 'frontBrake' | 'rearBrake' | 'seatAccessories';

export type BrakeMechanism = {
  pads: THREE.Group[];
  levers: THREE.Group[];
  leverRest: number[];
  padRest: number[];
};

export type BicycleModel = {
  root: THREE.Object3D;
  layers: Record<BicycleLayer, THREE.Group>;
  steeringPivot: THREE.Group;
  frontWheelSpin: THREE.Group;
  rearWheelSpin: THREE.Group;
  cassetteSpin: THREE.Group;
  crankPivot: THREE.Group;
  chainCurves: THREE.Curve<THREE.Vector3>[];
  chainCageAngles: number[];
  chainArcSpacingErrorsMm: number[];
  chainContactErrorsMm: { gearIndex: number; upper: number; lower: number };
  derailleurCage: THREE.Group;
  derailleurCageRestPosition: THREE.Vector3;
  derailleurUpperPulley: THREE.Group;
  derailleurLowerPulley: THREE.Group;
  derailleurPulleyRestRotations: number[];
  chainMeshes: THREE.Mesh[];
  chainLinks: THREE.InstancedMesh[];
  frontBrakeMechanism: BrakeMechanism;
  rearBrakeMechanism: BrakeMechanism;
  frontRotor: THREE.Group;
  rearRotor: THREE.Group;
  cassetteRings: THREE.Mesh[];
  sideStand: THREE.Group;
  sideStandFoot: THREE.Object3D;
  partRoots: Map<BicyclePartId, THREE.Object3D>;
  interactiveTargets: THREE.Object3D[];
  layerRestPositions: Record<BicycleLayer, THREE.Vector3>;
  explodeOffsets: Record<BicycleLayer, THREE.Vector3>;
};

const V = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);
const REAR_AXLE = V(0, 0.349, 0);
const FRONT_AXLE = V(1.075, 0.349, 0);
const BOTTOM_BRACKET = V(0.4409365, 0.289, 0);
const CHAINLINE = 0.05;

export const SIDE_STAND_AXIS = V(0, 0.63289, -0.774242).normalize();
export const SIDE_STAND_FOLDED_ANGLE = THREE.MathUtils.degToRad(84.405);
export const SIDE_STAND_DEPLOYED_ANGLE = 0;

function required<T extends THREE.Object3D>(root: THREE.Object3D, name: string): T {
  const object = root.getObjectByName(name);
  if (!object) throw new Error(`GLB 缺少必需节点：${name}`);
  return object as T;
}

function byRole(root: THREE.Object3D, role: string, which?: string) {
  const matches: THREE.Group[] = [];
  root.traverse((object) => {
    if (object.userData.motionRole !== role) return;
    if (which && object.userData.brakeWhich !== which) return;
    matches.push(object as THREE.Group);
  });
  return matches;
}

function createChainLinkGeometry() {
  const components: THREE.BufferGeometry[] = [];
  for (const z of [-0.0027, 0.0027]) {
    const plate = new THREE.BoxGeometry(0.0108, 0.0068, 0.0016);
    plate.translate(0, 0, z);
    components.push(plate);
  }
  for (const x of [-CHAIN_PITCH / 2, CHAIN_PITCH / 2]) {
    const roller = new THREE.CylinderGeometry(0.003875, 0.003875, 0.0062, 8);
    roller.rotateX(Math.PI / 2);
    roller.translate(x, 0, 0);
    components.push(roller);
  }
  const merged = mergeGeometries(components, false);
  for (const geometry of components) geometry.dispose();
  if (!merged) throw new Error('无法建立链节几何。');
  return merged;
}

function createBrakeMechanism(root: THREE.Object3D, which: 'front' | 'rear'): BrakeMechanism {
  const pads = byRole(root, 'brakePad', which);
  const levers = byRole(root, 'brakeLever', which);
  if (pads.length !== 2) throw new Error(`${which} brake must contain two movable pads; found ${pads.length}.`);
  if (levers.length !== 1) throw new Error(`${which} brake must contain one handlebar lever; found ${levers.length}.`);
  return {
    pads,
    levers,
    leverRest: levers.map((lever) => lever.rotation.z),
    padRest: pads.map((pad) => pad.position.z),
  };
}

function addHit(root: THREE.Object3D, geometry: THREE.BufferGeometry, position: THREE.Vector3, control: string, partId: BicyclePartId, targets: THREE.Object3D[]) {
  const target = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  target.position.copy(position);
  target.userData.control = control;
  target.userData.partId = partId;
  target.userData.hitTarget = true;
  root.add(target);
  targets.push(target);
  return target;
}

export function createBicycleModel(source: THREE.Object3D) {
  const root = source;
  root.name = 'UrbanCommuterBicycle';
  const partRoots = new Map<BicyclePartId, THREE.Object3D>();
  const layerMap = new Map<BicycleLayer, THREE.Group>();
  root.traverse((object) => {
    const partId = object.userData.partId as BicyclePartId | undefined;
    if (partId && !partRoots.has(partId)) partRoots.set(partId, object);
    const uiLayer = object.userData.uiLayer as BicycleLayer | undefined;
    if (uiLayer && LAYERS.includes(uiLayer)) layerMap.set(uiLayer, object as THREE.Group);
  });
  const layers = Object.fromEntries(LAYERS.map((layer) => [layer, layerMap.get(layer) ?? required<THREE.Group>(root, `layer.${layer}`)])) as Record<BicycleLayer, THREE.Group>;
  const steeringPivot = required<THREE.Group>(root, 'SteeringPivot');
  const frontWheelSpin = required<THREE.Group>(root, 'FrontWheelSpin');
  const rearWheelSpin = required<THREE.Group>(root, 'RearWheelSpin');
  const cassetteSpin = required<THREE.Group>(root, 'CassetteSpin');
  const crankPivot = required<THREE.Group>(root, 'CrankPivot');
  const sideStand = required<THREE.Group>(root, 'SideStandHinge');
  const sideStandFoot = required<THREE.Object3D>(root, 'SideStandFoot');
  const frontRotor = required<THREE.Group>(root, 'FrontRotor');
  const rearRotor = required<THREE.Group>(root, 'RearRotor');
  const derailleurCage = required<THREE.Group>(root, 'DerailleurCage');
  const derailleurUpperPulley = required<THREE.Group>(root, 'DerailleurUpperPulleySpin');
  const derailleurLowerPulley = required<THREE.Group>(root, 'DerailleurLowerPulleySpin');
  const frontBrakeMechanism = createBrakeMechanism(root, 'front');
  const rearBrakeMechanism = createBrakeMechanism(root, 'rear');
  const chainRoot = new THREE.Group();
  chainRoot.name = 'RuntimeChain';
  chainRoot.userData.partId = 'chain';
  chainRoot.userData.control = 'chain';
  layers.drivetrain.add(chainRoot);
  const chainCageAngles = CASSETTE_TEETH.map((teeth, index) => solveDerailleurCageAngle(teeth, 0.061 - (7 - index) * 0.0048));
  const chainRoutes = CASSETTE_TEETH.map((teeth, index) => makeChainRoute(teeth, 0.061 - (7 - index) * 0.0048, chainCageAngles[index]));
  const chainCurves = chainRoutes.map((route) => route.curve);
  const chainMeshes = chainCurves.map((curve, index) => {
    const object = new THREE.Mesh(new THREE.TubeGeometry(curve, 256, 0.0015, 5, true), new THREE.MeshStandardMaterial({ color: '#111616', roughness: 0.6, metalness: 0.35 }));
    object.name = `Chain.Path.${CASSETTE_TEETH[index]}T`;
    object.userData.partId = 'chain';
    object.visible = index === 0;
    chainRoot.add(object);
    return object;
  });
  const chainLinkGeometry = createChainLinkGeometry();
  const chainLinks = chainCurves.map((_, index) => {
    const links = new THREE.InstancedMesh(chainLinkGeometry, new THREE.MeshStandardMaterial({ color: '#7f8987', roughness: 0.31, metalness: 0.82 }), CHAIN_LINK_COUNT);
    links.name = `Chain.Links.${CASSETTE_TEETH[index]}T`;
    links.userData.partId = 'chain';
    links.userData.motionRole = 'chainMotion';
    links.visible = index === 0;
    chainRoot.add(links);
    return links;
  });
  const cassetteRings: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.Mesh && object.userData.partId === 'cassette' && CASSETTE_TEETH.includes(object.userData.teeth)) cassetteRings.push(object);
  });
  if (cassetteRings.length !== 8) throw new Error(`GLB must contain eight cassette gears; found ${cassetteRings.length}.`);
  frontWheelSpin.userData.control = 'frontWheel';
  rearWheelSpin.userData.control = 'rearWheel';
  crankPivot.userData.control = 'crank';
  sideStand.visible = false;

  const interactiveTargets: THREE.Object3D[] = [];
  addHit(root, new THREE.SphereGeometry(0.11, 12, 8), V(0.913, 0.931, 0), 'steer', 'handlebar', interactiveTargets);
  addHit(root, new THREE.TorusGeometry(0.17, 0.045, 8, 32), BOTTOM_BRACKET, 'crank', 'crank', interactiveTargets);
  addHit(root, new THREE.SphereGeometry(0.085, 12, 8), V(0.21, 0.37, CHAINLINE), 'chain', 'chain', interactiveTargets);
  addHit(root, new THREE.TorusGeometry(0.33, 0.035, 6, 64), FRONT_AXLE, 'frontWheel', 'frontTire', interactiveTargets);
  addHit(root, new THREE.TorusGeometry(0.33, 0.035, 6, 64), REAR_AXLE, 'rearWheel', 'rearTire', interactiveTargets);

  const layerRestPositions = Object.fromEntries(Object.entries(layers).map(([key, layer]) => [key, layer.position.clone()])) as Record<BicycleLayer, THREE.Vector3>;
  const explodeOffsets: Record<BicycleLayer, THREE.Vector3> = {
    frame: V(0, 0, 0),
    steering: V(-0.04, 0.10, -0.18),
    frontWheel: V(0.08, -0.015, 0.25),
    rearWheel: V(-0.08, 0.015, -0.25),
    drivetrain: V(0.02, -0.09, 0.22),
    frontBrake: V(0.12, 0.06, -0.1),
    rearBrake: V(-0.1, -0.06, 0.1),
    seatAccessories: V(-0.035, 0.14, 0.04),
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
    chainCageAngles,
    chainArcSpacingErrorsMm: chainRoutes.map((route) => route.arcSpacingErrorMm),
    chainContactErrorsMm: { gearIndex: -1, upper: Number.POSITIVE_INFINITY, lower: Number.POSITIVE_INFINITY },
    derailleurCage,
    derailleurCageRestPosition: derailleurCage.position.clone(),
    derailleurUpperPulley,
    derailleurLowerPulley,
    derailleurPulleyRestRotations: [derailleurUpperPulley.rotation.z, derailleurLowerPulley.rotation.z],
    chainMeshes,
    chainLinks,
    frontBrakeMechanism,
    rearBrakeMechanism,
    frontRotor,
    rearRotor,
    cassetteRings,
    sideStand,
    sideStandFoot,
    partRoots,
    interactiveTargets,
    layerRestPositions,
    explodeOffsets,
  } satisfies BicycleModel;
}

const LAYERS: BicycleLayer[] = ['frame', 'steering', 'frontWheel', 'rearWheel', 'drivetrain', 'frontBrake', 'rearBrake', 'seatAccessories'];

export function updateChainLinks(model: BicycleModel, gearIndex: number, phase: number) {
  const curve = model.chainCurves[gearIndex];
  const links = model.chainLinks[gearIndex];
  if (!curve || !links) return;
  const dummy = new THREE.Object3D();
  const tangent = new THREE.Vector3();
  const xAxis = V(1, 0, 0);
  const rearZ = 0.061 - (7 - gearIndex) * 0.0048;
  model.derailleurCage.rotation.z = model.chainCageAngles[gearIndex];
  model.derailleurCage.position.z = model.derailleurCageRestPosition.z + rearZ - DERAILLEUR_BASE_Z;
  const pulleyRotation = phase * Math.PI * 2 * CHAIN_LINK_COUNT / 13;
  model.derailleurUpperPulley.rotation.z = model.derailleurPulleyRestRotations[0] + pulleyRotation;
  model.derailleurLowerPulley.rotation.z = model.derailleurPulleyRestRotations[1] + pulleyRotation;
  if (model.chainContactErrorsMm.gearIndex !== gearIndex) {
    model.root.updateMatrixWorld(true);
    const localCenter = (pulley: THREE.Group) => model.root.worldToLocal(pulley.getWorldPosition(new THREE.Vector3()));
    const upper = localCenter(model.derailleurUpperPulley);
    const lower = localCenter(model.derailleurLowerPulley);
    const curve = model.chainCurves[gearIndex];
    model.chainContactErrorsMm = {
      gearIndex,
      upper: chainCircleContactErrorMm(curve, new THREE.Vector2(upper.x, upper.y), DERAILLEUR_PULLEY_RADIUS),
      lower: chainCircleContactErrorMm(curve, new THREE.Vector2(lower.x, lower.y), DERAILLEUR_PULLEY_RADIUS),
    };
  }
  for (let index = 0; index < links.count; index += 1) {
    const position = ((index / links.count + phase) % 1 + 1) % 1;
    curve.getPointAt(position, dummy.position);
    curve.getTangentAt(position, tangent);
    dummy.quaternion.setFromUnitVectors(xAxis, tangent.normalize());
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    links.setMatrixAt(index, dummy.matrix);
  }
  links.instanceMatrix.needsUpdate = true;
}
