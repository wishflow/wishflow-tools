import type { LevelDefinition, PlantBehavior, PlantDefinition, WaveDefinition, ZombieDefinition } from '../core/types';

type PlantExtras = Partial<Omit<PlantDefinition, 'id' | 'title' | 'titleZh' | 'cost' | 'behavior'>>;

function plant(
  id: string,
  title: string,
  titleZh: string,
  cost: number,
  behavior: PlantBehavior,
  extras: PlantExtras = {},
): PlantDefinition {
  return {
    id,
    title,
    titleZh,
    cost,
    behavior,
    maxHealth: 300,
    cooldownTicks: 450,
    ...extras,
  };
}

export const PLANTS: PlantDefinition[] = [
  plant('sunflower', 'Sunflower', '向日葵', 50, 'sunflower', { sunIntervalTicks: 720, sunValue: 25 }),
  plant('peashooter', 'Peashooter', '豌豆射手', 100, 'shooter', { damage: 20, attackIntervalTicks: 90, projectileSpeed: 0.09 }),
  plant('cherry-bomb', 'Cherry Bomb', '樱桃炸弹', 150, 'bomb', { blastRadius: 1.4, cooldownTicks: 1_500 }),
  plant('wall-nut', 'Wall-nut', '坚果墙', 50, 'blocker', { maxHealth: 4_000, cooldownTicks: 900 }),
  plant('potato-mine', 'Potato Mine', '土豆地雷', 25, 'mine', { damage: 1_800, blastRadius: 1.25, armTicks: 600, cooldownTicks: 900 }),
  plant('snow-pea', 'Snow Pea', '寒冰射手', 175, 'slow-shooter', { damage: 20, attackIntervalTicks: 90, projectileSpeed: 0.09, slowTicks: 240 }),
  plant('chomper', 'Chomper', '大嘴花', 150, 'eater', { damage: 999_999, attackIntervalTicks: 1_800, cooldownTicks: 900 }),
  plant('repeater', 'Repeater', '双发射手', 200, 'multi-shooter', { damage: 20, attackIntervalTicks: 90, projectileSpeed: 0.09, projectilesPerAttack: 2 }),
  plant('puff-shroom', 'Puff-shroom', '小喷菇', 0, 'shooter', { damage: 20, attackIntervalTicks: 90, projectileSpeed: 0.07 }),
  plant('sun-shroom', 'Sun-shroom', '阳光菇', 25, 'sunflower', { sunIntervalTicks: 900, sunValue: 15 }),
  plant('fume-shroom', 'Fume-shroom', '大喷菇', 75, 'area-shooter', { damage: 35, attackIntervalTicks: 100, projectileSpeed: 0.08, ability: 'piercing' }),
  plant('grave-buster', 'Grave Buster', '墓碑吞噬者', 75, 'utility', { cooldownTicks: 900, ability: 'destroy-grave' }),
  plant('hypno-shroom', 'Hypno-shroom', '魅惑菇', 75, 'utility', { cooldownTicks: 900, ability: 'hypnotize' }),
  plant('scaredy-shroom', 'Scaredy-shroom', '胆小菇', 25, 'shooter', { damage: 20, attackIntervalTicks: 90, projectileSpeed: 0.09 }),
  plant('ice-shroom', 'Ice-shroom', '寒冰菇', 75, 'bomb', { blastRadius: 99, slowTicks: 900, cooldownTicks: 1_800, ability: 'freeze-all' }),
  plant('doom-shroom', 'Doom-shroom', '毁灭菇', 125, 'bomb', { blastRadius: 3.5, damage: 9_999, cooldownTicks: 1_800 }),
  plant('lily-pad', 'Lily Pad', '睡莲', 25, 'support', { maxHealth: 300, cooldownTicks: 300, slot: 'platform', plantableOn: 'water' }),
  plant('squash', 'Squash', '窝瓜', 50, 'eater', { damage: 1_800, attackIntervalTicks: 30, cooldownTicks: 900, consumesOnAttack: true, attackRange: 1.5 }),
  plant('threepeater', 'Threepeater', '三线射手', 325, 'multi-lane-shooter', { damage: 20, attackIntervalTicks: 90, projectileSpeed: 0.09, attackRows: [-1, 0, 1] }),
  plant('tangle-kelp', 'Tangle Kelp', '缠绕水草', 25, 'eater', { damage: 1_800, attackIntervalTicks: 30, cooldownTicks: 900, consumesOnAttack: true, attackRange: 0.8, plantableOn: 'water' }),
  plant('jalapeno', 'Jalapeno', '火爆辣椒', 125, 'bomb', { blastRadius: 99, damage: 1_800, cooldownTicks: 1_500, ability: 'explode-lane' }),
  plant('spikeweed', 'Spikeweed', '地刺', 100, 'spike', { damage: 20, attackIntervalTicks: 30, cooldownTicks: 600 }),
  plant('torchwood', 'Torchwood', '火炬树桩', 175, 'support', { cooldownTicks: 900, ability: 'ignite-projectiles' }),
  plant('tall-nut', 'Tall-nut', '高坚果', 125, 'blocker', { maxHealth: 8_000, cooldownTicks: 1_200 }),
  plant('sea-shroom', 'Sea-shroom', '海蘑菇', 0, 'shooter', { damage: 20, attackIntervalTicks: 90, projectileSpeed: 0.07, plantableOn: 'water' }),
  plant('plantern', 'Plantern', '路灯花', 25, 'utility', { cooldownTicks: 600, ability: 'reveal-fog' }),
  plant('cactus', 'Cactus', '仙人掌', 125, 'shooter', { damage: 20, attackIntervalTicks: 90, projectileSpeed: 0.1, ability: 'anti-air' }),
  plant('blover', 'Blover', '三叶草', 100, 'utility', { cooldownTicks: 900, ability: 'clear-air' }),
  plant('split-pea', 'Split Pea', '分裂豆', 125, 'multi-shooter', { damage: 20, attackIntervalTicks: 90, projectileSpeed: 0.09, projectilesPerAttack: 1, shootsBackwards: true }),
  plant('starfruit', 'Starfruit', '杨桃', 125, 'multi-lane-shooter', { damage: 20, attackIntervalTicks: 90, projectileSpeed: 0.09, attackRows: [-2, -1, 0, 1, 2] }),
  plant('pumpkin', 'Pumpkin', '南瓜头', 125, 'support', { maxHealth: 4_000, cooldownTicks: 900, slot: 'overlay' }),
  plant('magnet-shroom', 'Magnet-shroom', '磁力菇', 100, 'utility', { cooldownTicks: 900, ability: 'strip-armor' }),
  plant('cabbage-pult', 'Cabbage-pult', '卷心菜投手', 100, 'catapult', { damage: 40, attackIntervalTicks: 100, projectileSpeed: 0.07 }),
  plant('flower-pot', 'Flower Pot', '花盆', 25, 'support', { cooldownTicks: 300, slot: 'platform', plantableOn: 'roof' }),
  plant('kernel-pult', 'Kernel-pult', '玉米投手', 100, 'catapult', { damage: 35, attackIntervalTicks: 100, projectileSpeed: 0.07 }),
  plant('coffee-bean', 'Coffee Bean', '咖啡豆', 75, 'utility', { cooldownTicks: 300, slot: 'overlay', ability: 'wake' }),
  plant('garlic', 'Garlic', '大蒜', 50, 'blocker', { maxHealth: 400, cooldownTicks: 600, ability: 'redirect' }),
  plant('umbrella-leaf', 'Umbrella Leaf', '叶子保护伞', 100, 'support', { cooldownTicks: 900 }),
  plant('marigold', 'Marigold', '金盏花', 50, 'sunflower', { sunIntervalTicks: 1_200, sunValue: 25 }),
  plant('melon-pult', 'Melon-pult', '西瓜投手', 300, 'catapult', { damage: 80, attackIntervalTicks: 120, projectileSpeed: 0.06 }),
  plant('gatling-pea', 'Gatling Pea', '机枪射手', 250, 'multi-shooter', { damage: 20, attackIntervalTicks: 90, projectileSpeed: 0.09, projectilesPerAttack: 4, requiredPlantId: 'repeater', consumesRequiredPlant: true }),
  plant('twin-sunflower', 'Twin Sunflower', '双胞向日葵', 150, 'sunflower', { sunIntervalTicks: 720, sunValue: 50, cooldownTicks: 900, requiredPlantId: 'sunflower', consumesRequiredPlant: true }),
  plant('gloom-shroom', 'Gloom-shroom', '忧郁菇', 150, 'area-shooter', { damage: 30, attackIntervalTicks: 90, projectileSpeed: 0.09, blastRadius: 1.2, ability: 'piercing', requiredPlantId: 'fume-shroom', consumesRequiredPlant: true }),
  plant('cattail', 'Cattail', '香蒲', 225, 'multi-lane-shooter', { damage: 20, attackIntervalTicks: 80, projectileSpeed: 0.12, attackRows: [-2, -1, 0, 1, 2], ability: 'anti-air', plantableOn: 'water', requiredPlantId: 'lily-pad' }),
  plant('winter-melon', 'Winter Melon', '冰西瓜', 200, 'catapult', { damage: 80, attackIntervalTicks: 120, projectileSpeed: 0.06, slowTicks: 240, requiredPlantId: 'melon-pult', consumesRequiredPlant: true }),
  plant('gold-magnet', 'Gold Magnet', '吸金磁', 50, 'utility', { cooldownTicks: 900, requiredPlantId: 'magnet-shroom', consumesRequiredPlant: true }),
  plant('spikerock', 'Spikerock', '地刺王', 125, 'spike', { maxHealth: 1_200, damage: 40, attackIntervalTicks: 30, cooldownTicks: 900, requiredPlantId: 'spikeweed', consumesRequiredPlant: true }),
  plant('cob-cannon', 'Cob Cannon', '玉米加农炮', 500, 'bomb', { maxHealth: 3_000, blastRadius: 2.5, damage: 1_800, cooldownTicks: 2_400 }),
  plant('imitater', 'Imitater', '模仿者', 0, 'upgrade', { cooldownTicks: 600 }),
];

