export const CACTUSVILLE_AWESOME_FEEDBACK = Object.freeze({
  enemyTypeThreshold: 5,
  averageDifficultyExclusiveThreshold: 800,
  durationMs: 1_200,
  messages: Object.freeze([
    Object.freeze({ en: 'Yeah!', zh: '好！' }),
    Object.freeze({ en: 'Yeehah!', zh: '耶哈！' }),
    Object.freeze({ en: 'Hit!', zh: '命中！' }),
    Object.freeze({ en: 'Direct hit!', zh: '正中目标！' }),
    Object.freeze({ en: 'KA-BOOM!', zh: '轰！' }),
  ]),
});

/** Applies the APK's integer formula to a presentation-only random offset in [0, 2]. */
export function selectAwesomeFeedbackMessageIndex(
  enemyType: number,
  averageDifficulty: number,
  queueEmpty: boolean,
  getRandomOffset: () => number,
): number | undefined {
  if (enemyType < CACTUSVILLE_AWESOME_FEEDBACK.enemyTypeThreshold
    || averageDifficulty <= CACTUSVILLE_AWESOME_FEEDBACK.averageDifficultyExclusiveThreshold
    || !queueEmpty) return undefined;
  const randomOffset = getRandomOffset();
  if (!Number.isInteger(randomOffset) || randomOffset < 0 || randomOffset > 2) {
    throw new RangeError('Awesome feedback random offset must be an integer from 0 through 2');
  }
  const baseIndex = Math.trunc((averageDifficulty - 900) / 100);
  return Math.max(0, Math.min(4, baseIndex + randomOffset - 1));
}
