export interface PuzzleModeLevel {
  id: string;
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
}

export interface MiniGameLevel extends PuzzleModeLevel {
  terrain: 'day' | 'night' | 'pool' | 'fog' | 'roof';
  zombiePool: string[];
  startingSun: number;
  difficulty: number;
}

export const MINI_GAMES: MiniGameLevel[] = [
  { id: 'zombotany', title: 'ZomBotany', titleZh: '植物僵尸', description: 'Defend against a themed wave of tougher plant-headed zombies.', descriptionZh: '抵挡一波更强的植物头僵尸主题攻势。', terrain: 'day', zombiePool: ['basic', 'conehead', 'buckethead'], startingSun: 250, difficulty: 1 },
  { id: 'wall-nut-bowling', title: 'Wall-nut Bowling', titleZh: '坚果保龄球', description: 'Roll wall-nuts down selected lanes and stop ten zombies.', descriptionZh: '选择草坪行滚出坚果，击退十只僵尸。', terrain: 'day', zombiePool: ['basic'], startingSun: 0, difficulty: 1 },
  { id: 'slot-machine', title: 'Slot Machine', titleZh: '老虎机', description: 'Hold the lawn with a seeded, changing mix of zombie waves.', descriptionZh: '抵挡由固定种子生成的随机僵尸波次。', terrain: 'day', zombiePool: ['basic', 'conehead', 'pole-vaulter'], startingSun: 300, difficulty: 1 },
  { id: 'its-raining-seeds', title: "It's Raining Seeds", titleZh: '种子雨', description: 'Defend through a quick sequence of mixed zombie waves.', descriptionZh: '在紧凑的混合僵尸波次中守住草坪。', terrain: 'day', zombiePool: ['basic', 'conehead', 'buckethead'], startingSun: 350, difficulty: 1 },
  { id: 'beghouled', title: 'Beghouled', titleZh: '宝石僵尸', description: 'Survive a short lawn challenge with a mixed wave schedule.', descriptionZh: '在混合波次安排中完成短程草坪挑战。', terrain: 'day', zombiePool: ['basic', 'conehead'], startingSun: 250, difficulty: 1 },
  { id: 'invisi-ghoul', title: 'Invisi-ghoul', titleZh: '隐形僵尸', description: 'Defend a foggy lawn against a hidden-feeling wave lineup.', descriptionZh: '在浓雾草坪中抵挡难以预判的僵尸阵容。', terrain: 'fog', zombiePool: ['basic', 'balloon', 'digger'], startingSun: 350, difficulty: 2 },
  { id: 'seeing-stars', title: 'Seeing Stars', titleZh: '星星之愿', description: 'Hold five lanes against a mixed wave challenge.', descriptionZh: '在混合波次挑战中守住五条草坪行。', terrain: 'day', zombiePool: ['basic', 'conehead', 'football'], startingSun: 400, difficulty: 2 },
  { id: 'zombiquarium', title: 'Zombiquarium', titleZh: '僵尸水族馆', description: 'Defend the pool against aquatic zombies and mixed reinforcements.', descriptionZh: '在泳池中抵挡水路僵尸与混合增援。', terrain: 'pool', zombiePool: ['duckytube', 'snorkel', 'dolphin-rider'], startingSun: 400, difficulty: 2 },
  { id: 'beghouled-twist', title: 'Beghouled Twist', titleZh: '宝石僵尸转转版', description: 'Face a denser mixed-wave defense challenge.', descriptionZh: '面对更密集的混合波次防守挑战。', terrain: 'day', zombiePool: ['basic', 'conehead', 'buckethead', 'dancer'], startingSun: 450, difficulty: 2 },
  { id: 'big-trouble-little-zombie', title: 'Big Trouble Little Zombie', titleZh: '小僵尸大麻烦', description: 'Survive a fast-moving night attack.', descriptionZh: '抵挡快速推进的夜间攻势。', terrain: 'night', zombiePool: ['imp', 'basic', 'newspaper'], startingSun: 400, difficulty: 2 },
  { id: 'portal-combat', title: 'Portal Combat', titleZh: '传送门战斗', description: 'Defend the night lawn from varied entry waves.', descriptionZh: '在夜间草坪中抵挡来自多路的混合攻势。', terrain: 'night', zombiePool: ['basic', 'digger', 'bungee'], startingSun: 450, difficulty: 2 },
  { id: 'column-like-you-see-em', title: "Column Like You See 'Em", titleZh: '按列布防', description: 'Hold the lawn through a column-focused wave challenge.', descriptionZh: '在强调列向布防的波次挑战中守住草坪。', terrain: 'day', zombiePool: ['basic', 'conehead', 'buckethead'], startingSun: 400, difficulty: 2 },
  { id: 'bobsled-bonanza', title: 'Bobsled Bonanza', titleZh: '雪橇盛宴', description: 'Protect the pool from bobsled teams and Zombonis.', descriptionZh: '保护泳池，抵挡雪橇小队与雪橇车僵尸。', terrain: 'pool', zombiePool: ['zamboni', 'bobsled', 'duckytube'], startingSun: 500, difficulty: 3 },
  { id: 'zombie-nimble-zombie-quick', title: 'Zombie Nimble Zombie Quick', titleZh: '僵尸敏捷僵尸快', description: 'Face a quick, relentless sequence of attacks.', descriptionZh: '抵挡快速而连续的僵尸攻势。', terrain: 'day', zombiePool: ['football', 'pole-vaulter', 'basic'], startingSun: 450, difficulty: 3 },
  { id: 'whack-a-zombie', title: 'Whack a Zombie', titleZh: '砸僵尸', description: 'Tap each zombie as it pops up before it disappears.', descriptionZh: '僵尸冒头时点击它，在它消失前击中目标。', terrain: 'day', zombiePool: ['basic'], startingSun: 0, difficulty: 1 },
  { id: 'last-stand', title: 'Last Stand', titleZh: '最后防线', description: 'Build a defense with a large starting sun reserve.', descriptionZh: '利用大量初始阳光搭建防线。', terrain: 'day', zombiePool: ['basic', 'conehead', 'buckethead', 'football'], startingSun: 5_000, difficulty: 3 },
  { id: 'zombotany-2', title: 'ZomBotany 2', titleZh: '植物僵尸 2', description: 'Defend against a heavier plant-headed zombie assault.', descriptionZh: '抵挡更强的植物头僵尸攻势。', terrain: 'day', zombiePool: ['conehead', 'buckethead', 'football', 'gargantuar'], startingSun: 600, difficulty: 4 },
  { id: 'wall-nut-bowling-2', title: 'Wall-nut Bowling 2', titleZh: '坚果保龄球 2', description: 'Roll wall-nuts through a tougher bowling challenge.', descriptionZh: '在更困难的保龄球挑战中滚出坚果。', terrain: 'day', zombiePool: ['basic', 'conehead'], startingSun: 0, difficulty: 2 },
  { id: 'pogo-party', title: 'Pogo Party', titleZh: '跳跳派对', description: 'Stop pogo zombies before they leap through the roof defense.', descriptionZh: '在跳跳僵尸越过屋顶防线前阻止它们。', terrain: 'roof', zombiePool: ['pogo', 'basic', 'buckethead'], startingSun: 600, difficulty: 4 },
  { id: 'dr-zomboss-revenge', title: "Dr. Zomboss's Revenge", titleZh: '僵王博士的复仇', description: 'Take on a boss-scale final lawn defense.', descriptionZh: '迎战首领级的最终草坪防守战。', terrain: 'roof', zombiePool: ['zomboss', 'gargantuar', 'imp'], startingSun: 1_000, difficulty: 5 },
];

