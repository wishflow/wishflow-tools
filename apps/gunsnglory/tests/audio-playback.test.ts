import assert from 'node:assert/strict';
import test from 'node:test';
import { acquireAudioPlayer, MAX_OVERLAPPING_SOUND_PLAYERS, silenceAudioPlayers } from '../src/audio/audio-playback';

function createPlayer() {
  return {
    currentTime: 0,
    ended: false,
    paused: false,
    pauseCount: 0,
    pause() {
      this.paused = true;
      this.pauseCount += 1;
    },
  };
}

test('same-name sound requests receive separate active players and never restart an active instance', () => {
  const players: ReturnType<typeof createPlayer>[] = [];
  const first = acquireAudioPlayer(players, createPlayer);
  assert.ok(first);
  first.currentTime = 0.4;
  const second = acquireAudioPlayer(players, createPlayer);

  assert.ok(second);
  assert.notEqual(second, first);
  assert.equal(first.currentTime, 0.4);
  assert.equal(players.length, 2);
});

test('sound player pool is bounded and reuses only an idle or ended player', () => {
  const players: ReturnType<typeof createPlayer>[] = [];
  for (let index = 0; index < MAX_OVERLAPPING_SOUND_PLAYERS; index += 1) {
    assert.ok(acquireAudioPlayer(players, createPlayer));
  }
  assert.equal(acquireAudioPlayer(players, createPlayer), undefined);

  const reusable = players[1]!;
  reusable.ended = true;
  assert.equal(acquireAudioPlayer(players, createPlayer), reusable);
  assert.equal(players.length, MAX_OVERLAPPING_SOUND_PLAYERS);
});

test('muting pauses and rewinds all active sound instances', () => {
  const players = [createPlayer(), createPlayer()];
  players[0]!.currentTime = 0.35;
  players[1]!.currentTime = 0.8;

  silenceAudioPlayers(players);

  assert.deepEqual(players.map(({ paused, currentTime, pauseCount }) => ({ paused, currentTime, pauseCount })), [
    { paused: true, currentTime: 0, pauseCount: 1 },
    { paused: true, currentTime: 0, pauseCount: 1 },
  ]);
});
