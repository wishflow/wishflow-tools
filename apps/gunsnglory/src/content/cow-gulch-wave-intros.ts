export interface LocalizedCampaignCopy {
  en: string;
  zh: string;
}

export interface CampaignWaveIntro {
  waveNumber: number;
  speaker: LocalizedCampaignCopy;
  text: LocalizedCampaignCopy;
  portraitAsset: 'portrait_pedro';
  voiceSound: 'sound_pedro';
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
      en: 'Boss, want to bet on who will be first to hit a settler? Just use the Action key to highlight one of them!',
      zh: '老板，要不要赌谁会先打中拓荒者？点选其中一个，就能让队伍集中攻击他！',
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

  next(waveNumber: number): CampaignWaveIntro | undefined {
    if (!Number.isSafeInteger(waveNumber) || waveNumber <= this.lastShownWave) return undefined;
    const intro = cowGulchWaveIntros.find((candidate) => candidate.waveNumber === waveNumber);
    if (intro) this.lastShownWave = waveNumber;
    return intro;
  }
}