export interface VasebreakerLevel extends PuzzleModeLevel {
  rows: number;
  columns: number;
  plantRatio: number;
  zombieRatio: number;
  plantPayloads: string[];
  zombiePayloads: string[];
  endless?: boolean;
}

export const VASEBREAKER_LEVELS: VasebreakerLevel[] = [
  { id: 'vasebreaker', title: 'Vasebreaker', titleZh: '砸罐子', description: 'Reveal plants, sun, and zombies one vase at a time.', descriptionZh: '逐个打破花瓶，揭开植物、阳光与僵尸。', rows: 5, columns: 6, plantRatio: .25, zombieRatio: .25, plantPayloads: ['peashooter', 'wall-nut', 'sunflower'], zombiePayloads: ['basic'] },
  { id: 'to-the-left', title: 'To the Left', titleZh: '向左', description: 'Manage a tighter vase layout and control which threats you reveal.', descriptionZh: '在更紧凑的花瓶阵型中控制揭开的威胁。', rows: 5, columns: 7, plantRatio: .24, zombieRatio: .3, plantPayloads: ['peashooter', 'wall-nut', 'cherry-bomb'], zombiePayloads: ['basic', 'conehead'] },
  { id: 'third-vase', title: 'Third Vase', titleZh: '第三个花瓶', description: 'Plan each reveal around a mixed group of zombies.', descriptionZh: '围绕混合僵尸群规划每次开罐顺序。', rows: 5, columns: 7, plantRatio: .25, zombieRatio: .32, plantPayloads: ['peashooter', 'snow-pea', 'wall-nut'], zombiePayloads: ['basic', 'conehead'] },
  { id: 'chain-reaction', title: 'Chain Reaction', titleZh: '连锁反应', description: 'Build a defense while opening a dense chain of vases.', descriptionZh: '在密集花瓶阵中逐步建立防线。', rows: 6, columns: 7, plantRatio: .28, zombieRatio: .3, plantPayloads: ['peashooter', 'repeater', 'cherry-bomb'], zombiePayloads: ['basic', 'conehead', 'buckethead'] },
  { id: 'm-is-for-metal', title: 'M is for Metal', titleZh: 'M 代表金属', description: 'Prepare for armored zombies hidden among the vases.', descriptionZh: '提防藏在花瓶中的装甲僵尸。', rows: 6, columns: 7, plantRatio: .28, zombieRatio: .32, plantPayloads: ['repeater', 'snow-pea', 'cherry-bomb'], zombiePayloads: ['conehead', 'buckethead'] },
  { id: 'scary-potter', title: 'Scary Potter', titleZh: '惊魂波特', description: 'Clear a larger board with stronger plant and zombie mixes.', descriptionZh: '在更大的棋盘上处理更强的植物与僵尸组合。', rows: 6, columns: 8, plantRatio: .28, zombieRatio: .32, plantPayloads: ['repeater', 'snow-pea', 'cherry-bomb', 'wall-nut'], zombiePayloads: ['basic', 'conehead', 'buckethead'] },
  { id: 'hokey-pokey', title: 'Hokey Pokey', titleZh: '摇摆舞', description: 'Read the board carefully before revealing its hidden pieces.', descriptionZh: '看清棋盘，再揭开隐藏内容。', rows: 6, columns: 8, plantRatio: .3, zombieRatio: .32, plantPayloads: ['peashooter', 'repeater', 'wall-nut', 'potato-mine'], zombiePayloads: ['basic', 'conehead', 'buckethead'] },
  { id: 'another-chain-reaction', title: 'Another Chain Reaction', titleZh: '又一次连锁反应', description: 'Face another dense board with a broader zombie roster.', descriptionZh: '面对更密集棋盘与更多僵尸类型。', rows: 6, columns: 8, plantRatio: .3, zombieRatio: .34, plantPayloads: ['repeater', 'snow-pea', 'cherry-bomb', 'wall-nut'], zombiePayloads: ['basic', 'conehead', 'buckethead'] },
  { id: 'ace-of-vase', title: 'Ace of Vase', titleZh: '砸罐高手', description: 'Clear a large final board with little room for mistakes.', descriptionZh: '清理大型最终棋盘，失误空间更少。', rows: 7, columns: 8, plantRatio: .3, zombieRatio: .35, plantPayloads: ['repeater', 'snow-pea', 'cherry-bomb', 'wall-nut', 'potato-mine'], zombiePayloads: ['basic', 'conehead', 'buckethead'] },
  { id: 'vasebreaker-endless', title: 'Vasebreaker Endless', titleZh: '无尽砸罐', description: 'Play a seeded endless-style vase challenge.', descriptionZh: '挑战可复现的无尽砸罐棋盘。', rows: 7, columns: 8, plantRatio: .3, zombieRatio: .36, plantPayloads: ['repeater', 'snow-pea', 'cherry-bomb', 'wall-nut', 'potato-mine'], zombiePayloads: ['basic', 'conehead', 'buckethead'], endless: true },
];

