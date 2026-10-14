import { localize, registerMessages, type LocalizedText } from '@wishflow/site-shell';
import { PLANTS, ZOMBIES } from './content/base';
import type { LevelTerrain } from './core/types';

export const MESSAGES: Record<string, LocalizedText> = {
  title: { en: 'Garden Defense', zh: '花园防线' },
  eyebrow: { en: 'A deterministic lawn defense game', zh: '可复现的草坪防守游戏' },
  menuHeading: { en: 'A quiet lawn. A very loud problem.', zh: '草坪很安静，麻烦快到了。' },
  menuDescription: { en: 'Build your garden, collect sunlight, and hold the line.', zh: '布置花园、收集阳光，守住最后一道防线。' },
  startAdventure: { en: 'Start Adventure', zh: '开始冒险' },
  selectLevel: { en: 'Unlocked levels', zh: '已解锁关卡' },
  chapterLabel: { en: 'ADVENTURE · FRONT YARD', zh: '冒险模式 · 前院' },
  modeHeading: { en: 'Choose a path', zh: '选择模式' },
  modesLater: { en: 'More modes unlock as the garden grows.', zh: '更多模式将随花园扩展逐步开放。' },
  adventure: { en: 'Adventure', zh: '冒险' },
  miniGames: { en: 'Mini-games', zh: '小游戏' },
  puzzle: { en: 'Puzzle', zh: '解谜' },
  survival: { en: 'Survival', zh: '生存' },
  zenGarden: { en: 'Zen Garden', zh: '禅境花园' },
  almanac: { en: 'Almanac', zh: '图鉴' },
  almanacPlants: { en: 'Plants', zh: '植物' },
  almanacZombies: { en: 'Zombies', zh: '僵尸' },
  statSun: { en: 'Cost', zh: '费用' },
  statHealth: { en: 'Health', zh: '生命' },
  statArmor: { en: 'Armor', zh: '护甲' },
  statSpeed: { en: 'Speed', zh: '速度' },
  statAbility: { en: 'Trait', zh: '特性' },
  inDevelopment: { en: 'In development', zh: '开发中' },
  lockedUntil3_2: { en: 'Clear Adventure 3-2 to unlock', zh: '通关冒险 3-2 后解锁' },
  lockedUntil4_6: { en: 'Clear Adventure 4-6 to unlock', zh: '通关冒险 4-6 后解锁' },
  lockedUntil5_4: { en: 'Clear Adventure 5-4 to unlock', zh: '通关冒险 5-4 后解锁' },
  lockedUntil5_10: { en: 'Complete Adventure to unlock', zh: '通关冒险模式后解锁' },
  survivalWaves: { en: '20 waves · Day', zh: '20 波 · 白天' },
  survivalComplete: { en: 'Survival run complete!', zh: '生存挑战完成！' },
  vasebreaker: { en: 'Vasebreaker', zh: '砸罐子' },
  vasebreakerCard: { en: 'Break vases to reveal plants, sunlight, and zombies.', zh: '打破花瓶，揭开植物、阳光与僵尸。' },
  vaseBreakerState: { en: 'Puzzle ready', zh: '解谜已开放' },
  vaseHidden: { en: 'Sealed vase', zh: '未打开的花瓶' },
  vaseEmpty: { en: 'Empty tile', zh: '空地' },
  vaseStatus: { en: 'Vases: {vases} · Sun: {sun} · Zombies: {zombies}', zh: '花瓶：{vases} · 阳光：{sun} · 僵尸：{zombies}' },
  vaseWon: { en: 'All vases cleared and the lawn is safe.', zh: '花瓶已清空，草坪安全。' },
  vaseLost: { en: 'A zombie reached the house. Return and try a new layout.', zh: '僵尸抵达房屋，请返回重试新布局。' },
  miniGamesState: { en: 'Wall-nut Bowling · Whack a Zombie', zh: '坚果保龄球 · 砸僵尸' },
  puzzleModesState: { en: 'Vasebreaker · I, Zombie', zh: '砸罐子 · 我是僵尸' },
  survivalModesState: { en: '5 terrain challenges', zh: '5 种地形挑战' },
  zenGardenState: { en: 'Session garden', zh: '本次会话花园' },
  iZombie: { en: 'I, Zombie', zh: '我是僵尸' },
  iZombieDescription: { en: 'Choose a zombie, spend brains, and send it through the lawn.', zh: '选择僵尸并消耗脑子，突破草坪防线。' },
  wallNutBowling: { en: 'Wall-nut Bowling', zh: '坚果保龄球' },
  wallNutBowlingDescription: { en: 'Pick a lane and roll wall-nuts to stop ten zombies.', zh: '选择一条草坪行滚出坚果，击退十只僵尸。' },
  whackAZombie: { en: 'Whack a Zombie', zh: '砸僵尸' },
  whackAZombieDescription: { en: 'Tap zombies as they pop up. Clear twenty targets before losing all three chances.', zh: '僵尸冒头时点击它。击中二十只，且不要耗尽三次机会。' },
  zenGardenDescription: { en: 'Water, fertilize, and care for plants in this temporary garden.', zh: '在临时花园中浇水、施肥并照料植物。' },
  waterPlant: { en: 'Water', zh: '浇水' },
  fertilizePlant: { en: 'Fertilize', zh: '施肥' },
  cleanPlant: { en: 'Clean', zh: '清理' },
  bowlLane: { en: 'Roll in row', zh: '在第几行滚出坚果' },
  throwCooldown: { en: 'Wall-nut recharging', zh: '坚果正在准备' },
  bowlingStatus: { en: 'Score: {score} · Lives: {lives}', zh: '击退：{score} · 生命：{lives}' },
  iZombieStatus: { en: 'Brains: {brains} · Zombies: {zombies}', zh: '脑子：{brains} · 僵尸：{zombies}' },
  zenStatus: { en: 'Garden session · Growth {growth}%', zh: '花园会话 · 生长 {growth}%' },
  modeWon: { en: 'Challenge complete!', zh: '挑战完成！' },
  modeLost: { en: 'Challenge failed. Return to choose another mode.', zh: '挑战失败，请返回选择其他模式。' },
  settings: { en: 'Settings', zh: '设置' },
  music: { en: 'Music', zh: '音乐' },
  sound: { en: 'Sound effects', zh: '音效' },
  shake: { en: 'Screen shake', zh: '画面震动' },
  battlefield: { en: 'Battlefield', zh: '战场' },
  selectSeed: { en: 'Seed packets', zh: '种子包' },
  seedSelection: { en: 'Choose your seeds', zh: '选择种子' },
  availableSeeds: { en: 'Available seeds', zh: '可选种子' },
  chosenSeeds: { en: 'Chosen seeds', zh: '已选种子' },
  seedSlots: { en: '6 seed slots', zh: '6 个选卡位' },
  startLevel: { en: 'Enter level', zh: '进入关卡' },
  continueWave: { en: 'Continue defense', zh: '继续防守' },
  reselectSeeds: { en: 'Rechoose seeds', zh: '重新选卡' },
  waveIntermission: { en: 'Flag cleared. Rechoose your plants for the next wave.', zh: '本轮已守住，请为下一轮重新选卡。' },
  endless: { en: 'Endless', zh: '无尽' },
  seedLimit: { en: 'The seed tray is full.', zh: '选卡位已满。' },
  chooseOneSeed: { en: 'Choose at least one seed packet.', zh: '请至少选择一个种子包。' },
  shovel: { en: 'Shovel', zh: '铲子' },
  pause: { en: 'Pause', zh: '暂停' },
  resume: { en: 'Resume', zh: '继续' },
  mainMenu: { en: 'Main menu', zh: '主菜单' },
  replay: { en: 'Play again', zh: '再玩一次' },
  ready: { en: 'Choose a seed packet, then tap a lawn tile.', zh: '选择种子包，再点击草坪格子。' },
  won: { en: 'Lawn secured!', zh: '草坪守住了！' },
  lost: { en: 'The lawn was overrun.', zh: '僵尸突破了防线。' },
  noSeed: { en: 'Choose a seed packet first.', zh: '请先选择种子包。' },
  invalidCell: { en: 'That tile is outside the lawn.', zh: '这个位置不在草坪上。' },
  occupied: { en: 'That tile is already occupied.', zh: '这个位置已经有植物了。' },
  wrongTerrain: { en: 'This plant cannot grow on that surface.', zh: '这种植物不能种在该地形。' },
  needsPlatform: { en: 'Place a Lily Pad or Flower Pot first.', zh: '请先放置睡莲或花盆。' },
  needsBasePlant: { en: 'Place a plant here before adding a Pumpkin.', zh: '请先种植植物，再放置南瓜头。' },
  noSleepingMushroom: { en: 'Coffee Beans only wake sleeping mushrooms.', zh: '咖啡豆只能唤醒睡着的蘑菇。' },
  needsUpgradeTarget: { en: 'Plant this upgrade on its required plant.', zh: '请将升级植物种在指定的基础植物上。' },
  graveBlocks: { en: 'Clear the gravestone before planting here.', zh: '请先清除墓碑，再在这里种植。' },
  noGrave: { en: 'Grave Buster can only be planted on a gravestone.', zh: '墓碑吞噬者只能种在墓碑上。' },
  noSun: { en: 'Not enough sunlight.', zh: '阳光不足。' },
  cooldown: { en: 'That seed packet is recharging.', zh: '种子包还在冷却。' },
  emptyCell: { en: 'There is nothing to shovel here.', zh: '这里没有可以铲除的植物。' },
  rotated: { en: 'Rotate your device to landscape to play.', zh: '请将设备旋转至横屏进行游戏。' },
  levelWon: { en: 'Level cleared', zh: '关卡完成' },
  allLevelsWon: { en: 'Adventure complete!', zh: '冒险模式已通关！' },
  rendererFailed: { en: 'The game renderer could not be loaded. Reload and try again.', zh: '游戏画面加载失败，请刷新后重试。' },
  version: { en: 'A fan-made learning project · No affiliation with EA or PopCap', zh: '粉丝学习项目 · 与 EA 或 PopCap 无关联' },
};

registerMessages('plants-vs-zombies', MESSAGES);

export function t(key: keyof typeof MESSAGES): string {
  return localize(MESSAGES[key]!);
}

export function plantName(id: string): string {
  const definition = PLANTS.find((plant) => plant.id === id);
  return definition ? localize({ en: definition.title, zh: definition.titleZh ?? definition.title }) : localize(id);
}

export function zombieName(id: string): string {
  const definition = ZOMBIES.find((zombie) => zombie.id === id);
  return definition ? localize({ en: definition.title, zh: definition.titleZh ?? definition.title }) : localize(id);
}

export function terrainName(terrain: LevelTerrain): string {
  const names: Record<LevelTerrain, LocalizedText> = {
    day: { en: 'Day', zh: '白天' },
    night: { en: 'Night', zh: '夜晚' },
    pool: { en: 'Pool', zh: '泳池' },
    fog: { en: 'Fog', zh: '浓雾' },
    roof: { en: 'Roof', zh: '屋顶' },
    boss: { en: 'Boss', zh: '首领战' },
  };
  return localize(names[terrain]);
}