function zombie(
  id: string,
  title: string,
  titleZh: string,
  maxHealth: number,
  speedPerTick: number,
  options: Partial<ZombieDefinition> = {},
): ZombieDefinition {
  return { id, title, titleZh, maxHealth, speedPerTick, biteDamage: 10, biteIntervalTicks: 30, behavior: 'walker', ...options };
}

export const ZOMBIES: ZombieDefinition[] = [
  zombie('basic', 'Zombie', '普通僵尸', 270, 0.0065),
  zombie('flag', 'Flag Zombie', '旗帜僵尸', 270, 0.008),
  zombie('conehead', 'Conehead Zombie', '路障僵尸', 640, 0.006),
  zombie('pole-vaulter', 'Pole Vaulting Zombie', '撑杆僵尸', 500, 0.009, { behavior: 'pole-vault' }),
  zombie('buckethead', 'Buckethead Zombie', '铁桶僵尸', 300, 0.0055, { armorHealth: 800 }),
  zombie('newspaper', 'Newspaper Zombie', '读报僵尸', 270, 0.0065, { armorHealth: 180 }),
  zombie('screen-door', 'Screen Door Zombie', '铁网门僵尸', 270, 0.0055, { armorHealth: 1_100 }),
  zombie('football', 'Football Zombie', '橄榄球僵尸', 270, 0.012, { armorHealth: 1_200 }),
  zombie('dancer', 'Dancing Zombie', '舞者僵尸', 500, 0.0065, { behavior: 'dancer' }),
  zombie('backup-dancer', 'Backup Dancer', '伴舞僵尸', 270, 0.0065),
  zombie('duckytube', 'Ducky Tube Zombie', '鸭子救生圈僵尸', 270, 0.0065),
  zombie('snorkel', 'Snorkel Zombie', '潜水僵尸', 270, 0.0065),
  zombie('zamboni', 'Zomboni', '雪橇车僵尸', 1_800, 0.012, { behavior: 'carrier' }),
  zombie('bobsled', 'Bobsled Team', '雪橇僵尸小队', 1_800, 0.012, { behavior: 'carrier' }),
  zombie('dolphin-rider', 'Dolphin Rider Zombie', '海豚骑士僵尸', 500, 0.012, { behavior: 'jumper' }),
  zombie('jack-in-the-box', 'Jack-in-the-Box Zombie', '玩偶匣僵尸', 500, 0.009),
  zombie('balloon', 'Balloon Zombie', '气球僵尸', 270, 0.0065, { behavior: 'balloon' }),
  zombie('digger', 'Digger Zombie', '矿工僵尸', 500, 0.008, { behavior: 'burrow' }),
  zombie('pogo', 'Pogo Zombie', '跳跳僵尸', 500, 0.009, { behavior: 'jumper', jumpIntervalTicks: 180 }),
  zombie('yeti', 'Yeti Zombie', '雪人僵尸', 1_800, 0.008),
  zombie('bungee', 'Bungee Zombie', '蹦极僵尸', 500, 0.01, { behavior: 'jumper' }),
  zombie('ladder', 'Ladder Zombie', '扶梯僵尸', 500, 0.0065, { armorHealth: 500 }),
  zombie('catapult', 'Catapult Zombie', '投石车僵尸', 850, 0.004, { behavior: 'carrier' }),
  zombie('gargantuar', 'Gargantuar', '巨人僵尸', 3_000, 0.004, { behavior: 'boss' }),
  zombie('imp', 'Imp', '小鬼僵尸', 270, 0.012),
  zombie('zomboss', 'Dr. Zomboss', '僵王博士', 20_000, 0.001, { behavior: 'boss' }),
];

