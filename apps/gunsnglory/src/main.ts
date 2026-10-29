import '@wishflow/site-shell';
import { getLanguage, registerMessages, subscribeLanguage } from '@wishflow/site-shell';
import {
  createBrowserExperimentRepository,
  createBrowserGame,
  createBrowserProgress,
  getBrowserScenarioContentVersion,
} from './bootstrap/browser';
import { cowGulchP1aSampleContent, cowGulchP1cCampaignContent, cowGulchP1dCampaignContent } from './content/cow-gulch';
import { drawGame, GAME_VIEWPORT, getMapViewport, resizeCanvas } from './render/canvas-renderer';
import { cameraForAnchor, createMapCamera, screenToMapCell, type MapCamera } from './render/map-viewport';
import { fitAspectViewport, toLogicalPoint } from './render/viewport';
import { DEFAULT_SIMULATION_SPEED, normalizeSimulationSpeed, SimulationTimeAccumulator } from './game/time-scaling';
import { GameOpenError, GameReplayError, isGameDifficulty } from './game';
import { createExperiments, type ExperimentComparisonReport } from './experiments';
import type {
  GameEvent,
  GameDifficulty,
  GameIntent,
  GameMode,
  GameOpenErrorCode,
  GameReplayErrorCode,
  GameReplayResult,
  GameSession,
  GameSettlementRecord,
} from './game';
import { ProgressError, type CampaignProgressView, type ProfileView, type SettlementSaveResult } from './progress';
import { messages } from './locales';
import './styles.css';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Game root is missing');

app.innerHTML = [
  '<section class="game-page" id="game">',
  '  <header class="game-heading">',
  '    <p class="eyebrow">FIRST COMBAT SLICE</p>',
  '    <h1>Guns’n’Glory</h1>',
  '    <p class="intro">Use the Cow Gulch map to defeat a pioneer and collect the reward.</p>',
  '  </header>',
  '  <section class="game-panel" aria-labelledby="scene-title">',
  '    <section class="campaign-panel" aria-labelledby="campaign-title">',
  '      <div class="campaign-heading"><h2 id="campaign-title" data-locale="Campaign progress">Campaign progress</h2><p data-testid="campaign-progress-summary"></p></div>',
  '      <p class="campaign-note" data-locale="This research stage reuses Cow Gulch; it is not a production campaign level.">This research stage reuses Cow Gulch; it is not a production campaign level.</p>',
  '      <button type="button" data-testid="open-original-waves" data-action="open-original-waves">Play original eight waves</button>',
  '      <div class="campaign-difficulty-control"><label for="campaign-difficulty" data-locale="Difficulty for the next battle">Difficulty for the next battle<select id="campaign-difficulty" data-testid="difficulty-select" disabled><option value="easy" data-locale="Easy">Easy</option><option value="medium" data-locale="Medium">Medium</option><option value="hard" data-locale="Hard">Hard</option></select></label><p data-testid="difficulty-status" role="status" aria-live="polite"></p></div>',
  '      <ol class="campaign-stage-list" data-testid="campaign-stage-list"></ol>',
  '      <p class="campaign-status" data-testid="campaign-status" role="status" aria-live="polite"></p>',
  '    </section>',
  '    <div class="scene-heading"><h2 id="scene-title">Cow Gulch</h2><span data-testid="scene-context">NEW MEXICO · 01</span><span data-testid="scene-difficulty"></span></div>',
  '    <div class="game-frame">',
  '      <canvas data-testid="game-canvas" aria-label="Cow Gulch game map" tabindex="0"></canvas>',
  '      <section class="settlement-panel" data-testid="settlement" aria-labelledby="settlement-title" aria-live="polite" hidden>',
  '        <h2 id="settlement-title">Battle result</h2>',
  '        <p data-testid="settlement-outcome"></p>',
  '        <p data-testid="settlement-summary"></p>',
  '        <p data-testid="settlement-score"></p>',
  '        <p data-testid="settlement-high-score"></p>',
  '        <p data-testid="settlement-save-status" role="status" aria-live="polite"></p>',
  '        <button type="button" data-action="retry-settlement-save" hidden>Retry saving result</button>',
  '        <button type="button" data-action="restart-sample">Restart this sample</button>',
  '      </section>',
  '    </div>',
  '    <div class="game-controls">',
  '      <p data-testid="profile-status" role="status" aria-live="polite"></p>',
  '      <p data-testid="profile-recovery-status" role="status" aria-live="polite"></p>',
  '      <button type="button" data-action="export-corrupt-profile" hidden>Download profile backup</button>',
  '      <button type="button" data-action="reset-corrupt-profile" hidden>Replace damaged profile</button>',
  '      <p data-testid="selection-status" role="status" aria-live="polite"></p>',
  '      <section data-testid="scene-open-error" role="alert" hidden>',
  '        <p data-testid="scene-open-error-message"></p>',
  '        <button type="button" data-action="retry-scene-open">Retry loading requested scene</button>',
  '        <button type="button" data-action="return-to-previous-scene">Return to previous scene</button>',
  '      </section>',
  '      <p data-testid="wave-status" role="status" aria-live="polite"></p>',
  '      <p data-testid="combat-status" role="status" aria-live="polite"></p>',
  '      <label class="simulation-speed-control" for="simulation-speed">',
  '        <span id="simulation-speed-label">Simulation speed</span>',
  '        <input id="simulation-speed" data-testid="simulation-speed" aria-labelledby="simulation-speed-label" type="range" min="0.25" max="4" step="0.25" value="1" disabled>',
  '        <output data-testid="simulation-speed-value" for="simulation-speed">1×</output>',
  '      </label>',
  '      <p data-testid="settings-status" role="status" aria-live="polite"></p>',
  '      <button type="button" data-action="retry-settings-save" hidden>Retry saving settings</button>',
  '      <button type="button" data-action="reload-saved-profile" hidden>Reload saved profile</button>',
  '      <p data-testid="upgrade-sample-status" role="status" aria-live="polite"></p>',
  '      <p data-testid="upgrade-status" role="status" aria-live="polite"></p>',
  '      <p data-testid="recruit-pool-status" role="status" aria-live="polite"></p>',
  '      <p data-testid="recruit-status" role="status" aria-live="polite"></p>',
  '      <button type="button" data-testid="hire-map-unit" data-action="hire-map-unit" hidden>Hire selected map unit</button>',
  '      <p data-testid="map-hire-status" role="status" aria-live="polite"></p>',
  '      <button type="button" data-action="start-wave">Start one pioneer sample</button>',
  '      <button type="button" data-action="recruit-unit">Hire Gunslinger</button>',
  '      <button type="button" data-action="upgrade-unit" hidden>Upgrade selected Gunslinger</button>',
  '      <button type="button" data-action="start-upgrade-sample">Open upgrade rules sample</button>',
  '      <button type="button" data-action="return-cow-gulch" hidden>Return to Cow Gulch sample</button>',
  '      <button type="button" data-action="start-defeat-sample">Test defeat with one life</button>',
  '      <button type="button" data-action="clear-selection">Clear selection</button>',
  '      <p data-testid="pause-status" role="status" aria-live="polite" hidden></p>',
  '      <button type="button" data-testid="pause-toggle" data-action="toggle-pause" disabled>Pause battle</button>',
  '    </div>',
  '    <section class="experiment-panel" aria-labelledby="experiment-title">',
  '      <h2 id="experiment-title" data-locale="Compare numeric schemes">Compare numeric schemes</h2>',
  '      <p class="experiment-intro" data-locale="Compare the original Cow Gulch reward with an immutable draft using matched random samples.">Compare the original Cow Gulch reward with an immutable draft using matched random samples.</p>',
  '      <div class="experiment-controls">',
  '        <label for="experiment-cash-reward" data-locale="Pioneer cash reward">Pioneer cash reward',
  '          <input id="experiment-cash-reward" data-testid="experiment-cash-reward" type="number" min="0" max="1000000000" step="1" value="5">',
  '        </label>',
  '        <label for="experiment-sample-count" data-locale="Matched samples">Matched samples',
  '          <select id="experiment-sample-count" data-testid="experiment-sample-count">',
  '            <option value="1">1</option><option value="3" selected>3</option><option value="5">5</option>',
  '          </select>',
  '        </label>',
  '        <button type="button" data-testid="compare-schemes" data-action="compare-schemes" data-locale="Compare schemes">Compare schemes</button>',
  '        <button type="button" data-testid="save-comparison" data-action="save-comparison" data-locale="Save comparison" disabled>Save comparison</button>',
  '      </div>',
  '      <div class="saved-experiment-controls">',
  '        <label for="saved-comparison-select" data-locale="Saved comparisons">Saved comparisons',
  '          <select id="saved-comparison-select" data-testid="saved-comparison-select"><option value="" data-locale="No saved comparisons">No saved comparisons</option></select>',
  '        </label>',
  '        <button type="button" data-testid="open-comparison" data-action="open-comparison" data-locale="Open saved comparison" disabled>Open saved comparison</button>',
  '        <button type="button" data-testid="load-more-comparisons" data-action="load-more-comparisons" data-locale="Load more" hidden disabled>Load more</button>',
  '      </div>',
  '      <p data-testid="saved-comparison-status" role="status" aria-live="polite"></p>',
  '      <p data-testid="experiment-status" role="status" aria-live="polite"></p>',
  '      <div class="experiment-report" data-testid="experiment-report" hidden>',
  '        <p class="experiment-report-summary" data-testid="experiment-report-summary" aria-live="polite"></p>',
  '        <p class="experiment-scheme-values" data-testid="experiment-scheme-values"></p>',
  '        <div class="experiment-table-scroll">',
  '          <table>',
  '            <thead><tr><th scope="col" data-locale="Measure">Measure</th><th scope="col" data-locale="Original">Original</th><th scope="col" data-locale="Draft">Draft</th></tr></thead>',
  '            <tbody>',
  '              <tr><th scope="row" data-locale="Completed / planned">Completed / planned</th><td data-testid="experiment-baseline-completed"></td><td data-testid="experiment-candidate-completed"></td></tr>',
  '              <tr><th scope="row" data-locale="Incomplete samples">Incomplete samples</th><td data-testid="experiment-baseline-incomplete"></td><td data-testid="experiment-candidate-incomplete"></td></tr>',
  '              <tr><th scope="row" data-locale="Victories / defeats">Victories / defeats</th><td data-testid="experiment-baseline-outcomes"></td><td data-testid="experiment-candidate-outcomes"></td></tr>',
  '              <tr><th scope="row" data-locale="Win rate">Win rate</th><td data-testid="experiment-baseline-win-rate"></td><td data-testid="experiment-candidate-win-rate"></td></tr>',
  '              <tr><th scope="row" data-locale="Average lives remaining">Average lives remaining</th><td data-testid="experiment-baseline-lives"></td><td data-testid="experiment-candidate-lives"></td></tr>',
  '              <tr><th scope="row" data-locale="Average victory time">Average victory time</th><td data-testid="experiment-baseline-time"></td><td data-testid="experiment-candidate-time"></td></tr>',
  '              <tr><th scope="row" data-locale="Average final cash">Average final cash</th><td data-testid="experiment-baseline-cash"></td><td data-testid="experiment-candidate-cash"></td></tr>',
  '              <tr><th scope="row" data-locale="Average cash change">Average cash change</th><td data-testid="experiment-baseline-cash-delta"></td><td data-testid="experiment-candidate-cash-delta"></td></tr>',
  '              <tr><th scope="row" data-locale="Average peak enemies">Average peak enemies</th><td data-testid="experiment-baseline-peak-enemies"></td><td data-testid="experiment-candidate-peak-enemies"></td></tr>',
  '              <tr><th scope="row" data-locale="Average escaped enemies">Average escaped enemies</th><td data-testid="experiment-baseline-escaped"></td><td data-testid="experiment-candidate-escaped"></td></tr>',
  '            </tbody>',
  '          </table>',
  '        </div>',
  '      </div>',
  '      <p class="experiment-note" data-locale="These runs use fixed paired seeds and do not change the saved profile. Save a comparison to keep it across sessions.">These runs use fixed paired seeds and do not change the saved profile. Save a comparison to keep it across sessions.</p>',
  '    </section>',
  '    <section class="replay-panel" aria-labelledby="replay-title">',
  '      <h2 id="replay-title" data-locale="Battle replay">Battle replay</h2>',
  '      <div class="replay-actions">',
  '        <button type="button" data-testid="export-replay" data-locale="Export settled battle">Export settled battle</button>',
  '        <label class="replay-import-label" data-locale="Import replay">Import replay<input id="import-replay" data-testid="import-replay" type="file" accept="application/json,.json" aria-label="Import replay"></label>',
  '      </div>',
  '      <p data-testid="replay-status" role="status" aria-live="polite"></p>',
  '    </section>',
  '    <details class="inspection-panel" data-testid="inspection-panel">',
  '      <summary>Inspect battle</summary>',
  '      <div class="inspection-actions">',
  '        <label><input type="checkbox" data-testid="inspection-overlay"> Show map overlay</label>',
  '        <button type="button" data-testid="single-step" data-action="single-step" disabled>Single step · 16 ms</button>',
  '      </div>',
  '      <p data-testid="inspection-frame"></p>',
  '      <p data-testid="inspection-units"></p>',
  '      <p data-testid="inspection-enemies"></p>',
  '      <p data-testid="inspection-route"></p>',
  '    </details>',
  '    <dialog class="recruit-confirmation" data-testid="recruit-confirmation" aria-labelledby="recruit-confirmation-title">',
  '      <h2 id="recruit-confirmation-title"></h2>',
  '      <div class="recruit-confirmation-actions">',
  '        <button type="button" data-action="confirm-recruit">Recruit</button>',
  '        <button type="button" data-action="cancel-recruit">Cancel</button>',
  '      </div>',
  '    </dialog>',
  '    <dialog class="recruit-confirmation upgrade-confirmation" data-testid="upgrade-confirmation" aria-labelledby="upgrade-confirmation-title">',
  '      <h2 id="upgrade-confirmation-title"></h2>',
  '      <p data-testid="upgrade-confirmation-details"></p>',
  '      <div class="recruit-confirmation-actions">',
  '        <button type="button" data-action="confirm-upgrade">Confirm upgrade</button>',
  '        <button type="button" data-action="cancel-upgrade">Cancel upgrade</button>',
  '      </div>',
  '    </dialog>',
  '    <p class="scene-caption" data-locale="The first three source campaign waves are playable. Later waves and full-campaign settlement remain unimplemented.">The first three source campaign waves are playable. Later waves and full-campaign settlement remain unimplemented.</p>',
  '  </section>',
  '</section>',
].join('');

registerMessages('gunsnglory', messages);

