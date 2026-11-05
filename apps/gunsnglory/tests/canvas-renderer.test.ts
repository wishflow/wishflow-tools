import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnemyView, GameView } from '../src/game';
import { drawGame, GAME_VIEWPORT, gameHudPointerActionAt, getHudMinimapGeometry, getMapViewport, mapDecorationDestination } from '../src/render/canvas-renderer';
import { mapCellToScreen } from '../src/render/map-viewport';

test('clips world tiles and depth-sorts scenery, units, shots, and wagon parts', () => {
  const mapImage = {} as HTMLImageElement;
  const hdpiTerrainImage = {} as HTMLImageElement;
  const bridgeImage = {} as HTMLImageElement;
  const verticalBridgeImage = {} as HTMLImageElement;
  const horizontalBridgeImage = {} as HTMLImageElement;
  const enemyImage = {} as HTMLImageElement;
  const femaleEnemyImage = {} as HTMLImageElement;
  const pioneerDeathImage = { naturalWidth: 96, naturalHeight: 24 } as HTMLImageElement;
  const wagonImage = {} as HTMLImageElement;
  const stagecoachImage = { naturalWidth: 144, naturalHeight: 216 } as HTMLImageElement;
  const stagecoachTurnImage = { naturalWidth: 96, naturalHeight: 72 } as HTMLImageElement;
  const horseWagonImage = {} as HTMLImageElement;
  const smokeImage = { naturalWidth: 384, naturalHeight: 64 } as HTMLImageElement;
  const unitImage = {} as HTMLImageElement;
  const shotImage = {} as HTMLImageElement;
  const wagonPartsImage = {} as HTMLImageElement;
  const cactusImage = { naturalWidth: 48, naturalHeight: 66 } as HTMLImageElement;
  const treeImage = { naturalWidth: 48, naturalHeight: 96 } as HTMLImageElement;
  const bushImage = { naturalWidth: 48, naturalHeight: 60 } as HTMLImageElement;
  const rocksImage = { naturalWidth: 48, naturalHeight: 66 } as HTMLImageElement;
  const shackImage = { naturalWidth: 96, naturalHeight: 72 } as HTMLImageElement;
  const drawCalls: unknown[][] = [];
  const fillCalls: Array<{ color: string; rect: number[] }> = [];
  const clipRects: number[][] = [];
  const decorationClipStates: boolean[] = [];
  const decorationViewportClipStates: boolean[] = [];
  const overlayText: string[] = [];
  const routeCommands: string[] = [];
  const routeLayerOrder: string[] = [];
  const enemyDrawAlphas: number[] = [];
  const pioneerDeathDraws: Array<{ args: unknown[]; alpha: number }> = [];
  const alphaStack: number[] = [];
  const mapClipStack: boolean[] = [];
  const viewportClipStack: boolean[] = [];
  let currentAlpha = 1;
  let currentFillStyle = '';
  let ellipseCalls = 0;
  let mapClipActive = false;
  let viewportClipActive = false;
  let pendingRect: number[] | undefined;
  const context = {
    save() {
      alphaStack.push(currentAlpha);
      mapClipStack.push(mapClipActive);
      viewportClipStack.push(viewportClipActive);
    },
    restore() {
      currentAlpha = alphaStack.pop() ?? 1;
      mapClipActive = mapClipStack.pop() ?? false;
      viewportClipActive = viewportClipStack.pop() ?? false;
    },
    get globalAlpha() { return currentAlpha; },
    set globalAlpha(value: number) { currentAlpha = value; },
    clearRect() {},
    translate() {},
    scale() {},
    fillRect(...rect: number[]) { fillCalls.push({ color: currentFillStyle, rect }); },
    get fillStyle() { return currentFillStyle; },
    set fillStyle(value: string) { currentFillStyle = value; },
    beginPath() {},
    rect(...args: number[]) { pendingRect = args; },
    clip() {
      if (pendingRect) {
        clipRects.push(pendingRect);
        if (clipRects.length === 1) viewportClipActive = true;
        if (clipRects.length === 2) mapClipActive = true;
      }
    },
    drawImage(...args: unknown[]) {
      drawCalls.push(args);
      if (args[0] === mapImage || args[0] === hdpiTerrainImage) routeLayerOrder.push('background');
      if (args[0] === bridgeImage || args[0] === verticalBridgeImage || args[0] === horizontalBridgeImage) {
        routeLayerOrder.push('bridge');
      }
      if (args[0] === enemyImage) enemyDrawAlphas.push(currentAlpha);
      if (args[0] === pioneerDeathImage) pioneerDeathDraws.push({ args, alpha: currentAlpha });
      if (args[0] === cactusImage || args[0] === treeImage || args[0] === bushImage) {
        decorationClipStates.push(mapClipActive);
        decorationViewportClipStates.push(viewportClipActive);
      }
    },
    moveTo() { routeCommands.push('moveTo'); routeLayerOrder.push('route'); },
    lineTo() { routeCommands.push('lineTo'); },
    arc() {},
    ellipse() { ellipseCalls += 1; },
    stroke() {},
    fill() {},
    setLineDash() {},
    measureText(text: string) { return { width: text.length * 6 } as TextMetrics; },
    fillText(text: string) { overlayText.push(text); },
  } as unknown as CanvasRenderingContext2D;
  const sampleEnemy = {
    id: 'pioneer-1',
    type: 1,
    asset: 'pioneer_male',
    speed: 5,
    direction: 'south',
    positionFine: { x: (4 * 7680) + 3840, y: (6 * 7680) + 3840 },
    hitPoints: 18,
    maxHitPoints: 18,
    alive: true,
    deathRemainingMs: 0,
    animationFrame: 2,
  } satisfies EnemyView;
  const view: GameView = {
    frame: 0,
    elapsedMs: 0,
    paused: false,
    scenarioId: 'cow-gulch',
    route: [{ x: -1.5, y: 10.5 }, { x: 4.5, y: 10.5 }, { x: 16.5, y: 3.5 }],
    map: {
      width: 17,
      height: 17,
      tileSize: 32,
      background: [{
        asset: 'ground', source: { x: 0, y: 0, width: 32, height: 32 },
        x: 0, y: 0, width: 1, height: 1,
      }, {
        asset: 'tiles_desert', source: { x: 32, y: 0, width: 32, height: 32 },
        x: 1, y: 0, width: 1, height: 1,
      }],
      streets: [{
        asset: 'bridge', source: { x: 0, y: 0, width: 48, height: 32 },
        x: 11.75, y: 9, width: 1.5, height: 1,
      }],
      decorations: [
        { asset: 'e_1x1_tree', cell: { x: 6, y: 7 } },
        { asset: 'e_1x1_cactus_a', cell: { x: 5, y: 6 } },
        { asset: 'e_1x1_bush', cell: { x: 9, y: 9 } },
        { asset: 'b_2x1_shack', cell: { x: 15, y: 7 }, anchorOffsetX: -0.5 },
        { asset: 'e_1x1_cactus_b', cell: { x: 8, y: 7 } },
        { asset: 'e_1x1_rocks_a', cell: { x: 9, y: 7 } },
      ],
    },
    units: [{
      id: 'gunslinger-1', type: 'gunslinger', asset: 'unit',
      cell: { x: 8, y: 8 },
      movementSpeedFinePer100Ms: 1500,
      selected: false,
      moving: false,
      upgradeLevel: 0,
      positionFine: { x: (8 * 7680) + 3840, y: (8 * 7680) + 5760 },
      attackRange: {
        centerTenthTiles: { x: 85, y: 82 },
        maximumTenthTiles: 50,
        boundary: 'exclusive',
      },
      frame: { x: 0, y: 0, width: 32, height: 44 },
      render: { x: 8, y: 7.625, width: 1, height: 1.375 },
      hitArea: { x: 8, y: 7.625, width: 1, height: 1.375 },
      weapon: {
        damage: 10,
        damageType: 'light',
        rangeFine: 38400,
        reloadTimeMs: 500,
        projectileSpeed: 100,
        damageStyle: 0,
      },
    }],
    enemies: [
      sampleEnemy,
      { ...sampleEnemy, id: 'pioneer-outside-map', positionFine: { x: -3840, y: sampleEnemy.positionFine.y } },
      { ...sampleEnemy, id: 'pioneer-overhanging-map-edge', positionFine: { x: -768, y: sampleEnemy.positionFine.y } },
    ],
    shots: [{
      id: 'dynamite-1',
      shooterId: 'gunslinger-1',
      targetId: 'pioneer-1',
      positionFine: { x: (9 * 7680) + 1920, y: (6 * 7680) + 3840 },
      remainingMs: 100,
      damageStyle: 3,
      imageAsset: 'sfx_mexican_dynamite',
      animationFrame: 0,
      fineZ: 0,
      heightFine: 3840,
    }],
    wagonDebris: [{
      id: 'wagon-part-1',
      positionFine: { x: (9 * 7680) + 3840, y: (10 * 7680) + 3840 },
      depthFineY: (9 * 7680) + 3840,
      heightFine: 3840,
      frame: 2,
    }],
    drawOrder: [
      'shot:dynamite-1', 'enemy:pioneer-1', 'enemy:pioneer-outside-map', 'enemy:pioneer-overhanging-map-edge',
      'decoration:1', 'decoration:3', 'decoration:5', 'decoration:4', 'decoration:0',
      'unit:gunslinger-1', 'wagon-debris:wagon-part-1', 'decoration:2',
    ],
    recruitPool: [],
    events: [],
  };

  const images = {
    ground: mapImage,
    tiles_desert: hdpiTerrainImage,
    bridge: bridgeImage,
    tiles_bridge_verti: verticalBridgeImage,
    tiles_bridge_hori: horizontalBridgeImage,
    pioneer_male: enemyImage,
    pioneer_female: femaleEnemyImage,
    sfx_death_pioneers: pioneerDeathImage,
    wagon: wagonImage,
    stagecoach: stagecoachImage,
    horse_wagon: horseWagonImage,
    sfx_smoke_explosion: smokeImage,
    unit: unitImage,
    e_1x1_cactus_a: cactusImage,
    e_1x1_cactus_b: cactusImage,
    e_1x1_tree: treeImage,
    e_1x1_bush: bushImage,
    e_1x1_rocks_a: rocksImage,
    b_2x1_shack: shackImage,
    sfx_mexican_dynamite: { ...shotImage, naturalWidth: 48, naturalHeight: 16 } as HTMLImageElement,
    sfx_exploding_parts: { ...wagonPartsImage, naturalWidth: 72, naturalHeight: 12 } as HTMLImageElement,
  };
  drawGame(context, view, images);

  const viewport = getMapViewport(view);
  assert.deepEqual(clipRects, [
    [0, 0, GAME_VIEWPORT.width, GAME_VIEWPORT.height],
    [viewport.origin.x, viewport.origin.y, viewport.mapWidth, viewport.mapHeight],
  ], 'world tile layers are clipped to map bounds inside the game viewport');
  const mapDraw = drawCalls.find((args) => args[0] === mapImage);
  assert.ok(mapDraw);
  assert.deepEqual(mapDraw.slice(5), [viewport.origin.x, viewport.origin.y, viewport.tileSize, viewport.tileSize]);
  const hdpiTerrainDraw = drawCalls.find((args) => args[0] === hdpiTerrainImage);
  assert.ok(hdpiTerrainDraw);
  assert.deepEqual(hdpiTerrainDraw.slice(1, 5), [48, 0, 48, 48], 'mdpi atlas crops scale to the matching APK hdpi source pixels');
  assert.deepEqual(hdpiTerrainDraw.slice(5), [viewport.origin.x + viewport.tileSize, viewport.origin.y, viewport.tileSize, viewport.tileSize],
    'density selection does not change map-cell size or placement');
  const enemyDraw = drawCalls.find((args) => args[0] === enemyImage);
  assert.ok(enemyDraw);
  assert.deepEqual(enemyDraw.slice(1, 5), [32, 24, 16, 24]);
  const enemyDraws = drawCalls.filter((args) => args[0] === enemyImage);
  assert.equal(enemyDraws.length, 2, 'fully off-map enemies are hidden while a sprite that still overlaps the map remains visible');
  const overhangingEnemy = enemyDraws[1];
  assert.ok(overhangingEnemy);
  assert.ok((overhangingEnemy[5] as number) < viewport.origin.x);
  assert.ok((overhangingEnemy[5] as number) + (overhangingEnemy[7] as number) > viewport.origin.x,
    'map-edge visibility uses intersection without clipping the sprite at the map edge');

  const decorationDraws = drawCalls.filter((args) => args[0] === cactusImage || args[0] === treeImage
    || args[0] === bushImage || args[0] === rocksImage || args[0] === shackImage);
  assert.deepEqual(decorationDraws.map(([image]) => image), [cactusImage, shackImage, rocksImage, cactusImage, treeImage, bushImage],
    'same-depth static decorations draw in reverse map-scan insertion order');
  assert.deepEqual(decorationDraws[0]?.slice(1), [302, 115, 60, 82]);
  const shackDecoration = view.map.decorations?.find(({ asset }) => asset === 'b_2x1_shack');
  assert.ok(shackDecoration);
  const expectedShackDestination = mapDecorationDestination(shackDecoration, { width: 96, height: 72 }, viewport);
  const actualShackDraw = decorationDraws.find(([image]) => image === shackImage);
  assert.ok(actualShackDraw);
  assert.deepEqual(actualShackDraw.slice(1), [
    expectedShackDestination.x,
    expectedShackDestination.y,
    expectedShackDestination.width,
    expectedShackDestination.height,
  ], 'the APK hdpi map cart retains the original logical footprint and anchor');
  assert.deepEqual(decorationDraws.slice(1, 5).map((args) => args[1]), [842, 542, 482, 362],
    'equal-depth map objects draw in reverse row-major insertion order');
  assert.deepEqual(decorationClipStates, [false, false, false, false], 'tall scenery may overhang a map edge but stays within the game viewport');
  assert.deepEqual(decorationViewportClipStates, [true, true, true, true], 'scenery overhang remains clipped to the game viewport');
  assert.ok(
    drawCalls.findIndex(([image]) => image === treeImage) < drawCalls.findIndex(([image]) => image === unitImage),
    'a unit with a lower ground anchor renders in front of scenery behind it',
  );
  assert.ok(
    drawCalls.findIndex(([image]) => image === unitImage) < drawCalls.findIndex(([image]) => image === bushImage),
    'scenery with a lower ground anchor renders in front of a unit behind it',
  );

  const routeCellCenter = mapCellToScreen(viewport, 4.5, 6.5);
  const [, , , , , enemyLeft, enemyTop, enemyWidth, enemyHeight] = enemyDraw;
  assert.equal((enemyLeft as number) + (enemyWidth as number) / 2, routeCellCenter.x);
  assert.equal((enemyTop as number) + (enemyHeight as number), routeCellCenter.y);

  const femaleWalkerView: GameView = {
    ...view,
    units: [],
    enemies: [{
      ...sampleEnemy,
      id: 'pioneer-female',
      type: 2,
      asset: 'pioneer_female',
      direction: 'west',
      mirrored: false,
      animationFrame: 1,
    }],
    shots: [],
    wagonDebris: [],
    drawOrder: ['enemy:pioneer-female'],
  };
  const femaleDrawStart = drawCalls.length;
  drawGame(context, femaleWalkerView, images);
  const femaleDraw = drawCalls.slice(femaleDrawStart).find(([image]) => image === femaleEnemyImage);
  assert.ok(femaleDraw);
  assert.deepEqual(femaleDraw.slice(1, 5), [16, 0, 16, 24], 'type 2 uses the west-facing frame from its original 3×3 atlas');
  const femaleViewport = getMapViewport(femaleWalkerView);
  assert.equal((femaleDraw[5] as number) + (femaleDraw[7] as number) / 2,
    femaleViewport.origin.x + (sampleEnemy.positionFine.x / 240) * femaleViewport.scaleFactor);
  assert.equal((femaleDraw[6] as number) + (femaleDraw[8] as number),
    femaleViewport.origin.y + (sampleEnemy.positionFine.y / 240) * femaleViewport.scaleFactor,
  'type 2 remains anchored to its feet while walking');

  assert.deepEqual(
    drawCalls.slice(0, femaleDrawStart).map((args) => args[0]),
    [mapImage, hdpiTerrainImage, images.sfx_mexican_dynamite, enemyImage, enemyImage, bridgeImage, cactusImage, shackImage, rocksImage, cactusImage,
      treeImage, unitImage, images.sfx_exploding_parts, bushImage],
    'a shot created after its target draws first when both share the same under-road depth',
  );
  const dynamiteDraw = drawCalls.find((args) => args[0] === images.sfx_mexican_dynamite);
  assert.ok(dynamiteDraw);
  assert.equal(
    (dynamiteDraw[6] as number) + (dynamiteDraw[8] as number),
    viewport.origin.y + ((view.shots[0]!.positionFine.y - view.shots[0]!.heightFine) / 240) * viewport.scaleFactor,
    'the elevated sprite remains bottom-anchored to its ground position minus the original arc offset',
  );

  const movementStart = drawCalls.length;
  drawGame(context, {
    ...view,
    frame: 1,
    units: [{ ...view.units[0]!, positionFine: { ...view.units[0]!.positionFine, y: 10 * 7680 } }],
  }, images);
  const movementImages = drawCalls.slice(movementStart).map(([image]) => image);
  assert.ok(
    movementImages.indexOf(unitImage) < movementImages.indexOf(bushImage),
    'a unit that moves down to a static prop’s exact depth keeps its prior queue position',
  );

  const topRouteView = {
    ...view,
    enemies: [{
      ...view.enemies[0]!,
      positionFine: { x: (12 * 7680) + 3840, y: (2 * 7680) + 3840 },
    }],
  };
  const topRouteViewport = getMapViewport(topRouteView);
  assert.equal(topRouteViewport.origin.y, viewport.origin.y);
  assert.equal(
    topRouteViewport.origin.y + (topRouteView.enemies[0]!.positionFine.y / 240) * topRouteViewport.scaleFactor,
    viewport.origin.y + (2.5 * viewport.tileSize),
    'the camera stays fixed while the map is cropped by the playfield',
  );

  const bottomRouteView = {
    ...view,
    enemies: [{
      ...view.enemies[0]!,
      positionFine: { x: (12 * 7680) + 3840, y: (13 * 7680) + 3840 },
    }],
  };
  const bottomRouteViewport = getMapViewport(bottomRouteView);
  assert.equal(bottomRouteViewport.origin.y, viewport.origin.y);
  const bottomEnemyFeet = bottomRouteViewport.origin.y
    + (bottomRouteView.enemies[0]!.positionFine.y / 240) * bottomRouteViewport.scaleFactor;
  assert.ok(bottomEnemyFeet < viewport.origin.y + viewport.mapHeight);
  assert.ok(bottomEnemyFeet - 24 * bottomRouteViewport.scaleFactor > viewport.origin.y);

  const fractionalEnemyView = {
    ...view,
    enemies: [{
      ...view.enemies[0]!,
      positionFine: {
        ...view.enemies[0]!.positionFine,
        y: view.enemies[0]!.positionFine.y + 123,
      },
    }],
  };
  for (const displayPixelScale of [0.668, 1, 1.3, 1.5, 2]) {
    const snappedViewport = getMapViewport(fractionalEnemyView, displayPixelScale);
    assert.ok(
      Math.abs(snappedViewport.origin.x * displayPixelScale - Math.round(snappedViewport.origin.x * displayPixelScale)) < 1e-9,
      `map x origin aligns to display pixels at scale ${displayPixelScale}`,
    );
    assert.ok(
      Math.abs(snappedViewport.origin.y * displayPixelScale - Math.round(snappedViewport.origin.y * displayPixelScale)) < 1e-9,
      `map y origin aligns to display pixels at scale ${displayPixelScale}`,
    );
  }
  const bottomAtFractionalScale = getMapViewport(bottomRouteView, 1.3);
  assert.ok(bottomAtFractionalScale.origin.x >= 0);
  assert.ok(bottomAtFractionalScale.origin.y < 0);
  assert.ok(bottomAtFractionalScale.origin.x + bottomAtFractionalScale.mapWidth <= GAME_VIEWPORT.width);
  assert.ok(bottomAtFractionalScale.origin.y + bottomAtFractionalScale.mapHeight > GAME_VIEWPORT.height);
  assert.ok(
    Math.abs(bottomAtFractionalScale.origin.y * 1.3 - Math.round(bottomAtFractionalScale.origin.y * 1.3)) < 1e-9,
    'the centered map stays aligned to the display-pixel grid',
  );

  routeLayerOrder.length = 0;
  drawGame(context, view, images, 1, undefined, true);
  const mapFrameImage = { naturalWidth: 192, naturalHeight: 192 } as HTMLImageElement;
  const mapFrameDrawStart = drawCalls.length;
  drawGame(context, view, { ...images, gng_frame: mapFrameImage }, 1, { zoom: 1, offsetX: 118, offsetY: 342 });
  const mapFrameDraws = drawCalls.slice(mapFrameDrawStart).filter(([image]) => image === mapFrameImage);
  assert.ok(mapFrameDraws.length > 0, 'exposed map edges draw the original frame atlas');
  assert.deepEqual(mapFrameDraws[0]?.slice(1, 5), [0, 96, 48, 48], 'the frame uses a quarter-cell from the APK 4×4 atlas');
  assert.deepEqual(mapFrameDraws[0]?.slice(5), [0, 0, 60, 60], 'frame tiles align to the logical map tile size');
  const priorityCrosshair = { naturalWidth: 64, naturalHeight: 16 } as HTMLImageElement;
  const priorityDrawStart = drawCalls.length;
  drawGame(context, { ...view, priorityTargetId: 'pioneer-1', elapsedMs: 0 }, {
    ...images,
    hud_crosshair: priorityCrosshair,
  });
  const priorityDraws = drawCalls.slice(priorityDrawStart).filter((args) => args[0] === priorityCrosshair);
  assert.equal(priorityDraws.length, 2, 'the original marker draws above and below the preferred target');
  assert.deepEqual(priorityDraws[0]?.slice(1, 5), [0, 0, 16, 16], 'the APK atlas uses its first 16×16 marker frame');
  assert.equal(priorityDraws[0]?.[5], priorityDraws[1]?.[5], 'both marker halves stay centered on the target');
  assert.ok((priorityDraws[0]?.[6] as number) + 16 < (priorityDraws[1]?.[6] as number),
    'the pulsing marker halves remain separated around the enemy sprite');
  assert.equal(routeCommands.filter((command) => command === 'lineTo').length, view.route!.length - 1);
  assert.ok(routeLayerOrder.indexOf('background') < routeLayerOrder.indexOf('route'));
  assert.ok(routeLayerOrder.indexOf('route') < routeLayerOrder.indexOf('bridge'),
    'bridge art covers the diagnostic route line, matching draw order without assigning route elevation');
  assert.ok(overlayText.includes('Unit gunslinger · R < 5.0'));
  assert.ok(overlayText.includes('Pioneer HP 18/18'));

  routeCommands.length = 0;
  const secondRoute = [{ x: 3.5, y: -1.5 }, { x: 3.5, y: 4.5 }, { x: 8.5, y: 17.5 }];
  drawGame(context, { ...view, routes: [view.route!, secondRoute] }, images, 1, undefined, true);
  assert.equal(routeCommands.filter((command) => command === 'moveTo').length, 2,
    'inspection draws each independent attack lane');
  assert.equal(routeCommands.filter((command) => command === 'lineTo').length,
    (view.route!.length - 1) + (secondRoute.length - 1),
  'inspection preserves each route’s waypoint geometry');

  const horsemanImage = { naturalWidth: 128, naturalHeight: 120 } as HTMLImageElement;
  const horsemanTurnImage = { naturalWidth: 64, naturalHeight: 40 } as HTMLImageElement;
  const horseman: EnemyView = {
    ...sampleEnemy,
    id: 'horseman-1',
    type: 3,
    asset: 'horseman',
    direction: 'south',
    animationFrame: 2,
  };
  drawCalls.length = 0;
  drawGame(context, { ...view, units: [], enemies: [horseman], shots: [], wagonDebris: [], drawOrder: ['enemy:horseman-1'] }, {
    ...images,
    horseman: horsemanImage,
  });
  const horsemanDraw = drawCalls.find(([image]) => image === horsemanImage);
  assert.ok(horsemanDraw);
  assert.deepEqual(horsemanDraw.slice(1, 5), [64, 40, 32, 40], 'Horseman uses one original 32×40 frame from its 4×3 sheet');
  assert.deepEqual(horsemanDraw.slice(7, 9), [60, 75], 'Horseman keeps its original logical sprite size');
  assert.equal((horsemanDraw[6] as number) + (horsemanDraw[8] as number),
    getMapViewport(view).origin.y + (horseman.positionFine.y / 240) * getMapViewport(view).scaleFactor,
  'Horseman remains anchored to the route foot position');

  drawCalls.length = 0;
  drawGame(context, {
    ...view,
    units: [],
    enemies: [{ ...horseman, turningAnimation: { asset: 'horseman_turn', frame: 1, mirrored: false } }],
    shots: [],
    wagonDebris: [],
    drawOrder: ['enemy:horseman-1'],
  }, { ...images, horseman: horsemanImage, horseman_turn: horsemanTurnImage });
  const horsemanTurnDraw = drawCalls.find(([image]) => image === horsemanTurnImage);
  assert.ok(horsemanTurnDraw);
  assert.deepEqual(horsemanTurnDraw.slice(1, 5), [32, 0, 32, 40], 'Horseman turns use the two-frame APK turn sheet');

  const stagecoach: EnemyView = {
    ...sampleEnemy,
    id: 'stagecoach-1',
    type: 5,
    asset: 'stagecoach',
    direction: 'east',
    animationFrame: 2,
  };
  drawCalls.length = 0;
  drawGame(context, { ...view, units: [], enemies: [stagecoach], shots: [], wagonDebris: [], drawOrder: ['enemy:stagecoach-1'] }, images);
  const stagecoachDraw = drawCalls.find(([image]) => image === stagecoachImage);
  assert.ok(stagecoachDraw);
  assert.deepEqual(stagecoachDraw.slice(1, 5), [96, 0, 48, 72], 'Post Coach crops the APK 48×72 frame from its 3×3 atlas');
  assert.deepEqual(stagecoachDraw.slice(7, 9), [60, 90], 'Post Coach uses its 32×48 logical footprint at the current map scale');
  assert.equal((stagecoachDraw[6] as number) + (stagecoachDraw[8] as number),
    getMapViewport(view).origin.y + (stagecoach.positionFine.y / 240) * getMapViewport(view).scaleFactor,
    'Post Coach remains anchored to the route foot position');

  drawCalls.length = 0;
  drawGame(context, {
    ...view,
    units: [],
    enemies: [{ ...stagecoach, turningAnimation: { asset: 'stagecoach_turn', frame: 1, mirrored: false } }],
    shots: [],
    wagonDebris: [],
    drawOrder: ['enemy:stagecoach-1'],
  }, { ...images, stagecoach_turn: stagecoachTurnImage });
  const stagecoachTurnDraw = drawCalls.find(([image]) => image === stagecoachTurnImage);
  assert.ok(stagecoachTurnDraw);
  assert.deepEqual(stagecoachTurnDraw.slice(1, 5), [48, 0, 48, 72], 'Post Coach uses the original two-frame turn atlas');
  assert.deepEqual(stagecoachTurnDraw.slice(7, 9), [60, 90]);

  for (const [deathRemainingMs, frame] of [[599, 0], [500, 0], [499, 1], [100, 4], [99, 5], [0, 5]] as const) {
    pioneerDeathDraws.length = 0;
    drawGame(context, {
      ...view,
      enemies: [{ ...view.enemies[0]!, alive: false, deathRemainingMs }],
    }, images);
    const deathDraw = pioneerDeathDraws.at(-1);
    assert.ok(deathDraw, `ordinary enemy death uses its sprite sheet at ${deathRemainingMs}ms remaining`);
    assert.deepEqual(deathDraw.args.slice(1, 5), [frame * 16, 0, 16, 24]);
    assert.equal(deathDraw.alpha, 1, 'the original death animation stays fully opaque');
  }

  for (const [type, asset, bodyImage, frameHeight, drawHeight] of [
    [4, 'wagon', wagonImage, 60, 75],
    [5, 'stagecoach', stagecoachImage, 72, 90],
    [8, 'horse_wagon', horseWagonImage, 60, 75],
  ] as const) {
    for (const [deathRemainingMs, smokeFrame, bodyVisible] of [
      [799, 0, true],
      [700, 0, true],
      [699, 1, true],
      [351, 4, true],
      [350, 4, false],
      [1, 7, false],
      [0, 7, false],
    ] as const) {
      drawCalls.length = 0;
      const deadVehicle = {
        ...view.enemies[0]!,
        type,
        asset,
        alive: false,
        deathRemainingMs,
      };
      drawGame(context, { ...view, enemies: [deadVehicle] }, images);
      const bodyDraws = drawCalls.filter(([image]) => image === bodyImage);
      assert.equal(bodyDraws.length, bodyVisible ? 1 : 0,
        'vehicle body visibility matches the original 350 ms cutoff at ' + deathRemainingMs + ' ms');
      if (bodyDraws[0]) {
        assert.deepEqual(bodyDraws[0].slice(3, 5), [48, frameHeight], 'vehicles crop one APK hdpi atlas frame');
        assert.deepEqual(bodyDraws[0].slice(7, 9), [60, drawHeight], 'vehicle frames retain their original logical draw size');
      }
      const smokeDraw = drawCalls.find(([image]) => image === smokeImage);
      assert.ok(smokeDraw, 'death style for enemy type ' + type + ' keeps its smoke at ' + deathRemainingMs + ' ms');
      assert.deepEqual(smokeDraw.slice(1, 5), [smokeFrame * 48, 0, 48, 64],
        'enemy type ' + type + ' uses the original smoke frame at ' + deathRemainingMs + ' ms');
      const centerX = viewport.origin.x + (deadVehicle.positionFine.x / 240) * viewport.scaleFactor;
      const feetY = viewport.origin.y + (deadVehicle.positionFine.y / 240) * viewport.scaleFactor;
      assert.deepEqual(smokeDraw.slice(5), [
        centerX - (24 * viewport.scaleFactor),
        feetY - (64 * viewport.scaleFactor),
        48 * viewport.scaleFactor,
        64 * viewport.scaleFactor,
      ], 'the smoke atlas stays aligned to the enemy ground anchor');
      if (bodyDraws[0]) {
        assert.ok(drawCalls.indexOf(bodyDraws[0]) < drawCalls.indexOf(smokeDraw),
          'the smoke draws over the vehicle body');
      }
    }
  }

  const damagedWagon = {
    ...view.enemies[0]!,
    type: 4 as const,
    asset: 'wagon' as const,
    hitPoints: 94,
    maxHitPoints: 100,
  };
  fillCalls.length = 0;
  drawGame(context, { ...view, enemies: [damagedWagon] }, { ...images, wagon: {} as HTMLImageElement });
  const healthBarBackground = fillCalls.filter(({ color }) => color === '#3f0000');
  const healthBarFill = fillCalls.filter(({ color }) => color === 'rgb(15, 239, 0)');
  const damagedWagonCenterX = viewport.origin.x
    + (damagedWagon.positionFine.x / 240) * viewport.scaleFactor;
  const damagedWagonFeetY = viewport.origin.y
    + (damagedWagon.positionFine.y / 240) * viewport.scaleFactor;
  const sourceScale = viewport.tileSize / 48;
  const expectedBackgroundHeight = (12 * sourceScale) - (sourceScale < 1 ? 1 : 0);
  const nativeTileHalf = Math.trunc(viewport.tileSize / 2) * 3;
  assert.deepEqual(healthBarBackground, [{
    color: '#3f0000',
    rect: [
      damagedWagonCenterX - (18 * sourceScale),
      damagedWagonFeetY - (6 * sourceScale) - nativeTileHalf,
      36 * sourceScale,
      expectedBackgroundHeight,
    ],
  }], 'a damaged vehicle shows the original dark-red 36×12 health-bar backing');
  const sourceFillWidth = Math.trunc(
    Math.trunc((damagedWagon.hitPoints * 10 * 6) * sourceScale)
      / (damagedWagon.maxHitPoints * 2),
  );
  assert.deepEqual(healthBarFill, [{
    color: 'rgb(15, 239, 0)',
    rect: [
      damagedWagonCenterX - (15 * sourceScale),
      damagedWagonFeetY - (3 * sourceScale) - nativeTileHalf,
      sourceFillWidth,
      6 * sourceScale,
    ],
  }], 'the original fill uses integer-scaled HP width and HP-derived red/green color');

  fillCalls.length = 0;
  drawGame(context, {
    ...view,
    enemies: [{ ...damagedWagon, hitPoints: 95 }],
  }, { ...images, wagon: {} as HTMLImageElement });
  assert.equal(fillCalls.some(({ color }) => color === '#3f0000'), false,
    'the original health bar stays hidden at the 95% cutoff');

  fillCalls.length = 0;
  drawGame(context, {
    ...view,
    enemies: [{ ...damagedWagon, hitPoints: 18, maxHitPoints: 19 }],
  }, { ...images, wagon: {} as HTMLImageElement });
  assert.equal(fillCalls.some(({ color }) => color === '#3f0000'), false,
    'the 95% cutoff uses the source integer division for odd max HP values');

  const reducedScaleView = { ...view, map: { ...view.map, width: 25 } };
  const reducedScaleViewport = getMapViewport(reducedScaleView);
  fillCalls.length = 0;
  drawGame(context, { ...reducedScaleView, enemies: [damagedWagon] }, { ...images, wagon: {} as HTMLImageElement });
  const reducedScaleBackground = fillCalls.find(({ color }) => color === '#3f0000');
  assert.ok(reducedScaleBackground);
  assert.ok(reducedScaleViewport.tileSize / 48 < 1);
  assert.equal(reducedScaleBackground.rect[3], (12 * reducedScaleViewport.tileSize / 48) - 1,
    'the source subtracts one canvas pixel from the backing at a scale below one');

  const ellipseCallsBeforeLegacyHitFlash = ellipseCalls;
  drawGame(context, {
    ...view,
    enemies: [{ ...view.enemies[0]!, hitFlashMs: 120 } as GameView['enemies'][number]],
  }, images);
  assert.equal(ellipseCalls, ellipseCallsBeforeLegacyHitFlash,
    'a legacy hit-flash timer does not add an enemy ellipse absent from the original renderer');

  const bridgeCrossingView: GameView = {
    ...view,
    map: {
      ...view.map,
      streets: [
        {
          asset: 'tiles_bridge_verti', source: { x: 0, y: 0, width: 32, height: 48 },
          x: 2, y: 9.75, width: 1, height: 1.5,
        },
        {
          asset: 'tiles_bridge_hori', source: { x: 0, y: 0, width: 48, height: 32 },
          x: 11.75, y: 9, width: 1.5, height: 1,
        },
      ],
      decorations: [],
    },
    units: [],
    enemies: [
      {
        ...sampleEnemy,
        id: 'pioneer-west-bridge',
        positionFine: { x: 2.5 * 7680, y: 10.5 * 7680 },
      },
      {
        ...sampleEnemy,
        id: 'pioneer-east-bridge',
        positionFine: { x: 12.5 * 7680, y: 9.5 * 7680 },
      },
    ],
    shots: [],
    wagonDebris: [],
    drawOrder: ['enemy:pioneer-east-bridge', 'enemy:pioneer-west-bridge'],
  };
  const bridgeCrossingDrawStart = drawCalls.length;
  drawGame(context, bridgeCrossingView, images);
  const bridgeCrossingDraws = drawCalls.slice(bridgeCrossingDrawStart);
  const bridgeImageIndex = (image: HTMLImageElement) => bridgeCrossingDraws.findIndex(([drawnImage]) => drawnImage === image);
  const firstEnemyDrawIndex = bridgeImageIndex(enemyImage);
  const lastEnemyDrawIndex = bridgeCrossingDraws.map(([drawnImage]) => drawnImage).lastIndexOf(enemyImage);
  const westBridgeDrawIndex = bridgeImageIndex(verticalBridgeImage);
  const eastBridgeDrawIndex = bridgeImageIndex(horizontalBridgeImage);
  assert.ok(firstEnemyDrawIndex >= 0 && firstEnemyDrawIndex < westBridgeDrawIndex,
    'the enemy crossing Cow Gulch’s west bridge draws beneath its vertical deck overlay');
  assert.ok(lastEnemyDrawIndex >= 0 && lastEnemyDrawIndex < eastBridgeDrawIndex,
    'the enemy crossing Cow Gulch’s east bridge draws beneath its horizontal deck overlay');

  const bridgeViewport = getMapViewport(bridgeCrossingView);
  for (const [index, cell] of [[0, { x: 12.5, y: 9.5 }], [1, { x: 2.5, y: 10.5 }]] as const) {
    const enemyDraw = bridgeCrossingDraws.filter(([image]) => image === enemyImage)[index];
    assert.ok(enemyDraw);
    const feet = mapCellToScreen(bridgeViewport, cell.x, cell.y);
    assert.equal((enemyDraw[5] as number) + ((enemyDraw[7] as number) / 2), feet.x,
      'bridge-crossing enemy sprite stays centered on its route position');
    assert.equal((enemyDraw[6] as number) + (enemyDraw[8] as number), feet.y,
      'bridge-crossing enemy feet stay anchored to the TDM route position');
  }
});

