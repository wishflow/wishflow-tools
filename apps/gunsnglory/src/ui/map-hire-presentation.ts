export type MapHireLanguage = 'en' | 'zh';

export interface MapHirePresentation {
  portraitAsset: string;
  name: Readonly<Record<MapHireLanguage, string>>;
  hireText: Readonly<Record<MapHireLanguage, string>>;
  insufficientCashText: Readonly<Record<MapHireLanguage, string>>;
}

const mapHirePresentations: Readonly<Record<string, MapHirePresentation>> = Object.freeze({
  gunslinger: {
    portraitAsset: 'portrait_gunslinger',
    name: { en: 'Desperado', zh: '亡命枪手' },
    hireText: { en: 'Howdy, partner! Who do you want me to gun down for you?', zh: '你好，伙伴！你想让我替你干掉谁？' },
    insufficientCashText: { en: 'First, go and ambush a few more gringos, so you can pay me, too!', zh: '先去再伏击几个敌人，赚够钱再雇我吧！' },
  },
  mexican: {
    portraitAsset: 'portrait_mexican',
    name: { en: 'Bandito', zh: '班迪多' },
    hireText: { en: 'Señor, why are you disturbing my siesta? Is there something to blow up?', zh: '先生，为什么打扰我的午睡？有东西要炸吗？' },
    insufficientCashText: { en: 'No, Señor. For that money, I’ll stay here. It’s much too hot.', zh: '不，先生。这点钱我还是留在这里吧，外面太热了。' },
  },
  cannon: {
    portraitAsset: 'portrait_deserter',
    name: { en: 'Cannon', zh: '加农炮手' },
    hireText: { en: 'Sir, my cannon is ready for action, sir! Do you require my services?', zh: '长官，我的加农炮已经准备就绪！需要我效劳吗？' },
    insufficientCashText: { en: 'The cannon won’t fire without money for ammunition, sir!', zh: '长官，没有钱买弹药，加农炮可不会开火！' },
  },
  indian: {
    portraitAsset: 'portrait_indian',
    name: { en: 'Native', zh: '原住民' },
    hireText: { en: 'Big warrior help drive out white invader.', zh: '强大的战士会帮助赶走入侵者。' },
    insufficientCashText: { en: 'Ugh. Medicine man had vision of paleface who bring many dollars. But was not you.', zh: '唉，巫医预见一位会带来许多钱的白人，可那个人不是你。' },
  },
  'train-12': {
    portraitAsset: 'portrait_engineer',
    name: { en: 'Gatling Gun', zh: '加特林机枪' },
    hireText: { en: 'Aye! I can mount a powerful Gatling gun on the wagon.', zh: '好！我可以在车厢上装一挺强力加特林机枪。' },
    insufficientCashText: { en: 'I can’t find my wrench. If you find your bag of gold, I’ll find my wrench.', zh: '我找不到扳手了。你先找到那袋金币，我就能找到扳手。' },
  },
  'train-22': {
    portraitAsset: 'portrait_engineer',
    name: { en: 'Gatling Gun', zh: '加特林机枪' },
    hireText: { en: 'Aye! I can mount a powerful Gatling gun on the wagon.', zh: '好！我可以在车厢上装一挺强力加特林机枪。' },
    insufficientCashText: { en: 'I can’t find my wrench. If you find your bag of gold, I’ll find my wrench.', zh: '我找不到扳手了。你先找到那袋金币，我就能找到扳手。' },
  },
  'steamer-32': {
    portraitAsset: 'portrait_captain',
    name: { en: 'Steamboat double cannon', zh: '汽船双炮' },
    hireText: { en: 'The deck has been freshly scrubbed. So how about a mighty double cannon?', zh: '甲板刚刚擦洗干净。来装一门威力强大的双炮怎么样？' },
    insufficientCashText: { en: 'Gunpowder isn’t free!', zh: '火药可不是免费的！' },
  },
  sniper: {
    portraitAsset: 'oregon_dakota_portrait_calamity',
    name: { en: 'Markswoman', zh: '女神枪手' },
    hireText: { en: 'With my rifle, I can hit settlers so far away that you can’t see them with the naked eye!', zh: '有了我的步枪，即使是肉眼看不到的远处敌人，我也能命中！' },
    insufficientCashText: { en: 'I won’t even talk to you for that price!', zh: '出这点钱，连和你说话都免了！' },
  },
  grandpa: {
    portraitAsset: 'oregon_dakota_portrait_geezer',
    name: { en: 'Scattergun Grandpa', zh: '霰弹枪爷爷' },
    hireText: { en: 'My scattergun is loaded with pepper. Do you want me to slow down some settlers?', zh: '我的霰弹枪装满了胡椒弹。要我去减慢敌人的脚步吗？' },
    insufficientCashText: { en: 'What? Did you say something? I can’t hear you!', zh: '什么？你说什么来着？我听不见！' },
  },
  pyromaniac: {
    portraitAsset: 'portrait_pyromaniac',
    name: { en: 'Pyromaniac', zh: '纵火狂' },
    hireText: { en: 'You wanna see big fireworks?', zh: '想看一场盛大的烟火吗？' },
    insufficientCashText: { en: 'No dollars, no rockets!', zh: '没有钱，就没有火箭！' },
  },
  salesman: {
    portraitAsset: 'portrait_salesman',
    name: { en: 'Snake Oil Salesman', zh: '蛇油推销员' },
    hireText: { en: 'Ladies and gentlemen! Come and test the effectiveness of my amazing tonics for yourself!', zh: '女士们、先生们！快来亲自试试我这神奇药剂的功效吧！' },
    insufficientCashText: { en: '*Cough* Not today, boys… I can’t breathe without a whiff of the scent of money!', zh: '*咳* 今天不行，伙计们……没有钱的味道，我都喘不过气！' },
  },
});

export function getMapHirePresentation(type: string): MapHirePresentation | undefined {
  return mapHirePresentations[type];
}

export const mapHirePresentationTypes = Object.freeze(Object.keys(mapHirePresentations));