const canvasElement = app.querySelector<HTMLCanvasElement>('[data-testid="game-canvas"]');
const profileStatusElement = app.querySelector<HTMLElement>('[data-testid="profile-status"]');
const profileRecoveryStatusElement = app.querySelector<HTMLElement>('[data-testid="profile-recovery-status"]');
const exportCorruptProfileButtonElement = app.querySelector<HTMLButtonElement>('[data-action="export-corrupt-profile"]');
const resetCorruptProfileButtonElement = app.querySelector<HTMLButtonElement>('[data-action="reset-corrupt-profile"]');
const statusElement = app.querySelector<HTMLElement>('[data-testid="selection-status"]');
const sceneOpenErrorElement = app.querySelector<HTMLElement>('[data-testid="scene-open-error"]');
const sceneOpenErrorMessageElement = app.querySelector<HTMLElement>('[data-testid="scene-open-error-message"]');
const retrySceneOpenButtonElement = app.querySelector<HTMLButtonElement>('[data-action="retry-scene-open"]');
const returnPreviousSceneButtonElement = app.querySelector<HTMLButtonElement>('[data-action="return-to-previous-scene"]');
const campaignProgressSummaryElement = app.querySelector<HTMLElement>('[data-testid="campaign-progress-summary"]');
const campaignStageListElement = app.querySelector<HTMLOListElement>('[data-testid="campaign-stage-list"]');
const campaignStatusElement = app.querySelector<HTMLElement>('[data-testid="campaign-status"]');
const campaignDifficultySelectElement = app.querySelector<HTMLSelectElement>('[data-testid="difficulty-select"]');
const campaignDifficultyStatusElement = app.querySelector<HTMLElement>('[data-testid="difficulty-status"]');
const waveStatusElement = app.querySelector<HTMLElement>('[data-testid="wave-status"]');
const combatStatusElement = app.querySelector<HTMLElement>('[data-testid="combat-status"]');
const sceneTitleElement = app.querySelector<HTMLElement>('#scene-title');
const sceneContextElement = app.querySelector<HTMLElement>('[data-testid="scene-context"]');
const sceneDifficultyElement = app.querySelector<HTMLElement>('[data-testid="scene-difficulty"]');
const upgradeSampleStatusElement = app.querySelector<HTMLElement>('[data-testid="upgrade-sample-status"]');
const upgradeStatusElement = app.querySelector<HTMLElement>('[data-testid="upgrade-status"]');
const recruitPoolStatusElement = app.querySelector<HTMLElement>('[data-testid="recruit-pool-status"]');
const recruitStatusElement = app.querySelector<HTMLElement>('[data-testid="recruit-status"]');
const mapHireButtonElement = app.querySelector<HTMLButtonElement>('[data-action="hire-map-unit"]');
const mapHireStatusElement = app.querySelector<HTMLElement>('[data-testid="map-hire-status"]');
const settingsStatusElement = app.querySelector<HTMLElement>('[data-testid="settings-status"]');
const retrySettingsButtonElement = app.querySelector<HTMLButtonElement>('[data-action="retry-settings-save"]');
const reloadProfileButtonElement = app.querySelector<HTMLButtonElement>('[data-action="reload-saved-profile"]');
const pauseStatusElement = app.querySelector<HTMLElement>('[data-testid="pause-status"]');
const pauseButtonElement = app.querySelector<HTMLButtonElement>('[data-testid="pause-toggle"]');
const singleStepButtonElement = app.querySelector<HTMLButtonElement>('[data-testid="single-step"]');
const inspectionOverlayInputElement = app.querySelector<HTMLInputElement>('[data-testid="inspection-overlay"]');
const inspectionFrameElement = app.querySelector<HTMLElement>('[data-testid="inspection-frame"]');
const inspectionUnitsElement = app.querySelector<HTMLElement>('[data-testid="inspection-units"]');
const inspectionEnemiesElement = app.querySelector<HTMLElement>('[data-testid="inspection-enemies"]');
const inspectionRouteElement = app.querySelector<HTMLElement>('[data-testid="inspection-route"]');
const simulationSpeedInputElement = app.querySelector<HTMLInputElement>('[data-testid="simulation-speed"]');
const simulationSpeedValueElement = app.querySelector<HTMLOutputElement>('[data-testid="simulation-speed-value"]');
const clearButton = app.querySelector<HTMLButtonElement>('[data-action="clear-selection"]');
const startWaveButton = app.querySelector<HTMLButtonElement>('[data-action="start-wave"]');
const openOriginalWavesButton = app.querySelector<HTMLButtonElement>('[data-action="open-original-waves"]');
const recruitButton = app.querySelector<HTMLButtonElement>('[data-action="recruit-unit"]');
const upgradeButton = app.querySelector<HTMLButtonElement>('[data-action="upgrade-unit"]');
const startUpgradeSampleButton = app.querySelector<HTMLButtonElement>('[data-action="start-upgrade-sample"]');
const returnCowGulchButton = app.querySelector<HTMLButtonElement>('[data-action="return-cow-gulch"]');
const recruitConfirmationElement = app.querySelector<HTMLDialogElement>('[data-testid="recruit-confirmation"]');
const recruitConfirmationTitleElement = app.querySelector<HTMLElement>('#recruit-confirmation-title');
const confirmRecruitButton = app.querySelector<HTMLButtonElement>('[data-action="confirm-recruit"]');
const cancelRecruitButton = app.querySelector<HTMLButtonElement>('[data-action="cancel-recruit"]');
const upgradeConfirmationElement = app.querySelector<HTMLDialogElement>('[data-testid="upgrade-confirmation"]');
const upgradeConfirmationTitleElement = app.querySelector<HTMLElement>('#upgrade-confirmation-title');
const upgradeConfirmationDetailsElement = app.querySelector<HTMLElement>('[data-testid="upgrade-confirmation-details"]');
const confirmUpgradeButton = app.querySelector<HTMLButtonElement>('[data-action="confirm-upgrade"]');
const cancelUpgradeButton = app.querySelector<HTMLButtonElement>('[data-action="cancel-upgrade"]');
const startDefeatButton = app.querySelector<HTMLButtonElement>('[data-action="start-defeat-sample"]');
const settlementPanelElement = app.querySelector<HTMLElement>('[data-testid="settlement"]');
const settlementTitleElement = app.querySelector<HTMLElement>('#settlement-title');
const settlementOutcomeElement = app.querySelector<HTMLElement>('[data-testid="settlement-outcome"]');
const settlementSummaryElement = app.querySelector<HTMLElement>('[data-testid="settlement-summary"]');
const settlementScoreElement = app.querySelector<HTMLElement>('[data-testid="settlement-score"]');
const settlementHighScoreElement = app.querySelector<HTMLElement>('[data-testid="settlement-high-score"]');
const settlementSaveStatusElement = app.querySelector<HTMLElement>('[data-testid="settlement-save-status"]');
const retrySettlementButton = app.querySelector<HTMLButtonElement>('[data-action="retry-settlement-save"]');
const restartButton = app.querySelector<HTMLButtonElement>('[data-action="restart-sample"]');
const exportReplayButton = app.querySelector<HTMLButtonElement>('[data-testid="export-replay"]');
const importReplayInput = app.querySelector<HTMLInputElement>('[data-testid="import-replay"]');
const replayStatusElement = app.querySelector<HTMLElement>('[data-testid="replay-status"]');
const compareSchemesButtonElement = app.querySelector<HTMLButtonElement>('[data-testid="compare-schemes"]');
const experimentCashRewardInputElement = app.querySelector<HTMLInputElement>('[data-testid="experiment-cash-reward"]');
const experimentSampleCountSelectElement = app.querySelector<HTMLSelectElement>('[data-testid="experiment-sample-count"]');
const experimentStatusElement = app.querySelector<HTMLElement>('[data-testid="experiment-status"]');
const saveComparisonButtonElement = app.querySelector<HTMLButtonElement>('[data-testid="save-comparison"]');
const savedComparisonSelectElement = app.querySelector<HTMLSelectElement>('[data-testid="saved-comparison-select"]');
const openComparisonButtonElement = app.querySelector<HTMLButtonElement>('[data-testid="open-comparison"]');
const loadMoreComparisonsButtonElement = app.querySelector<HTMLButtonElement>('[data-testid="load-more-comparisons"]');
const savedComparisonStatusElement = app.querySelector<HTMLElement>('[data-testid="saved-comparison-status"]');
const experimentReportElement = app.querySelector<HTMLElement>('[data-testid="experiment-report"]');
const experimentReportSummaryElement = app.querySelector<HTMLElement>('[data-testid="experiment-report-summary"]');
if (!canvasElement || !profileStatusElement || !profileRecoveryStatusElement
  || !exportCorruptProfileButtonElement || !resetCorruptProfileButtonElement
  || !statusElement || !sceneOpenErrorElement || !sceneOpenErrorMessageElement
  || !retrySceneOpenButtonElement || !returnPreviousSceneButtonElement || !waveStatusElement || !combatStatusElement
  || !campaignProgressSummaryElement || !campaignStageListElement || !campaignStatusElement
  || !campaignDifficultySelectElement || !campaignDifficultyStatusElement
  || !sceneTitleElement || !sceneContextElement || !sceneDifficultyElement
  || !upgradeSampleStatusElement || !upgradeStatusElement
  || !recruitPoolStatusElement || !recruitStatusElement || !mapHireButtonElement || !mapHireStatusElement
  || !recruitButton || !recruitConfirmationElement
  || !upgradeButton || !startUpgradeSampleButton || !returnCowGulchButton || !upgradeConfirmationElement
  || !upgradeConfirmationTitleElement || !upgradeConfirmationDetailsElement || !confirmUpgradeButton || !cancelUpgradeButton
  || !recruitConfirmationTitleElement || !confirmRecruitButton || !cancelRecruitButton || !settingsStatusElement
  || !retrySettingsButtonElement || !reloadProfileButtonElement
  || !pauseStatusElement || !pauseButtonElement
  || !singleStepButtonElement || !inspectionOverlayInputElement || !inspectionFrameElement
  || !inspectionUnitsElement || !inspectionEnemiesElement || !inspectionRouteElement
  || !simulationSpeedInputElement || !simulationSpeedValueElement || !clearButton || !startWaveButton
  || !openOriginalWavesButton
  || !startDefeatButton || !settlementPanelElement || !settlementTitleElement || !settlementOutcomeElement
  || !settlementSummaryElement || !settlementScoreElement || !settlementHighScoreElement
  || !settlementSaveStatusElement || !retrySettlementButton || !restartButton
  || !exportReplayButton || !importReplayInput || !replayStatusElement
  || !compareSchemesButtonElement || !experimentCashRewardInputElement || !experimentSampleCountSelectElement
  || !experimentStatusElement || !experimentReportElement || !experimentReportSummaryElement
  || !saveComparisonButtonElement || !savedComparisonSelectElement || !openComparisonButtonElement
  || !loadMoreComparisonsButtonElement || !savedComparisonStatusElement) {
  throw new Error('Game controls are missing');
}
const canvas: HTMLCanvasElement = canvasElement;
const profileStatus: HTMLElement = profileStatusElement;
const profileRecoveryStatus: HTMLElement = profileRecoveryStatusElement;
const exportCorruptProfileButton: HTMLButtonElement = exportCorruptProfileButtonElement;
const resetCorruptProfileButton: HTMLButtonElement = resetCorruptProfileButtonElement;
const status: HTMLElement = statusElement;
const sceneOpenErrorPanel: HTMLElement = sceneOpenErrorElement;
const sceneOpenErrorMessage: HTMLElement = sceneOpenErrorMessageElement;
const retrySceneOpenControl: HTMLButtonElement = retrySceneOpenButtonElement;
const returnPreviousSceneControl: HTMLButtonElement = returnPreviousSceneButtonElement;
const waveStatus: HTMLElement = waveStatusElement;
const combatStatus: HTMLElement = combatStatusElement;
const campaignProgressSummary: HTMLElement = campaignProgressSummaryElement;
const campaignStageList: HTMLOListElement = campaignStageListElement;
const campaignStatus: HTMLElement = campaignStatusElement;
const campaignDifficultySelect: HTMLSelectElement = campaignDifficultySelectElement;
const campaignDifficultyStatus: HTMLElement = campaignDifficultyStatusElement;
const sceneTitle: HTMLElement = sceneTitleElement;
const sceneContext: HTMLElement = sceneContextElement;
const sceneDifficulty: HTMLElement = sceneDifficultyElement;
const upgradeSampleStatus: HTMLElement = upgradeSampleStatusElement;
const upgradeStatus: HTMLElement = upgradeStatusElement;
const recruitPoolStatus: HTMLElement = recruitPoolStatusElement;
const recruitStatus: HTMLElement = recruitStatusElement;
const mapHireControl: HTMLButtonElement = mapHireButtonElement;
const mapHireStatus: HTMLElement = mapHireStatusElement;
const settingsStatus: HTMLElement = settingsStatusElement;
const retrySettingsButton: HTMLButtonElement = retrySettingsButtonElement;
const reloadProfileButton: HTMLButtonElement = reloadProfileButtonElement;
const pauseStatus: HTMLElement = pauseStatusElement;
const pauseControl: HTMLButtonElement = pauseButtonElement;
const singleStepControl: HTMLButtonElement = singleStepButtonElement;
const inspectionOverlayInput: HTMLInputElement = inspectionOverlayInputElement;
const inspectionFrame: HTMLElement = inspectionFrameElement;
const inspectionUnits: HTMLElement = inspectionUnitsElement;
const inspectionEnemies: HTMLElement = inspectionEnemiesElement;
const inspectionRoute: HTMLElement = inspectionRouteElement;
const simulationSpeedInput: HTMLInputElement = simulationSpeedInputElement;
const simulationSpeedValue: HTMLOutputElement = simulationSpeedValueElement;
const startWaveControl: HTMLButtonElement = startWaveButton;
const openOriginalWavesControl: HTMLButtonElement = openOriginalWavesButton;
const recruitControl: HTMLButtonElement = recruitButton;
const upgradeControl: HTMLButtonElement = upgradeButton;
const startUpgradeSampleControl: HTMLButtonElement = startUpgradeSampleButton;
const returnCowGulchControl: HTMLButtonElement = returnCowGulchButton;
const recruitConfirmation: HTMLDialogElement = recruitConfirmationElement;
const recruitConfirmationTitle: HTMLElement = recruitConfirmationTitleElement;
const confirmRecruitControl: HTMLButtonElement = confirmRecruitButton;
const cancelRecruitControl: HTMLButtonElement = cancelRecruitButton;
const upgradeConfirmation: HTMLDialogElement = upgradeConfirmationElement;
const upgradeConfirmationTitle: HTMLElement = upgradeConfirmationTitleElement;
const upgradeConfirmationDetails: HTMLElement = upgradeConfirmationDetailsElement;
const confirmUpgradeControl: HTMLButtonElement = confirmUpgradeButton;
const cancelUpgradeControl: HTMLButtonElement = cancelUpgradeButton;
const startDefeatControl: HTMLButtonElement = startDefeatButton;
const clearSelectionControl: HTMLButtonElement = clearButton;
const restartControl: HTMLButtonElement = restartButton;
const settlementPanel: HTMLElement = settlementPanelElement;
const settlementTitle: HTMLElement = settlementTitleElement;
const settlementOutcome: HTMLElement = settlementOutcomeElement;
const settlementSummary: HTMLElement = settlementSummaryElement;
const settlementScore: HTMLElement = settlementScoreElement;
const settlementHighScore: HTMLElement = settlementHighScoreElement;
const settlementSaveStatus: HTMLElement = settlementSaveStatusElement;
const retrySettlementControl: HTMLButtonElement = retrySettlementButton;
const exportReplayControl: HTMLButtonElement = exportReplayButton;
const importReplayControl: HTMLInputElement = importReplayInput;
const replayStatus: HTMLElement = replayStatusElement;
const compareSchemesControl: HTMLButtonElement = compareSchemesButtonElement;
const experimentCashRewardInput: HTMLInputElement = experimentCashRewardInputElement;
const experimentSampleCountSelect: HTMLSelectElement = experimentSampleCountSelectElement;
const experimentStatus: HTMLElement = experimentStatusElement;
const saveComparisonControl: HTMLButtonElement = saveComparisonButtonElement;
const savedComparisonSelect: HTMLSelectElement = savedComparisonSelectElement;
const openComparisonControl: HTMLButtonElement = openComparisonButtonElement;
const loadMoreComparisonsControl: HTMLButtonElement = loadMoreComparisonsButtonElement;
const savedComparisonStatus: HTMLElement = savedComparisonStatusElement;
const experimentReport: HTMLElement = experimentReportElement;
const experimentReportSummary: HTMLElement = experimentReportSummaryElement;

const game = createBrowserGame();
const progress = createBrowserProgress();
const experiments = createExperiments({
  game,
  repository: createBrowserExperimentRepository(),
  policies: [{
    id: 'start-wave',
    version: '1',
    create: () => ({
      decide: (observation) => observation.wave?.phase === 'not-started' ? [{ type: 'start-wave' }] : [],
    }),
  }],
});
let session = await game.open({
  scenarioId: cowGulchP1aSampleContent.id,
  contentVersion: cowGulchP1aSampleContent.contentVersion ?? 'unversioned',
  mode: 'formal',
});
let view = session.observe();
let profile: ProfileView = {
  settings: { simulationSpeed: DEFAULT_SIMULATION_SPEED, difficulty: 'easy' },
  completedScenarios: [],
  highScores: {},
};
let campaignProgressView: CampaignProgressView | undefined;
let campaignFeedback: { type: 'loading' | 'load-failed' | 'locked' | 'difficulty-locked' | 'opening' | 'opened' | 'open-failed'; scenarioId?: string } | undefined;
let campaignSelectionBusy = false;
let context: CanvasRenderingContext2D | undefined;
let simulationSpeed = DEFAULT_SIMULATION_SPEED;
let selectedDifficulty: GameDifficulty = 'easy';
let pauseReason: 'manual' | 'background' | undefined;
let showInspectionOverlay = false;
let pageLeaving = false;
let settingsStatusKey: 'load-failed' | 'saved' | 'save-failed' | 'conflict' | 'profile-reset' | undefined;
let settingsSaveBusy = false;
let profileLoadFailed = false;
let profileLoadErrorCode: string | undefined;
let profileRecoveryStatusKey: 'backup-exported' | 'export-failed' | 'reset-failed' | 'profile-reset' | 'profile-refreshed' | undefined;
let corruptProfileBackup: string | undefined;
let settlementSaveState: SettlementSaveResult['status'] | 'saving' | 'debug' | 'replay' | undefined;
let activeSettlementRecord: GameSettlementRecord | undefined;
let replaying = false;
let replacingSession = false;
type SessionOpenRequest = {
  scenarioId: string;
  contentVersion?: string;
  randomSeed: number;
  difficulty?: GameDifficulty;
  mode: GameMode;
};
type SceneOpenFailure = { request: SessionOpenRequest; code: GameOpenErrorCode | 'unknown' };
let sceneOpenFailure: SceneOpenFailure | undefined;
let restartModeOverride: Exclude<GameMode, 'replay'> | undefined;
type ReplayStatusState =
  | { type: 'importing' }
  | { type: 'exported' }
  | { type: 'verified'; checkpointCount: number; outcome: 'victory' | 'defeat' }
  | { type: 'error'; code: GameReplayErrorCode };
