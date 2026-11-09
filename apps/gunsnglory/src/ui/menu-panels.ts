export interface OptionsPanelView {
  backLabel: string;
  backImage: string;
  title: string;
  helpLabel: string;
  soundLabel: string;
  soundOnLabel: string;
  soundOffLabel: string;
  soundImage: string;
  soundEnabled: boolean;
}

export interface HelpPanelView {
  backLabel: string;
  backImage: string;
  title: string;
  lines: readonly string[];
  page: number;
  pageCount: number;
  previousLabel: string;
  nextLabel: string;
  pageLabel: string;
}

function escapeMarkup(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character);
}

export function renderOptionsPanelView(view: OptionsPanelView): string {
  return `<section class="campaign-menu-card-screen" aria-labelledby="game-options-title">
    <article class="campaign-menu-card campaign-options-card">
      <button type="button" class="campaign-menu-back" data-action="options-back" data-testid="campaign-menu-back" aria-label="${escapeMarkup(view.backLabel)}"><img src="${escapeMarkup(view.backImage)}" alt="" aria-hidden="true"></button>
      <h2 id="game-options-title">${escapeMarkup(view.title)}</h2>
      <button type="button" class="campaign-setting-toggle campaign-options-help" data-action="options-help" data-testid="options-help">${escapeMarkup(view.helpLabel)}</button>
      <button type="button" class="campaign-setting-toggle campaign-options-sound" data-action="options-toggle-sound" data-testid="options-sound-toggle" aria-pressed="${view.soundEnabled}" aria-label="${escapeMarkup(view.soundEnabled ? view.soundOnLabel : view.soundOffLabel)}" title="${escapeMarkup(view.soundEnabled ? view.soundOnLabel : view.soundOffLabel)}">
        <img src="${escapeMarkup(view.soundImage)}" alt="" aria-hidden="true"><span>${escapeMarkup(view.soundLabel)}</span><span data-testid="options-sound-state">${escapeMarkup(view.soundEnabled ? view.soundOnLabel : view.soundOffLabel)}</span>
      </button>
    </article>
  </section>`;
}

export function renderHelpPanelView(view: HelpPanelView): string {
  return `<section class="campaign-menu-card-screen" aria-labelledby="game-help-title">
    <article class="campaign-menu-card campaign-help-card">
      <button type="button" class="campaign-menu-back" data-action="help-back" data-testid="campaign-menu-back" aria-label="${escapeMarkup(view.backLabel)}"><img src="${escapeMarkup(view.backImage)}" alt="" aria-hidden="true"></button>
      <h2 id="game-help-title">${escapeMarkup(view.title)}</h2>
      <ol data-testid="help-page-content">${view.lines.map((line) => `<li>${escapeMarkup(line)}</li>`).join('')}</ol>
      <nav class="campaign-help-pagination" aria-label="${escapeMarkup(view.title)}">
        <button type="button" data-action="help-previous" data-testid="help-previous" aria-label="${escapeMarkup(view.previousLabel)}" ${view.page === 0 ? 'disabled' : ''}><img src="${escapeMarkup(view.backImage)}" alt="" aria-hidden="true"></button>
        <output data-testid="help-page-number" aria-live="polite">${escapeMarkup(view.pageLabel)}</output>
        <button type="button" data-action="help-next" data-testid="help-next" aria-label="${escapeMarkup(view.nextLabel)}" ${view.page >= view.pageCount - 1 ? 'disabled' : ''}><img src="${escapeMarkup(view.backImage)}" alt="" aria-hidden="true"></button>
      </nav>
    </article>
  </section>`;
}
