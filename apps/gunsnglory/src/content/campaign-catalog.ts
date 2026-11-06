import type { CampaignProgressView } from '../progress';

/** Campaign labels and map-number mapping transcribed from the APK inventory. */
export const campaignRegions = Object.freeze([
  Object.freeze({ id: 'new-mexico', title: Object.freeze({ en: 'New Mexico', zh: '新墨西哥' }) }),
  Object.freeze({ id: 'mississippi', title: Object.freeze({ en: 'Mississippi', zh: '密西西比' }) }),
  Object.freeze({ id: 'oregon', title: Object.freeze({ en: 'Oregon', zh: '俄勒冈' }) }),
  Object.freeze({ id: 'dakota', title: Object.freeze({ en: 'Dakota', zh: '达科他' }) }),
  Object.freeze({ id: 'nevada', title: Object.freeze({ en: 'Nevada', zh: '内华达' }) }),
  Object.freeze({ id: 'alaska', title: Object.freeze({ en: 'Alaska', zh: '阿拉斯加' }) }),
] as const);

export type CampaignRegionId = typeof campaignRegions[number]['id'];

export interface CampaignCatalogEntry {
  level: number;
  regionId: CampaignRegionId;
  regionTitle: string;
  title: string;
  mapFileNumber: number;
  titleResourceNumber: number;
}