let replayStatusState: ReplayStatusState | undefined;
let lastDefeatReward: number | undefined;
let lastRecruitmentEvent: Extract<GameEvent, { type: 'unit-recruited' | 'unit-recruitment-rejected' }> | undefined;
let lastMapHireEvent: Extract<GameEvent, { type: 'map-unit-hired' | 'map-unit-hire-rejected' }> | undefined;
let pendingRecruitmentType: string | undefined;
let recruitmentCommandNumber = 0;
let mapHireCommandNumber = 0;
let lastUpgradeEvent: Extract<GameEvent, { type: 'unit-upgraded' | 'unit-upgrade-rejected' }> | undefined;
let pendingUpgradeUnitId: string | undefined;
let upgradeCommandNumber = 0;
let settingsSaveSequence = 0;
const simulationTime = new SimulationTimeAccumulator();
let mapCamera: MapCamera = createMapCamera();
const languageMessages = {
  en: {
    result: 'Battle result',
    campaignSummary: (completed: number, total: number) => `${completed}/${total} stages complete`,
    campaignLoading: 'Loading campaign progress…',
    campaignLoadFailed: 'Campaign progress could not be loaded; stages are unavailable.',
    campaignStageAvailable: 'Available',
    campaignStageLocked: 'Locked',
    campaignStageCompleted: 'Completed',
    campaignStageScore: (score: number) => `Best $${score}`,
    difficultyNames: { easy: 'Easy', medium: 'Medium', hard: 'Hard' } satisfies Record<GameDifficulty, string>,
    campaignDifficultyLocked: 'Hard unlocks after completing the 10th level in any region.',
    campaignDifficultyUnlocked: 'Hard difficulty is unlocked.',
    sceneDifficulty: (difficulty: GameDifficulty) => `DIFFICULTY · ${difficulty.toUpperCase()}`,
    openCampaignStage: (name: string) => `Open ${name}`,
    campaignLocked: (name: string) => `${name} is locked. Complete its prerequisites first.`,
    campaignOpening: (name: string) => `Opening ${name}…`,
    campaignOpened: (name: string) => `${name} opened.`,
    campaignOpenFailed: 'The stage could not be opened. The previous scene remains available.',
    none: 'No unit selected',
    unitName: (type: string) => type === 'mexican' ? 'Mexican' : 'Gunslinger',
    selected: (name: string) => `${name} selected`,
    selectedSleeping: (name: string) => `${name} is waiting to be hired`,
    mapHireButton: (name: string, price: number) => `Hire map ${name} · $${price}`,
    mapHired: (name: string, price: number) => `${name} hired from the map for $${price}.`,
    mapHireRejected: (name: string, price: number, cash: number) => `Not enough cash to hire ${name}: need $${price}, have $${cash}.`,
    startSample: 'Start one pioneer sample',
    openOriginalWaves: 'Play original eight waves',
    originalWaveContext: 'ORIGINAL CAMPAIGN · 1–8',
    originalWaveNotice: 'This archived slice stops after wave 3 of 8 and does not settle the campaign.',
    originalCampaignNotice: 'All eight original waves are active. Clear Wave 8 to settle the battle.',
    returnCowGulchSample: 'Return to Cow Gulch sample',
    failed: 'Game scene failed to load',
    retrySceneOpen: 'Retry loading requested scene',
    returnPreviousScene: 'Return to previous scene',
    sceneOpenErrors: {
      'scenario-unavailable': 'This scenario is unavailable in this build.',
      'content-version-unavailable': 'The requested scenario content version is unavailable; no newer version was substituted.',
      'difficulty-unavailable': 'This scenario does not support the requested difficulty.',
      'rules-version-unsupported': 'The requested game rules version is not supported by this build.',
      'prepared-setup-invalid': 'The requested game setup is incomplete or damaged.',
      'prepared-setup-mismatch': 'The requested game setup does not match this scenario.',
      unknown: 'The scene could not be opened. Your previous scene is still available.',
    } satisfies Record<GameOpenErrorCode | 'unknown', string>,
    pauseBattle: 'Pause battle',
    resumeBattle: 'Resume battle',
    battlePaused: 'Battle paused.',
    battlePausedInBackground: 'Battle paused automatically while this tab was in the background.',
    inspectTitle: 'Inspect battle',
    showOverlay: 'Show map overlay',
    singleStep: 'Single step · 16 ms',
    inspectionFrame: (frame: number, elapsedMs: number) => `Frame ${frame} · ${elapsedMs} ms`,
    inspectionUnits: (units: string) => `Units: ${units}`,
    inspectionEnemies: (enemies: string) => `Enemies: ${enemies}`,
    inspectionRoute: (route: string) => `Route: ${route}`,
    noUnits: 'none',
    noEnemies: 'none',
    noRoute: 'not available',
    position: (x: string, y: string) => `at (${x}, ${y})`,
    unitRange: (range: string, boundary: string) => ` · range ${boundary} ${range} cells`,
    enemyHealth: (hp: number, maxHp: number) => ` · HP ${hp}/${maxHp}`,
    waiting: (lives: number, number: number, cash: number, total?: number) => `Wave ${number}${total ? `/${total}` : ''} ready · Lives ${lives} · Cash $${cash}`,
    active: (lives: number, number: number, enemies: number, cash: number, total?: number) => `Wave ${number}${total ? `/${total}` : ''} · Lives ${lives} · Enemies ${enemies} · Cash $${cash}`,
    complete: (lives: number, number: number, escaped: number, defeated: number, cash: number, total?: number) => `Wave ${number}${total ? `/${total}` : ''} complete · Lives ${lives} · Escaped ${escaped} · Defeated ${defeated} · Cash $${cash}`,
    campaignWavesUnavailable: (next: number, total: number) => `Wave ${next} of ${total} is not implemented in this build.`,
    startCampaignWave: (number: number, total: number) => `Start wave ${number} of ${total}`,
    defeated: (cashReward: number) => `Pioneer defeated · +$${cashReward}`,
    recruitButton: (name: string, price: number) => `Hire ${name} · $${price}`,
    recruitPool: (units: string) => `Recruit pool: ${units}`,
    recruitPoolEmpty: 'Recruit pool: empty',
    recruited: (name: string, price: number) => `${name} recruited for $${price}; held in the spawn pool.`,
    insufficientCash: (name: string, price: number, cash: number) => `Not enough cash for ${name}: need $${price}, have $${cash}.`,
    confirmRecruit: (name: string, price: number) => `Recruit ${name} for $${price}?`,
    confirmRecruitButton: 'Recruit',
    cancelRecruitButton: 'Cancel',
    upgradeSceneTitle: 'Cow Gulch · upgrade test',
    upgradeSceneContext: 'DEBUG RULE TEST',
    originalUpgradeLimit: 'Original Cow Gulch has an upgrade limit of 0. This separate debug fixture sets the limit to 1 and starts with $25; it never saves progress.',
    debugUpgradeFixture: 'Debug-only fixture · upgrade limit 1 · $25 starting cash · no profile writes.',
    upgradeButton: (price: number) => `Upgrade Gunslinger · $${price}`,
    upgradeSummary: (level: number, speed: number, nextSpeed: number, reload: number, nextReload: number) =>
      `Level ${level} → ${level + 1} · Speed ${speed} → ${nextSpeed} · Reload ${reload} → ${nextReload} ms`,
    upgradeDetails: (level: number, speed: number, nextSpeed: number, damage: number, nextDamage: number,
      range: number, nextRange: number, reload: number, nextReload: number, specialReload: number,
      nextSpecialReload: number, price: number, cash: number) =>
      `Level ${level} → ${level + 1} · Speed ${speed} → ${nextSpeed} · Damage ${damage} → ${nextDamage} · Range ${range} → ${nextRange} fine units · Reload ${reload} → ${nextReload} ms · Special reload ${specialReload} → ${nextSpecialReload} ms · Price $${price} · Cash $${cash}`,
    confirmUpgrade: (name: string, price: number) => `Upgrade ${name} for $${price}?`,
    confirmUpgradeButton: 'Confirm upgrade',
    cancelUpgradeButton: 'Cancel upgrade',
    upgraded: (name: string, level: number, price: number) => `${name} upgraded to level ${level} for $${price}.`,
    insufficientUpgradeCash: (price: number, cash: number) => `Not enough cash to upgrade: need $${price}, have $${cash}.`,
    upgradeLimitReached: 'This unit has reached the upgrade limit for this level.',
    noUpgradeAvailable: 'No upgrade is available for this unit in this level.',
    'load-failed': 'Settings could not be loaded; default settings are active for this session.',
    saved: 'Settings saved.',
    'save-failed': 'The selected settings are active for this session, but could not be saved.',
    conflict: 'A newer profile exists. Reload it before saving another setting.',
    'profile-reset': 'A new empty profile is ready.',
    retrySettings: 'Retry saving settings',
    reloadProfile: 'Reload saved profile',
    noSavedProfile: 'Saved profile: no Cow Gulch result yet.',
    profileLoadFailed: 'Saved profile could not be read.',
    profileCorrupt: 'Saved profile is damaged. Download a backup before replacing it.',
    profileUnsupported: 'Saved profile uses a newer format. Download a backup and open it with a compatible version.',
    exportProfile: 'Download profile backup',
    replaceProfile: 'Replace damaged profile',
    backupExported: 'Backup downloaded. You can now replace the damaged profile.',
    exportFailed: 'Profile backup could not be exported.',
    resetProfile: 'Damaged profile replaced. The downloaded backup keeps the original record.',
    resetFailed: 'Profile changed or could not be reset. Download a fresh backup and retry.',
    profileRefreshed: 'A newer valid profile was found and loaded.',
    confirmResetProfile: 'Replace this damaged profile with a new empty one? Make sure the backup was downloaded.',
    profileSaved: (completed: boolean, score: number | undefined) =>
      `Saved profile: Cow Gulch${completed ? ' sample complete' : ''}${score === undefined ? '' : ` · Best $${score}`}.`,
    settlementSaving: 'Saving result to this browser…',
    settlementSaved: 'Result saved to this browser.',
    settlementFailed: 'Result is not saved. Retry to save it.',
    settlementConflict: 'A newer profile exists. Retry to merge this result.',
    settlementDebug: 'Debug result · not added to the saved profile.',
    settlementReplay: 'Replay result · not added to the saved profile.',
    replayExported: 'Replay file exported.',
    replayImporting: 'Checking and replaying battle…',
    replayVerified: (checkpointCount: number, outcome: string) => `Replay verified · ${checkpointCount} checkpoints · ${outcome}.`,
    replayErrors: {
      'missing-version': 'Replay is missing a required version.',
      'unsupported-version': 'Replay uses an unsupported format or rules version.',
      'content-unavailable': 'Replay content version is unavailable in this build.',
      'corrupt-input': 'Replay file is invalid or incomplete.',
      'digest-mismatch': 'Replay integrity check failed: its digest does not match.',
      'result-mismatch': 'Replay verification failed: a checkpoint or result differs.',
      'incomplete-recording': 'This battle has not reached a recordable result.',
      'recording-too-large': 'This battle record exceeds the supported replay size.',
      'unsupported-mode': 'Replays cannot be exported from another replay session.',
    } satisfies Record<GameReplayErrorCode, string>,
    scoreCandidate: (score: number) => `High-score candidate: $${score}`,
    scoreSaved: (score: number) => `High-score saved: $${score}`,
    retrySave: 'Retry saving result',
    victory: 'Victory',
    defeat: 'Defeat',
    settlementSummary: (number: number, lives: number, escaped: number, defeated: number, cash: number) =>
      `Wave ${number} · Lives ${lives} · Escaped ${escaped} · Defeated ${defeated} · Cash $${cash}`,
    displayScore: (score: number) => `Displayed score: $${score}`,
  },
  zh: {
    result: '战斗结算',
    campaignSummary: (completed: number, total: number) => `已完成 ${completed}/${total} 个关卡`,
    campaignLoading: '正在读取战役进度…',
    campaignLoadFailed: '无法读取战役进度，当前关卡不可用。',
    campaignStageAvailable: '可进入',
    campaignStageLocked: '未解锁',
    campaignStageCompleted: '已完成',
    campaignStageScore: (score: number) => `最高分 $${score}`,
    difficultyNames: { easy: '简单', medium: '中等', hard: '困难' } satisfies Record<GameDifficulty, string>,
    campaignDifficultyLocked: '完成任意区域的第 10 关后解锁困难模式。',
    campaignDifficultyUnlocked: '困难模式已解锁。',
    sceneDifficulty: (difficulty: GameDifficulty) => `难度 · ${({ easy: '简单', medium: '中等', hard: '困难' })[difficulty]}`,
    openCampaignStage: (name: string) => `进入${name}`,
    campaignLocked: (name: string) => `${name}尚未解锁，请先完成前置关卡。`,
    campaignOpening: (name: string) => `正在进入${name}…`,
    campaignOpened: (name: string) => `已进入${name}。`,
    campaignOpenFailed: '无法打开该关卡，之前的场景仍可使用。',
    none: '尚未选择单位',
    unitName: (type: string) => type === 'mexican' ? '墨西哥人' : '枪手',
    selected: (name: string) => `已选择${name}`,
    selectedSleeping: (name: string) => `${name}待招募，尚未雇用`,
    mapHireButton: (name: string, price: number) => `雇佣地图上的${name} · $${price}`,
    mapHired: (name: string, price: number) => `已花费 $${price} 雇佣地图上的${name}。`,
    mapHireRejected: (name: string, price: number, cash: number) => `现金不足，无法雇佣${name}：需要 $${price}，当前 $${cash}。`,
    startSample: '开始单个拓荒者样本',
    openOriginalWaves: '游玩原版八波',
    originalWaveContext: '原版战役 · 第 1–8 波',
    originalWaveNotice: '该历史切片在第 3/8 波后停止，不结算战役。',
    originalCampaignNotice: '原版八波内容已启用；完成第 8 波后结算战局。',
    returnCowGulchSample: '返回牛溪谷样本',
    failed: '游戏场景加载失败',
    retrySceneOpen: '重试加载请求的场景',
    returnPreviousScene: '返回之前的场景',
    sceneOpenErrors: {
      'scenario-unavailable': '当前版本中没有此场景。',
      'content-version-unavailable': '请求的场景内容版本不可用；未替换为较新版本。',
      'difficulty-unavailable': '该场景没有所选难度的规则数据。',
      'rules-version-unsupported': '当前版本不支持请求的游戏规则版本。',
      'prepared-setup-invalid': '请求的游戏配置不完整或已损坏。',
      'prepared-setup-mismatch': '请求的游戏配置与此场景不匹配。',
      unknown: '场景无法打开；之前的场景仍可使用。',
    } satisfies Record<GameOpenErrorCode | 'unknown', string>,
    pauseBattle: '暂停战斗',
    resumeBattle: '继续战斗',
    battlePaused: '战斗已暂停。',
    battlePausedInBackground: '切换到后台时已自动暂停战斗。',
    inspectTitle: '战局检查',
    showOverlay: '显示地图覆盖层',
    singleStep: '单步推进 · 16 毫秒',
    inspectionFrame: (frame: number, elapsedMs: number) => `帧 ${frame} · ${elapsedMs} 毫秒`,
    inspectionUnits: (units: string) => `单位：${units}`,
    inspectionEnemies: (enemies: string) => `敌人：${enemies}`,
    inspectionRoute: (route: string) => `路线：${route}`,
    noUnits: '无',
    noEnemies: '无',
    noRoute: '不可用',
    position: (x: string, y: string) => `位置 (${x}, ${y})`,
    unitRange: (range: string, boundary: string) => ` · 射程 ${boundary} ${range} 格`,
    enemyHealth: (hp: number, maxHp: number) => ` · 生命 ${hp}/${maxHp}`,
    waiting: (lives: number, number: number, cash: number, total?: number) => `第 ${number}${total ? `/${total}` : ''} 波待开始 · 生命 ${lives} · 现金 $${cash}`,
    active: (lives: number, number: number, enemies: number, cash: number, total?: number) => `第 ${number}${total ? `/${total}` : ''} 波 · 生命 ${lives} · 敌人 ${enemies} · 现金 $${cash}`,
    complete: (lives: number, number: number, escaped: number, defeated: number, cash: number, total?: number) => `第 ${number}${total ? `/${total}` : ''} 波完成 · 生命 ${lives} · 逃脱 ${escaped} · 击败 ${defeated} · 现金 $${cash}`,
    campaignWavesUnavailable: (next: number, total: number) => `当前版本尚未实现第 ${next}/${total} 波。`,
    startCampaignWave: (number: number, total: number) => `开始第 ${number}/${total} 波`,
    defeated: (cashReward: number) => `拓荒者被击败 · +$${cashReward}`,
    recruitButton: (name: string, price: number) => `招募${name} · $${price}`,
    recruitPool: (units: string) => `预备单位：${units}`,
    recruitPoolEmpty: '预备单位：无',
    recruited: (name: string, price: number) => `已花费 $${price} 招募${name}，现存于生成池。`,
    insufficientCash: (name: string, price: number, cash: number) => `现金不足，无法招募${name}：需要 $${price}，当前 $${cash}。`,
    confirmRecruit: (name: string, price: number) => `花费 $${price} 招募${name}？`,
    confirmRecruitButton: '确认招募',
    cancelRecruitButton: '取消',
    upgradeSceneTitle: '牛溪谷 · 升级测试',
    upgradeSceneContext: '规则测试 · 调试场景',
    originalUpgradeLimit: '原版牛溪谷的升级上限为 0。此独立调试样本将上限设为 1、初始现金设为 $25；不会写入存档。',
    debugUpgradeFixture: '仅供规则测试 · 升级上限 1 · 初始现金 $25 · 不写入档案。',
    upgradeButton: (price: number) => `升级枪手 · $${price}`,
    upgradeSummary: (level: number, speed: number, nextSpeed: number, reload: number, nextReload: number) =>
      `等级 ${level} → ${level + 1} · 移动速度 ${speed} → ${nextSpeed} · 装填 ${reload} → ${nextReload} 毫秒`,
    upgradeDetails: (level: number, speed: number, nextSpeed: number, damage: number, nextDamage: number,
      range: number, nextRange: number, reload: number, nextReload: number, specialReload: number,
      nextSpecialReload: number, price: number, cash: number) =>
      `等级 ${level} → ${level + 1} · 移动速度 ${speed} → ${nextSpeed} · 伤害 ${damage} → ${nextDamage} · 射程 ${range} → ${nextRange} 细单位 · 装填 ${reload} → ${nextReload} 毫秒 · 特殊装填 ${specialReload} → ${nextSpecialReload} 毫秒 · 价格 $${price} · 当前现金 $${cash}`,
    confirmUpgrade: (name: string, price: number) => `花费 $${price} 升级${name}？`,
    confirmUpgradeButton: '确认升级',
    cancelUpgradeButton: '取消升级',
    upgraded: (name: string, level: number, price: number) => `已花费 $${price} 将${name}升至等级 ${level}。`,
    insufficientUpgradeCash: (price: number, cash: number) => `升级资金不足：需要 $${price}，当前 $${cash}。`,
    upgradeLimitReached: '该单位已达到本关升级上限。',
    noUpgradeAvailable: '该单位在本关没有可用升级。',
    'load-failed': '无法读取设置，本次使用默认值。',
    saved: '设置已保存。',
    'save-failed': '本次使用所选设置，但保存失败。',
    conflict: '档案已有更新。请先重新加载，再保存其他设置。',
    'profile-reset': '新的空档案已就绪。',
    retrySettings: '重试保存设置',
    reloadProfile: '重新加载已保存档案',
    noSavedProfile: '已保存档案：尚无牛溪谷结算。',
    profileLoadFailed: '无法读取已保存档案。',
    profileCorrupt: '已保存档案损坏。替换前请先下载备份。',
    profileUnsupported: '档案使用了较新格式。请下载备份，并在兼容版本中打开。',
    exportProfile: '下载档案备份',
    replaceProfile: '替换损坏档案',
    backupExported: '备份已下载，现在可以替换损坏档案。',
    exportFailed: '无法导出档案备份。',
    resetProfile: '损坏档案已替换。原记录保留在已下载的备份中。',
    resetFailed: '档案已变化或无法重置。请重新下载备份后重试。',
    profileRefreshed: '发现并加载了较新的有效档案。',
    confirmResetProfile: '要将损坏档案替换为空档案吗？请确认备份已下载。',
    profileSaved: (completed: boolean, score: number | undefined) =>
      `已保存档案：牛溪谷${completed ? '样本已完成' : ''}${score === undefined ? '' : ` · 最高分 $${score}`}。`,
    settlementSaving: '正在将结算保存到此浏览器…',
    settlementSaved: '结算已保存到此浏览器。',
    settlementFailed: '结算尚未保存。请重试保存。',
    settlementConflict: '档案已有更新版本。重试可合并本次结果。',
    settlementDebug: '调试结果 · 不会写入已保存档案。',
    settlementReplay: '重放结果 · 不会写入已保存档案。',
    replayExported: '战局文件已导出。',
    replayImporting: '正在检查并重放战局…',
    replayVerified: (checkpointCount: number, outcome: string) => `重放验证通过 · ${checkpointCount} 个检查点 · ${outcome}。`,
    replayErrors: {
      'missing-version': '重放文件缺少必需的版本信息。',
      'unsupported-version': '重放文件使用了不支持的格式或规则版本。',
      'content-unavailable': '此版本游戏内容在当前构建中不可用。',
      'corrupt-input': '重放文件无效或不完整。',
      'digest-mismatch': '重放完整性检查失败：摘要与内容不匹配。',
      'result-mismatch': '重放验证失败：检查点或结算结果不一致。',
      'incomplete-recording': '本场战局尚未到达可记录的结算状态。',
      'recording-too-large': '本场战局记录超过了重放文件支持的大小。',
      'unsupported-mode': '不能从另一个重放会话导出战局。',
    } satisfies Record<GameReplayErrorCode, string>,
    scoreCandidate: (score: number) => `高分候选值：$${score}`,
    scoreSaved: (score: number) => `已保存高分：$${score}`,
    retrySave: '重试保存结算',
    victory: '胜利',
    defeat: '败北',
    settlementSummary: (number: number, lives: number, escaped: number, defeated: number, cash: number) =>
      `第 ${number} 波 · 生命 ${lives} · 逃脱 ${escaped} · 击败 ${defeated} · 现金 $${cash}`,
    displayScore: (score: number) => `画面分数：$${score}`,
  },
};