export interface IZombieLevel extends PuzzleModeLevel {
  brains: number;
  layout: number;
  zombieIds: string[];
  endless?: boolean;
}

export const I_ZOMBIE_LEVELS: IZombieLevel[] = [
  { id: 'i-zombie', title: 'I, Zombie', titleZh: '我是僵尸', description: 'Spend brains to guide zombies through a prepared defense.', descriptionZh: '消耗脑子，指挥僵尸突破预设防线。', brains: 250, layout: 0, zombieIds: ['basic', 'conehead', 'pole-vaulter', 'buckethead', 'balloon'] },
  { id: 'i-zombie-too', title: 'I, Zombie Too', titleZh: '我是僵尸 2', description: 'Break through a new lawn layout with a larger zombie roster.', descriptionZh: '用更多种类的僵尸突破新的草坪阵型。', brains: 300, layout: 1, zombieIds: ['basic', 'conehead', 'pole-vaulter', 'buckethead', 'balloon', 'digger'] },
  { id: 'can-you-dig-it', title: 'Can You Dig It?', titleZh: '你会挖洞吗？', description: 'Use diggers to bypass the front of the defense.', descriptionZh: '利用矿工僵尸绕过防线前排。', brains: 250, layout: 2, zombieIds: ['digger', 'basic'] },
  { id: 'totally-nuts', title: 'Totally Nuts', titleZh: '坚果阵', description: 'Find a way through a lawn packed with blockers.', descriptionZh: '想办法突破布满坚果防守的草坪。', brains: 400, layout: 3, zombieIds: ['basic', 'pole-vaulter', 'gargantuar', 'imp'] },
  { id: 'dead-zeppelin', title: 'Dead Zeppelin', titleZh: '亡灵飞艇', description: 'Use airborne zombies against a defense built across several rows.', descriptionZh: '用空中僵尸攻击覆盖多行的防线。', brains: 300, layout: 4, zombieIds: ['balloon', 'basic', 'conehead'] },
  { id: 'me-smash', title: 'Me Smash!', titleZh: '我要砸！', description: 'Deploy heavy zombies against a stronger defense.', descriptionZh: '派出重型僵尸冲击更强的防线。', brains: 500, layout: 5, zombieIds: ['gargantuar', 'imp', 'buckethead'] },
  { id: 'zomboogie', title: 'ZomBoogie', titleZh: '僵尸布吉舞', description: 'Use dancers and their backup to open a route to the brains.', descriptionZh: '利用舞者和伴舞打通通往脑子的路线。', brains: 400, layout: 6, zombieIds: ['dancer', 'basic', 'conehead'] },
  { id: 'three-hit-wonder', title: 'Three Hit Wonder', titleZh: '三击奇迹', description: 'Choose lanes carefully in a compact three-row puzzle.', descriptionZh: '在紧凑的三行棋盘中谨慎选择路线。', brains: 250, layout: 7, zombieIds: ['basic', 'conehead', 'buckethead'] },
  { id: 'all-your-brainz-r-belong-to-us', title: 'All Your Brainz R Belong to Us', titleZh: '你们的脑子都是我们的', description: 'Use a broad roster and limited resources to finish the puzzle.', descriptionZh: '用丰富的僵尸阵容和有限资源完成谜题。', brains: 500, layout: 8, zombieIds: ['basic', 'conehead', 'pole-vaulter', 'buckethead', 'balloon', 'digger', 'pogo', 'dancer', 'gargantuar', 'imp'] },
  { id: 'i-zombie-endless', title: 'I, Zombie Endless', titleZh: '无尽我是僵尸', description: 'Keep deploying zombies through an endless sequence of defenses.', descriptionZh: '持续派出僵尸，挑战连续防线。', brains: 350, layout: 9, zombieIds: ['basic', 'conehead', 'pole-vaulter', 'buckethead', 'balloon', 'digger', 'pogo', 'dancer', 'gargantuar', 'imp'], endless: true },
];
