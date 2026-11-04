import type { CampaignEnemyType, EnemyView, GameEvent } from '../game';

export interface EnemyDefeatSummary {
  enemyType?: CampaignEnemyType;
  count: number;
  cashReward: number;
}

/** Keeps every defeat event from one Game update, grouping only equal enemy types. */
export function summarizeEnemyDefeats(
  events: readonly GameEvent[],
  enemies: readonly Pick<EnemyView, 'id' | 'type'>[],
): EnemyDefeatSummary[] {
  const summaries = new Map<CampaignEnemyType | 'unknown', EnemyDefeatSummary>();
  for (const event of events) {
    if (event.type !== 'enemy-defeated') continue;
    const enemyType = event.enemyType ?? enemies.find((enemy) => enemy.id === event.enemyId)?.type;
    const key = enemyType ?? 'unknown';
    const current = summaries.get(key);
    if (current) {
      current.count += 1;
      current.cashReward += event.cashReward;
    } else {
      summaries.set(key, { enemyType, count: 1, cashReward: event.cashReward });
    }
  }
  return [...summaries.values()];
}