function profileMessage(language: keyof typeof languageMessages): string {
  const messages = languageMessages[language];
  if (profileLoadFailed) {
    if (profileLoadErrorCode === 'corrupt-data') return messages.profileCorrupt;
    if (profileLoadErrorCode === 'unsupported-version') return messages.profileUnsupported;
    return messages.profileLoadFailed;
  }
  const completed = profile.completedScenarios.includes('cow-gulch');
  const score = profile.highScores['cow-gulch'];
  if (!completed && score === undefined) return messages.noSavedProfile;
  return messages.profileSaved(completed, score);
}

function applyProfileSettings(settings: ProfileView['settings']): void {
  simulationSpeed = settings.simulationSpeed;
  simulationSpeedInput.value = String(simulationSpeed);
  selectedDifficulty = settings.difficulty === 'hard' && !campaignProgressView?.hardModeUnlocked
    ? 'easy'
    : settings.difficulty;
  campaignDifficultySelect.value = selectedDifficulty;
}

function updateProfileSettings(settings: ProfileView['settings']): void {
  profile = { ...profile, settings };
  if (campaignProgressView) campaignProgressView = { ...campaignProgressView, profile };
}

function renderCampaign(): void {
  const language = getLanguage();
  const copy = languageMessages[language];
  const stages = campaignProgressView?.stages ?? [];
  const hardUnlocked = campaignProgressView?.hardModeUnlocked === true;
  const hardOption = campaignDifficultySelect.querySelector<HTMLOptionElement>('option[value="hard"]');
  if (hardOption) hardOption.disabled = !hardUnlocked;
  if (selectedDifficulty === 'hard' && !hardUnlocked) selectedDifficulty = 'easy';
  if (campaignDifficultySelect.value !== selectedDifficulty) campaignDifficultySelect.value = selectedDifficulty;
  const difficultyDisabled = profileLoadFailed || !campaignProgressView || campaignSelectionBusy
    || settingsSaveBusy || replacingSession || replaying;
  if (campaignDifficultySelect.disabled !== difficultyDisabled) {
    campaignDifficultySelect.disabled = difficultyDisabled;
  }
  const difficultyStatusText = campaignProgressView
    ? hardUnlocked ? copy.campaignDifficultyUnlocked : copy.campaignDifficultyLocked
    : profileLoadFailed ? copy.campaignLoadFailed : copy.campaignLoading;
  if (campaignDifficultyStatus.textContent !== difficultyStatusText) {
    campaignDifficultyStatus.textContent = difficultyStatusText;
  }
  const rows = Array.from(campaignStageList.children) as HTMLLIElement[];
  const rowsMatch = rows.length === stages.length
    && rows.every((row, index) => row.dataset.scenarioId === stages[index]?.scenarioId);

  if (!rowsMatch) {
    const fragment = document.createDocumentFragment();
    stages.forEach((stage, index) => {
      const row = document.createElement('li');
      row.className = 'campaign-stage';
      row.dataset.scenarioId = stage.scenarioId;
      const details = document.createElement('div');
      details.className = 'campaign-stage-details';
      const name = document.createElement('span');
      name.className = 'campaign-stage-name';
      name.dataset.role = 'stage-name';
      const state = document.createElement('span');
      state.className = 'campaign-stage-state';
      state.dataset.role = 'stage-state';
      details.append(name, state);
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.action = 'open-campaign-stage';
      button.dataset.scenarioId = stage.scenarioId;
      button.setAttribute('data-testid', `campaign-stage-button-${index + 1}`);
      row.append(details, button);
      fragment.append(row);
    });
    campaignStageList.replaceChildren(fragment);
  }

  stages.forEach((stage, index) => {
    const row = campaignStageList.children[index] as HTMLLIElement | undefined;
    if (!row) return;
    const name = row.querySelector<HTMLElement>('[data-role="stage-name"]');
    const state = row.querySelector<HTMLElement>('[data-role="stage-state"]');
    const button = row.querySelector<HTMLButtonElement>('[data-action="open-campaign-stage"]');
    if (!name || !state || !button) return;
    const title = stage.title[language];
    if (name.textContent !== title) name.textContent = title;
    const stageStatus = stage.status === 'completed'
      ? copy.campaignStageCompleted
      : stage.status === 'available' ? copy.campaignStageAvailable : copy.campaignStageLocked;
    const statusText = stage.highScore === undefined
      ? stageStatus
      : `${stageStatus} · ${copy.campaignStageScore(stage.highScore)}`;
    if (state.textContent !== statusText) state.textContent = statusText;
    const buttonText = copy.openCampaignStage(title);
    if (button.textContent !== buttonText) button.textContent = buttonText;
    const disabled = campaignSelectionBusy || settingsSaveBusy || profileLoadFailed || replacingSession || replaying
      || stage.status === 'locked';
    if (button.disabled !== disabled) button.disabled = disabled;
  });

  const summaryText = campaignProgressView
    ? copy.campaignSummary(campaignProgressView.completedCount, campaignProgressView.stages.length)
    : profileLoadFailed ? copy.campaignLoadFailed : copy.campaignLoading;
  if (campaignProgressSummary.textContent !== summaryText) campaignProgressSummary.textContent = summaryText;
  const feedbackStage = campaignFeedback?.scenarioId
    ? campaignProgressView?.stages.find(({ scenarioId }) => scenarioId === campaignFeedback?.scenarioId)
    : undefined;
  const feedbackTitle = feedbackStage?.title[language] ?? campaignFeedback?.scenarioId ?? '';
  let feedbackText = '';
  switch (campaignFeedback?.type) {
    case 'loading': feedbackText = copy.campaignLoading; break;
    case 'load-failed': feedbackText = copy.campaignLoadFailed; break;
    case 'locked': feedbackText = copy.campaignLocked(feedbackTitle); break;
    case 'difficulty-locked': feedbackText = copy.campaignDifficultyLocked; break;
    case 'opening': feedbackText = copy.campaignOpening(feedbackTitle); break;
    case 'opened': feedbackText = copy.campaignOpened(feedbackTitle); break;
    case 'open-failed': feedbackText = copy.campaignOpenFailed; break;
  }
  if (campaignStatus.textContent !== feedbackText) campaignStatus.textContent = feedbackText;
}

function profileRecoveryMessage(language: keyof typeof languageMessages): string {
  const messages = languageMessages[language];
  switch (profileRecoveryStatusKey) {
    case 'backup-exported': return messages.backupExported;
    case 'export-failed': return messages.exportFailed;
    case 'reset-failed': return messages.resetFailed;
    case 'profile-reset': return messages.resetProfile;
    case 'profile-refreshed': return messages.profileRefreshed;
    default: return '';
  }
}

function settlementSaveMessage(language: keyof typeof languageMessages): string {
  const messages = languageMessages[language];
  switch (settlementSaveState) {
    case 'saving': return messages.settlementSaving;
    case 'saved': return messages.settlementSaved;
    case 'failed': return messages.settlementFailed;
    case 'conflict': return messages.settlementConflict;
    case 'debug': return messages.settlementDebug;
    case 'replay': return messages.settlementReplay;
    default: return '';
  }
}

function replayMessage(language: keyof typeof languageMessages): string {
  const messages = languageMessages[language];
  if (!replayStatusState) return '';
  if (replayStatusState.type === 'importing') return messages.replayImporting;
  if (replayStatusState.type === 'exported') return messages.replayExported;
  if (replayStatusState.type === 'error') return messages.replayErrors[replayStatusState.code];
  const outcome = replayStatusState.outcome === 'victory' ? messages.victory : messages.defeat;
  return messages.replayVerified(replayStatusState.checkpointCount, outcome);
}

function replayErrorCode(error: unknown): GameReplayErrorCode {
  return error instanceof GameReplayError ? error.code : 'corrupt-input';
}

let latestExperimentReport: ExperimentComparisonReport | undefined;
let latestExperimentPersisted = false;
let savedComparisonCursor: string | undefined;
let savedComparisonSummaries: import('./experiments/experiment-repository').SavedComparisonSummary[] = [];
let savedComparisonListBusy = false;

const experimentCopy = {
  en: {
    invalidReward: 'Enter a whole-number reward from $0 to $1,000,000,000.',
    comparing: (samples: number) => `Comparing ${samples} matched sample${samples === 1 ? '' : 's'}…`,
    failed: 'The comparison could not be completed. Check the selected values and try again.',
    summary: (report: ExperimentComparisonReport, incompleteRate: string) =>
      `${report.pairedCompletedSampleCount}/${report.plannedSampleCount} paired samples · ${report.completedRunCount}/${report.plannedRunCount} runs completed · ${incompleteRate} incomplete across all planned runs.`,
    schemeValues: (original: number, draft: number) => `Original reward $${original} · Draft reward $${draft}`,
    unavailable: '—',
    saved: 'Comparison saved in this browser.',
    opened: 'Saved comparison opened.',
    missing: 'That saved comparison is no longer available.',
    saveFailed: 'Could not save the comparison to browser storage.',
    openFailed: 'Could not open the saved comparison.',
    listFailed: 'Could not load saved comparisons from browser storage.',
    savedListFailed: 'Saved, but the comparison list could not be refreshed.',
    noSaved: 'No saved comparisons',
    savedOption: (id: string, date: string) => `${id} · ${date}`,
    loadMore: 'Load more',
  },
  zh: {
    invalidReward: '请输入 $0 到 $1,000,000,000 之间的整数奖励。',
    comparing: (samples: number) => `正在比较 ${samples} 组配对样本…`,
    failed: '比较未能完成。请检查参数后重试。',
    summary: (report: ExperimentComparisonReport, incompleteRate: string) =>
      `${report.pairedCompletedSampleCount}/${report.plannedSampleCount} 组配对样本 · ${report.completedRunCount}/${report.plannedRunCount} 场运行完成 · 全部计划运行未完成率 ${incompleteRate}。`,
    schemeValues: (original: number, draft: number) => `原版奖励 $${original} · 草稿奖励 $${draft}`,
    unavailable: '—',
    saved: '比较已保存到此浏览器。',
    opened: '已打开已保存的比较。',
    missing: '此比较已不存在。',
    saveFailed: '无法将比较保存到浏览器存储。',
    openFailed: '无法打开已保存的比较。',
    listFailed: '无法从浏览器存储读取已保存的比较。',
    savedListFailed: '比较已保存，但无法刷新列表。',
    noSaved: '没有已保存的比较',
    savedOption: (id: string, date: string) => `${id} · ${date}`,
    loadMore: '加载更多',
  },
};