test('draws the sleeping unit and its elapsed-time Zzz atlas frame above the unit', () => {
  const mapImage = {} as HTMLImageElement;
  const sleepingImage = {} as HTMLImageElement;
  const effectImage = {} as HTMLImageElement;
  const drawCalls: unknown[][] = [];
  const context = {
    save() {},
    restore() {},
    clearRect() {},
    fillRect() {},
    beginPath() {},
    rect() {},
    clip() {},
    drawImage(...args: unknown[]) { drawCalls.push(args); },
  } as unknown as CanvasRenderingContext2D;
  const view: GameView = {
    frame: 4,
    elapsedMs: 400,
    paused: false,
    scenarioId: 'cow-gulch',
    map: {
      width: 1,
      height: 1,
      tileSize: 32,
      background: [{ asset: 'ground', source: { x: 0, y: 0, width: 32, height: 32 }, x: 0, y: 0, width: 1, height: 1 }],
      streets: [],
    },
    units: [{
      id: 'gunslinger-hire-01',
      type: 'gunslinger',
      activity: 4,
      cell: { x: 0, y: 0 },
      movementSpeedFinePer100Ms: 1500,
      asset: 'player_gunslinger_sleep',
      frame: { x: 0, y: 0, width: 32, height: 32 },
      render: { x: 0, y: -0.25, width: 1, height: 1 },
      hitArea: { x: 0, y: -0.25, width: 1, height: 1 },
      selected: false,
      moving: false,
      positionFine: { x: 3840, y: 5760 },
      sleepingAnimationFrame: 2,
      upgradeLevel: 0,
    }],
    enemies: [],
    shots: [],
    drawOrder: ['unit:gunslinger-hire-01'],
    recruitPool: [],
    events: [],
  };

  drawGame(context, view, {
    ground: mapImage,
    player_gunslinger_sleep: sleepingImage,
    sfx_sleeping: effectImage,
  });

  assert.deepEqual(drawCalls.map(([image]) => image), [mapImage, sleepingImage, effectImage]);
  assert.deepEqual(drawCalls[1]?.slice(1, 5), [0, 0, 32, 32]);
  const viewport = getMapViewport(view);
  const effectCall = drawCalls[2]!;
  assert.deepEqual(effectCall.slice(1, 5), [48, 0, 24, 16], 'uses the third 24×16 sleeping animation frame');
  const [, , , , , effectX, effectY, effectWidth, effectHeight] = effectCall;
  const feetX = viewport.origin.x + (view.units[0]!.positionFine.x / 240) * viewport.scaleFactor;
  const feetY = viewport.origin.y + (view.units[0]!.positionFine.y / 240) * viewport.scaleFactor;
  assert.equal((effectX as number) + (effectWidth as number) / 2, feetX);
  assert.equal((effectY as number) + (effectHeight as number), feetY - 32 * viewport.scaleFactor);
});

