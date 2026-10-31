import assert from 'node:assert/strict';
import test from 'node:test';
import { DrawOrderQueue, synchronizeDrawOrder } from '../src/game/draw-order';

test('new objects insert before existing objects at an equal depth', () => {
  const queue = new DrawOrderQueue();
  queue.insert('older', 100);
  queue.insert('newer', 100);

  assert.deepEqual(queue.items(), ['newer', 'older']);
});

test('moving objects cross only strictly shallower or deeper neighbors', () => {
  const queue = new DrawOrderQueue();
  queue.insert('front', 10);
  queue.insert('middle', 20);
  queue.insert('back', 30);

  queue.correct('back', 20, true);
  assert.deepEqual(queue.items(), ['front', 'middle', 'back'], 'moving up to a tie keeps the existing order');
  queue.correct('back', 19, true);
  assert.deepEqual(queue.items(), ['front', 'back', 'middle'], 'a strict upward depth change crosses its neighbor');

  const movingDown = new DrawOrderQueue();
  movingDown.insert('front', 10);
  movingDown.insert('middle', 20);
  movingDown.insert('back', 30);
  movingDown.correct('middle', 30, false);
  assert.deepEqual(movingDown.items(), ['front', 'middle', 'back'], 'moving down to a tie keeps the existing order');

  movingDown.correct('middle', 31, false);
  assert.deepEqual(movingDown.items(), ['front', 'back', 'middle'], 'a strict depth change crosses its neighbor');
});

test('new cross-type objects preserve APK creation order when their depths tie', () => {
  const queue = new DrawOrderQueue();
  queue.insert('older-decoration', 100);

  synchronizeDrawOrder(queue, [
    { id: 'older-decoration', kind: 'decoration', depth: 100 },
    { id: 'new-wagon-debris', kind: 'wagon-debris', depth: 100 },
    { id: 'new-shot', kind: 'shot', depth: 100 },
    { id: 'new-wave-enemy', kind: 'enemy', depth: 100 },
  ], ['new-wagon-debris', 'new-shot', 'new-wave-enemy']);

  assert.deepEqual(queue.items(), [
    'new-wave-enemy', 'new-shot', 'new-wagon-debris', 'older-decoration',
  ]);
});