type SavedComparisonStatusKey = 'saved' | 'opened' | 'missing' | 'saveFailed' | 'openFailed' | 'listFailed' | 'savedListFailed';
let savedComparisonStatusKey: SavedComparisonStatusKey | undefined;

function renderSavedComparisonStatus(): void {
  savedComparisonStatus.textContent = savedComparisonStatusKey
    ? experimentCopy[getLanguage()][savedComparisonStatusKey]
    : '';
}

function setSavedComparisonStatus(key?: SavedComparisonStatusKey): void {
  savedComparisonStatusKey = key;
  renderSavedComparisonStatus();
}

function renderSavedComparisonOptions(selectedId = savedComparisonSelect.value): void {
  const language = getLanguage();
  const copy = experimentCopy[language];
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = copy.noSaved;
  savedComparisonSelect.replaceChildren(placeholder);
  const dateFormat = new Intl.DateTimeFormat(language, { dateStyle: 'short', timeStyle: 'short' });
  for (const summary of savedComparisonSummaries) {
    const option = document.createElement('option');
    option.value = summary.id;
    option.textContent = copy.savedOption(summary.id, dateFormat.format(new Date(summary.savedAt)));
    savedComparisonSelect.append(option);
  }
  savedComparisonSelect.value = savedComparisonSummaries.some(({ id }) => id === selectedId) ? selectedId : '';
  openComparisonControl.disabled = savedComparisonSelect.value === '' || savedComparisonListBusy;
  loadMoreComparisonsControl.hidden = savedComparisonCursor === undefined;
  loadMoreComparisonsControl.disabled = savedComparisonCursor === undefined || savedComparisonListBusy;
}

async function loadSavedComparisons(options: { reset?: boolean; selectId?: string; reportFailure?: boolean } = {}): Promise<boolean> {
  if (savedComparisonListBusy) return false;
  let loaded = false;
  savedComparisonListBusy = true;
  renderSavedComparisonOptions();
  try {
    const page = await experiments.listComparisons({
      limit: 20,
      ...(!options.reset && savedComparisonCursor ? { cursor: savedComparisonCursor } : {}),
    });
    if (options.reset) savedComparisonSummaries = [];
    const existingIds = new Set(savedComparisonSummaries.map(({ id }) => id));
    savedComparisonSummaries.push(...page.items.filter(({ id }) => !existingIds.has(id)));
    savedComparisonCursor = page.nextCursor;
    loaded = true;
    if (options.reportFailure) setSavedComparisonStatus();
  } catch {
    if (options.reportFailure) setSavedComparisonStatus('listFailed');
  } finally {
    savedComparisonListBusy = false;
    renderSavedComparisonOptions(options.selectId);
  }
  return loaded;
}

function renderExperimentComparison(): void {
  if (!latestExperimentReport) return;
  const language = getLanguage();
  const copy = experimentCopy[language];
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 });
  const percent = (value: number | null) => value === null
    ? copy.unavailable
    : new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 1 }).format(value);
  const metric = (value: number | null) => value === null ? copy.unavailable : number.format(value);
  const money = (value: number | null, signed = false) => {
    if (value === null) return copy.unavailable;
    const formatted = number.format(Math.abs(value));
    const sign = signed ? (value > 0 ? '+' : value < 0 ? '−' : '') : (value < 0 ? '−' : '');
    return sign + '$' + formatted;
  };
  const time = (value: number | null) => value === null
    ? copy.unavailable
    : number.format(value / 1000) + (language === 'zh' ? ' 秒' : ' s');
  const set = (side: 'baseline' | 'candidate', name: string, value: string) => {
    const output = experimentReport.querySelector<HTMLElement>(`[data-testid="experiment-${side}-${name}"]`);
    if (output) output.textContent = value;
  };

  const report = latestExperimentReport;
  const summary = percent(report.incompleteRate);
  experimentReportSummary.textContent = copy.summary(report, summary);
  const originalReward = report.baseline.scheme.preparedSetup.parameters
    .find(({ path }) => path === 'previewWave/enemy/cashReward')?.value ?? 0;
  const draftReward = report.candidate.scheme.preparedSetup.parameters
    .find(({ path }) => path === 'previewWave/enemy/cashReward')?.value ?? 0;
  const schemeValues = experimentReport.querySelector<HTMLElement>('[data-testid="experiment-scheme-values"]');
  if (schemeValues) schemeValues.textContent = copy.schemeValues(originalReward, draftReward);
  for (const side of ['baseline', 'candidate'] as const) {
    const variant = report[side];
    const values = variant.summary;
    set(side, 'completed', `${values.completedSamples}/${values.plannedSamples}`);
    set(side, 'incomplete', `${values.incompleteSamples} (${percent(values.incompleteRate)})`);
    set(side, 'outcomes', `${values.victories} / ${values.defeats}`);
    set(side, 'win-rate', percent(values.winRate));
    set(side, 'lives', metric(values.averageLivesRemaining));
    set(side, 'time', time(values.averageVictoryTimeMs));
    set(side, 'cash', money(values.averageFinalCash));
    set(side, 'cash-delta', money(values.averageCashDelta, true));
    set(side, 'peak-enemies', metric(values.averagePeakEnemies));
    set(side, 'escaped', metric(values.averageEscapedEnemies));
  }
  experimentReport.hidden = false;
  saveComparisonControl.disabled = latestExperimentPersisted;
}

compareSchemesControl.addEventListener('click', async () => {
  const language = getLanguage();
  const copy = experimentCopy[language];
  const rewardInput = experimentCashRewardInput.value.trim();
  const reward = rewardInput === '' ? Number.NaN : Number(rewardInput);
  const sampleCount = Number(experimentSampleCountSelect.value);
  if (!Number.isSafeInteger(reward) || reward < 0 || reward > 1_000_000_000) {
    experimentStatus.textContent = copy.invalidReward;
    experimentCashRewardInput.focus();
    return;
  }
  if (![1, 3, 5].includes(sampleCount)) {
    experimentStatus.textContent = copy.failed;
    return;
  }

  compareSchemesControl.disabled = true;
  saveComparisonControl.disabled = true;
  experimentCashRewardInput.disabled = true;
  experimentSampleCountSelect.disabled = true;
  experimentStatus.textContent = copy.comparing(sampleCount);
  try {
    const baseline = await experiments.saveScheme({
      id: 'cow-gulch-original',
      version: '1',
      scenarioId: 'cow-gulch',
    });
    const comparisonToken = globalThis.crypto.randomUUID();
    const draftVersion = `draft-${comparisonToken}`;
    const draft = await experiments.saveScheme({
      id: 'cow-gulch-reward-draft',
      version: draftVersion,
      scenarioId: 'cow-gulch',
      overrides: [{ path: 'previewWave/enemy/cashReward', value: reward }],
    });
    const comparisonId = `cow-gulch-reward-comparison-${comparisonToken}`;
    latestExperimentReport = await experiments.compare({
      comparisonId,
      scenario: {
        id: 'cow-gulch-single-wave',
        version: '1',
        gameScenarioId: 'cow-gulch',
        contentVersion: baseline.contentVersion,
        rulesVersion: baseline.rulesVersion,
        observationLevel: 'player-visible',
        decisionIntervalFrames: 1,
        deltaMs: 100,
        maxFrames: 2_000,
        maxSimulatedMs: 200_000,
        maxEntities: 100,
        maxWallClockMs: 30_000,
        yieldEveryFrames: 40,
      },
      baseline: { id: baseline.id, version: baseline.version },
      candidate: { id: draft.id, version: draft.version },
      samples: Array.from({ length: sampleCount }, (_, index) => ({
        id: `seed-${42 + index}`,
        randomSeed: 42 + index,
      })),
      policy: { id: 'start-wave', version: '1' },
    });
    latestExperimentPersisted = false;
    renderExperimentComparison();
    experimentStatus.textContent = '';
  } catch {
    experimentStatus.textContent = copy.failed;
  } finally {
    compareSchemesControl.disabled = false;
    saveComparisonControl.disabled = !latestExperimentReport || latestExperimentPersisted;
    experimentCashRewardInput.disabled = false;
    experimentSampleCountSelect.disabled = false;
  }
});

savedComparisonSelect.addEventListener('change', () => {
  openComparisonControl.disabled = savedComparisonSelect.value === '' || savedComparisonListBusy;
});

saveComparisonControl.addEventListener('click', async () => {
  const report = latestExperimentReport;
  if (!report) return;
  saveComparisonControl.disabled = true;
  setSavedComparisonStatus();
  try {
    const saved = await experiments.saveComparison(report);
    const summary = {
      id: saved.id,
      savedAt: saved.savedAt,
      ...saved.summary,
      candidateScheme: { ...saved.summary.candidateScheme },
    };
    savedComparisonSummaries = [summary, ...savedComparisonSummaries.filter(({ id }) => id !== saved.id)];
    renderSavedComparisonOptions(saved.id);
    const refreshed = await loadSavedComparisons({ reset: true, selectId: saved.id });
    latestExperimentPersisted = true;
    renderExperimentComparison();
    setSavedComparisonStatus(refreshed ? 'saved' : 'savedListFailed');
  } catch {
    setSavedComparisonStatus('saveFailed');
  } finally {
    saveComparisonControl.disabled = !latestExperimentReport || latestExperimentPersisted;
  }
});

openComparisonControl.addEventListener('click', async () => {
  const id = savedComparisonSelect.value;
  if (!id) return;
  openComparisonControl.disabled = true;
  setSavedComparisonStatus();
  try {
    const saved = await experiments.openComparison(id);
    if (!saved) {
      setSavedComparisonStatus('missing');
      return;
    }
    latestExperimentReport = saved.report;
    latestExperimentPersisted = true;
    renderExperimentComparison();
    setSavedComparisonStatus('opened');
  } catch {
    setSavedComparisonStatus('openFailed');
  } finally {
    openComparisonControl.disabled = savedComparisonSelect.value === '' || savedComparisonListBusy;
  }
});

loadMoreComparisonsControl.addEventListener('click', () => {
  void loadSavedComparisons({ reportFailure: true });
});

void loadSavedComparisons({ reset: true, reportFailure: true });

async function applyFormalSettlement(record: GameSettlementRecord): Promise<void> {
  try {
    const result = await progress.applySettlement(record);
    profile = result.profile;
    if (result.status !== 'failed') {
      profileLoadFailed = false;
      profileLoadErrorCode = undefined;
    }
    settlementSaveState = result.status;
  } catch {
    settlementSaveState = 'failed';
    try {
      profile = await progress.loadProfile();
      profileLoadFailed = false;
      profileLoadErrorCode = undefined;
    } catch {
      profileLoadFailed = true;
    }
  }
  try {
    campaignProgressView = await progress.loadCampaign();
    profile = campaignProgressView.profile;
    applyProfileSettings(profile.settings);
    profileLoadFailed = false;
    profileLoadErrorCode = undefined;
    campaignFeedback = undefined;
  } catch {
    campaignProgressView = undefined;
    campaignFeedback = { type: 'load-failed' };
  }
  renderStatus();
}

async function retryFormalSettlement(): Promise<void> {
  const settlementId = activeSettlementRecord?.settlementId;
  if (!settlementId || (settlementSaveState !== 'failed' && settlementSaveState !== 'conflict')) return;
  settlementSaveState = 'saving';
  renderStatus();
  try {
    const result = await progress.retrySettlement(settlementId);
    profile = result.profile;
    if (result.status !== 'failed') {
      profileLoadFailed = false;
      profileLoadErrorCode = undefined;
    }
    settlementSaveState = result.status;
  } catch {
    settlementSaveState = 'failed';
  }
  try {
    campaignProgressView = await progress.loadCampaign();
    profile = campaignProgressView.profile;
    applyProfileSettings(profile.settings);
    profileLoadFailed = false;
    profileLoadErrorCode = undefined;
    campaignFeedback = undefined;
  } catch {
    campaignProgressView = undefined;
    campaignFeedback = { type: 'load-failed' };
  }
  renderStatus();
}