test('draws the APK selection range and four animated cursor markers', () => {
  const drawCalls: unknown[][] = [];
  const clipRects: number[][] = [];
  const filledCircles: Array<{ arc: number[]; fillStyle: string }> = [];
  let pendingRect: number[] | undefined;
  let pendingArc: number[] | undefined;
  let fillStyle = '';
  const context = {
    save() {},
    restore() {},
    clearRect() {},
    fillRect() {},
    get fillStyle() { return fillStyle; },
    set fillStyle(value: string) { fillStyle = value; },
    beginPath() {},
    rect(...args: number[]) { pendingRect = args; },
    clip() {
      if (pendingRect) clipRects.push(pendingRect);
    },
    arc(...args: number[]) { pendingArc = args; },
    fill() {
      if (pendingArc) filledCircles.push({ arc: pendingArc, fillStyle });
      pendingArc = undefined;
    },
    drawImage(...args: unknown[]) { drawCalls.push(args); },
  } as unknown as CanvasRenderingContext2D;
  const ground = {} as HTMLImageElement;
  const gunslinger = {} as HTMLImageElement;
  const cursor = { naturalWidth: 64, naturalHeight: 16 } as HTMLImageElement;
  const view: GameView = {
    frame: 18,
    elapsedMs: 288,
    paused: false,
    scenarioId: 'cow-gulch',
    map: {
      width: 17,
      height: 17,
      tileSize: 32,
      background: [{ asset: 'ground', source: { x: 0, y: 0, width: 32, height: 32 }, x: 0, y: 0, width: 17, height: 17 }],
      streets: [],
    },
    units: [{
      id: 'gunslinger-1',
      type: 'gunslinger',
      cell: { x: 8, y: 8 },
      movementSpeedFinePer100Ms: 1500,
      asset: 'player_gunslinger',
      frame: { x: 0, y: 0, width: 32, height: 44 },
      render: { x: 8, y: 7.625, width: 1, height: 1.375 },
      hitArea: { x: 8, y: 7.625, width: 1, height: 1.375 },
      selected: true,
      moving: false,
      positionFine: { x: (8 * 7680) + 3840, y: (8 * 7680) + 5760 },
      attackRange: {
        centerTenthTiles: { x: 85, y: 82 },
        maximumTenthTiles: 45,
        boundary: 'exclusive',
      },
      upgradeLevel: 0,
    }],
    enemies: [],
    shots: [],
    drawOrder: ['unit:gunslinger-1'],
    recruitPool: [],
    events: [],
  };
  const images = { ground, player_gunslinger: gunslinger, cursor };

  drawGame(context, view, images);

  const viewport = getMapViewport(view);
  const selected = view.units[0]!;
  const frameHeight = Math.trunc(selected.frame.height * viewport.scaleFactor);
  const centerX = Math.trunc(viewport.origin.x + (selected.positionFine.x / 7680) * viewport.tileSize);
  const centerY = Math.trunc(viewport.origin.y + (selected.positionFine.y / 7680) * viewport.tileSize)
    - Math.trunc(frameHeight / 2);
  assert.deepEqual(filledCircles, [{
    arc: [centerX, centerY, 4 * viewport.tileSize, 0, Math.PI * 2],
    fillStyle: 'rgba(255, 255, 255, 0.1568627450980392)',
  }], 'the range circle uses the original integer-cell radius and translucent white paint');
  assert.ok(clipRects.some((rect) => rect[0] === viewport.origin.x && rect[1] === viewport.origin.y
    && rect[2] === viewport.mapWidth && rect[3] === viewport.mapHeight),
  'the selection feedback is clipped to the map bounds');

  const cursorDraws = drawCalls.filter(([image]) => image === cursor);
  assert.deepEqual(cursorDraws.map((call) => call.slice(1, 5)), [
    [0, 0, 16, 16], [16, 0, 16, 16], [32, 0, 16, 16], [48, 0, 16, 16],
  ], 'the cursor atlas draws one original directional marker in each corner');
  assert.deepEqual(cursorDraws.map((call) => call.slice(5)), [
    [centerX - 15 - 30, centerY - 30, 30, 30],
    [centerX - 15 + 30, centerY - 30, 30, 30],
    [centerX - 15 - 30, centerY + 30, 30, 30],
    [centerX - 15 + 30, centerY + 30, 30, 30],
  ], 'the marker spacing follows the original breathing phase at frame 18');
  assert.ok(drawCalls.findIndex(([image]) => image === gunslinger) < drawCalls.findIndex(([image]) => image === cursor),
    'selection range and markers overlay the world objects');
});

