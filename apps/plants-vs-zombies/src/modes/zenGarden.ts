export interface ZenPlantState {
  id: string;
  typeId: string;
  hydration: number;
  happiness: number;
  growth: number;
  needsCare: boolean;
}

export interface ZenGardenSnapshot {
  id: 'zen-garden';
  tick: number;
  plants: ZenPlantState[];
}

export type ZenCareAction = 'water' | 'fertilize' | 'clean';

export class ZenGardenRuntime {
  readonly seed: string;
  private tick = 0;
  private readonly plants: ZenPlantState[] = [
    { id: 'zen-plant-1', typeId: 'sunflower', hydration: 62, happiness: 55, growth: 18, needsCare: false },
    { id: 'zen-plant-2', typeId: 'peashooter', hydration: 38, happiness: 42, growth: 35, needsCare: true },
    { id: 'zen-plant-3', typeId: 'wall-nut', hydration: 76, happiness: 68, growth: 53, needsCare: false },
  ];

  constructor(seed = 'zen-garden-default') {
    this.seed = seed;
  }

  care(plantId: string, action: ZenCareAction): boolean {
    const plant = this.plants.find((candidate) => candidate.id === plantId);
    if (!plant) return false;
    if (action === 'water') {
      plant.hydration = Math.min(100, plant.hydration + 45);
      plant.happiness = Math.min(100, plant.happiness + 12);
    } else if (action === 'fertilize') {
      plant.growth = Math.min(100, plant.growth + 18);
      plant.happiness = Math.min(100, plant.happiness + 8);
    } else {
      plant.needsCare = false;
      plant.happiness = Math.min(100, plant.happiness + 5);
    }
    return true;
  }

  step(ticks = 1): void {
    if (!Number.isInteger(ticks) || ticks < 0) throw new Error('ticks must be a non-negative integer.');
    for (let index = 0; index < ticks; index += 1) {
      this.tick += 1;
      if (this.tick % 600 !== 0) continue;
      for (const plant of this.plants) {
        plant.hydration = Math.max(0, plant.hydration - 4);
        if (plant.hydration >= 30) plant.growth = Math.min(100, plant.growth + 1);
        else plant.happiness = Math.max(0, plant.happiness - 2);
        plant.needsCare = plant.hydration < 30 || plant.happiness < 30;
      }
    }
  }

  getSnapshot(): ZenGardenSnapshot {
    return { id: 'zen-garden', tick: this.tick, plants: this.plants.map((plant) => ({ ...plant })) };
  }
}
