export interface AudioPlaybackNode {
  currentTime: number;
  ended: boolean;
  paused: boolean;
  pause(): void;
}

export const MAX_OVERLAPPING_SOUND_PLAYERS = 4;

/** Reuses only an idle/ended player, leaving every currently playing sound untouched. */
export function acquireAudioPlayer<T extends AudioPlaybackNode>(
  players: T[],
  create: () => T,
  maxPlayers = MAX_OVERLAPPING_SOUND_PLAYERS,
): T | undefined {
  const idle = players.find((player) => player.paused || player.ended);
  if (idle) return idle;
  if (players.length >= maxPlayers) return undefined;
  const player = create();
  players.push(player);
  return player;
}

export function silenceAudioPlayers(players: readonly AudioPlaybackNode[]): void {
  for (const player of players) {
    player.pause();
    player.currentTime = 0;
  }
}
