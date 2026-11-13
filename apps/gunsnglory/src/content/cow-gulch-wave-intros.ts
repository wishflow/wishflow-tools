export interface LocalizedCampaignCopy {
  en: string;
  zh: string;
}

export interface CampaignWaveIntro {
  waveNumber: number;
  speaker: LocalizedCampaignCopy;
  text: LocalizedCampaignCopy;
  portraitAsset: 'portrait_indian' | 'portrait_pedro' | 'portrait_settlers' | 'portrait_deserter' | 'portrait_engineer' | 'portrait_sheriff' | 'portrait_gunslinger' | 'portrait_mexican' | 'portrait_captain' | 'oregon_dakota_portrait_geezer';
  voiceSound?: 'sound_deserter_yes_sir' | 'sound_indian_hugh' | 'sound_pedro' | 'sound_siedler' | 'sound_sheriff' | 'sound_desperado_yihaa' | 'sound_mexican_arriba';
}

/** Cow Gulch wave dialogue transcribed from APK campaign strings and pointer controls. */
export const cowGulchWaveIntros: readonly CampaignWaveIntro[] = Object.freeze([
  {
    waveNumber: 1,
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: "Hey, Boss! I'm Pedro, your faithful compañero! Grab this Desperado and move him to the canyon! Then, he can ambush the settlers and take their gold! Hee hee hee!",
      zh: '老板！我是你忠实的伙伴佩德罗！选中这个枪手，把他移动到峡谷边缘！这样他就能伏击拓荒者，抢走他们的黄金！嘿嘿嘿！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 2,
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: "That's the way, Boss! As you can see from the gauge on the top left, the settlers have handed over some gold. We can use this to hire some new bandits. Give one of these sleeping Desperados a whack on the back of the head to wake him up, and offer him a few dollars!",
      zh: '干得好，老板！看左上角的计量条，拓荒者已经交出了些黄金。我们可以用它雇佣新的匪徒。打醒一个睡着的枪手，再付他几块钱，让他加入队伍！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 3,
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'Dios mio! Now those settlers are trying to hide in their covered wagons! We should pursue them through the canyon to get them!',
      zh: '我的天！那些拓荒者躲进篷车里了！我们得穿过峡谷追上他们！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 4,
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: "Yeehah! We should hire a couple of dynamite-throwing Banditos! Smoke the settlers out and blast 'em away in groups!",
      zh: '耶哈！我们该雇几个会扔炸药的匪徒！把拓荒者从车里炸出来，再一群群解决掉！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 5,
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'Boss, want to bet on who will be first to hit a settler? Click or tap one to set a priority target!',
      zh: '老板，要不要赌谁会先打中拓荒者？点击或轻触其中一个，将其设为优先目标！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 6,
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'You have to make sure that none of the settlers escape. The star above shows how many settlers can escape before the Sheriff is alerted.',
      zh: '别让拓荒者逃走。上方的星星显示警长被惊动前，还能逃走多少人。',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 7,
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'Ha ha! Those settlers might just about be able to found a tent camp!',
      zh: '哈哈！那些拓荒者差不多够搭起一个帐篷营地了！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 8,
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: "Let's go, men! As you can see from the top right, the last group has set off! Show the boss what you can do! Ándale!",
      zh: '弟兄们，出发！右上角显示最后一队已经上路了！让老板看看你们的本事！快走！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
]);

export class CampaignWaveIntroCursor {
  private lastShownWave = 0;

  constructor(private readonly intros: readonly CampaignWaveIntro[] = cowGulchWaveIntros) {}

  next(waveNumber: number): CampaignWaveIntro | undefined {
    if (!Number.isSafeInteger(waveNumber) || waveNumber <= this.lastShownWave) return undefined;
    const intro = this.intros.find((candidate) => candidate.waveNumber === waveNumber);
    if (intro) this.lastShownWave = waveNumber;
    return intro;
  }
}

/** Apache Valley wave dialogue transcribed from the APK's campaign strings and speaker resources. */
export const apacheValleyWaveIntros: readonly CampaignWaveIntro[] = Object.freeze([
  {
    waveNumber: 1,
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'Apache Valley is a good hunting ground... for settlers! You can also see on the bottom left how long it will be before the first convoy of settlers arrives. Press the Display key to speed up the start of the game! ',
      zh: '阿帕奇山谷是个绝佳的狩猎场……对拓荒者来说！左下角会显示第一队拓荒者抵达前的剩余时间。按显示键可以加快游戏开始！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 2,
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'We must wake all these slumbering warriors up and persuade as many of them as possible to join us!',
      zh: '我们得把这些沉睡的战士都叫醒，尽可能说服他们加入我们！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 3,
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: 'Darling, this gloomy canyon gives me the creeps. Can\'t we take the eastern route?',
      zh: '亲爱的，这条阴森的峡谷让我毛骨悚然。我们不能走东边那条路吗？',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 4,
    speaker: { en: 'Indian', zh: '印第安战士' },
    text: {
      en: 'Many settlers are approaching the land of our ancestors. Can you smell it, too? They are coming through both canyons at the same time!',
      zh: '许多拓荒者正在逼近祖先的土地。你也闻到了吗？他们正同时穿过两条峡谷！',
    },
    portraitAsset: 'portrait_indian',
    voiceSound: 'sound_indian_hugh',
  },
  {
    waveNumber: 5,
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: 'Have you heard anything from Billy? Did he ever arrive in Cow Gulch?',
      zh: '你听到比利的消息了吗？他到底有没有到牛溪谷？',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 6,
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'That should now be the last of the settlers. Then we can share the booty out and get dead drunk!',
      zh: '这应该就是最后一批拓荒者了。之后我们就能分赃，再喝个酩酊大醉！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
]);