export const campaignCatalog: readonly CampaignCatalogEntry[] = Object.freeze([
  Object.freeze({ level: 1, regionId: 'new-mexico', regionTitle: 'New Mexico', title: 'Cow Gulch', mapFileNumber: 1, titleResourceNumber: 1 }),
  Object.freeze({ level: 2, regionId: 'new-mexico', regionTitle: 'New Mexico', title: 'Death Valley', mapFileNumber: 2, titleResourceNumber: 2 }),
  Object.freeze({ level: 3, regionId: 'new-mexico', regionTitle: 'New Mexico', title: 'Fort Kaboom', mapFileNumber: 3, titleResourceNumber: 3 }),
  Object.freeze({ level: 4, regionId: 'new-mexico', regionTitle: 'New Mexico', title: 'Tech Town', mapFileNumber: 4, titleResourceNumber: 4 }),
  Object.freeze({ level: 5, regionId: 'new-mexico', regionTitle: 'New Mexico', title: 'Billy Hills', mapFileNumber: 5, titleResourceNumber: 5 }),
  Object.freeze({ level: 6, regionId: 'new-mexico', regionTitle: 'New Mexico', title: 'Murdock Mountains', mapFileNumber: 6, titleResourceNumber: 6 }),
  Object.freeze({ level: 7, regionId: 'new-mexico', regionTitle: 'New Mexico', title: 'Lucky Lake', mapFileNumber: 7, titleResourceNumber: 7 }),
  Object.freeze({ level: 8, regionId: 'new-mexico', regionTitle: 'New Mexico', title: 'Cactusville', mapFileNumber: 8, titleResourceNumber: 8 }),
  Object.freeze({ level: 9, regionId: 'new-mexico', regionTitle: 'New Mexico', title: 'Railroad Ranch', mapFileNumber: 9, titleResourceNumber: 9 }),
  Object.freeze({ level: 10, regionId: 'new-mexico', regionTitle: 'New Mexico', title: 'Lost City', mapFileNumber: 10, titleResourceNumber: 10 }),
  Object.freeze({ level: 11, regionId: 'mississippi', regionTitle: 'Mississippi', title: 'Traveller\'s Town', mapFileNumber: 14, titleResourceNumber: 14 }),
  Object.freeze({ level: 12, regionId: 'mississippi', regionTitle: 'Mississippi', title: 'Steam Valley', mapFileNumber: 15, titleResourceNumber: 15 }),
  Object.freeze({ level: 13, regionId: 'mississippi', regionTitle: 'Mississippi', title: 'Golden River', mapFileNumber: 16, titleResourceNumber: 16 }),
  Object.freeze({ level: 14, regionId: 'mississippi', regionTitle: 'Mississippi', title: 'Riverside Mountains', mapFileNumber: 17, titleResourceNumber: 17 }),
  Object.freeze({ level: 15, regionId: 'mississippi', regionTitle: 'Mississippi', title: 'Railroad Canyon', mapFileNumber: 18, titleResourceNumber: 18 }),
  Object.freeze({ level: 16, regionId: 'mississippi', regionTitle: 'Mississippi', title: 'Highpoint Terrace', mapFileNumber: 19, titleResourceNumber: 19 }),
  Object.freeze({ level: 17, regionId: 'mississippi', regionTitle: 'Mississippi', title: 'Dead Rocks', mapFileNumber: 20, titleResourceNumber: 20 }),
  Object.freeze({ level: 18, regionId: 'mississippi', regionTitle: 'Mississippi', title: 'Shadow Town', mapFileNumber: 21, titleResourceNumber: 21 }),
  Object.freeze({ level: 19, regionId: 'mississippi', regionTitle: 'Mississippi', title: 'Dust Falls', mapFileNumber: 22, titleResourceNumber: 22 }),
  Object.freeze({ level: 20, regionId: 'mississippi', regionTitle: 'Mississippi', title: 'Horse Hills', mapFileNumber: 23, titleResourceNumber: 23 }),
  Object.freeze({ level: 21, regionId: 'oregon', regionTitle: 'Oregon', title: 'Eastwood Forest', mapFileNumber: 24, titleResourceNumber: 24 }),
  Object.freeze({ level: 22, regionId: 'oregon', regionTitle: 'Oregon', title: 'Cashcow Canyon', mapFileNumber: 25, titleResourceNumber: 25 }),
  Object.freeze({ level: 23, regionId: 'oregon', regionTitle: 'Oregon', title: 'Chinook Woods', mapFileNumber: 26, titleResourceNumber: 26 }),
  Object.freeze({ level: 24, regionId: 'oregon', regionTitle: 'Oregon', title: 'Fort Echo', mapFileNumber: 27, titleResourceNumber: 27 }),
  Object.freeze({ level: 25, regionId: 'oregon', regionTitle: 'Oregon', title: 'Dynamite Plains', mapFileNumber: 28, titleResourceNumber: 28 }),
  Object.freeze({ level: 26, regionId: 'oregon', regionTitle: 'Oregon', title: 'Columbia River', mapFileNumber: 29, titleResourceNumber: 29 }),
  Object.freeze({ level: 27, regionId: 'oregon', regionTitle: 'Oregon', title: 'Mount Hood', mapFileNumber: 30, titleResourceNumber: 30 }),
  Object.freeze({ level: 28, regionId: 'oregon', regionTitle: 'Oregon', title: 'Colt City', mapFileNumber: 31, titleResourceNumber: 31 }),
  Object.freeze({ level: 29, regionId: 'oregon', regionTitle: 'Oregon', title: 'Snake River', mapFileNumber: 32, titleResourceNumber: 32 }),
  Object.freeze({ level: 30, regionId: 'oregon', regionTitle: 'Oregon', title: 'Lumber Mill Hills', mapFileNumber: 33, titleResourceNumber: 33 }),
  Object.freeze({ level: 31, regionId: 'dakota', regionTitle: 'Dakota', title: 'Loot Lakes', mapFileNumber: 34, titleResourceNumber: 34 }),
  Object.freeze({ level: 32, regionId: 'dakota', regionTitle: 'Dakota', title: 'Six Grandfathers', mapFileNumber: 35, titleResourceNumber: 35 }),
  Object.freeze({ level: 33, regionId: 'dakota', regionTitle: 'Dakota', title: 'Fort Knockout', mapFileNumber: 36, titleResourceNumber: 36 }),
  Object.freeze({ level: 34, regionId: 'dakota', regionTitle: 'Dakota', title: 'Badlands', mapFileNumber: 37, titleResourceNumber: 37 }),
  Object.freeze({ level: 35, regionId: 'dakota', regionTitle: 'Dakota', title: 'Ghost Town', mapFileNumber: 38, titleResourceNumber: 38 }),
  Object.freeze({ level: 36, regionId: 'dakota', regionTitle: 'Dakota', title: 'Ice Rocks', mapFileNumber: 39, titleResourceNumber: 39 }),
  Object.freeze({ level: 37, regionId: 'dakota', regionTitle: 'Dakota', title: 'Frost Station', mapFileNumber: 40, titleResourceNumber: 40 }),
  Object.freeze({ level: 38, regionId: 'dakota', regionTitle: 'Dakota', title: 'Wayne Waters', mapFileNumber: 41, titleResourceNumber: 41 }),
  Object.freeze({ level: 39, regionId: 'dakota', regionTitle: 'Dakota', title: 'Snow Town', mapFileNumber: 42, titleResourceNumber: 42 }),
  Object.freeze({ level: 40, regionId: 'dakota', regionTitle: 'Dakota', title: 'Sioux Falls', mapFileNumber: 43, titleResourceNumber: 43 }),
  Object.freeze({ level: 41, regionId: 'nevada', regionTitle: 'Nevada', title: 'Labyrinth Gulch', mapFileNumber: 44, titleResourceNumber: 44 }),
  Object.freeze({ level: 42, regionId: 'nevada', regionTitle: 'Nevada', title: 'Bombington', mapFileNumber: 45, titleResourceNumber: 45 }),
  Object.freeze({ level: 43, regionId: 'nevada', regionTitle: 'Nevada', title: 'Reno', mapFileNumber: 46, titleResourceNumber: 46 }),
  Object.freeze({ level: 44, regionId: 'nevada', regionTitle: 'Nevada', title: 'Hoover Valley', mapFileNumber: 47, titleResourceNumber: 47 }),
  Object.freeze({ level: 45, regionId: 'nevada', regionTitle: 'Nevada', title: 'Railroad Crossing', mapFileNumber: 48, titleResourceNumber: 48 }),
  Object.freeze({ level: 46, regionId: 'nevada', regionTitle: 'Nevada', title: 'Las Vegas', mapFileNumber: 49, titleResourceNumber: 49 }),
  Object.freeze({ level: 47, regionId: 'nevada', regionTitle: 'Nevada', title: 'Hills of the Burning Bandit', mapFileNumber: 50, titleResourceNumber: 50 }),
  Object.freeze({ level: 48, regionId: 'nevada', regionTitle: 'Nevada', title: 'Dead Desert', mapFileNumber: 51, titleResourceNumber: 51 }),
  Object.freeze({ level: 49, regionId: 'nevada', regionTitle: 'Nevada', title: 'Boomtown City', mapFileNumber: 52, titleResourceNumber: 52 }),
  Object.freeze({ level: 50, regionId: 'nevada', regionTitle: 'Nevada', title: 'Area 52', mapFileNumber: 53, titleResourceNumber: 53 }),
  Object.freeze({ level: 51, regionId: 'alaska', regionTitle: 'Alaska', title: 'Windham Bay Mine', mapFileNumber: 54, titleResourceNumber: 54 }),
  Object.freeze({ level: 52, regionId: 'alaska', regionTitle: 'Alaska', title: 'Cold Lake', mapFileNumber: 55, titleResourceNumber: 55 }),
  Object.freeze({ level: 53, regionId: 'alaska', regionTitle: 'Alaska', title: 'Frozen Rivers', mapFileNumber: 56, titleResourceNumber: 56 }),
  Object.freeze({ level: 54, regionId: 'alaska', regionTitle: 'Alaska', title: 'Winter Valley', mapFileNumber: 57, titleResourceNumber: 57 }),
  Object.freeze({ level: 55, regionId: 'alaska', regionTitle: 'Alaska', title: 'Kenaj Fjorde', mapFileNumber: 58, titleResourceNumber: 58 }),
  Object.freeze({ level: 56, regionId: 'alaska', regionTitle: 'Alaska', title: 'Fairbanks', mapFileNumber: 59, titleResourceNumber: 59 }),
  Object.freeze({ level: 57, regionId: 'alaska', regionTitle: 'Alaska', title: 'Trans-Alaska-Goldline', mapFileNumber: 60, titleResourceNumber: 60 }),
  Object.freeze({ level: 58, regionId: 'alaska', regionTitle: 'Alaska', title: 'Yukon River', mapFileNumber: 61, titleResourceNumber: 61 }),
  Object.freeze({ level: 59, regionId: 'alaska', regionTitle: 'Alaska', title: 'Chilkoot Pass', mapFileNumber: 62, titleResourceNumber: 62 }),
  Object.freeze({ level: 60, regionId: 'alaska', regionTitle: 'Alaska', title: 'Glacier Bay', mapFileNumber: 63, titleResourceNumber: 63 }),
]);

export type CampaignLevelState = 'available' | 'completed' | 'locked' | 'unimplemented';

export function campaignLevelState(level: number, progress: CampaignProgressView | undefined): CampaignLevelState {
  const stage = progress?.stages.find((candidate) => candidate.globalLevel === level);
  if (stage) return stage.status;
  const previousImplementedStage = progress?.stages
    .filter((candidate) => candidate.globalLevel < level)
    .sort((left, right) => right.globalLevel - left.globalLevel)[0];
  if (!previousImplementedStage) return 'unimplemented';
  if (previousImplementedStage.globalLevel !== level - 1) return 'locked';
  return previousImplementedStage.status === 'completed' ? 'unimplemented' : 'locked';
}
