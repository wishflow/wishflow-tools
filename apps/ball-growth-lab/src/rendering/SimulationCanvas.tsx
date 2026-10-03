import { Application, Container, Graphics, Particle, ParticleContainer, Texture } from 'pixi.js';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { buildBoundarySegments, getArenaHalfExtent, getGapArcs, pointAtBoundaryDistance } from '../arena';
import { MAX_ARENA_HALF_EXTENT, type SimulationConfig } from '../types';

const VALUES_PER_BALL = 5;

export interface CanvasHandle {
  updateBalls(data: Float32Array, count: number): void;
}

interface SimulationCanvasProps {
  config: SimulationConfig;
  onFps: (fps: number) => void;
  onError: (message: string) => void;
}

interface RenderParticle {
  particle: Particle;
  lastSeen: number;
}

const PALETTE = [0xff7058, 0x72c8e8, 0xd8f065, 0xffc857, 0xb99aff, 0xff9fc4];

function createBallTexture(): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('无法创建球体纹理。');

  const gradient = context.createRadialGradient(21, 18, 2, 32, 34, 31);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.7, '#f8f8f8');
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

function drawArena(fill: Graphics, boundary: Graphics, config: SimulationConfig): void {
  fill.clear();
  const halfExtent = getArenaHalfExtent(config);
  fill.circle(0, 0, halfExtent).fill(0x26395e);

  boundary.clear();
  const segments = buildBoundarySegments(config);
  boundary.setStrokeStyle({ width: 0.42, color: 0xff7058, alpha: 0.24, cap: 'round', join: 'round' });
  for (const segment of segments) boundary.moveTo(segment.from.x, segment.from.y).lineTo(segment.to.x, segment.to.y);
  boundary.stroke();
  boundary.setStrokeStyle({ width: 0.13, color: 0xf5f2e9, cap: 'round', join: 'round' });
  for (const segment of segments) boundary.moveTo(segment.from.x, segment.from.y).lineTo(segment.to.x, segment.to.y);
  boundary.stroke();

  for (const gap of getGapArcs(config)) {
    for (const distance of [gap.center - gap.width / 2, gap.center + gap.width / 2]) {
      const point = pointAtBoundaryDistance(config.shape, distance, halfExtent);
      boundary.circle(point.x, point.y, 0.19).fill(0xff7058);
    }
  }
}

export const SimulationCanvas = forwardRef<CanvasHandle, SimulationCanvasProps>(function SimulationCanvas(
  { config, onFps, onError },
  forwardedRef,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const particlesRef = useRef<ParticleContainer | null>(null);
  const textureRef = useRef<Texture | null>(null);
  const arenaGraphicsRef = useRef<{ fill: Graphics; boundary: Graphics } | null>(null);
  const particleById = useRef(new Map<number, RenderParticle>());
  const latestData = useRef<Float32Array>(new Float32Array());
  const latestCount = useRef(0);
  const snapshotVersion = useRef(0);
  const onFpsRef = useRef(onFps);
  const onErrorRef = useRef(onError);
  onFpsRef.current = onFps;
  onErrorRef.current = onError;

  const applyPackedBalls = (data: Float32Array, count: number) => {
    latestData.current = data;
    latestCount.current = count;
    const container = particlesRef.current;
    const texture = textureRef.current;
    if (!container || !texture) return;

    const version = ++snapshotVersion.current;
    for (let index = 0; index < count; index += 1) {
      const offset = index * VALUES_PER_BALL;
      const id = data[offset];
      let record = particleById.current.get(id);
      if (!record) {
        const particle = new Particle({
          texture,
          x: data[offset + 1],
          y: data[offset + 2],
          scaleX: (data[offset + 3] * 2) / texture.width,
          scaleY: (data[offset + 3] * 2) / texture.height,
          anchorX: 0.5,
          anchorY: 0.5,
          tint: data[offset + 4],
        });
        record = { particle, lastSeen: version };
        particleById.current.set(id, record);
        container.addParticle(particle);
      } else {
        record.particle.x = data[offset + 1];
        record.particle.y = data[offset + 2];
        record.lastSeen = version;
      }
    }

    for (const [id, record] of particleById.current) {
      if (record.lastSeen === version) continue;
      container.removeParticle(record.particle);
      particleById.current.delete(id);
    }
  };

  useImperativeHandle(forwardedRef, () => ({ updateBalls: applyPackedBalls }), []);

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
      root.position.set(app.screen.width / 2, app.screen.height / 2);
      root.scale.set(size / (MAX_ARENA_HALF_EXTENT * 2));
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
      drawArena(arenaFill, arenaBoundary, config);
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

      resizeObserver = new ResizeObserver(fitArena);
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

      if (latestCount.current > 0) applyPackedBalls(latestData.current, latestCount.current);
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
      if (appRef.current === app) appRef.current = null;
      if (app.renderer) {
        // Tear down the renderer before its shared canvas texture so Pixi can
        // release the shader bind groups that still reference the texture.
        app.destroy({ removeView: true }, { children: true });
        texture?.destroy(true);
      } else {
        texture?.destroy(true);
      }
    };
  }, []);

  useEffect(() => {
    const graphics = arenaGraphicsRef.current;
    if (graphics) drawArena(graphics.fill, graphics.boundary, config);
  }, [config]);

  return (
    <div
      ref={hostRef}
      className="simulation-canvas"
      aria-label={`圆形场地，${config.gapCount === 0 ? '没有缺口' : `${config.gapCount} 个均匀缺口`}，球群实时碰撞模拟`}
      role="img"
    />
  );
});
