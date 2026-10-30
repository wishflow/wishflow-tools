import assert from 'node:assert/strict';
import test from 'node:test';
import type { GameView } from '../src/game';
import { drawGame, GAME_VIEWPORT, gameHudPointerActionAt, getMapViewport } from '../src/render/canvas-renderer';
import { mapCellToScreen } from '../src/render/map-viewport';

test('clips world tiles and depth-sorts scenery, units, shots, and wagon parts', () => {
  const mapImage = {} as HTMLImageElement;
  const bridgeImage = {} as HTMLImageElement;
  const enemyImage = {} as HTMLImageElement;
  const unitImage = {} as HTMLImageElement;
  const shotImage = {} as HTMLImageElement;
  const wagonPartsImage = {} as HTMLImageElement;
  const cactusImage = { naturalWidth: 32, naturalHeight: 44 } as HTMLImageElement;
  const treeImage = { naturalWidth: 32, naturalHeight: 64 } as HTMLImageElement;
  const bushImage = { naturalWidth: 32, naturalHeight: 32 } as HTMLImageElement;
  const rocksImage = { naturalWidth: 32, naturalHeight: 32 } as HTMLImageElement;
  const shackImage = { naturalWidth: 64, naturalHeight: 32 } as HTMLImageElement;
  const drawCalls: unknown[][] = [];
  const fillCalls: Array<{ color: string; rect: number[] }> = [];
  const clipRects: number[][] = [];
  const decorationClipStates: boolean[] = [];
  const decorationViewportClipStates: boolean[] = [];
  const overlayText: string[] = [];
  const routeCommands: string[] = [];
  const enemyDrawAlphas: number[] = [];
  const alphaStack: number[] = [];
  const mapClipStack: boolean[] = [];
  const viewportClipStack: boolean[] = [];
  let currentAlpha = 1;
  let currentFillStyle = '';
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
      if (args[0] === enemyImage) enemyDrawAlphas.push(currentAlpha);
      if (args[0] === cactusImage || args[0] === treeImage || args[0] === bushImage) {
        decorationClipStates.push(mapClipActive);
        decorationViewportClipStates.push(viewportClipActive);
      }
    },
    moveTo() { routeCommands.push('moveTo'); },
    lineTo() { routeCommands.push('lineTo'); },
    arc() {},
    ellipse() {},
    stroke() {},
    fill() {},
    setLineDash() {},
    measureText(text: string) { return { width: text.length * 6 } as TextMetrics; },
    fillText(text: string) { overlayText.push(text); },
  } as unknown as CanvasRenderingContext2D;
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
      }],
      streets: [{
        asset: 'bridge', source: { x: 0, y: 0, width: 48, height: 32 },
        x: 11.75, y: 9, width: 1.5, height: 1,
      }],
      decorations: [
        { asset: 'tree', cell: { x: 6, y: 7 } },
        { asset: 'cactus', cell: { x: 5, y: 6 } },
        { asset: 'bush', cell: { x: 9, y: 9 } },
        { asset: 'b_2x1_shack', cell: { x: 15, y: 7 }, anchorOffsetX: -0.5 },
        { asset: 'cactus', cell: { x: 8, y: 7 } },
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
    enemies: [{
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
      hitFlashMs: 0,
      animationFrame: 2,
    }],
    shots: [{
      id: 'dynamite-1',
      shooterId: 'gunslinger-1',
      targetId: 'pioneer-1',
      positionFine: { x: (9 * 7680) + 1920, y: (9 * 7680) + 1920 },
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
    recruitPool: [],
    events: [],
  };

  const images = {
    ground: mapImage,
    bridge: bridgeImage,
    pioneer_male: enemyImage,
    unit: unitImage,
    cactus: cactusImage,
    tree: treeImage,
    bush: bushImage,
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
  const enemyDraw = drawCalls.find((args) => args[0] === enemyImage);
  assert.ok(enemyDraw);
  assert.deepEqual(enemyDraw.slice(1, 5), [32, 24, 16, 24]);

  const decorationDraws = drawCalls.filter((args) => args[0] === cactusImage || args[0] === treeImage
    || args[0] === bushImage || args[0] === rocksImage || args[0] === shackImage);
  assert.deepEqual(decorationDraws.map(([image]) => image), [cactusImage, shackImage, rocksImage, cactusImage, treeImage, bushImage],
    'same-depth static decorations draw in reverse map-scan insertion order');
  assert.deepEqual(decorationDraws[0]?.slice(1), [302, 115, 60, 82]);
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
  assert.deepEqual(
    drawCalls.map((args) => args[0]),
    [mapImage, enemyImage, images.sfx_mexican_dynamite, bridgeImage, cactusImage, shackImage, rocksImage, cactusImage,
      treeImage, unitImage, images.sfx_exploding_parts, bushImage],
    'a low-depth shot shares the under-road draw pass while other scene objects keep their ground-depth order',
  );
  const dynamiteDraw = drawCalls.find((args) => args[0] === images.sfx_mexican_dynamite);
  assert.ok(dynamiteDraw);
  assert.equal(
    (dynamiteDraw[6] as number) + (dynamiteDraw[8] as number),
    viewport.origin.y + ((view.shots[0]!.positionFine.y - view.shots[0]!.heightFine) / 240) * viewport.scaleFactor,
    'the elevated sprite remains bottom-anchored to its ground position minus the original arc offset',
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

  drawGame(context, view, images, 1, undefined, true);
  assert.equal(routeCommands.filter((command) => command === 'lineTo').length, view.route!.length - 1);
  assert.ok(overlayText.includes('Unit gunslinger · R < 5.0'));
  assert.ok(overlayText.includes('Pioneer HP 18/18'));

  drawGame(context, {
    ...view,
    enemies: [{ ...view.enemies[0]!, alive: false, deathRemainingMs: 399 }],
  }, images);
  assert.equal(enemyDrawAlphas.at(-1), Math.max(0.15, 399 / 799), 'ordinary enemy death keeps the existing fade');

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
    recruitPool: [],
    events: [],
    wave: {
      number: 1,
      totalWaves: 8,
      phase: 'active',
      lives: 50,
      escapedEnemies: 0,
      defeatedEnemies: 0,
      cash: 70,
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
    [84, 0, 12, 24], [0, 0, 12, 24], // cash 70
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
      positionFine: { x: 3840, y: 3840 },
      drawingOffsetFine: { x: 0, y: 0 },
      groupId: 'wagon-group',
      damageable: true,
      turningAnimation: { asset: 'wagon_turn', frame: 1, mirrored: false },
      hitPoints: 200,
      maxHitPoints: 200,
      alive: true,
      deathRemainingMs: 0,
      hitFlashMs: 0,
      animationFrame: 0,
    }],
    shots: [],
    recruitPool: [],
    events: [],
  };
  const images = { ground: {} as HTMLImageElement, wagon_turn: {} as HTMLImageElement };

  drawGame(context, baseView, images);
  assert.deepEqual(scales, [], 'a west-facing direction must not override a non-mirrored turn atlas frame');
  const turnDraw = drawCalls.find((args) => args[0] === images.wagon_turn);
  assert.deepEqual(turnDraw?.slice(1, 5), [32, 0, 32, 40]);

  scales.length = 0;
  drawCalls.length = 0;
  drawGame(context, {
    ...baseView,
    enemies: [{ ...baseView.enemies[0]!, direction: 'east', turningAnimation: { asset: 'wagon_turn', frame: 0, mirrored: true } }],
  }, images);
  assert.deepEqual(scales, [[-1, 1]], 'a mirrored turn atlas frame must flip even when the next direction is east');
  assert.deepEqual(drawCalls.find((args) => args[0] === images.wagon_turn)?.slice(1, 5), [0, 0, 32, 40]);
});
