import {
  Application,
  Container,
  Graphics,
  Particle,
  ParticleContainer,
  Texture,
} from 'pixi.js';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { buildBoundarySegments, getArenaHalfExtent, getGapArcs, pointAtBoundaryDistance } from '../arena';
import { MAX_ARENA_HALF_EXTENT, type ArenaShape, type BallSnapshot } from '../types';

export interface CanvasHandle {
  updateBalls(balls: BallSnapshot[]): void;
}

interface SimulationCanvasProps {
  shape: ArenaShape;
  gapCount: number;
  arenaSize: number;
  ballDiameterRatio: number;
  gapWidthRatio: number;
  onFps: (fps: number) => void;
  onError: (message: string) => void;
}

const PIXI_COLORS = {
  arena: 0x1c2038,
  wall: 0xffd45f,
  accent: 0xff5b91,
};

function createBallTexture(): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('无法创建球体纹理。');

  const gradient = context.createRadialGradient(22, 18, 2, 32, 34, 31);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.72, '#f8f8f8');
  gradient.addColorStop(0.9, '#d8d8d8');
  gradient.addColorStop(1, '#bdbdbd');
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(32, 32, 30, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = 'rgba(255,255,255,0.86)';
  context.beginPath();
  context.ellipse(23, 19, 9, 5, -0.6, 0, Math.PI * 2);
  context.fill();

  return Texture.from(canvas);
}

function drawArena(
  fill: Graphics,
  boundary: Graphics,
  config: Pick<SimulationCanvasProps, 'shape' | 'gapCount' | 'arenaSize' | 'ballDiameterRatio' | 'gapWidthRatio'>,
): void {
  fill.clear();
  const halfExtent = getArenaHalfExtent(config);

  if (config.shape === 'square') {
    fill.rect(-halfExtent, -halfExtent, halfExtent * 2, halfExtent * 2).fill(PIXI_COLORS.arena);
  } else {
    fill.circle(0, 0, halfExtent).fill(PIXI_COLORS.arena);
  }

  boundary.clear();
  boundary.setStrokeStyle({ width: 0.16, color: PIXI_COLORS.wall, cap: 'round', join: 'round' });
  const simulationConfig = {
    ...config,
    gravity: 9.8,
    restitution: 1,
    initialSpeed: 11,
    speedSpread: 0.3,
    initialDirection: 270,
    directionSpread: 120,
    initialCount: 2,
    birthProbability: 0,
    pairCooldown: 1,
    maxPopulation: 1000,
    seed: 'render',
  };
  for (const segment of buildBoundarySegments(simulationConfig)) {
    boundary.moveTo(segment.from.x, segment.from.y).lineTo(segment.to.x, segment.to.y);
  }
  boundary.setStrokeStyle({ width: 0.44, color: PIXI_COLORS.accent, alpha: 0.22, cap: 'round', join: 'round' });
  boundary.stroke();
  boundary.setStrokeStyle({ width: 0.12, color: PIXI_COLORS.wall, cap: 'round', join: 'round' });
  boundary.stroke();

  const gaps = getGapArcs(simulationConfig);
  for (const gap of gaps) {
    for (const distance of [gap.center - gap.width / 2, gap.center + gap.width / 2]) {
      const point = pointAtBoundaryDistance(config.shape, distance, halfExtent);
      boundary.circle(point.x, point.y, 0.19).fill(PIXI_COLORS.accent);
    }
  }
}