test('renders the original campaign HUD artwork and numeric atlas over the game map', () => {
  const ground = {} as HTMLImageElement;
  const hudImages = {
    gng_hud_0_top: { width: 480, height: 67 } as HTMLImageElement,
    gng_hud_0_top_left: { width: 30, height: 67 } as HTMLImageElement,
    gng_hud_0_top_right: { width: 30, height: 67 } as HTMLImageElement,
    gng_hud_1_top_pause: { width: 74, height: 49 } as HTMLImageElement,
    gng_hud_1_top_pause_pressed: { width: 74, height: 49 } as HTMLImageElement,
    gng_hud_1_top_star: { width: 68, height: 64 } as HTMLImageElement,
    gng_hud_1_top_star_0: { width: 68, height: 64 } as HTMLImageElement,
    hud_font_numbers_scaled: { width: 120, height: 24 } as HTMLImageElement,
  };
  const images = { ground, ...hudImages };
  const drawCalls: unknown[][] = [];
  const fillStyles: string[] = [];
  const fills: { color: string; rect: number[] }[] = [];
  const strokes: { color: string; rect: number[] }[] = [];
  let fillStyle = '';
  let strokeStyle = '';
  const context = {
    save() {},
    restore() {},
    clearRect() {},
    fillRect(...rect: number[]) { fillStyles.push(fillStyle); fills.push({ color: fillStyle, rect }); },
    strokeRect(...rect: number[]) { strokes.push({ color: strokeStyle, rect }); },
    get fillStyle() { return fillStyle; },
    set fillStyle(value: string) { fillStyle = value; },
    get strokeStyle() { return strokeStyle; },
    set strokeStyle(value: string) { strokeStyle = value; },
    lineWidth: 1,
    beginPath() {},
    rect() {},
    clip() {},
    drawImage(...args: unknown[]) { drawCalls.push(args); },
  } as unknown as CanvasRenderingContext2D;
  const view: GameView = {
    frame: 0,
    elapsedMs: 0,
    paused: false,
    scenarioId: 'campaign-new-mexico-01',
    map: {
      width: 17,
      height: 17,
      tileSize: 32,
      background: [{ asset: 'ground', source: { x: 0, y: 0, width: 32, height: 32 }, x: 0, y: 0, width: 1, height: 1 }],
      streets: [{ asset: 'ground', source: { x: 0, y: 0, width: 32, height: 32 }, x: 1, y: 0, width: 1, height: 1 }],
      originalTileGrid: [[0, 48, 124, 160, 32, 88], [96, 17, 36, 80, 89, 89]],
    },
    units: [],
    enemies: [],
    shots: [],
    drawOrder: [],
    recruitPool: [],
    events: [],
    wave: {
      number: 1,
      totalWaves: 8,
      phase: 'active',
      lives: 50,
      escapedEnemies: 0,
      defeatedEnemies: 0,
      cash: 65,
      activeEnemies: 0,
    },
  };

  drawGame(context, view, images);

  const hudCallImages = drawCalls.slice(1).map(([image]) => image);
  for (const asset of [
    hudImages.gng_hud_0_top_left,
    hudImages.gng_hud_0_top,
    hudImages.gng_hud_0_top_right,
    hudImages.gng_hud_1_top_pause,
    hudImages.gng_hud_1_top_star_0,
    hudImages.hud_font_numbers_scaled,
  ]) {
    assert.ok(hudCallImages.includes(asset), 'draws each original HUD bitmap above the world');
  }
  const centerBar = drawCalls.find(([image]) => image === hudImages.gng_hud_0_top);
  assert.deepEqual(centerBar?.slice(1), [272, 0, 480, 67]);
  const numberGlyphs = drawCalls
    .filter(([image]) => image === hudImages.hud_font_numbers_scaled)
    .map((call) => call.slice(1, 5));
  assert.deepEqual(numberGlyphs, [
    [72, 0, 12, 24], [60, 0, 12, 24], // Cow Gulch initial cash 65
    [0, 0, 12, 24], [12, 0, 12, 24], // wave 01
    [0, 0, 12, 24], [96, 0, 12, 24], // total 08
    [60, 0, 12, 24], [0, 0, 12, 24], // lives 50
  ]);
  for (const terrainColor of ['#fbd19f', '#bc8156', '#609db3', '#8bcfe5', '#f2b780']) {
    assert.ok(fillStyles.includes(terrainColor), `minimap uses original ${terrainColor} terrain color`);
  }
  const firstMinimapCellColor = (x: number, y: number) => fills.find(({ rect }) => rect[0] === x && rect[1] === y)?.color;
  assert.equal(firstMinimapCellColor(702, 10), '#fbd19f', 'raw empty terrain is desert');
  assert.equal(firstMinimapCellColor(704, 10), '#bc8156', 'original canyon codes use canyon color');
  assert.equal(firstMinimapCellColor(706, 10), '#609db3', 'TDM water source codes map to water');
  assert.equal(firstMinimapCellColor(708, 10), '#8bcfe5', 'original ice codes use ice color');
  assert.equal(firstMinimapCellColor(712, 10), '#fbd19f', 'an 88/89 cliff edge without a matching tile above stays desert');
  assert.equal(firstMinimapCellColor(702, 12), '#fbd19f', 'raw BasicMap 96 is a unit marker on desert, not BackgroundMap water');
  const [outerFrame, innerFrame] = strokes;
  assert.equal(outerFrame?.color, '#fff');
  assert.equal(innerFrame?.color, '#000');
  assert.deepEqual(innerFrame?.rect, [
    (outerFrame?.rect[0] ?? 0) + 1,
    (outerFrame?.rect[1] ?? 0) + 1,
    (outerFrame?.rect[2] ?? 0) - 2,
    (outerFrame?.rect[3] ?? 0) - 2,
  ], 'camera frame uses the original nested white/black outline without filling the minimap');
  assert.equal(gameHudPointerActionAt(314, 24), 'pause');
  assert.equal(gameHudPointerActionAt(250, 24), 'covered');
  assert.equal(gameHudPointerActionAt(100, 24), undefined);
  assert.equal(gameHudPointerActionAt(314, 80), undefined);

  const partialLivesStart = drawCalls.length;
  drawGame(context, { ...view, wave: { ...view.wave!, lives: 25 } }, images);
  const partialLivesStar = drawCalls.slice(partialLivesStart)
    .find(([image]) => image === hudImages.gng_hud_1_top_star);
  assert.deepEqual(partialLivesStar?.slice(1), [0, 32, 68, 32, 478, 37, 68, 32]);

  const pausedDrawStart = drawCalls.length;
  drawGame(context, { ...view, paused: true }, images);
  assert.ok(drawCalls.slice(pausedDrawStart)
    .some(([image]) => image === hudImages.gng_hud_1_top_pause_pressed), 'manual pause draws the original pressed HUD bitmap');
});

