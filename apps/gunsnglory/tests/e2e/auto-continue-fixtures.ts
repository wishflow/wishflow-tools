import { expect, test as base, type Page } from '@playwright/test';

export { expect };

/** Legacy gameplay specs should continue through new narrative pauses automatically. */
export async function installAutoContinueCampaignWaveIntro(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const continueOpenCampaignIntro = () => {
      const dialog = document.querySelector<HTMLDialogElement>('[data-testid="campaign-wave-intro"]');
      if (!dialog) return;
      if (!dialog.open) {
        delete dialog.dataset.autoContinued;
        return;
      }
      if (dialog.dataset.autoContinued === 'true') return;
      const button = dialog.querySelector<HTMLButtonElement>('[data-action="continue-wave-intro"]');
      if (!button) return;
      dialog.dataset.autoContinued = 'true';
      button.click();
    };

    // Init scripts can run before <html> exists. Document is always available
    // and observes the dialog when the application inserts or opens it.
    new MutationObserver(continueOpenCampaignIntro).observe(document, {
      attributes: true,
      attributeFilter: ['open'],
      childList: true,
      subtree: true,
    });
    continueOpenCampaignIntro();
  });
}

/** The focused wave-intro specs use the raw Playwright fixture and inspect each prompt directly. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await installAutoContinueCampaignWaveIntro(page);
    await use(page);
  },
});
