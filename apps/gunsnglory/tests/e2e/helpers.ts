import type { Page } from '@playwright/test';

export async function openSingleWaveSample(page: Page, input: 'click' | 'tap' = 'click'): Promise<void> {
  const button = page.getByTestId('open-single-wave-sample');
  if (input === 'tap') await button.tap();
  else await button.click();
}