test('draws original firing, Mexican dynamite, and explosion atlas frames', () => {
  const ground = {} as HTMLImageElement;
  const gunslinger = {} as HTMLImageElement;
  const dynamite = {} as HTMLImageElement;
  const explosion = {} as HTMLImageElement;
  const gunslingerShot = {} as HTMLImageElement;
  const drawCalls: unknown[][] = [];
  const transforms: unknown[][] = [];
  const context = {
    save() {},
    restore() {},
    clearRect() {},
    fillRect() {},
    beginPath() {},
    rect() {},
    clip() {},
    drawImage(...args: unknown[]) { drawCalls.push(args); },
    translate(...args: number[]) { transforms.push(['translate', ...args]); },
    scale(...args: number[]) { transforms.push(['scale', ...args]); },
    arc() {},
    fill() {},
    stroke() {},
  } as unknown as CanvasRenderingContext2D;
  const view: GameView = {
    frame: 1,
    elapsedMs: 100,
    paused: false,
    scenarioId: 'cow-gulch',
    map: {
      width: 1,
      height: 1,
      tileSize: 32,
      background: [{ asset: 'ground', source: { x: 0, y: 0, width: 32, height: 32 }, x: 0, y: 0, width: 1, height: 1 }],
      streets: [],
    },
    units: [{
      id: 'gunslinger-1',
      type: 'gunslinger',
      asset: 'player_gunslinger',
      cell: { x: 0, y: 0 },
      movementSpeedFinePer100Ms: 1500,
      frame: { x: 0, y: 0, width: 32, height: 44 },
      render: { x: 0, y: -0.375, width: 1, height: 1.375 },
      hitArea: { x: 0, y: -0.375, width: 1, height: 1.375 },
      selected: false,
      moving: false,
      positionFine: { x: 3840, y: 5760 },
      upgradeLevel: 0,
      shootingAnimation: { asset: 'player_gunslinger_shot', frame: 1, row: 2, mirrored: true },
    }],
    enemies: [],
    shots: [
      {
        id: 'flight', shooterId: 'mexican-1', targetId: 'enemy-1',
        positionFine: { x: 3840, y: 3840 }, remainingMs: 100,
        damageStyle: 3, imageAsset: 'sfx_mexican_dynamite', animationFrame: 2,
        fineZ: 0, heightFine: 3840,
      },
      {
        id: 'impact', shooterId: 'mexican-1', targetId: 'enemy-2',
        positionFine: { x: 3840, y: 3840 }, remainingMs: 599,
        damageStyle: 3, imageAsset: 'sfx_mexican_dynamite', animationFrame: 1,
        explosionRemainingMs: 599, fineZ: 7680, heightFine: 0,
      },
    ],
    drawOrder: ['shot:flight', 'shot:impact', 'unit:gunslinger-1'],
    recruitPool: [],
    events: [],
  };

  drawGame(context, view, {
    ground,
    player_gunslinger: gunslinger,
    sfx_mexican_dynamite: dynamite,
    sfx_explosion: explosion,
    player_gunslinger_shot: gunslingerShot,
  });

  const dynamiteDraw = drawCalls.find(([image]) => image === dynamite);
  assert.ok(dynamiteDraw);
  assert.deepEqual(dynamiteDraw.slice(1, 5), [32, 0, 16, 16]);
  const shotViewport = getMapViewport(view);
  assert.equal(
    (dynamiteDraw[6] as number) + (dynamiteDraw[8] as number),
    shotViewport.origin.y + ((3840 - 3840) / 240) * shotViewport.scaleFactor,
    'flight atlas frames use the original bottom anchor after subtracting their arc height',
  );
  const explosionDraw = drawCalls.find(([image]) => image === explosion);
  assert.ok(explosionDraw);
  assert.deepEqual(explosionDraw.slice(1, 5), [48, 0, 48, 52]);
  const firingDraw = drawCalls.find(([image]) => image === gunslingerShot);
  assert.ok(firingDraw);
  assert.deepEqual(firingDraw.slice(1, 5), [32, 88, 32, 44]);
  assert.deepEqual(transforms.map(([name]) => name), ['translate', 'scale']);
  assert.deepEqual(transforms[1], ['scale', -1, 1]);

  const walkingDrawStart = drawCalls.length;
  const walkingTransformStart = transforms.length;
  drawGame(context, {
    ...view,
    units: [{
      ...view.units[0]!,
      shootingAnimation: undefined,
      walkingAnimation: { frame: 2, row: 4, mirrored: true },
    }],
    shots: [],
    drawOrder: ['unit:gunslinger-1'],
  }, { ground, player_gunslinger: gunslinger });
  const walkingDraw = drawCalls.slice(walkingDrawStart).find(([image]) => image === gunslinger);
  assert.deepEqual(walkingDraw?.slice(1, 5), [64, 176, 32, 44], 'walk frame and row select the exact source atlas cell');
  assert.deepEqual(transforms.slice(walkingTransformStart).map(([name]) => name), ['translate', 'scale']);
  assert.deepEqual(transforms.at(-1), ['scale', -1, 1], 'the walking atlas mirrors only when its direction row requests it');
});