const TERRAIN_BY_WORLD = ['day', 'night', 'pool', 'fog', 'roof'] as const;
const TERRAIN_TITLE: Record<(typeof TERRAIN_BY_WORLD)[number], { en: string; zh: string }> = {
  day: { en: 'Front Yard · Day', zh: '前院 · 白天' },
  night: { en: 'Front Yard · Night', zh: '前院 · 夜晚' },
  pool: { en: 'Backyard · Pool', zh: '后院 · 泳池' },
  fog: { en: 'Backyard · Fog', zh: '后院 · 浓雾' },
  roof: { en: 'Roof · Day', zh: '屋顶 · 白天' },
};

function zombiesForStage(world: number, stage: number): string[] {
  const worldSets = [
    ['basic', 'flag', 'conehead', 'pole-vaulter', 'buckethead', 'newspaper', 'screen-door', 'football', 'dancer', 'backup-dancer'],
    ['basic', 'conehead', 'buckethead', 'dancer', 'backup-dancer', 'jack-in-the-box', 'balloon'],
    ['duckytube', 'snorkel', 'dolphin-rider', 'zamboni', 'bobsled', 'conehead', 'buckethead'],
    ['basic', 'jack-in-the-box', 'balloon', 'digger', 'pogo', 'bungee', 'ladder'],
    ['football', 'catapult', 'gargantuar', 'imp', 'yeti', 'zomboss'],
  ];
  const candidates = worldSets[world - 1] ?? worldSets[0]!;
  const count = Math.min(candidates.length, 1 + Math.floor(stage / 2));
  return candidates.slice(0, count);
}