export const SimulationCanvas = forwardRef<CanvasHandle, SimulationCanvasProps>(function SimulationCanvas(
  { shape, gapCount, arenaSize, ballDiameterRatio, gapWidthRatio, onFps, onError },
  forwardedRef,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const particlesRef = useRef<ParticleContainer | null>(null);
  const textureRef = useRef<Texture | null>(null);
  const arenaGraphicsRef = useRef<{ fill: Graphics; boundary: Graphics } | null>(null);
  const particleById = useRef(new Map<number, Particle>());
  const latestBalls = useRef<BallSnapshot[]>([]);
  const onFpsRef = useRef(onFps);
  const onErrorRef = useRef(onError);
  onFpsRef.current = onFps;
  onErrorRef.current = onError;

  useImperativeHandle(forwardedRef, () => ({
    updateBalls(balls) {
      latestBalls.current = balls;
      const container = particlesRef.current;
      const texture = textureRef.current;
      if (!container || !texture) return;

      const liveIds = new Set<number>();
      for (const ball of balls) {
        liveIds.add(ball.id);
        let particle = particleById.current.get(ball.id);
        if (!particle) {
          particle = new Particle({
            texture,
            x: ball.x,
            y: ball.y,
            scaleX: (ball.radius * 2) / texture.width,
            scaleY: (ball.radius * 2) / texture.height,
            anchorX: 0.5,
            anchorY: 0.5,
            tint: ball.color,
          });
          particleById.current.set(ball.id, particle);
          container.addParticle(particle);
        }
        particle.x = ball.x;
        particle.y = ball.y;
      }

      for (const [id, particle] of particleById.current) {
        if (liveIds.has(id)) continue;
        container.removeParticle(particle);
        particleById.current.delete(id);
      }
    },
  }), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const app = new Application();
    let arenaFill: Graphics | null = null;
    let arenaBoundary: Graphics | null = null;
    let root: Container | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let frames = 0;
    let fpsWindowStart = performance.now();

    const fitArena = () => {
      if (!root || !app.renderer) return;
      const size = Math.min(host.clientWidth - 28, host.clientHeight - 28);
      if (size <= 0) return;
      const worldScale = size / (MAX_ARENA_HALF_EXTENT * 2);
      root.position.set(app.screen.width / 2, app.screen.height / 2);
      root.scale.set(worldScale);
    };

    void app.init({
      resizeTo: host,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 1.5),
      antialias: false,
      backgroundAlpha: 0,
      powerPreference: 'high-performance',
    }).then(() => {
      if (cancelled) {
        app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
        return;
      }

      host.replaceChildren(app.canvas);
      root = new Container();
      arenaFill = new Graphics();
      arenaBoundary = new Graphics();
      drawArena(arenaFill, arenaBoundary, { shape, gapCount, arenaSize, ballDiameterRatio, gapWidthRatio });
      arenaGraphicsRef.current = { fill: arenaFill, boundary: arenaBoundary };
      textureRef.current = createBallTexture();
      const particles = new ParticleContainer({
        texture: textureRef.current,
        dynamicProperties: { position: true, rotation: false, vertex: false, uvs: false, color: false },
        boundsArea: app.screen,
      });
      particlesRef.current = particles;
      root.addChild(arenaFill, particles, arenaBoundary);
      app.stage.addChild(root);
      fitArena();

      resizeObserver = new ResizeObserver(() => fitArena());
      resizeObserver.observe(host);
      app.ticker.add(() => {
        frames += 1;
        const now = performance.now();
        const elapsed = now - fpsWindowStart;
        if (elapsed < 700) return;
        onFpsRef.current(Math.round((frames * 1000) / elapsed));
        frames = 0;
        fpsWindowStart = now;
      });

      const pending = latestBalls.current;
      if (pending.length > 0) {
        // A snapshot may arrive while WebGL is initializing.
        const liveIds = new Set<number>();
        for (const ball of pending) {
          liveIds.add(ball.id);
          let particle = particleById.current.get(ball.id);
          if (!particle) {
            particle = new Particle({
              texture: textureRef.current,
              x: ball.x,
              y: ball.y,
              scaleX: (ball.radius * 2) / textureRef.current!.width,
              scaleY: (ball.radius * 2) / textureRef.current!.height,
              anchorX: 0.5,
              anchorY: 0.5,
              tint: ball.color,
            });
            particleById.current.set(ball.id, particle);
            particles.addParticle(particle);
          }
        }
      }
      appRef.current = app;
    }).catch((error: unknown) => {
      if (!cancelled) onErrorRef.current(error instanceof Error ? error.message : 'PixiJS 画布启动失败。');
    });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      particleById.current.clear();
      particlesRef.current = null;
      arenaGraphicsRef.current = null;
      const texture = textureRef.current;
      textureRef.current = null;
      if (texture) texture.destroy(true);
      if (appRef.current === app) appRef.current = null;
      if (app.renderer) app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
    };
  }, []);

  useEffect(() => {
    const graphics = arenaGraphicsRef.current;
    if (graphics) drawArena(graphics.fill, graphics.boundary, { shape, gapCount, arenaSize, ballDiameterRatio, gapWidthRatio });
  }, [shape, gapCount, arenaSize, ballDiameterRatio, gapWidthRatio]);

  const shapeName = shape === 'square' ? '正方形' : '圆形';
  const gapDescription = gapCount === 0 ? '没有缺口' : `${gapCount} 个均匀缺口`;
  return (
    <div
      ref={hostRef}
      className="simulation-canvas"
      aria-label={`${shapeName}物理边界，${gapDescription}，球群实时碰撞模拟`}
      role="img"
    />
  );
});
