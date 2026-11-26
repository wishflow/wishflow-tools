import type { GameView } from '../../src/game';
import { drawGame, type GameImages } from '../../src/render/canvas-renderer';

export interface ProductionDrawCall {
  asset: string;
  args: unknown[];
}

export function recordProductionDrawCalls(view: GameView): ProductionDrawCall[] {
  const imageNames = new WeakMap<object, string>();
  const imageCache = new Map<string, HTMLImageElement>();
  const images = new Proxy({} as GameImages, {
    get(_target, key) {
      if (typeof key !== 'string') return undefined;
      const cached = imageCache.get(key);
      if (cached) return cached;
      const image = { naturalWidth: 2_048, naturalHeight: 2_048 } as HTMLImageElement;
      imageNames.set(image, key);
      imageCache.set(key, image);
      return image;
    },
  });
  const drawCalls: ProductionDrawCall[] = [];
  const noOp = () => undefined;
  const context = new Proxy({} as CanvasRenderingContext2D, {
    get(_target, key) {
      if (key === 'drawImage') {
        return (image: object, ...args: unknown[]) => {
          drawCalls.push({ asset: imageNames.get(image) ?? '<unknown>', args });
        };
      }
      if (key === 'measureText') return (text: string) => ({ width: text.length * 6 });
      if (key === 'canvas') return { width: 1_024, height: 576 };
      if (key === 'globalAlpha') return 1;
      return noOp;
    },
    set() {
      return true;
    },
  });

  drawGame(context, view, images);
  return drawCalls;
}