function renderStatus(events: readonly GameEvent[] = view.events): void {
  const language = getLanguage();
  const unit = view.units.find((candidate) => candidate.selected);
  const messages = languageMessages[language];
  renderCampaign();
  const actionLocked = replaying || replacingSession;
  sceneOpenErrorPanel.hidden = sceneOpenFailure === undefined;
  retrySceneOpenControl.textContent = messages.retrySceneOpen;
  retrySceneOpenControl.disabled = actionLocked;
  returnPreviousSceneControl.textContent = messages.returnPreviousScene;
  returnPreviousSceneControl.disabled = actionLocked;
  if (sceneOpenFailure) {
    sceneOpenErrorMessage.textContent = messages.sceneOpenErrors[sceneOpenFailure.code];
  }
  const profileText = profileMessage(language);
  if (profileStatus.textContent !== profileText) profileStatus.textContent = profileText;
  const profileRecoveryText = profileRecoveryMessage(language);
  if (profileRecoveryStatus.textContent !== profileRecoveryText) profileRecoveryStatus.textContent = profileRecoveryText;
  exportCorruptProfileButton.hidden = !profileLoadFailed
    || (profileLoadErrorCode !== 'corrupt-data' && profileLoadErrorCode !== 'unsupported-version');
  exportCorruptProfileButton.textContent = messages.exportProfile;
  resetCorruptProfileButton.hidden = profileLoadErrorCode !== 'corrupt-data' || !corruptProfileBackup;
  resetCorruptProfileButton.textContent = messages.replaceProfile;
  replayStatus.textContent = replayMessage(language);
  sceneDifficulty.textContent = messages.sceneDifficulty(session.startRecord.difficulty ?? 'easy');
  exportReplayControl.disabled = replaying || replacingSession || !view.wave?.settlement
    || session.startRecord.mode === 'replay';
  importReplayControl.disabled = replaying || replacingSession;
  const defeatEvent = events.find((event) => event.type === 'enemy-defeated');
  if (defeatEvent?.type === 'enemy-defeated') lastDefeatReward = defeatEvent.cashReward;
  const recruitmentEvent = [...events].reverse().find((event) =>
    event.type === 'unit-recruited' || event.type === 'unit-recruitment-rejected');
  if (recruitmentEvent?.type === 'unit-recruited' || recruitmentEvent?.type === 'unit-recruitment-rejected') {
    lastRecruitmentEvent = recruitmentEvent;
  }
  const mapHireEvent = [...events].reverse().find((event) =>
    event.type === 'map-unit-hired' || event.type === 'map-unit-hire-rejected');
  if (mapHireEvent?.type === 'map-unit-hired' || mapHireEvent?.type === 'map-unit-hire-rejected') {
    lastMapHireEvent = mapHireEvent;
  }
  const upgradeEvent = [...events].reverse().find((event) =>
    event.type === 'unit-upgraded' || event.type === 'unit-upgrade-rejected');
  if (upgradeEvent?.type === 'unit-upgraded' || upgradeEvent?.type === 'unit-upgrade-rejected') {
    lastUpgradeEvent = upgradeEvent;
  }
  const selectionText = unit
    ? (unit.activity === 4
      ? messages.selectedSleeping(messages.unitName(unit.type))
      : messages.selected(messages.unitName(unit.type)))
      + ' · Cell (' + (unit.cell.x + 1) + ', ' + (unit.cell.y + 1) + ')'
    : messages.none;
  if (status.textContent !== selectionText) status.textContent = selectionText;
  simulationSpeedValue.textContent = simulationSpeed + '×';
  const pauseMessage = view.paused
    ? pauseReason === 'background' ? messages.battlePausedInBackground : messages.battlePaused
    : '';
  pauseStatus.textContent = pauseMessage;
  pauseStatus.hidden = !view.paused;
  pauseControl.textContent = view.paused ? messages.resumeBattle : messages.pauseBattle;
  pauseControl.disabled = actionLocked || (!view.paused
    && view.wave?.phase !== 'active'
    && !view.units.some((candidate) => candidate.moving));
  singleStepControl.textContent = messages.singleStep;
  singleStepControl.disabled = actionLocked || !view.paused || view.wave?.settlement !== undefined;
  inspectionOverlayInput.checked = showInspectionOverlay;
  inspectionFrame.textContent = messages.inspectionFrame(view.frame, view.elapsedMs);
  inspectionUnits.textContent = messages.inspectionUnits(view.units.length === 0
    ? messages.noUnits
    : view.units.map((unit) => {
      const x = (unit.positionFine.x / 7680).toFixed(2);
      const y = (unit.positionFine.y / 7680).toFixed(2);
      const range = unit.attackRange
        ? messages.unitRange(
          (unit.attackRange.maximumTenthTiles / 10).toFixed(1),
          unit.attackRange.boundary === 'exclusive' ? '<' : '≤',
        )
        : '';
      return `${unit.id} ${messages.position(x, y)}${range}`;
    }).join(' · '));
  inspectionEnemies.textContent = messages.inspectionEnemies(view.enemies.length === 0
    ? messages.noEnemies
    : view.enemies.map((enemy) => {
      const x = (enemy.positionFine.x / 7680).toFixed(2);
      const y = (enemy.positionFine.y / 7680).toFixed(2);
      return `${enemy.id} ${messages.position(x, y)}${messages.enemyHealth(enemy.hitPoints, enemy.maxHitPoints)}`;
    }).join(' · '));
  inspectionRoute.textContent = messages.inspectionRoute(view.route?.length
    ? view.route.map((point) => `(${point.x.toFixed(1)}, ${point.y.toFixed(1)})`).join(' → ')
    : messages.noRoute);
  const settingsText = settingsStatusKey ? messages[settingsStatusKey] : '';
  if (settingsStatus.textContent !== settingsText) settingsStatus.textContent = settingsText;
  simulationSpeedInput.disabled = !campaignProgressView && !profileLoadFailed;
  retrySettingsButton.hidden = settingsStatusKey !== 'save-failed' || profileLoadFailed;
  retrySettingsButton.textContent = messages.retrySettings;
  reloadProfileButton.hidden = settingsStatusKey !== 'conflict';
  reloadProfileButton.textContent = messages.reloadProfile;
  if (view.wave) {
    const wave = view.wave;
    const waveText = wave.phase === 'not-started'
      ? messages.waiting(wave.lives, wave.number, wave.cash, wave.totalWaves)
      : wave.phase === 'active'
        ? messages.active(wave.lives, wave.number, wave.activeEnemies, wave.cash, wave.totalWaves)
        : messages.complete(wave.lives, wave.number, wave.escapedEnemies, wave.defeatedEnemies, wave.cash, wave.totalWaves);
    const campaignExhausted = wave.phase === 'complete' && wave.totalWaves !== undefined && !wave.settlement;
    const displayedWaveText = campaignExhausted
      ? `${waveText} · ${messages.campaignWavesUnavailable(wave.number + 1, wave.totalWaves!)}`
      : waveText;
    if (waveStatus.textContent !== displayedWaveText) waveStatus.textContent = displayedWaveText;
    startWaveControl.textContent = campaignExhausted
      ? messages.campaignWavesUnavailable(wave.number + 1, wave.totalWaves!)
      : wave.totalWaves
        ? messages.startCampaignWave(wave.number, wave.totalWaves)
        : messages.startSample;
  }
  const combatText = lastDefeatReward === undefined ? '' : messages.defeated(lastDefeatReward);
  if (combatStatus.textContent !== combatText) combatStatus.textContent = combatText;
  const poolEntries = view.recruitPool.filter((entry) => entry.count > 0);
  const poolText = poolEntries.length === 0
    ? messages.recruitPoolEmpty
    : messages.recruitPool(poolEntries.map((entry) => `${entry.name[language]} ×${entry.count}`).join(' · '));
  if (recruitPoolStatus.textContent !== poolText) recruitPoolStatus.textContent = poolText;
  const recruitDefinition = view.recruitPool[0];
  let recruitText = '';
  if (lastRecruitmentEvent?.type === 'unit-recruited') {
    recruitText = messages.recruited(
      recruitDefinition?.name[language] ?? lastRecruitmentEvent.unitType,
      lastRecruitmentEvent.price,
    );
  } else if (lastRecruitmentEvent?.type === 'unit-recruitment-rejected') {
    recruitText = messages.insufficientCash(
      recruitDefinition?.name[language] ?? lastRecruitmentEvent.unitType,
      lastRecruitmentEvent.price,
      lastRecruitmentEvent.availableCash,
    );
  }
  if (recruitStatus.textContent !== recruitText) recruitStatus.textContent = recruitText;
  const selectedSleepingMapUnit = unit?.activity === 4 && unit.hirePrice !== undefined ? unit : undefined;
  mapHireControl.hidden = !selectedSleepingMapUnit;
  if (selectedSleepingMapUnit) {
    mapHireControl.textContent = messages.mapHireButton(
      messages.unitName(selectedSleepingMapUnit.type),
      selectedSleepingMapUnit.hirePrice!,
    );
    mapHireControl.disabled = actionLocked || view.paused || Boolean(view.wave?.settlement)
      || (view.wave?.cash ?? 0) < selectedSleepingMapUnit.hirePrice!;
  }
  const mapHireText = lastMapHireEvent?.type === 'map-unit-hired'
    ? messages.mapHired(messages.unitName(lastMapHireEvent.unitType), lastMapHireEvent.price)
    : lastMapHireEvent?.type === 'map-unit-hire-rejected'
      ? messages.mapHireRejected(
        messages.unitName(lastMapHireEvent.unitType),
        lastMapHireEvent.price,
        lastMapHireEvent.availableCash,
      )
      : '';
  if (mapHireStatus.textContent !== mapHireText) mapHireStatus.textContent = mapHireText;
  if (recruitDefinition) {
    const recruitLabel = messages.recruitButton(recruitDefinition.name[language], recruitDefinition.price);
    if (recruitControl.textContent !== recruitLabel) recruitControl.textContent = recruitLabel;
  }
  const upgradeScenario = view.scenarioId === 'cow-gulch-upgrade-sample';
  const originalWaveScenario = view.scenarioId === cowGulchP1cCampaignContent.id
    || view.scenarioId === cowGulchP1dCampaignContent.id;
  const originalWaveContent = view.scenarioId === cowGulchP1dCampaignContent.id
    ? cowGulchP1dCampaignContent
    : cowGulchP1cCampaignContent;
  const originalWaveNotice = originalWaveContent.id === cowGulchP1dCampaignContent.id
    ? messages.originalCampaignNotice
    : messages.originalWaveNotice;
  const activeCampaignStage = campaignProgressView?.stages.find(({ scenarioId }) => scenarioId === view.scenarioId);
  sceneTitle.textContent = upgradeScenario
    ? messages.upgradeSceneTitle
    : originalWaveScenario
      ? originalWaveContent.title[language]
    : activeCampaignStage?.title[language] ?? 'Cow Gulch';
  sceneContext.textContent = upgradeScenario
    ? messages.upgradeSceneContext
    : originalWaveScenario
      ? messages.originalWaveContext
    : activeCampaignStage ? language === 'zh' ? '进度验收样本' : 'PROGRESS SAMPLE' : 'NEW MEXICO · 01';
  upgradeSampleStatus.textContent = upgradeScenario
    ? messages.debugUpgradeFixture
    : originalWaveScenario ? originalWaveNotice : messages.originalUpgradeLimit;
  const selectedUnit = unit;
  const nextUpgrade = selectedUnit?.nextUpgrade;
  let upgradeText = '';
  if (lastUpgradeEvent?.type === 'unit-upgraded') {
    const unitName = language === 'zh' ? '枪手' : 'Gunslinger';
    upgradeText = messages.upgraded(unitName, lastUpgradeEvent.level, lastUpgradeEvent.price);
  } else if (lastUpgradeEvent?.type === 'unit-upgrade-rejected') {
    upgradeText = lastUpgradeEvent.reason === 'insufficient-funds'
      ? messages.insufficientUpgradeCash(lastUpgradeEvent.price, lastUpgradeEvent.availableCash)
      : messages.upgradeLimitReached;
  } else if (selectedUnit && nextUpgrade && selectedUnit.weapon) {
    upgradeText = messages.upgradeSummary(
      selectedUnit.upgradeLevel,
      selectedUnit.movementSpeedFinePer100Ms,
      nextUpgrade.movementSpeedFinePer100Ms,
      selectedUnit.weapon.reloadTimeMs,
      nextUpgrade.weapon.reloadTimeMs,
    );
  } else if (selectedUnit) {
    upgradeText = messages.noUpgradeAvailable;
  }
  if (upgradeStatus.textContent !== upgradeText) upgradeStatus.textContent = upgradeText;
  if (nextUpgrade) {
    upgradeControl.textContent = messages.upgradeButton(nextUpgrade.price);
  } else {
    upgradeControl.textContent = messages.upgradeButton(0);
  }
  confirmRecruitControl.textContent = messages.confirmRecruitButton;
  cancelRecruitControl.textContent = messages.cancelRecruitButton;
  confirmUpgradeControl.textContent = messages.confirmUpgradeButton;
  cancelUpgradeControl.textContent = messages.cancelUpgradeButton;
  if (pendingRecruitmentType) {
    const pendingRecruit = view.recruitPool.find((entry) => entry.unitType === pendingRecruitmentType);
    if (pendingRecruit) recruitConfirmationTitle.textContent = messages.confirmRecruit(
      pendingRecruit.name[language], pendingRecruit.price,
    );
  }
  if (pendingUpgradeUnitId) renderUpgradeConfirmation(language);
  const settlement = view.wave?.settlement;
  const newSettlement = Boolean(settlement) && settlementPanel.hidden;
  settlementPanel.hidden = !settlement;
  if (settlement && recruitConfirmation.open) {
    pendingRecruitmentType = undefined;
    recruitConfirmation.close();
  }
  if (settlement && upgradeConfirmation.open) {
    pendingUpgradeUnitId = undefined;
    upgradeConfirmation.close();
    confirmUpgradeControl.hidden = false;
  }
  if (settlement && view.wave) {
    if (newSettlement) {
      activeSettlementRecord = session.terminalRecord();
      settlementSaveState = activeSettlementRecord?.mode === 'formal'
        ? 'saving'
        : activeSettlementRecord?.mode === 'replay' ? 'replay' : 'debug';
    }
    settlementTitle.textContent = messages.result;
    settlementOutcome.textContent = messages[settlement.outcome];
    settlementSummary.textContent = messages.settlementSummary(
      view.wave.number,
      view.wave.lives,
      view.wave.escapedEnemies,
      view.wave.defeatedEnemies,
      view.wave.cash,
    );
    settlementScore.textContent = messages.displayScore(settlement.displayScore);
    const savedHighScore = profile.highScores[view.scenarioId];
    settlementHighScore.textContent = settlementSaveState === 'saved' && savedHighScore !== undefined
      ? messages.scoreSaved(savedHighScore)
      : messages.scoreCandidate(settlement.highScoreCandidate);
    const saveMessage = settlementSaveMessage(language);
    if (settlementSaveStatus.textContent !== saveMessage) settlementSaveStatus.textContent = saveMessage;
    retrySettlementControl.hidden = settlementSaveState !== 'failed' && settlementSaveState !== 'conflict';
    retrySettlementControl.textContent = messages.retrySave;
    if (newSettlement) restartControl.focus();
    if (newSettlement && activeSettlementRecord?.mode === 'formal') {
      void applyFormalSettlement(activeSettlementRecord);
    }
  } else {
    settlementSaveStatus.textContent = '';
    retrySettlementControl.hidden = true;
  }
  const waveNotStarted = view.wave?.phase === 'not-started';
  const campaignExhausted = view.wave?.phase === 'complete' && view.wave.totalWaves !== undefined && !view.wave.settlement;
  startWaveControl.hidden = Boolean(view.wave?.totalWaves && !campaignExhausted);
  startWaveControl.disabled = actionLocked || !waveNotStarted || view.paused;
  recruitControl.disabled = actionLocked || Boolean(settlement) || !recruitDefinition || view.paused;
  upgradeControl.hidden = !nextUpgrade;
  upgradeControl.disabled = actionLocked || Boolean(settlement) || !nextUpgrade || view.paused;
  startUpgradeSampleControl.hidden = upgradeScenario || originalWaveScenario;
  openOriginalWavesControl.hidden = upgradeScenario || originalWaveScenario;
  openOriginalWavesControl.textContent = messages.openOriginalWaves;
  returnCowGulchControl.hidden = !upgradeScenario && !originalWaveScenario;
  returnCowGulchControl.textContent = messages.returnCowGulchSample;
  startDefeatControl.disabled = actionLocked || !waveNotStarted || view.scenarioId !== 'cow-gulch' || view.paused;
  clearSelectionControl.disabled = actionLocked || Boolean(settlement) || view.paused;
  const canvasLabel = upgradeScenario
    ? language === 'zh' ? '牛溪谷升级规则测试地图' : 'Cow Gulch upgrade rules test map'
    : activeCampaignStage
      ? language === 'zh' ? `${activeCampaignStage.title[language]}游戏地图` : `${activeCampaignStage.title[language]} game map`
      : language === 'zh' ? '牛溪谷游戏地图' : 'Cow Gulch game map';
  if (canvas.getAttribute('aria-label') !== canvasLabel) canvas.setAttribute('aria-label', canvasLabel);
}

function renderUpgradeConfirmation(language: keyof typeof languageMessages): void {
  const unit = view.units.find((candidate) => candidate.id === pendingUpgradeUnitId);
  const nextUpgrade = unit?.nextUpgrade;
  const cash = view.wave?.cash;
  if (!unit || !nextUpgrade || !unit.weapon || cash === undefined) {
    pendingUpgradeUnitId = undefined;
    if (upgradeConfirmation.open) upgradeConfirmation.close();
    confirmUpgradeControl.hidden = false;
    return;
  }

  const messages = languageMessages[language];
  const unitName = language === 'zh' ? '枪手' : 'Gunslinger';
  upgradeConfirmationTitle.textContent = messages.confirmUpgrade(unitName, nextUpgrade.price);
  const details = messages.upgradeDetails(
    unit.upgradeLevel,
    unit.movementSpeedFinePer100Ms,
    nextUpgrade.movementSpeedFinePer100Ms,
    unit.weapon.damage,
    nextUpgrade.weapon.damage,
    unit.weapon.rangeFine,
    nextUpgrade.weapon.rangeFine,
    unit.weapon.reloadTimeMs,
    nextUpgrade.weapon.reloadTimeMs,
    unit.weapon.specialReloadTimeMs ?? 0,
    nextUpgrade.weapon.specialReloadTimeMs ?? 0,
    nextUpgrade.price,
    cash,
  );
  const affordable = cash >= nextUpgrade.price;
  upgradeConfirmationDetails.textContent = affordable
    ? details
    : `${details} · ${messages.insufficientUpgradeCash(nextUpgrade.price, cash)}`;
  confirmUpgradeControl.hidden = !affordable;
  confirmUpgradeControl.disabled = !affordable;
}

function redraw(resize = false): void {
  const displayPixelScale = getDisplayPixelScale();
  if (resize || !context) context = resizeCanvas(canvas, displayPixelScale);
  drawGame(context, view, images, displayPixelScale, mapCamera, showInspectionOverlay, getLanguage());
}

function getDisplayPixelScale(): number {
  const cssWidth = canvas.getBoundingClientRect().width;
  const cssScale = cssWidth > 0 ? cssWidth / GAME_VIEWPORT.width : 1;
  return cssScale * Math.max(1, window.devicePixelRatio || 1);
}

const assetNames = new Set([
  ...view.map.background.map((tile) => tile.asset),
  ...view.map.streets.map((tile) => tile.asset),
  ...view.units.map((unit) => unit.asset),
  ...(view.units.some((unit) => unit.activity === 4) ? ['sfx_sleeping'] : []),
  'pioneer_male',
  'pioneer_female',
  'wagon',
  'wagon_turn',
  'horse_wagon',
  'horse_wagon_white',
  'horse_wagon_turn',
  'horse_wagon_turn_white',
  'sfx_smoke_explosion',
  'sfx_exploding_parts',
  'player_gunslinger_shot',
  'player_mexican',
  'player_mexican_shot',
  'sfx_mexican_dynamite',
  'sfx_explosion',
]);
const images: Record<string, HTMLImageElement> = {};