function createLevel(world: number, stage: number): LevelDefinition {
  const id = world + '-' + stage;
  const terrain = TERRAIN_BY_WORLD[world - 1] ?? 'day';
  const title = TERRAIN_TITLE[terrain];
  const rows = terrain === 'pool' || terrain === 'fog' ? 6 : 5;
  const columns = 9;
  const types = zombiesForStage(world, stage);
  const waveCount = Math.min(8, 2 + world + Math.floor((stage - 1) / 2));
  const rewardIndex = (world - 1) * 10 + stage - 1;
  const rewardPlantId = PLANTS[rewardIndex + 2]?.id;
  const waves: WaveDefinition[] = Array.from({ length: waveCount }, (_, index) => {
    const typeId = types[(index + Math.floor(stage / 2)) % types.length] ?? 'basic';
    const count = Math.max(1, Math.floor((world + stage + index) / 3));
    return {
      atTick: (index + 1) * 450,
      zombies: [{ typeId, count, rowRange: [0, rows - 1] as [number, number] }],
    };
  });
  const graves = terrain === 'night'
    ? Array.from({ length: Math.min(5, 1 + Math.floor(stage / 2)) }, (_, index) => ({
      row: (index * 2 + stage) % rows,
      column: Math.min(columns - 2, 3 + index),
    }))
    : undefined;
  if (world === 5 && stage === 10) {
    waves[waves.length - 1] = { atTick: waves.length * 450, zombies: [{ typeId: 'zomboss', row: 2 }] };
  }
  return {
    id,
    title: title.en,
    titleZh: title.zh,
    terrain,
    waterRows: terrain === 'pool' || terrain === 'fog' ? [2, 3] : undefined,
    rewardPlantId,
    rows,
    columns,
    startingSun: world === 1 && stage === 1 ? 150 : 200,
    skySunEveryTicks: terrain === 'night' ? 0 : terrain === 'fog' ? 900 : 480,
    graves,
    waves,
  };
}

export const ADVENTURE_LEVELS: LevelDefinition[] = Array.from({ length: 50 }, (_, index) => {
  const world = Math.floor(index / 10) + 1;
  const stage = index % 10 + 1;
  if (world === 1 && stage === 1) {
    return {
      id: '1-1',
      title: 'Front Yard · Day',
      titleZh: '前院 · 白天',
      terrain: 'day',
      rewardPlantId: 'cherry-bomb',
      rows: 5,
      columns: 9,
      startingSun: 150,
      skySunEveryTicks: 480,
      waves: [
        { atTick: 900, zombies: [{ typeId: 'basic', row: 2 }] },
        { atTick: 1_800, zombies: [{ typeId: 'basic', row: 1 }, { typeId: 'basic', row: 3 }] },
        { atTick: 2_700, zombies: [{ typeId: 'conehead', row: 2 }] },
      ],
    };
  }
  return createLevel(world, stage);
});
