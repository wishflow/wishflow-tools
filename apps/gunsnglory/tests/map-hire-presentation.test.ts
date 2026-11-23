import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getMapHirePresentation,
  mapHirePresentationTypes,
} from '../src/ui/map-hire-presentation';

test('map hire presentation covers every supported sleeping character and vehicle weapon', () => {
  assert.deepEqual(mapHirePresentationTypes, [
    'gunslinger', 'mexican', 'cannon', 'indian', 'train-12', 'train-22',
    'steamer-32', 'sniper', 'grandpa', 'pyromaniac', 'salesman',
  ]);

  for (const type of mapHirePresentationTypes) {
    const presentation = getMapHirePresentation(type);
    assert.ok(presentation, `${type} has original hire presentation`);
    assert.match(presentation.portraitAsset, /^(portrait_|oregon_dakota_portrait_)/);
    for (const language of ['en', 'zh'] as const) {
      assert.ok(presentation.name[language], `${type} has ${language} name`);
      assert.ok(presentation.hireText[language], `${type} has ${language} hire text`);
      assert.ok(presentation.insufficientCashText[language], `${type} has ${language} insufficient-cash text`);
    }
  }
  assert.equal(getMapHirePresentation('unknown'), undefined);
});

test('map hire dialogue distinguishes ordinary and insufficient-cash responses', () => {
  const presentation = getMapHirePresentation('cannon');
  assert.ok(presentation);
  assert.equal(presentation.name.en, 'Cannon');
  assert.equal(presentation.hireText.en, 'Sir, my cannon is ready for action, sir! Do you require my services?');
  assert.match(presentation.insufficientCashText.en, /money for ammunition/);
});