async function loadSettings(): Promise<void> {
  try {
    campaignProgressView = await progress.loadCampaign();
    profile = campaignProgressView.profile;
    applyProfileSettings(profile.settings);
    campaignFeedback = undefined;
    profileLoadFailed = false;
    profileLoadErrorCode = undefined;
  } catch (error) {
    settingsStatusKey = 'load-failed';
    profileLoadFailed = true;
    profileLoadErrorCode = error instanceof ProgressError ? error.code : undefined;
    campaignProgressView = undefined;
    campaignFeedback = { type: 'load-failed' };
  } finally {
    simulationSpeedInput.disabled = false;
    renderStatus();
  }
}

async function loadImage(assetName: string): Promise<void> {
  const image = new Image();
  image.src = new URL(import.meta.env.BASE_URL + 'assets/' + assetName + '.png', window.location.href).toString();
  await image.decode();
  images[assetName] = image;
}

try {
  await Promise.all([...assetNames].map(loadImage).concat(loadSettings()));
  redraw(true);
  renderStatus();
} catch (error) {
  status.textContent = languageMessages[getLanguage()].failed;
  throw error;
}

const frame = app.querySelector<HTMLElement>('.game-frame');
if (frame && typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(() => redraw(true)).observe(frame);
}
window.addEventListener('resize', () => redraw(true));

let animationFrame = 0;
let previousTimestamp: number | undefined;
let loopGeneration = 0;
type PointerPoint = { x: number; y: number };
type TrackedPointer = { pointerType: string; point: PointerPoint };
type PinchGesture = {
  pointerIds: [number, number];
  startDistance: number;
  startZoom: number;
  mapAnchor: PointerPoint;
};

let activePointerId: number | undefined;
let activePointerOrigin: PointerPoint | undefined;
let activeDragUnitId: string | undefined;
let dragStarted = false;
let pointerMovedBeyondTolerance = false;
let multiTouchGestureLocked = false;
let pinchGesture: PinchGesture | undefined;
const trackedPointers = new Map<number, TrackedPointer>();
const DRAG_START_TOLERANCE = 20;

function stopGameLoop(): void {
  loopGeneration += 1;
  if (animationFrame !== 0) window.cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  previousTimestamp = undefined;
  simulationTime.reset();
}

const audioElements = new Map<string, HTMLAudioElement>();

function playRequestedSounds(events: readonly GameEvent[]): void {
  if ('soundEnabled' in profile.settings && profile.settings.soundEnabled === false) return;
  for (const event of events) {
    if (event.type !== 'sound-requested') continue;
    let audio = audioElements.get(event.sound);
    if (!audio) {
      audio = new Audio(new URL(
        import.meta.env.BASE_URL + 'assets/sounds/' + event.sound + '.ogg',
        window.location.href,
      ).toString());
      audioElements.set(event.sound, audio);
    }
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }
}

function activateSession(
  nextSession: GameSession,
  nextReplayStatus?: ReplayStatusState,
  nextRestartMode?: Exclude<GameMode, 'replay'>,
): void {
  stopGameLoop();
  const previousSession = session;
  session = nextSession;
  view = session.observe();
  pauseReason = undefined;
  mapCamera = createMapCamera();
  previousSession.close();
  lastDefeatReward = undefined;
  lastRecruitmentEvent = undefined;
  lastMapHireEvent = undefined;
  pendingRecruitmentType = undefined;
  recruitmentCommandNumber = 0;
  lastUpgradeEvent = undefined;
  pendingUpgradeUnitId = undefined;
  upgradeCommandNumber = 0;
  if (recruitConfirmation.open) recruitConfirmation.close();
  if (upgradeConfirmation.open) upgradeConfirmation.close();
  confirmUpgradeControl.hidden = false;
  activeSettlementRecord = undefined;
  settlementSaveState = undefined;
  settlementPanel.hidden = true;
  replayStatusState = nextReplayStatus;
  restartModeOverride = nextRestartMode;
  renderStatus();
  redraw();
}

async function replaceSession(request: SessionOpenRequest): Promise<boolean> {
  if (replaying || replacingSession) return false;
  replacingSession = true;
  const resumePreviousSession = !view.paused && !document.hidden
    && (view.wave?.phase === 'active' || view.units.some((unit) => unit.moving));
  stopGameLoop();
  try {
    const nextSession = await game.open(request);
    sceneOpenFailure = undefined;
    activateSession(nextSession);
    return true;
  } catch (error) {
    sceneOpenFailure = {
      request,
      code: error instanceof GameOpenError ? error.code : 'unknown',
    };
    return false;
  } finally {
    replacingSession = false;
    renderStatus();
    if (!view.paused && (view.wave?.phase === 'active' || view.units.some((unit) => unit.moving))) startGameLoop();
  }
}

async function openCampaignStage(scenarioId: string): Promise<void> {
  if (campaignSelectionBusy || settingsSaveBusy) return;
  const requestedDifficulty = selectedDifficulty;
  campaignSelectionBusy = true;
  campaignFeedback = { type: 'loading' };
  renderCampaign();
  try {
    campaignProgressView = await progress.loadCampaign();
    profile = campaignProgressView.profile;
    profileLoadFailed = false;
    profileLoadErrorCode = undefined;
    const stage = campaignProgressView.stages.find((candidate) => candidate.scenarioId === scenarioId);
    if (!stage) {
      campaignFeedback = { type: 'load-failed' };
      return;
    }
    if (stage.status === 'locked') {
      campaignFeedback = { type: 'locked', scenarioId };
      return;
    }
    if (requestedDifficulty === 'hard' && !campaignProgressView.hardModeUnlocked) {
      selectedDifficulty = profile.settings.difficulty === 'hard' ? 'easy' : profile.settings.difficulty;
      campaignDifficultySelect.value = selectedDifficulty;
      campaignFeedback = { type: 'difficulty-locked' };
      return;
    }
    campaignFeedback = { type: 'opening', scenarioId };
    renderCampaign();
    const opened = await replaceSession({
      scenarioId: stage.scenarioId,
      contentVersion: stage.contentVersion,
      randomSeed: session.startRecord.randomSeed,
      difficulty: requestedDifficulty,
      mode: 'formal',
    });
    campaignFeedback = { type: opened ? 'opened' : 'open-failed', scenarioId };
  } catch {
    campaignProgressView = undefined;
    campaignFeedback = { type: 'load-failed' };
  } finally {
    campaignSelectionBusy = false;
    renderStatus();
  }
}

function requestScenarioOpen(
  scenarioId: string,
  mode: GameMode,
  difficulty: GameDifficulty = mode === 'formal' ? selectedDifficulty : 'easy',
): SessionOpenRequest {
  return {
    scenarioId,
    contentVersion: getBrowserScenarioContentVersion(scenarioId),
    randomSeed: session.startRecord.randomSeed,
    difficulty,
    mode,
  };
}