test('draws ordinary bullets as small dark-red rectangles without an outline', () => {
  const ground = {} as HTMLImageElement;
  const fillCalls: Array<{ color: string; rect: number[] }> = [];
  const arcs: number[][] = [];
  const strokes: string[] = [];
  let fillStyle = '';
  let strokeStyle = '';
  const context = {
    save() {},
    restore() {},
    clearRect() {},
    get fillStyle() { return fillStyle; },
    set fillStyle(value: string) { fillStyle = value; },
    get strokeStyle() { return strokeStyle; },
    set strokeStyle(value: string) { strokeStyle = value; },
    fillRect(...rect: number[]) { fillCalls.push({ color: fillStyle, rect }); },
    beginPath() {},
    rect() {},
    clip() {},
    drawImage() {},
    arc(...arc: number[]) { arcs.push(arc); },
    fill() {},
    stroke() { strokes.push(strokeStyle); },
  } as unknown as CanvasRenderingContext2D;
  const view: GameView = {
    frame: 0,
    elapsedMs: 0,
    paused: false,
    scenarioId: 'ordinary-projectile-render-fixture',
    map: {
      width: 1,
      height: 1,
      tileSize: 32,
      background: [{ asset: 'ground', source: { x: 0, y: 0, width: 32, height: 32 }, x: 0, y: 0, width: 1, height: 1 }],
      streets: [],
    },
    units: [],
    enemies: [],
    shots: [{
      id: 'ordinary',
      shooterId: 'gunslinger-1',
      targetId: 'pioneer-1',
      positionFine: { x: 3840, y: 3840 },
      remainingMs: 100,
      damageStyle: 0,
      fineZ: 7680,
      heightFine: 0,
      animationFrame: 0,
    }],
    drawOrder: ['shot:ordinary'],
    recruitPool: [],
    events: [],
  };

  drawGame(context, view, { ground });

  const viewport = getMapViewport(view);
  const bulletCenter = viewport.origin.x + (3840 / 240) * viewport.scaleFactor;
  const bulletY = viewport.origin.y + (3840 / 240) * viewport.scaleFactor;
  const bullet = fillCalls.find(({ color }) => color.toLowerCase() === '#7f0000');
  assert.ok(bullet, 'the projectile uses the APK dark-red fill');
  assert.ok(bullet.rect[2] <= 5 * viewport.scaleFactor && bullet.rect[3] <= 5 * viewport.scaleFactor,
    'the projectile remains a small rectangle');
  assert.equal(bullet.rect[0]! + bullet.rect[2]! / 2, bulletCenter);
  assert.equal(bullet.rect[1]! + bullet.rect[3]! / 2, bulletY);
  assert.equal(arcs.some(([x, y]) => x === bulletCenter && y === bulletY), false,
    'ordinary bullets are not rendered as circles');
  assert.deepEqual(strokes, [], 'ordinary bullets have no outline');
});


