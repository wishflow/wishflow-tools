import Phaser from 'phaser';
import { gameSession } from '../game/session';
import { LAWN, GAME_HEIGHT, GAME_WIDTH, cellHeightFor, cellWidth, sunPosition } from './layout';

const STEP_MS = 1_000 / 60;

export class BoardScene extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;
  private accumulator = 0;
  private updateCounter = 0;
  private lastDrawnTick = -1;
  private renderedRuntime: typeof gameSession.runtime = null;

  constructor() {
    super('board');
  }

  create(): void {
    this.graphics = this.add.graphics();
    this.paint();
  }

  update(_time: number, delta: number): void {
    const runtime = gameSession.runtime;
    if (!runtime) {
      if (this.renderedRuntime !== null) {
        this.renderedRuntime = null;
        this.lastDrawnTick = -1;
        this.paint();
      }
      return;
    }
    this.renderedRuntime = runtime;

    if (runtime.getSnapshot().phase === 'playing') {
      this.accumulator = Math.min(this.accumulator + delta, 300);
      while (this.accumulator >= STEP_MS) {
        runtime.step();
        this.accumulator -= STEP_MS;
      }
    } else {
      this.accumulator = 0;
    }

    this.updateCounter += 1;
    const snapshot = runtime.getSnapshot();
    if (snapshot.tick !== this.lastDrawnTick || this.updateCounter % 12 === 0) this.paint(snapshot);
    if (this.updateCounter % 12 === 0) gameSession.onSnapshot?.(snapshot);
  }

  private paint(snapshot = gameSession.runtime?.getSnapshot()): void {
    const graphics = this.graphics;
    if (!graphics) return;
    graphics.clear();
    graphics.fillStyle(0xc8d29c, 1);
    graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    graphics.fillStyle(0x9db978, 1);
    graphics.fillRect(0, 0, GAME_WIDTH, 104);
    graphics.fillStyle(0xf3e4b8, 1);
    graphics.fillRect(0, 102, GAME_WIDTH, 3);

    this.drawFence(graphics);
    this.drawLawn(graphics, snapshot?.terrain ?? 'day', snapshot?.rows ?? LAWN.rows, snapshot?.waterRows ?? []);
    this.drawMailbox(graphics);
    if (!snapshot) return;

    for (const grave of snapshot.graves) this.drawGrave(graphics, grave.row, grave.column, snapshot.rows);

    for (const mower of snapshot.mowers) this.drawMower(graphics, mower.row, mower.x, mower.active, mower.used, snapshot.rows);
    for (const plant of snapshot.plants) this.drawPlant(graphics, plant.typeId, plant.row, plant.column, snapshot.rows);
    for (const sun of snapshot.suns) this.drawSun(graphics, sun.id);
    for (const projectile of snapshot.projectiles) {
      const x = LAWN.x + (projectile.x + 0.5) * cellWidth;
      const y = LAWN.y + (projectile.row + 0.5) * cellHeightFor(snapshot.rows);
      graphics.fillStyle(projectile.slowTicks > 0 ? 0x9eeaff : 0x68c442, 1);
      graphics.fillCircle(x, y - 10, 9);
      graphics.fillStyle(0xf1ffd2, 0.9);
      graphics.fillCircle(x - 2, y - 12, 3);
    }
    for (const zombie of snapshot.zombies) {
      if (!zombie.isBurrowed) this.drawZombie(graphics, zombie.row, zombie.x, zombie.health, zombie.armorHealth, zombie.maxHealth, zombie.maxArmorHealth, zombie.typeId, snapshot.rows);
    }
    if (snapshot.terrain === 'fog') this.drawFog(graphics, snapshot.rows, snapshot.columns, snapshot.fogRevealedCells);

    this.lastDrawnTick = snapshot.tick;
    if (snapshot.phase === 'paused') this.drawBanner(graphics, 'PAUSED', 0x233522);
    if (snapshot.phase === 'won') this.drawBanner(graphics, 'LAWN SECURED', 0x316339);
    if (snapshot.phase === 'lost') this.drawBanner(graphics, 'THE LAWN WAS OVERRUN', 0x733d30);
  }

  private drawFence(graphics: Phaser.GameObjects.Graphics): void {
    graphics.fillStyle(0x764b2d, 1);
    graphics.fillRect(0, 509, GAME_WIDTH, 91);
    graphics.fillStyle(0x9b6a3d, 1);
    graphics.fillRect(0, 521, GAME_WIDTH, 14);
    graphics.fillStyle(0xc38d55, 1);
    for (let x = 18; x < GAME_WIDTH; x += 88) graphics.fillRect(x, 528, 8, 61);
    graphics.fillStyle(0x657d3d, 1);
    graphics.fillRect(0, 496, GAME_WIDTH, 14);
  }

  private drawLawn(graphics: Phaser.GameObjects.Graphics, terrain: string, rows: number, waterRows: number[]): void {
    graphics.fillStyle(0x527345, 1);
    graphics.fillRect(LAWN.x - 8, LAWN.y - 8, LAWN.width + 16, LAWN.height + 16);
    const cellHeight = cellHeightFor(rows);
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < LAWN.columns; column += 1) {
        const x = LAWN.x + column * cellWidth;
        const y = LAWN.y + row * cellHeight;
        const water = waterRows.includes(row);
        const roof = terrain === 'roof';
        const night = terrain === 'night';
        const shade = water
          ? ((row + column) % 2 === 0 ? 0x5b9ab5 : 0x4f8eaa)
          : roof
            ? ((row + column) % 2 === 0 ? 0xb28768 : 0xa77b5e)
            : night
              ? ((row + column) % 2 === 0 ? 0x52674f : 0x465b47)
              : ((row + column) % 2 === 0 ? 0x8dba60 : 0x82b356);
        graphics.fillStyle(shade, 1);
        graphics.fillRect(x, y, cellWidth, cellHeight);
        if (water) {
          graphics.fillStyle(0xb4deec, 0.2);
          graphics.fillRect(x + 8, y + cellHeight * 0.4, cellWidth - 16, 3);
        } else {
          graphics.fillStyle(night ? 0x637b59 : 0x91bd65, 0.42);
          graphics.fillRect(x + 4, y + 3, cellWidth - 8, 3);
        }
      }
    }
    graphics.lineStyle(2, 0x527345, 0.8);
    for (let column = 0; column <= LAWN.columns; column += 1) {
      const x = LAWN.x + column * cellWidth;
      graphics.lineBetween(x, LAWN.y, x, LAWN.y + LAWN.height);
    }
    for (let row = 0; row <= rows; row += 1) {
      const y = LAWN.y + row * cellHeight;
      graphics.lineBetween(LAWN.x, y, LAWN.x + LAWN.width, y);
    }
    graphics.fillStyle(0x355c36, 1);
    graphics.fillRect(LAWN.x - 8, LAWN.y - 8, LAWN.width + 16, 8);
    graphics.fillRect(LAWN.x - 8, LAWN.y + LAWN.height, LAWN.width + 16, 8);
  }

  private drawFog(graphics: Phaser.GameObjects.Graphics, rows: number, columns: number, revealedCells: Array<{ row: number; column: number }>): void {
    const revealed = new Set(revealedCells.map((cell) => cell.row + ':' + cell.column));
    const height = cellHeightFor(rows);
    for (let row = 0; row < rows; row += 1) {
      for (let column = 4; column < columns; column += 1) {
        if (revealed.has(row + ':' + column)) continue;
        graphics.fillStyle(0xc8d0c3, 0.58);
        graphics.fillRect(LAWN.x + column * cellWidth, LAWN.y + row * height, cellWidth, height);
      }
    }
  }

  private drawMailbox(graphics: Phaser.GameObjects.Graphics): void {
    graphics.fillStyle(0x714834, 1);
    graphics.fillRect(55, 224, 14, 116);
    graphics.fillStyle(0xe5a84e, 1);
    graphics.fillRoundedRect(35, 184, 75, 48, 9);
    graphics.fillStyle(0x5e7f47, 1);
    graphics.fillRoundedRect(44, 193, 56, 28, 7);
    graphics.fillStyle(0xebb958, 1);
    graphics.fillRect(94, 168, 6, 29);
    graphics.fillStyle(0x58723e, 1);
    graphics.fillRoundedRect(22, 333, 92, 14, 7);
  }

  private drawGrave(graphics: Phaser.GameObjects.Graphics, row: number, column: number, rows: number): void {
    const x = LAWN.x + (column + 0.5) * cellWidth;
    const y = LAWN.y + (row + 0.5) * cellHeightFor(rows);
    graphics.fillStyle(0x65665c, 1);
    graphics.fillRoundedRect(x - 18, y - 18, 36, 48, 16);
    graphics.fillStyle(0x828175, 1);
    graphics.fillRoundedRect(x - 13, y - 13, 26, 36, 12);
    graphics.fillStyle(0x47483f, 1);
    graphics.fillRect(x - 2, y - 7, 4, 17);
    graphics.fillRect(x - 7, y - 2, 14, 4);
    graphics.fillStyle(0x456a3b, 1);
    graphics.fillEllipse(x, y + 23, 42, 8);
  }

  private drawPlant(graphics: Phaser.GameObjects.Graphics, typeId: string, row: number, column: number, rows: number): void {
    const x = LAWN.x + (column + 0.5) * cellWidth;
    const y = LAWN.y + (row + 0.5) * cellHeightFor(rows);
    if (typeId === 'lily-pad') {
      graphics.fillStyle(0x3f9557, 1);
      graphics.fillEllipse(x, y + 18, 46, 19);
      graphics.lineStyle(2, 0x276542, 0.9);
      graphics.lineBetween(x - 20, y + 18, x + 19, y + 18);
      return;
    }
    if (typeId === 'flower-pot') {
      graphics.fillStyle(0xb96c3f, 1);
      graphics.fillRoundedRect(x - 20, y + 4, 40, 29, 4);
      graphics.fillStyle(0xd58a4f, 1);
      graphics.fillRoundedRect(x - 24, y + 1, 48, 8, 3);
      graphics.lineStyle(2, 0x895032, 0.9);
      graphics.lineBetween(x - 14, y + 11, x - 10, y + 27);
      graphics.lineBetween(x + 14, y + 11, x + 10, y + 27);
      return;
    }
    if (typeId === 'pumpkin') {
      graphics.fillStyle(0xe99032, 0.28);
      graphics.fillRoundedRect(x - 26, y - 31, 52, 61, 18);
      graphics.lineStyle(3, 0xb75a26, 0.9);
      graphics.strokeRoundedRect(x - 26, y - 31, 52, 61, 18);
      graphics.lineStyle(2, 0xf4b64a, 0.85);
      graphics.lineBetween(x - 10, y - 28, x - 10, y + 27);
      graphics.lineBetween(x + 10, y - 28, x + 10, y + 27);
      return;
    }
    graphics.fillStyle(0x4e7942, 1);
    graphics.fillRect(x - 3, y + 4, 6, 26);
    graphics.fillStyle(0x3c8a50, 1);
    graphics.fillCircle(x - 12, y + 19, 9);
    graphics.fillCircle(x + 12, y + 20, 9);
    if (typeId === 'sunflower') {
      for (let petal = 0; petal < 10; petal += 1) {
        const angle = petal * Math.PI / 5;
        graphics.fillStyle(0xf4be43, 1);
        graphics.fillCircle(x + Math.cos(angle) * 18, y - 8 + Math.sin(angle) * 18, 8);
      }
      graphics.fillStyle(0x70462b, 1);
      graphics.fillCircle(x, y - 8, 13);
      graphics.fillStyle(0xffe6a0, 1);
      graphics.fillCircle(x - 4, y - 12, 2);
      graphics.fillCircle(x + 4, y - 12, 2);
    } else if (typeId === 'wall-nut') {
      graphics.fillStyle(0xa77743, 1);
      graphics.fillRoundedRect(x - 22, y - 31, 44, 57, 18);
      graphics.lineStyle(2, 0x70482d, 0.85);
      graphics.lineBetween(x - 12, y - 10, x + 10, y - 6);
      graphics.fillStyle(0x3c2b21, 1);
      graphics.fillCircle(x - 8, y - 12, 3);
      graphics.fillCircle(x + 8, y - 12, 3);
    } else if (typeId === 'cherry-bomb') {
      graphics.fillStyle(0xd84c3e, 1);
      graphics.fillCircle(x - 11, y - 4, 17);
      graphics.fillCircle(x + 11, y - 4, 17);
      graphics.fillStyle(0x547c39, 1);
      graphics.fillRect(x - 2, y - 28, 4, 12);
      graphics.fillStyle(0xffdc93, 1);
      graphics.fillCircle(x - 16, y - 9, 4);
      graphics.fillCircle(x + 6, y - 9, 4);
    } else {
      const snow = typeId === 'snow-pea';
      graphics.fillStyle(snow ? 0x76b9d1 : 0x58a34e, 1);
      graphics.fillCircle(x - 1, y - 3, 22);
      graphics.fillStyle(snow ? 0x4387a4 : 0x3f7f42, 1);
      graphics.fillRoundedRect(x + 7, y - 17, 31, 24, 10);
      graphics.fillStyle(0x233a29, 1);
      graphics.fillCircle(x - 8, y - 9, 3);
      graphics.fillStyle(0xe5f5d1, 1);
      graphics.fillCircle(x - 9, y - 10, 1.4);
      graphics.fillStyle(snow ? 0xa8e9f7 : 0x8fce5d, 1);
      graphics.fillCircle(x + 25, y - 5, 6);
    }
  }

  private drawZombie(graphics: Phaser.GameObjects.Graphics, row: number, xCell: number, health: number, armorHealth: number, maxHealth: number, maxArmorHealth: number, typeId: string, rows: number): void {
    const x = LAWN.x + (xCell + 0.5) * cellWidth;
    const y = LAWN.y + (row + 0.5) * cellHeightFor(rows);
    const cone = typeId === 'conehead';
    const bucket = typeId === 'buckethead';
    graphics.fillStyle(0x3d5139, 1);
    graphics.fillRect(x - 14, y + 14, 11, 22);
    graphics.fillRect(x + 3, y + 14, 11, 22);
    graphics.fillStyle(0x536d4c, 1);
    graphics.fillRoundedRect(x - 20, y - 7, 40, 31, 10);
    graphics.fillStyle(0xb3ad83, 1);
    graphics.fillCircle(x, y - 20, 18);
    graphics.fillStyle(0x32362d, 1);
    graphics.fillCircle(x - 6, y - 23, 3);
    graphics.fillCircle(x + 6, y - 23, 3);
    graphics.fillStyle(0xf0e6c0, 1);
    graphics.fillRect(x - 7, y - 12, 14, 3);
    if (cone) {
      graphics.fillStyle(0xdd793a, 1);
      graphics.fillTriangle(x - 12, y - 33, x + 12, y - 33, x, y - 56);
    }
    if (bucket) {
      graphics.fillStyle(0x92958b, 1);
      graphics.fillRoundedRect(x - 17, y - 44, 34, 15, 5);
      graphics.fillStyle(0x70746b, 1);
      graphics.fillRect(x - 15, y - 30, 30, 4);
    }
    graphics.fillStyle(0x473829, 1);
    graphics.fillRect(x - 21, y - 1, 43, 5);
    graphics.fillStyle(0x473b32, 1);
    graphics.fillRoundedRect(x - 22, y - 51, 44, 5, 2);
    graphics.fillStyle(0x91bd58, 1);
    const totalHealth = maxHealth + maxArmorHealth;
    graphics.fillRect(x - 21, y - 50, 42 * Math.max(0, Math.min(1, (health + armorHealth) / totalHealth)), 3);
    if (armorHealth > 0) {
      graphics.fillStyle(0xabb3a9, 1);
      graphics.fillRect(x - 21, y - 50, 42 * Math.max(0, Math.min(1, armorHealth / totalHealth)), 3);
    }
  }

  private drawSun(graphics: Phaser.GameObjects.Graphics, id: string): void {
    const { x, y } = sunPosition(id);
    graphics.fillStyle(0xf4be44, 1);
    graphics.fillCircle(x, y, 17);
    graphics.fillStyle(0xffe89d, 1);
    graphics.fillCircle(x, y, 12);
    graphics.fillStyle(0xf4be44, 1);
    graphics.fillCircle(x, y, 8);
  }

  private drawMower(graphics: Phaser.GameObjects.Graphics, row: number, xCell: number, active: boolean, used: boolean, rows: number): void {
    if (used && !active) return;
    const x = LAWN.x + (xCell + 0.5) * cellWidth;
    const y = LAWN.y + (row + 0.5) * cellHeightFor(rows) + 22;
    graphics.fillStyle(0x35443b, 1);
    graphics.fillRoundedRect(x - 20, y - 11, 39, 18, 5);
    graphics.fillStyle(0xbcc8b4, 1);
    graphics.fillRoundedRect(x - 13, y - 17, 24, 13, 4);
    graphics.fillStyle(active ? 0xe4c04f : 0x6e7b68, 1);
    graphics.fillCircle(x - 11, y + 8, 5);
    graphics.fillCircle(x + 11, y + 8, 5);
    graphics.fillStyle(0x9aac8c, 1);
    graphics.fillRect(x + 16, y - 6, 11, 3);
  }

  private drawBanner(graphics: Phaser.GameObjects.Graphics, text: string, color: number): void {
    graphics.fillStyle(color, 0.92);
    graphics.fillRoundedRect(270, 250, 420, 88, 18);
    graphics.fillStyle(0xf8eed2, 1);
    graphics.fillRect(293, 274, 374, 3);
    graphics.fillStyle(0xf8eed2, 0.9);
    const width = Math.max(90, Math.min(340, text.length * 15));
    graphics.fillRoundedRect(480 - width / 2, 305, width, 8, 4);
  }
}