async function exportCurrentReplay(): Promise<void> {
  if (replaying || replacingSession || exportReplayControl.disabled) return;
  const sourceSession = session;
  replaying = true;
  renderStatus();
  try {
    const serialized = await sourceSession.exportReplay();
    if (sourceSession !== session) return;
    const url = URL.createObjectURL(new Blob([serialized], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sourceSession.startRecord.scenarioId}.replay.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    replayStatusState = { type: 'exported' };
  } catch (error) {
    replayStatusState = { type: 'error', code: replayErrorCode(error) };
  } finally {
    replaying = false;
    renderStatus();
  }
}

async function importReplayFile(file: File | undefined): Promise<void> {
  if (!file || replaying || replacingSession) return;
  replaying = true;
  replayStatusState = { type: 'importing' };
  renderStatus();
  try {
    if (file.size > 10_000_000) {
      throw new GameReplayError('corrupt-input', 'Replay file is too large');
    }
    const result: GameReplayResult = await game.replay(await file.text());
    if (result.sourceStartRecord.mode === 'replay') {
      result.session.close();
      throw new GameReplayError('unsupported-mode', 'A replay cannot be used as the source battle');
    }
    const settlement = result.session.observe().wave?.settlement;
    if (!settlement) {
      result.session.close();
      throw new GameReplayError('incomplete-recording', 'Replay did not reach a terminal result');
    }
    replacingSession = true;
    activateSession(
      result.session,
      {
        type: 'verified',
        checkpointCount: result.verifiedCheckpointFrames.length,
        outcome: settlement.outcome,
      },
      result.sourceStartRecord.mode,
    );
  } catch (error) {
    replayStatusState = { type: 'error', code: replayErrorCode(error) };
  } finally {
    importReplayControl.value = '';
    replacingSession = false;
    replaying = false;
    renderStatus();
  }
}

function saveSettings(settings: ProfileView['settings'], onFailure?: () => void): void {
  const sequence = ++settingsSaveSequence;
  settingsSaveBusy = true;
  settingsStatusKey = undefined;
  renderStatus();
  void progress.saveSettings(settings).then((saved) => {
    if (sequence !== settingsSaveSequence) return;
    settingsSaveBusy = false;
    updateProfileSettings(saved);
    settingsStatusKey = 'saved';
    renderStatus();
  }).catch((error: unknown) => {
    if (sequence !== settingsSaveSequence) return;
    settingsSaveBusy = false;
    onFailure?.();
    settingsStatusKey = error instanceof ProgressError && error.code === 'conflict' ? 'conflict' : 'save-failed';
    renderStatus();
  });
}

simulationSpeedInput.addEventListener('input', () => {
  settingsSaveSequence += 1;
  simulationSpeed = normalizeSimulationSpeed(Number(simulationSpeedInput.value));
  simulationSpeedInput.value = String(simulationSpeed);
  settingsStatusKey = undefined;
  renderStatus();
});

simulationSpeedInput.addEventListener('change', () => {
  const requestedSpeed = normalizeSimulationSpeed(Number(simulationSpeedInput.value));
  simulationSpeed = requestedSpeed;
  saveSettings({ simulationSpeed: requestedSpeed, difficulty: selectedDifficulty });
});

campaignDifficultySelect.addEventListener('change', () => {
  const requestedDifficulty = campaignDifficultySelect.value;
  if (!isGameDifficulty(requestedDifficulty)) {
    campaignDifficultySelect.value = selectedDifficulty;
    return;
  }
  if (requestedDifficulty === 'hard' && !campaignProgressView?.hardModeUnlocked) {
    campaignDifficultySelect.value = selectedDifficulty;
    campaignFeedback = { type: 'difficulty-locked' };
    renderStatus();
    return;
  }
  selectedDifficulty = requestedDifficulty;
  campaignFeedback = undefined;
  saveSettings(
    { simulationSpeed, difficulty: selectedDifficulty },
  );
  if (session.startRecord.mode === 'formal'
    && view.frame === 0
    && view.wave?.phase === 'not-started'
    && session.startRecord.difficulty !== requestedDifficulty) {
    void replaceSession(requestScenarioOpen(session.startRecord.scenarioId, 'formal', requestedDifficulty));
  }
});

retrySettingsButton.addEventListener('click', () => {
  const sequence = ++settingsSaveSequence;
  settingsSaveBusy = true;
  renderStatus();
  void progress.retrySettings().then((saved) => {
    if (sequence !== settingsSaveSequence) return;
    settingsSaveBusy = false;
    updateProfileSettings(saved);
    applyProfileSettings(saved);
    settingsStatusKey = 'saved';
    renderStatus();
  }).catch((error: unknown) => {
    if (sequence !== settingsSaveSequence) return;
    settingsSaveBusy = false;
    settingsStatusKey = error instanceof ProgressError && error.code === 'conflict' ? 'conflict' : 'save-failed';
    renderStatus();
  });
});

reloadProfileButton.addEventListener('click', () => {
  const sequence = ++settingsSaveSequence;
  settingsSaveBusy = true;
  renderStatus();
  void progress.loadProfile().then(async () => {
    const loaded = await progress.loadCampaign();
    if (sequence !== settingsSaveSequence) return;
    campaignProgressView = loaded;
    campaignFeedback = undefined;
    profile = loaded.profile;
    profileLoadFailed = false;
    profileLoadErrorCode = undefined;
    corruptProfileBackup = undefined;
    profileRecoveryStatusKey = undefined;
    applyProfileSettings(profile.settings);
    settingsSaveBusy = false;
    settingsStatusKey = 'saved';
    renderStatus();
  }).catch((error: unknown) => {
    if (sequence !== settingsSaveSequence) return;
    settingsSaveBusy = false;
    profileLoadFailed = true;
    profileLoadErrorCode = error instanceof ProgressError ? error.code : undefined;
    settingsStatusKey = 'load-failed';
    renderStatus();
  });
});

exportCorruptProfileButton.addEventListener('click', () => {
  void progress.exportSavedProfile().then((backup) => {
    if (!backup) {
      corruptProfileBackup = undefined;
      profileRecoveryStatusKey = 'export-failed';
      renderStatus();
      return;
    }
    corruptProfileBackup = backup;
    const blob = new Blob([backup], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gunsnglory-profile-backup.json';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    profileRecoveryStatusKey = 'backup-exported';
    renderStatus();
  }).catch(() => {
    corruptProfileBackup = undefined;
    profileRecoveryStatusKey = 'export-failed';
    renderStatus();
  });
});

resetCorruptProfileButton.addEventListener('click', () => {
  const backup = corruptProfileBackup;
  if (!backup || !window.confirm(languageMessages[getLanguage()].confirmResetProfile)) return;
  void progress.resetCorruptProfile(backup).then(async (restored) => {
    profile = restored;
    try {
      campaignProgressView = await progress.loadCampaign();
      profile = campaignProgressView.profile;
      campaignFeedback = undefined;
    } catch {
      campaignProgressView = undefined;
      campaignFeedback = { type: 'load-failed' };
    }
    profileLoadFailed = false;
    profileLoadErrorCode = undefined;
    corruptProfileBackup = undefined;
    profileRecoveryStatusKey = 'profile-reset';
    applyProfileSettings(restored.settings);
    settingsStatusKey = 'profile-reset';
    renderStatus();
  }).catch(async (error: unknown) => {
    if (error instanceof ProgressError && error.code === 'conflict') {
      corruptProfileBackup = undefined;
      try {
        campaignProgressView = await progress.loadCampaign();
        campaignFeedback = undefined;
        profile = campaignProgressView.profile;
        profileLoadFailed = false;
        profileLoadErrorCode = undefined;
        applyProfileSettings(profile.settings);
        settingsStatusKey = 'saved';
        profileRecoveryStatusKey = 'profile-refreshed';
      } catch (refreshError) {
        profileLoadFailed = true;
        profileLoadErrorCode = refreshError instanceof ProgressError ? refreshError.code : undefined;
        profileRecoveryStatusKey = 'reset-failed';
      }
    } else {
      if (error instanceof ProgressError && error.code !== 'corrupt-data') {
        profileLoadErrorCode = error.code;
        corruptProfileBackup = undefined;
      }
      profileRecoveryStatusKey = 'reset-failed';
    }
    renderStatus();
  });
});

function finishPointerMovement(pointerId?: number): void {
  if (pointerId !== undefined && pointerId !== activePointerId) return;
  const endedPointerId = activePointerId;
  const wasDragging = dragStarted;
  activePointerId = undefined;
  activePointerOrigin = undefined;
  activeDragUnitId = undefined;
  dragStarted = false;
  pointerMovedBeyondTolerance = false;
  if (endedPointerId !== undefined) trackedPointers.delete(endedPointerId);
  if (wasDragging) dispatch({ type: 'stop-moving' });
}

function cancelPointerGesture(): void {
  const wasDragging = dragStarted;
  activePointerId = undefined;
  activePointerOrigin = undefined;
  activeDragUnitId = undefined;
  dragStarted = false;
  pointerMovedBeyondTolerance = false;
  multiTouchGestureLocked = false;
  pinchGesture = undefined;
  trackedPointers.clear();
  if (wasDragging) dispatch({ type: 'stop-moving' });
}

function pauseForBackground(): void {
  previousTimestamp = undefined;
  simulationTime.reset();
  if (view.paused) {
    stopGameLoop();
    return;
  }
  cancelPointerGesture();
  pauseReason = 'background';
  stopGameLoop();
  view = session.pause();
  renderStatus();
  redraw();
}

function handleVisibilityChange(): void {
  if (pageLeaving || replacingSession) return;
  previousTimestamp = undefined;
  simulationTime.reset();
  if (document.hidden) {
    pauseForBackground();
    return;
  }

  if (pauseReason === 'background' && view.paused) {
    pauseReason = undefined;
    view = session.resume();
    renderStatus();
    redraw();
  }
  if (!view.paused && (view.wave?.phase === 'active' || view.units.some((unit) => unit.moving))) {
    startGameLoop();
  }
}

document.addEventListener('visibilitychange', handleVisibilityChange);

function startGameLoop(): void {
  if (view.paused || document.hidden
    || (view.wave?.phase !== 'active' && !view.units.some((unit) => unit.moving))) return;
  if (animationFrame !== 0 || replacingSession) return;
  const loopSession = session;
  const generation = loopGeneration;
  const tick = (timestamp: number) => {
    if (generation !== loopGeneration || loopSession !== session) return;
    if (view.wave?.phase !== 'active' && !view.units.some((unit) => unit.moving)) {
      animationFrame = 0;
      previousTimestamp = undefined;
      simulationTime.reset();
      return;
    }

    if (document.hidden) {
      pauseForBackground();
      animationFrame = 0;
      return;
    }

    if (view.paused) {
      previousTimestamp = undefined;
      simulationTime.reset();
      animationFrame = 0;
      return;
    }

    const currentTimestamp = Math.trunc(timestamp);
    const deltaMs = previousTimestamp === undefined ? 0 : currentTimestamp - previousTimestamp;
    previousTimestamp = currentTimestamp;
    const frameEvents: GameEvent[] = [];
    for (const stepMs of simulationTime.advanceElapsed(deltaMs, simulationSpeed)) {
      view = loopSession.advance({ deltaMs: stepMs });
      frameEvents.push(...view.events);
      if (view.wave?.phase !== 'active') break;
    }
    playRequestedSounds(frameEvents);
    renderStatus(frameEvents);
    redraw();
    animationFrame = window.requestAnimationFrame(tick);
  };
  animationFrame = window.requestAnimationFrame(tick);
}

function dispatch(intent: GameIntent): void {
  if (replaying || replacingSession) return;
  if (!session.submitIntent(intent)) return;
  view = session.advance();
  playRequestedSounds(view.events);
  renderStatus();
  redraw();
  if (view.wave?.phase === 'active' || view.units.some((unit) => unit.moving)) startGameLoop();
}

pauseControl.addEventListener('click', () => {
  if (document.hidden) return;
  previousTimestamp = undefined;
  simulationTime.reset();
  if (view.paused) {
    pauseReason = undefined;
    view = session.resume();
    renderStatus();
    redraw();
    startGameLoop();
    return;
  }

  cancelPointerGesture();
  pauseReason = 'manual';
  stopGameLoop();
  view = session.pause();
  renderStatus();
  redraw();
});

singleStepControl.addEventListener('click', () => {
  if (!view.paused || singleStepControl.disabled) return;
  view = session.singleStep({ deltaMs: 16 });
  playRequestedSounds(view.events);
  renderStatus();
  redraw();
});

inspectionOverlayInput.addEventListener('change', () => {
  showInspectionOverlay = inspectionOverlayInput.checked;
  redraw();
});

campaignStageList.addEventListener('click', (event: MouseEvent) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLButtonElement>('[data-action="open-campaign-stage"]');
  const scenarioId = button?.dataset.scenarioId;
  if (!scenarioId) return;
  void openCampaignStage(scenarioId);
});

openOriginalWavesControl.addEventListener('click', () => {
  void replaceSession(requestScenarioOpen(cowGulchP1dCampaignContent.id, 'formal'));
});

startWaveControl.addEventListener('click', () => dispatch({ type: 'start-wave' }));
mapHireControl.addEventListener('click', () => {
  const unit = view.units.find((candidate) => candidate.selected && candidate.activity === 4);
  if (!unit) return;
  dispatch({
    type: 'hire-map-unit',
    unitId: unit.id,
    commandId: `${session.id}:map-hire:${++mapHireCommandNumber}`,
  });
});
recruitControl.addEventListener('click', () => {
  const recruit = view.recruitPool[0];
  const cash = view.wave?.cash;
  if (!recruit || cash === undefined || recruitConfirmation.open) return;
  if (cash < recruit.price) {
    dispatch({
      type: 'recruit-unit',
      unitType: recruit.unitType,
      commandId: `${session.id}:recruit:${++recruitmentCommandNumber}`,
    });
    return;
  }
  pendingRecruitmentType = recruit.unitType;
  recruitConfirmationTitle.textContent = languageMessages[getLanguage()].confirmRecruit(
    recruit.name[getLanguage()], recruit.price,
  );
  recruitConfirmation.showModal();
  confirmRecruitControl.focus();
});
confirmRecruitControl.addEventListener('click', () => {
  const unitType = pendingRecruitmentType;
  pendingRecruitmentType = undefined;
  recruitConfirmation.close();
  if (!unitType) return;
  dispatch({
    type: 'recruit-unit',
    unitType,
    commandId: `${session.id}:recruit:${++recruitmentCommandNumber}`,
  });
});
cancelRecruitControl.addEventListener('click', () => {
  pendingRecruitmentType = undefined;
  recruitConfirmation.close();
});
recruitConfirmation.addEventListener('cancel', () => {
  pendingRecruitmentType = undefined;
});
startUpgradeSampleControl.addEventListener('click', () => {
  void replaceSession(requestScenarioOpen('cow-gulch-upgrade-sample', 'debug'));
});
returnCowGulchControl.addEventListener('click', () => {
  void replaceSession(requestScenarioOpen(cowGulchP1aSampleContent.id, 'formal'));
});
upgradeControl.addEventListener('click', () => {
  const unit = view.units.find((candidate) => candidate.selected && candidate.nextUpgrade);
  if (!unit || upgradeConfirmation.open || view.wave?.cash === undefined) return;
  pendingUpgradeUnitId = unit.id;
  renderUpgradeConfirmation(getLanguage());
  upgradeConfirmation.showModal();
  (confirmUpgradeControl.hidden ? cancelUpgradeControl : confirmUpgradeControl).focus();
});
confirmUpgradeControl.addEventListener('click', () => {
  const unitId = pendingUpgradeUnitId;
  pendingUpgradeUnitId = undefined;
  upgradeConfirmation.close();
  confirmUpgradeControl.hidden = false;
  if (!unitId) return;
  dispatch({
    type: 'upgrade-unit',
    unitId,
    commandId: `${session.id}:upgrade:${++upgradeCommandNumber}`,
  });
  if (upgradeControl.hidden) canvas.focus({ preventScroll: true });
});
cancelUpgradeControl.addEventListener('click', () => {
  pendingUpgradeUnitId = undefined;
  upgradeConfirmation.close();
  confirmUpgradeControl.hidden = false;
});
upgradeConfirmation.addEventListener('cancel', () => {
  pendingUpgradeUnitId = undefined;
  confirmUpgradeControl.hidden = false;
});
clearSelectionControl.addEventListener('click', () => dispatch({ type: 'clear-selection' }));
startDefeatControl.addEventListener('click', () => {
  void replaceSession(requestScenarioOpen('cow-gulch-defeat', 'debug')).then((replaced) => {
    if (replaced) dispatch({ type: 'start-wave' });
  });
});
retrySceneOpenControl.addEventListener('click', () => {
  if (sceneOpenFailure) void replaceSession(sceneOpenFailure.request);
});
returnPreviousSceneControl.addEventListener('click', () => {
  sceneOpenFailure = undefined;
  renderStatus();
});
retrySettlementControl.addEventListener('click', () => { void retryFormalSettlement(); });
exportReplayControl.addEventListener('click', () => { void exportCurrentReplay(); });
importReplayControl.addEventListener('change', () => { void importReplayFile(importReplayControl.files?.[0]); });
restartControl.addEventListener('click', () => {
  const mode = restartModeOverride ?? session.startRecord.mode;
  void replaceSession(requestScenarioOpen(
    session.startRecord.scenarioId,
    mode,
    mode === 'formal' ? selectedDifficulty : session.startRecord.difficulty ?? 'easy',
  ));
});

window.addEventListener('pagehide', () => {
  pageLeaving = true;
  stopGameLoop();
  session.close();
}, { once: true });

function pointerLogicalPosition(clientX: number, clientY: number): PointerPoint | undefined {
  const bounds = canvas.getBoundingClientRect();
  const logicalViewport = fitAspectViewport(bounds.width, bounds.height, GAME_VIEWPORT.width, GAME_VIEWPORT.height);
  return toLogicalPoint(
    clientX - bounds.left,
    clientY - bounds.top,
    logicalViewport,
    GAME_VIEWPORT.width,
    GAME_VIEWPORT.height,
  ) ?? undefined;
}

function pointerMapPosition(event: PointerEvent): { x: number; y: number; mapX: number; mapY: number } | undefined {
  const point = pointerLogicalPosition(event.clientX, event.clientY);
  if (!point) return undefined;
  const mapViewport = getMapViewport(view, getDisplayPixelScale(), mapCamera);
  const mapCell = screenToMapCell(mapViewport, point.x, point.y);
  return { x: point.x, y: point.y, mapX: mapCell.x, mapY: mapCell.y };
}

function midpoint(first: PointerPoint, second: PointerPoint): PointerPoint {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function pointerDistance(first: PointerPoint, second: PointerPoint): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function startPinchGesture(): void {
  const touchPointers = [...trackedPointers.entries()].filter(([, pointer]) => pointer.pointerType === 'touch').slice(0, 2);
  if (touchPointers.length < 2) return;

  const wasDragging = dragStarted;
  activePointerId = undefined;
  activePointerOrigin = undefined;
  activeDragUnitId = undefined;
  dragStarted = false;
  pointerMovedBeyondTolerance = false;
  multiTouchGestureLocked = true;
  if (wasDragging) dispatch({ type: 'stop-moving' });

  const [firstEntry, secondEntry] = touchPointers;
  if (!firstEntry || !secondEntry) return;
  const [firstId, firstPointer] = firstEntry;
  const [secondId, secondPointer] = secondEntry;
  const focalPoint = midpoint(firstPointer.point, secondPointer.point);
  const viewport = getMapViewport(view, getDisplayPixelScale(), mapCamera);
  pinchGesture = {
    pointerIds: [firstId, secondId],
    startDistance: Math.max(1, pointerDistance(firstPointer.point, secondPointer.point)),
    startZoom: mapCamera.zoom,
    mapAnchor: screenToMapCell(viewport, focalPoint.x, focalPoint.y),
  };
}

function updatePinchGesture(): void {
  if (!pinchGesture) return;
  const [firstId, secondId] = pinchGesture.pointerIds;
  const firstPointer = trackedPointers.get(firstId);
  const secondPointer = trackedPointers.get(secondId);
  if (!firstPointer || !secondPointer) return;

  const focalPoint = midpoint(firstPointer.point, secondPointer.point);
  const distanceRatio = pointerDistance(firstPointer.point, secondPointer.point) / pinchGesture.startDistance;
  const displayPixelScale = getDisplayPixelScale();
  const baseViewport = getMapViewport(view, displayPixelScale);
  mapCamera = cameraForAnchor(
    baseViewport,
    view.map.width,
    view.map.height,
    GAME_VIEWPORT.width,
    GAME_VIEWPORT.height,
    pinchGesture.startZoom * distanceRatio,
    pinchGesture.mapAnchor,
    focalPoint,
    displayPixelScale,
  );
  redraw();
}

function finishPointerContact(pointerId: number): void {
  if (!trackedPointers.has(pointerId)) return;
  if (multiTouchGestureLocked) {
    trackedPointers.delete(pointerId);
    if (pinchGesture?.pointerIds.includes(pointerId)) pinchGesture = undefined;
    if (trackedPointers.size === 0) {
      multiTouchGestureLocked = false;
      pinchGesture = undefined;
    }
    return;
  }
  if (pointerId === activePointerId) finishPointerMovement(pointerId);
  else trackedPointers.delete(pointerId);
}

function selectedUnitAt(mapX: number, mapY: number): string | undefined {
  return view.units.find((unit) => unit.selected
    && mapX >= unit.hitArea.x && mapX < unit.hitArea.x + unit.hitArea.width
    && mapY >= unit.hitArea.y && mapY < unit.hitArea.y + unit.hitArea.height)?.id;
}

canvas.addEventListener('pointerdown', (event: PointerEvent) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  if (event.pointerType !== 'touch' && !event.isPrimary) return;
  if (multiTouchGestureLocked && event.pointerType !== 'touch') return;
  if (activePointerId !== undefined) {
    const activePointer = trackedPointers.get(activePointerId);
    if (activePointer?.pointerType !== 'touch' || event.pointerType !== 'touch') return;
  }

  const point = pointerLogicalPosition(event.clientX, event.clientY);
  if (!point) return;
  event.preventDefault();
  try {
    canvas.setPointerCapture(event.pointerId);
  } catch {
    return;
  }
  trackedPointers.set(event.pointerId, { pointerType: event.pointerType, point });
  if (multiTouchGestureLocked) return;

  if (event.pointerType === 'touch') {
    if ([...trackedPointers.values()].filter((pointer) => pointer.pointerType === 'touch').length >= 2) {
      startPinchGesture();
      return;
    }
  }
  if (activePointerId !== undefined) return;

  activePointerId = event.pointerId;
  activePointerOrigin = point;
  activeDragUnitId = undefined;
  dragStarted = false;
  pointerMovedBeyondTolerance = false;
  if (event.pointerType === 'touch') {
    const mapViewport = getMapViewport(view, getDisplayPixelScale(), mapCamera);
    const mapCell = screenToMapCell(mapViewport, point.x, point.y);
    activeDragUnitId = selectedUnitAt(mapCell.x, mapCell.y);
    return;
  }

  const mapPoint = pointerMapPosition(event);
  if (!mapPoint) {
    finishPointerMovement(event.pointerId);
    return;
  }
  dispatch({ type: 'select-at', x: mapPoint.mapX, y: mapPoint.mapY });
  activeDragUnitId = view.units.find((unit) => unit.selected)?.id;
});

canvas.addEventListener('pointermove', (event: PointerEvent) => {
  const pointer = trackedPointers.get(event.pointerId);
  if (!pointer) return;
  const logicalPoint = pointerLogicalPosition(event.clientX, event.clientY);
  if (!logicalPoint) {
    finishPointerContact(event.pointerId);
    return;
  }
  pointer.point = logicalPoint;

  if (multiTouchGestureLocked) {
    event.preventDefault();
    if (pinchGesture?.pointerIds.includes(event.pointerId)) updatePinchGesture();
    return;
  }
  if (event.pointerId !== activePointerId || !activePointerOrigin) return;
  const point = pointerMapPosition(event);
  if (!point) {
    finishPointerContact(event.pointerId);
    return;
  }
  if (!pointerMovedBeyondTolerance
    && Math.abs(point.x - activePointerOrigin.x) <= DRAG_START_TOLERANCE
    && Math.abs(point.y - activePointerOrigin.y) <= DRAG_START_TOLERANCE) return;

  pointerMovedBeyondTolerance = true;
  event.preventDefault();
  if (pointer.pointerType === 'touch' && !activeDragUnitId) {
    const viewport = getMapViewport(view, getDisplayPixelScale(), mapCamera);
    const origin = screenToMapCell(viewport, activePointerOrigin.x, activePointerOrigin.y);
    dispatch({ type: 'select-at', x: origin.x, y: origin.y });
    activeDragUnitId = view.units.find((unit) => unit.selected)?.id;
  }
  if (!activeDragUnitId || !view.units.some((unit) => unit.id === activeDragUnitId && unit.selected)) return;

  dragStarted = true;
  dispatch({ type: 'move-unit', targetX: point.mapX, targetY: point.mapY });
});

canvas.addEventListener('pointerup', (event: PointerEvent) => {
  const pointer = trackedPointers.get(event.pointerId);
  if (!pointer) return;
  event.preventDefault();
  if (multiTouchGestureLocked) {
    finishPointerContact(event.pointerId);
    return;
  }
  if (event.pointerId !== activePointerId) {
    finishPointerContact(event.pointerId);
    return;
  }
  if (pointer.pointerType === 'touch' && !pointerMovedBeyondTolerance) {
    const point = pointerMapPosition(event);
    if (point) dispatch({ type: 'select-at', x: point.mapX, y: point.mapY });
  }
  finishPointerMovement(event.pointerId);
});

canvas.addEventListener('pointercancel', (event: PointerEvent) => finishPointerContact(event.pointerId));
canvas.addEventListener('lostpointercapture', (event: PointerEvent) => finishPointerContact(event.pointerId));
window.addEventListener('blur', cancelPointerGesture);

subscribeLanguage(() => {
  renderStatus();
  renderExperimentComparison();
  renderSavedComparisonOptions();
  renderSavedComparisonStatus();
  redraw();
});

if (session.startRecord.mode === 'formal' && session.startRecord.difficulty !== selectedDifficulty) {
  await replaceSession(requestScenarioOpen(session.startRecord.scenarioId, 'formal', selectedDifficulty));
}