test('turning vehicle sprites use only the mirroring direction chosen by the turn atlas', () => {
  const drawCalls: unknown[][] = [];
  const scales: number[][] = [];
  const context = {
    save() {},
    restore() {},
    clearRect() {},
    fillRect() {},
    beginPath() {},
    rect() {},
    clip() {},
    drawImage(...args: unknown[]) { drawCalls.push(args); },
    translate() {},
    scale(x: number, y: number) { scales.push([x, y]); },
  } as unknown as CanvasRenderingContext2D;
  const baseView: GameView = {
    frame: 0,
    elapsedMs: 0,
    paused: false,
    scenarioId: 'p1c-turn-render-fixture',
    map: {
      width: 1,
      height: 1,
      tileSize: 32,
      background: [{ asset: 'ground', source: { x: 0, y: 0, width: 32, height: 32 }, x: 0, y: 0, width: 1, height: 1 }],
      streets: [],
    },
    units: [],
    enemies: [{
      id: 'wagon',
      type: 4,
      asset: 'wagon',
      speed: 500,
      direction: 'west',
      positionFine: { x: 4001, y: 4051 },
      drawingOffsetFine: { x: 0, y: 0 },
      groupId: 'wagon-group',
      damageable: true,
      turningAnimation: { asset: 'wagon_turn', frame: 1, mirrored: false },
      hitPoints: 200,
      maxHitPoints: 200,
      alive: true,
      deathRemainingMs: 0,
      animationFrame: 0,
    }],
    shots: [],
    drawOrder: ['enemy:wagon'],
    recruitPool: [],
    events: [],
  };
  const images = { ground: {} as HTMLImageElement, wagon_turn: {} as HTMLImageElement };

  drawGame(context, baseView, images);
  assert.deepEqual(scales, [], 'a west-facing direction must not override a non-mirrored turn atlas frame');
  const turnDraw = drawCalls.find((args) => args[0] === images.wagon_turn);
  assert.deepEqual(turnDraw?.slice(1, 5), [48, 0, 48, 60]);
  assert.deepEqual(turnDraw?.slice(5, 9), [481, 209, 64, 80],
    'each destination edge is truncated to an integer pixel like Android Rect.set');

  scales.length = 0;
  drawCalls.length = 0;
  drawGame(context, {
    ...baseView,
    enemies: [{ ...baseView.enemies[0]!, direction: 'east', turningAnimation: { asset: 'wagon_turn', frame: 0, mirrored: true } }],
  }, images);
  assert.deepEqual(scales, [[-1, 1]], 'a mirrored turn atlas frame must flip even when the next direction is east');
  assert.deepEqual(drawCalls.find((args) => args[0] === images.wagon_turn)?.slice(1, 5), [0, 0, 48, 60]);
});

