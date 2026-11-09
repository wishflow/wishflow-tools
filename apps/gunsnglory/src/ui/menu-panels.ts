export interface OptionsPanelView {
  backLabel: string;
  backImage: string;
  title: string;
  helpLabel: string;
  soundNote: string;
  speedLabel: string;
  speedHelp: string;
  speed: number;
  experimentsTitle: string;
  experimentsHelp: string;
  profileTitle: string;
  profileHelp: string;
  exportProfile: string;
  importProfile: string;
  profileStatus: string;
  settingsStatus: string;
  profileBusy: boolean;
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
      <p class="campaign-menu-subtle campaign-options-sound-note">${escapeMarkup(view.soundNote)}</p>
      <label class="campaign-speed-setting"><span>${escapeMarkup(view.speedLabel)}</span><output data-testid="menu-simulation-speed-value">${view.speed}×</output><input type="range" min="0.25" max="4" step="0.25" value="${view.speed}" data-testid="menu-simulation-speed" aria-label="${escapeMarkup(view.speedLabel)}"></label>
      <p class="campaign-menu-subtle">${escapeMarkup(view.speedHelp)}</p>
      <details class="campaign-data-tools" data-testid="menu-experiment-tools">
        <summary>${escapeMarkup(view.experimentsTitle)}</summary>
        <p class="campaign-menu-subtle">${escapeMarkup(view.experimentsHelp)}</p>
        <section class="campaign-profile-archive" aria-labelledby="campaign-profile-archive-title">
          <h3 id="campaign-profile-archive-title">${escapeMarkup(view.profileTitle)}</h3>
          <p class="campaign-menu-subtle">${escapeMarkup(view.profileHelp)}</p>
          <div class="campaign-profile-archive-actions">
            <button type="button" data-action="export-profile-archive" data-testid="export-profile-archive" ${view.profileBusy ? 'disabled' : ''}>${escapeMarkup(view.exportProfile)}</button>
            <label class="replay-import-label">${escapeMarkup(view.importProfile)}<input type="file" data-testid="import-profile-archive" accept="application/json,.json" aria-label="${escapeMarkup(view.importProfile)}" ${view.profileBusy ? 'disabled' : ''}></label>
          </div>
          <p data-testid="profile-archive-status" class="campaign-menu-status" role="status" aria-live="polite">${escapeMarkup(view.profileStatus)}</p>
        </section>
        <div class="campaign-experiment-host" data-testid="campaign-experiment-host"></div>
      </details>
      <p class="campaign-menu-status" data-testid="menu-settings-status" role="status">${escapeMarkup(view.settingsStatus)}</p>
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
