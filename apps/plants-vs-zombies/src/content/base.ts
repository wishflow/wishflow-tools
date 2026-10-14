import type { LevelDefinition, PlantBehavior, PlantDefinition, ZombieDefinition } from '../core/types';
import { ADVENTURE_STAGE_DATA, getAdventureStageTitle } from './adventureData';

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
  return {
    id, title, titleZh, maxHealth, waveCost: 1, startingLevel: 1, firstAllowedWave: 1, pickWeight: 0,
    speedPerTick, biteDamage: 10, biteIntervalTicks: 30, behavior: 'walker', ...options,
  };
}

export const ZOMBIES: ZombieDefinition[] = [
  zombie('basic', 'Zombie', '普通僵尸', 270, 0.0065, { startingLevel: 1, firstAllowedWave: 1, pickWeight: 4_000 }),
  zombie('flag', 'Flag Zombie', '旗帜僵尸', 270, 0.008, { startingLevel: 1, firstAllowedWave: 1 }),
  zombie('conehead', 'Conehead Zombie', '路障僵尸', 640, 0.006, { waveCost: 2, startingLevel: 3, firstAllowedWave: 1, pickWeight: 4_000 }),
  zombie('pole-vaulter', 'Pole Vaulting Zombie', '撑杆僵尸', 500, 0.009, { waveCost: 2, startingLevel: 6, firstAllowedWave: 5, pickWeight: 2_000, behavior: 'pole-vault' }),
  zombie('buckethead', 'Buckethead Zombie', '铁桶僵尸', 300, 0.0055, { waveCost: 4, startingLevel: 8, firstAllowedWave: 1, pickWeight: 3_000, armorHealth: 800 }),
  zombie('newspaper', 'Newspaper Zombie', '读报僵尸', 270, 0.0065, { waveCost: 2, startingLevel: 11, firstAllowedWave: 1, pickWeight: 1_000, armorHealth: 180 }),
  zombie('screen-door', 'Screen Door Zombie', '铁网门僵尸', 270, 0.0055, { waveCost: 4, startingLevel: 13, firstAllowedWave: 5, pickWeight: 3_500, armorHealth: 1_100 }),
  zombie('football', 'Football Zombie', '橄榄球僵尸', 270, 0.012, { waveCost: 7, startingLevel: 16, firstAllowedWave: 5, pickWeight: 2_000, armorHealth: 1_200 }),
  zombie('dancer', 'Dancing Zombie', '舞者僵尸', 500, 0.0065, { waveCost: 5, startingLevel: 18, firstAllowedWave: 5, pickWeight: 1_000, behavior: 'dancer' }),
  zombie('backup-dancer', 'Backup Dancer', '伴舞僵尸', 270, 0.0065, { startingLevel: 18, firstAllowedWave: 1 }),
  zombie('duckytube', 'Ducky Tube Zombie', '鸭子救生圈僵尸', 270, 0.0065, { startingLevel: 21, firstAllowedWave: 5 }),
  zombie('snorkel', 'Snorkel Zombie', '潜水僵尸', 270, 0.0065, { waveCost: 3, startingLevel: 23, firstAllowedWave: 10, pickWeight: 2_000 }),
  zombie('zamboni', 'Zomboni', '雪橇车僵尸', 1_800, 0.012, { waveCost: 7, startingLevel: 26, firstAllowedWave: 10, pickWeight: 2_000, behavior: 'carrier' }),
  zombie('bobsled', 'Bobsled Team', '雪橇僵尸小队', 1_800, 0.012, { waveCost: 3, startingLevel: 26, firstAllowedWave: 10, pickWeight: 2_000, behavior: 'carrier' }),
  zombie('dolphin-rider', 'Dolphin Rider Zombie', '海豚骑士僵尸', 500, 0.012, { waveCost: 3, startingLevel: 28, firstAllowedWave: 10, pickWeight: 1_500, behavior: 'jumper' }),
  zombie('jack-in-the-box', 'Jack-in-the-Box Zombie', '玩偶匣僵尸', 500, 0.009, { waveCost: 3, startingLevel: 31, firstAllowedWave: 10, pickWeight: 1_000 }),
  zombie('balloon', 'Balloon Zombie', '气球僵尸', 270, 0.0065, { waveCost: 2, startingLevel: 33, firstAllowedWave: 10, pickWeight: 2_000, behavior: 'balloon' }),
  zombie('digger', 'Digger Zombie', '矿工僵尸', 500, 0.008, { waveCost: 4, startingLevel: 36, firstAllowedWave: 10, pickWeight: 1_000, behavior: 'burrow' }),
  zombie('pogo', 'Pogo Zombie', '跳跳僵尸', 500, 0.009, { waveCost: 4, startingLevel: 38, firstAllowedWave: 10, pickWeight: 1_000, behavior: 'jumper', jumpIntervalTicks: 180 }),
  zombie('yeti', 'Yeti Zombie', '雪人僵尸', 1_800, 0.008, { waveCost: 4, startingLevel: 40, firstAllowedWave: 1, pickWeight: 1 }),
  zombie('bungee', 'Bungee Zombie', '蹦极僵尸', 500, 0.01, { waveCost: 3, startingLevel: 41, firstAllowedWave: 10, pickWeight: 1_000, behavior: 'jumper' }),
  zombie('ladder', 'Ladder Zombie', '扶梯僵尸', 500, 0.0065, { waveCost: 4, startingLevel: 43, firstAllowedWave: 10, pickWeight: 1_000, armorHealth: 500 }),
  zombie('catapult', 'Catapult Zombie', '投石车僵尸', 850, 0.004, { waveCost: 5, startingLevel: 46, firstAllowedWave: 10, pickWeight: 1_500, behavior: 'carrier' }),
  zombie('gargantuar', 'Gargantuar', '巨人僵尸', 3_000, 0.004, { waveCost: 10, startingLevel: 48, firstAllowedWave: 15, pickWeight: 1_500, behavior: 'boss' }),
  zombie('imp', 'Imp', '小鬼僵尸', 270, 0.012, { waveCost: 10, startingLevel: 48, firstAllowedWave: 1 }),
  zombie('zomboss', 'Dr. Zomboss', '僵王博士', 20_000, 0.001, { waveCost: 10, startingLevel: 50, firstAllowedWave: 1, behavior: 'boss' }),
  zombie('red-eye-gargantuar', 'Gargantuar (Red Eyes)', '红眼巨人僵尸', 6_000, 0.004, { waveCost: 10, startingLevel: 48, firstAllowedWave: 15, pickWeight: 6_000, behavior: 'boss' }),
];

export const ADVENTURE_LEVELS: LevelDefinition[] = ADVENTURE_STAGE_DATA.map((stage) => {
  const title = getAdventureStageTitle(stage.terrain);
  const isWater = stage.terrain === 'pool' || stage.terrain === 'fog';
  return {
    id: stage.id,
    title: title.title,
    titleZh: title.titleZh,
    terrain: stage.terrain,
    waterRows: isWater ? [2, 3] : undefined,
    rows: stage.rows,
    columns: 9,
    rewardPlantId: stage.rewardPlantId,
    startingSun: stage.startingSun,
    skySunEveryTicks: stage.terrain === 'day' || stage.terrain === 'pool' || stage.terrain === 'roof' ? 480 : 0,
    adventureWavePlan: stage.adventureWavePlan,
    waves: [],
  };
});