test('ordinary horse-wagon and covered-wagon frames mirror eastward movement like the APK', () => {
  const scales: number[][] = [];
  const context = {
    save() {},
    restore() {},
    clearRect() {},
    fillRect() {},
    beginPath() {},
    rect() {},
    clip() {},
    drawImage() {},
    translate() {},
    scale(x: number, y: number) { scales.push([x, y]); },
  } as unknown as CanvasRenderingContext2D;
  const map = {
    width: 17,
    height: 17,
    tileSize: 32,
    background: [{ asset: 'ground', source: { x: 0, y: 0, width: 32, height: 32 }, x: 0, y: 0, width: 17, height: 17 }],
    streets: [],
  };
  const variants = [
    { type: 4 as const, asset: 'wagon' as const },
    { type: 5 as const, asset: 'stagecoach' as const },
    { type: 8 as const, asset: 'horse_wagon' as const },
    { type: 8 as const, asset: 'horse_wagon_white' as const },
  ];
  const facings = [
    { direction: 'east' as const, mirrored: undefined, expectedMirror: true },
    { direction: 'west' as const, mirrored: undefined, expectedMirror: false },
    { direction: 'north' as const, mirrored: true, expectedMirror: true },
    { direction: 'south' as const, mirrored: false, expectedMirror: false },
  ];

  for (const variant of variants) {
    for (const facing of facings) {
      scales.length = 0;
      const enemy: EnemyView = {
        id: `vehicle-${variant.type}-${facing.direction}`,
        type: variant.type,
        asset: variant.asset,
        speed: 500,
        direction: facing.direction,
        ...(facing.mirrored === undefined ? {} : { mirrored: facing.mirrored }),
        positionFine: { x: 8 * 7680 + 3840, y: 8 * 7680 + 3840 },
        drawingOffsetFine: { x: 0, y: 0 },
        groupId: 'vehicle-group',
        damageable: variant.type === 4 || variant.type === 5,
        hitPoints: 200,
        maxHitPoints: 200,
        alive: true,
        deathRemainingMs: 0,
        animationFrame: 0,
      };
      const view: GameView = {
        frame: 0,
        elapsedMs: 0,
        paused: false,
        scenarioId: 'vehicle-mirror-fixture',
        map,
        units: [],
        enemies: [enemy],
        shots: [],
        drawOrder: [`enemy:${enemy.id}`],
        recruitPool: [],
        events: [],
      };
      drawGame(context, view, { ground: {} as HTMLImageElement, [variant.asset]: {} as HTMLImageElement });
      assert.deepEqual(scales, facing.expectedMirror ? [[-1, 1]] : [], `${variant.asset} facing ${facing.direction}`);
    }
  }
});

test('HUD minimap viewport uses the APK integer cell arithmetic while its panel stays draggable', () => {
  const view: GameView = {
    frame: 0,
    elapsedMs: 0,
    paused: false,
    scenarioId: 'minimap-geometry-fixture',
    map: { width: 17, height: 17, tileSize: 32, background: [], streets: [] },
    units: [],
    enemies: [],
    shots: [],
    drawOrder: [],
    recruitPool: [],
    events: [],
  };

  const geometry = getHudMinimapGeometry(view, getMapViewport(view));
  assert.deepEqual(geometry.panel, { x: 686, y: 2, width: 66, height: 50 });
  assert.deepEqual(geometry.map, { x: 702, y: 10, width: 34, height: 34 });
  assert.equal(geometry.viewport.x, 702);
  assert.equal(geometry.viewport.y, 16, 'APK integer division floors the camera offset to three minimap cells');
  assert.equal(geometry.viewport.width, 34);
  assert.equal(geometry.viewport.height, 18, 'APK integer division floors the visible canvas height to nine map cells');

  const subcellPan = getHudMinimapGeometry(view, getMapViewport(view, 1, { zoom: 1, offsetX: 0, offsetY: -10 }));
  assert.equal(subcellPan.viewport.y, 16, 'the APK minimap outline does not move until the integer camera crosses a tile');
  const wholeCellPan = getHudMinimapGeometry(view, getMapViewport(view, 1, { zoom: 1, offsetX: 0, offsetY: -30 }));
  assert.equal(wholeCellPan.viewport.y, 18, 'the outline advances by one minimap cell after the camera crosses the tile boundary');
});
