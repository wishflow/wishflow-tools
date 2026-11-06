import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { techTownCampaignWaves } from '../src/content/tech-town-campaign-waves';
import { techTownWaveIntros } from '../src/content/tech-town-wave-intros';

const appRoot = path.resolve(import.meta.dirname, '..');

test('Tech Town campaign waves match all eight APK headers and spawn-pool records', () => {
  assert.deepEqual(techTownCampaignWaves.map(({ number, delayMs, hitPointMultiplierPercent, speedMultiplierPercent, spawnPools }) => ({
    number,
    delayMs,
    hitPointMultiplierPercent,
    speedMultiplierPercent,
    spawnPools: spawnPools.map(({ spawnPointId, intervalMs, requests }) => ({ spawnPointId, intervalMs, requests })),
  })), [
    { number: 1, delayMs: 15_000, hitPointMultiplierPercent: 100, speedMultiplierPercent: 100, spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [1, 3, 3, 3, 2, 1, 1, 0, 0, 0] },
    ] },
    { number: 2, delayMs: 5_000, hitPointMultiplierPercent: 100, speedMultiplierPercent: 100, spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [0, 2, 1, 2, 2, 1, 1, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 3_500, requests: [0, 0, 2, 3, 3, 2, 1, 0, 0, 0] },
    ] },
    { number: 3, delayMs: 5_000, hitPointMultiplierPercent: 125, speedMultiplierPercent: 100, spawnPools: [
      { spawnPointId: 0, intervalMs: 3_000, requests: [0, 0, 1, 2, 3, 3, 3, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [0, 0, 1, 2, 3, 4, 3, 0, 0, 0] },
    ] },
    { number: 4, delayMs: 5_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 100, spawnPools: [
      { spawnPointId: 0, intervalMs: 3_000, requests: [0, 2, 0, 0, 3, 3, 2, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [0, 0, 2, 0, 4, 2, 1, 0, 0, 0] },
    ] },
    { number: 5, delayMs: 25_000, hitPointMultiplierPercent: 175, speedMultiplierPercent: 100, spawnPools: [
      { spawnPointId: 0, intervalMs: 3_000, requests: [1, 2, 0, 0, 3, 3, 2, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_000, requests: [0, 1, 1, 0, 3, 2, 1, 0, 0, 0] },
      { spawnPointId: 2, intervalMs: 2_500, requests: [1, 2, 0, 0, 3, 3, 2, 0, 0, 0] },
      { spawnPointId: 3, intervalMs: 2_500, requests: [1, 2, 2, 0, 3, 2, 2, 0, 0, 0] },
    ] },
    { number: 6, delayMs: 25_000, hitPointMultiplierPercent: 275, speedMultiplierPercent: 105, spawnPools: [
      { spawnPointId: 1, intervalMs: 4_500, requests: [0, 0, 0, 0, 0, 0, 0, 2, 0, 0] },
      { spawnPointId: 3, intervalMs: 2_500, requests: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0] },
    ] },
    { number: 7, delayMs: 25_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 110, spawnPools: [
      { spawnPointId: 0, intervalMs: 3_000, requests: [1, 2, 0, 0, 3, 1, 2, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_000, requests: [0, 1, 0, 2, 3, 3, 1, 1, 0, 0] },
      { spawnPointId: 2, intervalMs: 2_500, requests: [1, 2, 0, 1, 4, 3, 2, 0, 0, 0] },
      { spawnPointId: 3, intervalMs: 2_500, requests: [0, 3, 1, 0, 2, 2, 1, 1, 0, 0] },
    ] },
    { number: 8, delayMs: 25_000, hitPointMultiplierPercent: 275, speedMultiplierPercent: 110, spawnPools: [
      { spawnPointId: 0, intervalMs: 3_000, requests: [1, 0, 0, 0, 3, 1, 2, 2, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_000, requests: [2, 0, 1, 0, 3, 3, 1, 1, 0, 0] },
      { spawnPointId: 2, intervalMs: 2_500, requests: [0, 1, 0, 0, 2, 3, 1, 2, 0, 0] },
      { spawnPointId: 3, intervalMs: 2_500, requests: [3, 2, 0, 1, 1, 2, 1, 1, 0, 0] },
    ] },
  ]);
});

test('Tech Town has the eight original dialogue keys, speakers, portraits and bilingual copy', () => {
  assert.deepEqual(techTownWaveIntros.map(({ waveNumber, dialogueResource, speaker, portraitAsset, text }) => ({
    waveNumber,
    dialogueResource,
    speaker: speaker.en,
    portraitAsset,
    en: text.en,
    zh: text.zh,
  })), [
    { waveNumber: 1, dialogueResource: 'T_IA_CAMPAIGN_04_01', speaker: 'Pedro', portraitAsset: 'portrait_pedro', en: "The railroad could be our most powerful weapon, if we mount deadly Gatling guns on empty cars! Unfortunately that isn't free.", zh: '如果能在空车厢上装上致命的加特林机枪，铁路就会成为我们最强大的武器！可惜，这可不便宜。' },
    { waveNumber: 2, dialogueResource: 'T_CAMPAIGN_04_02', speaker: 'Pedro', portraitAsset: 'portrait_pedro', en: 'The most low-down characters frequent the saloon. If we run out of fighters out here, we can surely get some replacements in there!', zh: '酒馆里总有些最不入流的家伙。要是外面的战士不够了，我们肯定能从那里招些替补！' },
    { waveNumber: 3, dialogueResource: 'T_CAMPAIGN_04_03', speaker: 'Engineer', portraitAsset: 'portrait_engineer', en: 'If the settlers had taken the railroad, it would have been much quicker!', zh: '要是拓荒者乘铁路来，就快多了！' },
    { waveNumber: 4, dialogueResource: 'T_CAMPAIGN_04_04', speaker: 'Settlers', portraitAsset: 'portrait_settlers', en: "Why didn't we take the railroad? It would have been much quicker!", zh: '我们为什么不走铁路？那样肯定快多了！' },
    { waveNumber: 5, dialogueResource: 'T_CAMPAIGN_04_05', speaker: 'Pedro', portraitAsset: 'portrait_pedro', en: "We spotted some settlers in the South. Don't let them slip past us!", zh: '我们发现南边有些拓荒者。别让他们溜过去！' },
    { waveNumber: 6, dialogueResource: 'T_CAMPAIGN_04_06', speaker: 'Settlers', portraitAsset: 'portrait_settlers', en: "Gold! Gold! We found gold! Let's take this treasure with us. Nothing will happen to us.", zh: '黄金！黄金！我们找到黄金了！把财宝带上吧，不会出事的。' },
    { waveNumber: 7, dialogueResource: 'T_CAMPAIGN_04_07', speaker: 'Pedro', portraitAsset: 'portrait_pedro', en: 'Hee hee hee! How nice of you to offer the gold up to us on a silver platter!', zh: '嘿嘿嘿！你们真客气，竟把黄金拱手送到我们面前！' },
    { waveNumber: 8, dialogueResource: 'T_CAMPAIGN_04_08', speaker: 'Pedro', portraitAsset: 'portrait_pedro', en: "The last settlers are coming up ahead. We'll set a trap for them that they'll never forget. Hee hee hee!", zh: '最后一批拓荒者就在前面。我们要给他们设个永生难忘的陷阱。嘿嘿嘿！' },
  ]);
});

test('Tech Town Engineer dialogue uses the original APK portrait asset', () => {
  const source = path.join(appRoot, 'public/assets/portrait_engineer.png');
  assert.equal(existsSync(source), true);
  const png = readFileSync(source);
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [96, 96]);
});
