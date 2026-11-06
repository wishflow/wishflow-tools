import '@wishflow/site-shell';
import { getLanguage, registerMessages, subscribeLanguage } from '@wishflow/site-shell';
import {
  createBrowserExperimentRepository,
  createBrowserGame,
  createBrowserProgress,
  getBrowserScenarioContentVersion,
} from './bootstrap/browser';
import {
  cowGulchP1aSampleContent,
  cowGulchP1bCampaignContent,
  cowGulchP1cCampaignContent,
  cowGulchP1dCampaignContent,
  cowGulchUpgradeSampleContent,
} from './content/cow-gulch';
import { cowGulchDefeatContent } from './content/cow-gulch-defeat';
import { apacheValleyContent } from './content/apache-valley';
import { techTownMapEntityAssets } from './content/tech-town-map-entity-assets';
import { techTownTrainTestContent } from './content/tech-town-train-sample';
import { gamblerDialogAssets } from './content/gambler-dialog-assets';
import { BASE_GAME_VIEWPORT, drawGame, GAME_VIEWPORT, gameHudPointerActionAt, getHudMinimapGeometry, getMapViewport, resizeCanvas, setGameViewport } from './render/canvas-renderer';
import { apacheValleyLevelTwoContent, cowGulchLevelOneContent, fortKaboomLevelThreeContent, officialCampaignStages } from './content/official-campaign';
import { campaignCatalog, campaignLevelState, campaignRegions, type CampaignRegionId } from './content/campaign-catalog';
import { apacheValleyWaveIntros, CampaignWaveIntroCursor, cowGulchWaveIntros, type CampaignWaveIntro } from './content/cow-gulch-wave-intros';
import { fortKaboomWaveIntros } from './content/fort-kaboom-wave-intros';
import {
  cowGulchAmbientMusic,
  cowGulchBattleMusicForWave,
  cowGulchVictoryMusic,
  type CowGulchMusicTrack,
} from './content/cow-gulch-music';
import {
  cameraForAnchor,
  createMapCamera,
  MAX_MAP_ZOOM,
  MIN_MAP_ZOOM,
  panCameraByScreenDelta,
  screenToMapCell,
  type MapCamera,
} from './render/map-viewport';
import { fitAspectViewport, fitLogicalViewportToScreen, toLogicalPoint } from './render/viewport';
import { gameAssetRelativePath } from './render/game-asset-path';
import { DEFAULT_SIMULATION_SPEED, normalizeSimulationSpeed, SimulationTimeAccumulator } from './game/time-scaling';
import { chooseSoundVariation, SoundEffectsManager } from './audio/sfx-manager';
import { deriveSessionRandomSeed, JavaUtilRandom } from './game/java-random';
import { acquireAudioPlayer, silenceAudioPlayers } from './audio/audio-playback';
import { GameOpenError, GameReplayError, isGameDifficulty } from './game';
import { summarizeEnemyDefeats, type EnemyDefeatSummary } from './ui/combat-feedback';
import { createExperiments, type ExperimentComparisonReport } from './experiments';
import type {
  GameEvent,
  CampaignEnemyType,
  GameDifficulty,
  GameIntent,
  GameMode,
  GameOpenErrorCode,
  GameReplayErrorCode,
  GameReplayResult,
  GameSession,
  GameSettlementRecord,
  GamblerCardView,
  GamblerOutcome,
  ScenarioContent,
  UnitShotSound,
} from './game';
import { ProgressError, type CampaignProgressView, type ProfileView, type SettlementSaveResult } from './progress';
import { messages } from './locales';
import './styles.css';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Game root is missing');

app.innerHTML = [
  '<section class="game-page" id="game">',
  '  <header class="game-heading">',
  '    <p class="eyebrow" data-locale="ORIGINAL CAMPAIGN">ORIGINAL CAMPAIGN</p>',
  '    <h1>Guns’n’Glory</h1>',
  '    <p class="intro" data-locale="Play Guns’n’Glory’s original campaign in your browser.">Play Guns’n’Glory’s original campaign in your browser.</p>',
  '  </header>',
  '  <section class="game-panel" aria-labelledby="scene-title">',
  '    <section class="campaign-panel" aria-labelledby="campaign-title" hidden>',
  '      <div class="campaign-heading"><h2 id="campaign-title" data-locale="Campaign progress">Campaign progress</h2><p data-testid="campaign-progress-summary"></p></div>',
  '      <p class="campaign-note" data-locale="Cow Gulch and Apache Valley are the first two official levels. Earlier sample results remain separate from campaign progress.">Cow Gulch and Apache Valley are the first two official levels. Earlier sample results remain separate from campaign progress.</p>',
  '      <div class="campaign-difficulty-control"><label for="campaign-difficulty" data-locale="Difficulty for the next battle">Difficulty for the next battle<select id="campaign-difficulty" data-testid="difficulty-select" disabled><option value="easy" data-locale="Easy">Easy</option><option value="medium" data-locale="Medium">Medium</option><option value="hard" data-locale="Hard">Hard</option></select></label><p data-testid="difficulty-status" role="status" aria-live="polite"></p></div>',
  '      <ol class="campaign-stage-list" data-testid="campaign-stage-list"></ol>',
  '      <p class="campaign-status" data-testid="campaign-status" role="status" aria-live="polite"></p>',
  '    </section>',
  '    <section class="asset-load-error" data-testid="asset-load-error" role="alert" hidden><p data-testid="asset-load-error-message"></p><button type="button" data-testid="retry-assets" data-action="retry-assets">Retry loading game resources</button></section>',
  '    <div class="scene-heading" hidden><h2 id="scene-title">Cow Gulch</h2><span data-testid="scene-context">NEW MEXICO · 01</span><span data-testid="scene-difficulty"></span></div>',
  '    <div class="game-frame">',
  '      <canvas data-testid="game-canvas" aria-label="Cow Gulch game map" tabindex="0"></canvas>',
  '      <button type="button" class="game-frame-fullscreen-toggle" data-testid="fullscreen-toggle" data-action="toggle-fullscreen" aria-pressed="false" aria-describedby="fullscreen-status">Enter fullscreen</button>',
  '      <p class="game-frame-fullscreen-status" id="fullscreen-status" data-testid="fullscreen-status" role="status" aria-live="polite" hidden></p>',
  '      <section class="campaign-menu-screen" data-testid="campaign-menu-screen" aria-label="Campaign menu">',
  '        <div class="campaign-menu-view" data-testid="campaign-menu-view"></div>',
  '      </section>',
  '      <details class="game-toolbar" data-testid="game-toolbar" aria-label="Game controls" open hidden>',
  '        <summary data-testid="game-toolbar-toggle" data-locale="Game controls">Game controls</summary>',
  '        <div class="game-toolbar-panel">',
  '          <div class="game-toolbar-actions">',
  '          <button type="button" data-testid="pause-toggle" data-action="toggle-pause" disabled>Pause battle</button>',
  '          <button type="button" data-testid="campaign-menu-toggle" data-action="show-campaign-menu">Campaign</button>',
  '          <button type="button" data-testid="start-wave" data-action="start-wave">Start one pioneer sample</button>',
  '          <button type="button" data-action="recruit-unit">Hire Gunslinger</button>',
  '          <button type="button" data-action="upgrade-unit" hidden>Upgrade selected Gunslinger</button>',
  '          <button type="button" data-action="clear-selection">Clear selection</button>',
  '          <div class="map-zoom-controls" data-testid="map-zoom-controls" role="group" aria-label="Map zoom" hidden>',
  '            <button type="button" data-testid="map-zoom-out" data-action="map-zoom-out" aria-label="Zoom out">−</button>',
  '            <output data-testid="map-zoom-level" aria-label="Map zoom level" aria-live="off">1×</output>',
  '            <button type="button" data-testid="map-zoom-in" data-action="map-zoom-in" aria-label="Zoom in">+</button>',
  '            <button type="button" data-testid="map-zoom-reset" data-action="map-zoom-reset">Reset zoom</button>',
  '          </div>',
  '          </div>',
  '          <div class="game-toolbar-options">',
  '          <label class="simulation-speed-control" for="simulation-speed">',
  '            <span id="simulation-speed-label">Simulation speed</span>',
  '            <input id="simulation-speed" data-testid="simulation-speed" aria-labelledby="simulation-speed-label" type="range" min="0.25" max="4" step="0.25" value="1" disabled>',
  '            <output data-testid="simulation-speed-value" for="simulation-speed">1×</output>',
  '          </label>',
  '          <button type="button" class="sound-toggle" data-testid="sound-toggle" data-action="toggle-sound" aria-pressed="true">Sound: On</button>',
  '          <details class="controls-help" data-testid="controls-help">',
  '            <summary data-locale="Controls">Controls</summary>',
  '            <ul>',
  '              <li data-locale="Click or tap a unit to select it; click empty ground to clear selection.">Click or tap a unit to select it; click empty ground to clear selection.</li>',
  '              <li data-locale="Drag a selected unit to move it to a reachable cell.">Drag a selected unit to move it to a reachable cell.</li>',
  '              <li data-locale="Click or tap a settler to set or clear a priority target.">Click or tap a settler to set or clear a priority target.</li>',
  '              <li data-locale="Drag empty ground to pan the map; drag the minimap to move its viewport.">Drag empty ground to pan the map; drag the minimap to move its viewport.</li>',
  '              <li data-locale="Pinch with two fingers to zoom the map.">Pinch with two fingers to zoom the map.</li>',
  '              <li data-locale="Use the pause button or HUD pause icon to pause and resume.">Use the pause button or HUD pause icon to pause and resume.</li>',
  '              <li data-locale="Tap Game controls to show or hide the in-game toolbar.">Tap Game controls to show or hide the in-game toolbar.</li>',
  '              <li data-locale="Open Inspect battle for state details; single-step works while paused.">Open Inspect battle for state details; single-step works while paused.</li>',
  '            </ul>',
  '          </details>',
  '          </div>',
  '        </div>',
  '      </details>',
  '      <section class="settlement-panel" data-testid="settlement" aria-labelledby="settlement-title" aria-live="polite" hidden>',
  '        <h2 id="settlement-title">Battle result</h2>',
  '        <p data-testid="settlement-outcome"></p>',
  '        <p data-testid="settlement-summary"></p>',
  '        <p data-testid="settlement-score"></p>',
  '        <p data-testid="settlement-high-score"></p>',
  '        <p data-testid="settlement-save-status" role="status" aria-live="polite"></p>',
  '        <button type="button" data-action="retry-settlement-save" hidden>Retry saving result</button>',
  '        <button type="button" data-action="restart-sample">Restart this sample</button>',
  '        <button type="button" data-testid="settlement-campaign-menu" data-action="return-campaign-from-settlement">Campaign map</button>',
  '      </section>',
  '      <dialog class="campaign-exit-confirmation" data-testid="campaign-exit-confirmation" aria-labelledby="campaign-exit-title">',
  '        <h2 id="campaign-exit-title" data-locale="Return to campaign">Return to campaign</h2>',
  '        <p data-locale="The unfinished battle will not be saved and will restart from its first wave if you return.">The unfinished battle will not be saved and will restart from its first wave if you return.</p>',
  '        <div class="recruit-confirmation-actions">',
  '          <button type="button" data-action="cancel-campaign-exit" data-locale="Keep playing">Keep playing</button>',
  '          <button type="button" data-action="confirm-campaign-exit" data-locale="Leave battle">Leave battle</button>',
  '        </div>',
  '      </dialog>',
  '      <dialog class="recruit-confirmation" data-testid="recruit-confirmation" aria-modal="false" aria-labelledby="recruit-confirmation-title">',
  '        <h2 id="recruit-confirmation-title"></h2>',
  '        <div class="recruit-confirmation-actions">',
  '          <button type="button" data-action="confirm-recruit">Recruit</button>',
  '          <button type="button" data-action="cancel-recruit">Cancel</button>',
  '        </div>',
  '      </dialog>',
  '      <dialog class="recruit-confirmation map-hire-confirmation" data-testid="map-hire-confirmation" aria-modal="false" aria-labelledby="map-hire-confirmation-title">',
  '        <h2 id="map-hire-confirmation-title" data-testid="map-hire-confirmation-title"></h2>',
  '        <p data-testid="map-hire-confirmation-details" aria-live="polite"></p>',
  '        <div class="recruit-confirmation-actions">',
  '          <button type="button" data-testid="confirm-map-hire" data-action="confirm-map-hire">Hire</button>',
  '          <button type="button" data-testid="cancel-map-hire" data-action="cancel-map-hire">Cancel</button>',
  '        </div>',
  '      </dialog>',
  '      <dialog class="recruit-confirmation upgrade-confirmation" data-testid="upgrade-confirmation" aria-modal="false" aria-labelledby="upgrade-confirmation-title">',
  '        <h2 id="upgrade-confirmation-title"></h2>',
  '        <p data-testid="upgrade-confirmation-details"></p>',
  '        <div class="recruit-confirmation-actions">',
  '          <button type="button" data-action="confirm-upgrade">Confirm upgrade</button>',
  '          <button type="button" data-action="cancel-upgrade">Cancel upgrade</button>',
  '        </div>',
  '      </dialog>',
  '      <dialog class="recruit-confirmation gambler-confirmation" data-testid="gambler-dialog" aria-modal="false" aria-labelledby="gambler-dialog-title" aria-describedby="gambler-dialog-message">',
  '        <div class="gambler-dialog-heading">',
  '          <img data-testid="gambler-portrait" alt="" width="64" height="64">',
  '          <div><h2 id="gambler-dialog-title" data-testid="gambler-dialog-title"></h2><p id="gambler-dialog-message" data-testid="gambler-message" aria-live="polite"></p></div>',
  '        </div>',
  '        <p class="gambler-cash" data-testid="gambler-cash"></p>',
  '        <ol class="gambler-cards" data-testid="gambler-cards" aria-label="Gambler hand"></ol>',
  '        <p class="gambler-result" data-testid="gambler-result" aria-live="polite"></p>',
  '        <div class="recruit-confirmation-actions gambler-actions">',
  '          <button type="button" data-action="play-gambler" data-testid="play-gambler">Play</button>',
  '          <button type="button" data-action="close-gambler" data-testid="close-gambler">Cancel</button>',
  '        </div>',
  '      </dialog>',
  '      <dialog class="campaign-wave-intro" data-testid="campaign-wave-intro" aria-modal="false" aria-labelledby="campaign-wave-intro-title" aria-describedby="campaign-wave-intro-text">',
  '        <div class="campaign-wave-intro-card">',
  '          <img class="campaign-wave-intro-parchment" data-testid="campaign-wave-intro-parchment" alt="" width="384" height="192">',
  '          <img data-testid="campaign-wave-intro-portrait" alt="" width="96" height="110">',
  '          <div class="campaign-wave-intro-copy">',
  '            <p class="eyebrow" data-testid="campaign-wave-intro-wave"></p>',
  '            <h2 id="campaign-wave-intro-title"></h2>',
  '            <p id="campaign-wave-intro-text" data-testid="campaign-wave-intro-text"></p>',
  '          </div>',
  '          <div class="campaign-wave-intro-actions">',
  '              <button type="button" data-action="retry-wave-intro-voice" hidden>Retry Pedro’s voice</button>',
  '              <button type="button" data-action="continue-wave-intro"><img class="campaign-wave-intro-confirm-icon" data-testid="campaign-wave-intro-confirm-icon" alt="" width="32" height="32"><span class="campaign-wave-intro-continue-label">Continue</span></button>',
  '          </div>',
  '        </div>',
  '      </dialog>',
  '    </div>',
  '    <details class="archive-panel" data-testid="archive-panel" hidden>',
  '      <summary data-locale="Archive and testing tools">Archive and testing tools</summary>',
  '      <div class="archive-panel-content">',
  '    <div class="game-controls">',
  '      <p data-testid="profile-status" role="status" aria-live="polite"></p>',
  '      <p data-testid="pending-settlement-status" role="status" aria-live="polite" hidden></p>',
  '      <button type="button" data-testid="retry-pending-settlement" data-action="retry-pending-settlement" hidden disabled>Retry saving pending result</button>',
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
  '      <p data-testid="sound-playback-status" role="status" aria-live="polite" hidden></p>',
  '      <button type="button" data-testid="retry-sound-playback" data-action="retry-sound-playback" hidden>Retry sound playback</button>',
  '      <p data-testid="settings-status" role="status" aria-live="polite"></p>',
  '      <button type="button" data-action="retry-settings-save" hidden>Retry saving settings</button>',
  '      <button type="button" data-action="reload-saved-profile" hidden>Reload saved profile</button>',
  '      <p data-testid="upgrade-sample-status" role="status" aria-live="polite"></p>',
  '      <p data-testid="upgrade-status" role="status" aria-live="polite"></p>',
  '      <p data-testid="recruit-pool-status" role="status" aria-live="polite"></p>',
  '      <p data-testid="recruit-status" role="status" aria-live="polite"></p>',
  '      <p data-testid="map-hire-status" role="status" aria-live="polite"></p>',
  '      <button type="button" data-action="start-upgrade-sample">Open upgrade rules sample</button>',
  '      <button type="button" data-action="start-gambler-sample">Open Gambler UI sample</button>',
  '      <button type="button" data-action="start-gambler-low-cash-sample">Open low-cash Gambler sample</button>',
  '      <button type="button" data-testid="open-tech-town-train-sample" data-action="start-tech-town-train-sample" data-locale="Open Tech Town train and Gatling sample">Open Tech Town train and Gatling sample</button>',
  '      <button type="button" data-testid="open-single-wave-sample" data-action="return-cow-gulch" hidden>Return to Cow Gulch sample</button>',
  '      <button type="button" data-action="start-defeat-sample">Test defeat with one life</button>',
  '      <p data-testid="pause-status" role="status" aria-live="polite" hidden></p>',
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
  '    <p class="scene-caption" data-testid="scene-caption"></p>',
  '      </div>',
  '    </details>',
  '  </section>',
  '</section>',
].join('');

registerMessages('gunsnglory', messages);

const canvasElement = app.querySelector<HTMLCanvasElement>('[data-testid="game-canvas"]');
const gameFrameElement = app.querySelector<HTMLElement>('.game-frame');
const campaignMenuScreenElement = app.querySelector<HTMLElement>('[data-testid="campaign-menu-screen"]');
const campaignMenuViewElement = app.querySelector<HTMLElement>('[data-testid="campaign-menu-view"]');
const fullscreenToggleButtonElement = app.querySelector<HTMLButtonElement>('[data-testid="fullscreen-toggle"]');
const fullscreenStatusElement = app.querySelector<HTMLElement>('[data-testid="fullscreen-status"]');
const mapZoomControlsElement = app.querySelector<HTMLElement>('[data-testid="map-zoom-controls"]');
const mapZoomOutButtonElement = app.querySelector<HTMLButtonElement>('[data-testid="map-zoom-out"]');
const mapZoomInButtonElement = app.querySelector<HTMLButtonElement>('[data-testid="map-zoom-in"]');
const mapZoomResetButtonElement = app.querySelector<HTMLButtonElement>('[data-testid="map-zoom-reset"]');
const mapZoomLevelElement = app.querySelector<HTMLOutputElement>('[data-testid="map-zoom-level"]');
const sceneHeadingElement = app.querySelector<HTMLElement>('.scene-heading');
const gameToolbarElement = app.querySelector<HTMLElement>('[data-testid="game-toolbar"]');
const campaignExitConfirmationElement = app.querySelector<HTMLDialogElement>('[data-testid="campaign-exit-confirmation"]');
const campaignPanelElement = app.querySelector<HTMLElement>('.campaign-panel');
const archivePanelElement = app.querySelector<HTMLDetailsElement>('[data-testid="archive-panel"]');
const profileStatusElement = app.querySelector<HTMLElement>('[data-testid="profile-status"]');
const pendingSettlementStatusElement = app.querySelector<HTMLElement>('[data-testid="pending-settlement-status"]');
const retryPendingSettlementButtonElement = app.querySelector<HTMLButtonElement>('[data-testid="retry-pending-settlement"]');
const profileRecoveryStatusElement = app.querySelector<HTMLElement>('[data-testid="profile-recovery-status"]');
const exportCorruptProfileButtonElement = app.querySelector<HTMLButtonElement>('[data-action="export-corrupt-profile"]');
const resetCorruptProfileButtonElement = app.querySelector<HTMLButtonElement>('[data-action="reset-corrupt-profile"]');
const statusElement = app.querySelector<HTMLElement>('[data-testid="selection-status"]');
const sceneOpenErrorElement = app.querySelector<HTMLElement>('[data-testid="scene-open-error"]');
const sceneOpenErrorMessageElement = app.querySelector<HTMLElement>('[data-testid="scene-open-error-message"]');
const retrySceneOpenButtonElement = app.querySelector<HTMLButtonElement>('[data-action="retry-scene-open"]');
const returnPreviousSceneButtonElement = app.querySelector<HTMLButtonElement>('[data-action="return-to-previous-scene"]');
const assetLoadErrorElement = app.querySelector<HTMLElement>('[data-testid="asset-load-error"]');
const assetLoadErrorMessageElement = app.querySelector<HTMLElement>('[data-testid="asset-load-error-message"]');
const retryAssetsButtonElement = app.querySelector<HTMLButtonElement>('[data-action="retry-assets"]');
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
const campaignMenuToggleElement = app.querySelector<HTMLButtonElement>('[data-action="show-campaign-menu"]');
const settlementCampaignMenuButtonElement = app.querySelector<HTMLButtonElement>('[data-action="return-campaign-from-settlement"]');
const sceneCaptionElement = app.querySelector<HTMLElement>('[data-testid="scene-caption"]');
const upgradeSampleStatusElement = app.querySelector<HTMLElement>('[data-testid="upgrade-sample-status"]');
const upgradeStatusElement = app.querySelector<HTMLElement>('[data-testid="upgrade-status"]');
const recruitPoolStatusElement = app.querySelector<HTMLElement>('[data-testid="recruit-pool-status"]');
const recruitStatusElement = app.querySelector<HTMLElement>('[data-testid="recruit-status"]');
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
const soundToggleButtonElement = app.querySelector<HTMLButtonElement>('[data-testid="sound-toggle"]');
const soundPlaybackStatusElement = app.querySelector<HTMLElement>('[data-testid="sound-playback-status"]');
const retrySoundPlaybackButtonElement = app.querySelector<HTMLButtonElement>('[data-testid="retry-sound-playback"]');
const clearButton = app.querySelector<HTMLButtonElement>('[data-action="clear-selection"]');
const startWaveButton = app.querySelector<HTMLButtonElement>('[data-action="start-wave"]');
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
const mapHireConfirmationElement = app.querySelector<HTMLDialogElement>('[data-testid="map-hire-confirmation"]');
const mapHireConfirmationTitleElement = app.querySelector<HTMLElement>('[data-testid="map-hire-confirmation-title"]');
const mapHireConfirmationDetailsElement = app.querySelector<HTMLElement>('[data-testid="map-hire-confirmation-details"]');
const confirmMapHireButton = app.querySelector<HTMLButtonElement>('[data-action="confirm-map-hire"]');
const cancelMapHireButton = app.querySelector<HTMLButtonElement>('[data-action="cancel-map-hire"]');
const gamblerDialogElement = app.querySelector<HTMLDialogElement>('[data-testid="gambler-dialog"]');
const gamblerDialogTitleElement = app.querySelector<HTMLElement>('#gambler-dialog-title');
const gamblerDialogMessageElement = app.querySelector<HTMLElement>('[data-testid="gambler-message"]');
const gamblerPortraitElement = app.querySelector<HTMLImageElement>('[data-testid="gambler-portrait"]');
const gamblerCashElement = app.querySelector<HTMLElement>('[data-testid="gambler-cash"]');
const gamblerCardsElement = app.querySelector<HTMLOListElement>('[data-testid="gambler-cards"]');
const gamblerResultElement = app.querySelector<HTMLElement>('[data-testid="gambler-result"]');
const playGamblerButton = app.querySelector<HTMLButtonElement>('[data-testid="play-gambler"]');
const closeGamblerButton = app.querySelector<HTMLButtonElement>('[data-testid="close-gambler"]');
const startGamblerSampleButton = app.querySelector<HTMLButtonElement>('[data-action="start-gambler-sample"]');
const startGamblerLowCashSampleButton = app.querySelector<HTMLButtonElement>('[data-action="start-gambler-low-cash-sample"]');
const startTechTownTrainSampleButton = app.querySelector<HTMLButtonElement>('[data-action="start-tech-town-train-sample"]');
const campaignWaveIntroDialogElement = app.querySelector<HTMLDialogElement>('[data-testid="campaign-wave-intro"]');
const campaignWaveIntroParchmentElement = app.querySelector<HTMLImageElement>('[data-testid="campaign-wave-intro-parchment"]');
const campaignWaveIntroWaveElement = app.querySelector<HTMLElement>('[data-testid="campaign-wave-intro-wave"]');
const campaignWaveIntroTitleElement = app.querySelector<HTMLElement>('#campaign-wave-intro-title');
const campaignWaveIntroTextElement = app.querySelector<HTMLElement>('[data-testid="campaign-wave-intro-text"]');
const campaignWaveIntroPortraitElement = app.querySelector<HTMLImageElement>('[data-testid="campaign-wave-intro-portrait"]');
const campaignWaveIntroConfirmIconElement = app.querySelector<HTMLImageElement>('[data-testid="campaign-wave-intro-confirm-icon"]');
const campaignWaveIntroContinueLabelElement = app.querySelector<HTMLElement>('.campaign-wave-intro-continue-label');
const retryCampaignWaveIntroVoiceButtonElement = app.querySelector<HTMLButtonElement>('[data-action="retry-wave-intro-voice"]');
const continueCampaignWaveIntroButtonElement = app.querySelector<HTMLButtonElement>('[data-action="continue-wave-intro"]');
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
if (!canvasElement || !gameFrameElement || !campaignMenuScreenElement || !campaignMenuViewElement || !fullscreenToggleButtonElement
  || !fullscreenStatusElement || !mapZoomControlsElement || !mapZoomOutButtonElement
  || !mapZoomInButtonElement || !mapZoomResetButtonElement || !mapZoomLevelElement
  || !sceneHeadingElement || !gameToolbarElement
  || !campaignExitConfirmationElement || !campaignPanelElement
  || !archivePanelElement
  || !profileStatusElement || !pendingSettlementStatusElement || !retryPendingSettlementButtonElement || !profileRecoveryStatusElement
  || !exportCorruptProfileButtonElement || !resetCorruptProfileButtonElement
  || !statusElement || !sceneOpenErrorElement || !sceneOpenErrorMessageElement
  || !retrySceneOpenButtonElement || !returnPreviousSceneButtonElement || !waveStatusElement || !combatStatusElement
  || !assetLoadErrorElement || !assetLoadErrorMessageElement || !retryAssetsButtonElement
  || !campaignProgressSummaryElement || !campaignStageListElement || !campaignStatusElement
  || !campaignDifficultySelectElement || !campaignDifficultyStatusElement
  || !sceneTitleElement || !sceneContextElement || !sceneDifficultyElement || !sceneCaptionElement
  || !campaignMenuToggleElement || !settlementCampaignMenuButtonElement
  || !upgradeSampleStatusElement || !upgradeStatusElement
  || !recruitPoolStatusElement || !recruitStatusElement || !mapHireStatusElement
  || !recruitButton || !recruitConfirmationElement
  || !upgradeButton || !startUpgradeSampleButton || !returnCowGulchButton || !upgradeConfirmationElement
  || !upgradeConfirmationTitleElement || !upgradeConfirmationDetailsElement || !confirmUpgradeButton || !cancelUpgradeButton
  || !mapHireConfirmationElement || !mapHireConfirmationTitleElement || !mapHireConfirmationDetailsElement
  || !confirmMapHireButton || !cancelMapHireButton
  || !gamblerDialogElement || !gamblerDialogTitleElement || !gamblerDialogMessageElement || !gamblerPortraitElement
  || !gamblerCashElement || !gamblerCardsElement || !gamblerResultElement || !playGamblerButton || !closeGamblerButton
  || !startGamblerSampleButton || !startGamblerLowCashSampleButton || !startTechTownTrainSampleButton
  || !campaignWaveIntroDialogElement || !campaignWaveIntroParchmentElement || !campaignWaveIntroWaveElement || !campaignWaveIntroTitleElement
  || !campaignWaveIntroTextElement || !campaignWaveIntroPortraitElement || !campaignWaveIntroConfirmIconElement
  || !campaignWaveIntroContinueLabelElement || !retryCampaignWaveIntroVoiceButtonElement
  || !continueCampaignWaveIntroButtonElement
  || !recruitConfirmationTitleElement || !confirmRecruitButton || !cancelRecruitButton || !settingsStatusElement
  || !retrySettingsButtonElement || !reloadProfileButtonElement
  || !pauseStatusElement || !pauseButtonElement
  || !singleStepButtonElement || !inspectionOverlayInputElement || !inspectionFrameElement
  || !inspectionUnitsElement || !inspectionEnemiesElement || !inspectionRouteElement
  || !simulationSpeedInputElement || !simulationSpeedValueElement || !soundToggleButtonElement
  || !soundPlaybackStatusElement || !retrySoundPlaybackButtonElement
  || !clearButton || !startWaveButton
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
const gameFrame: HTMLElement = gameFrameElement;
const campaignMenuScreen: HTMLElement = campaignMenuScreenElement;
const campaignMenuView: HTMLElement = campaignMenuViewElement;
const fullscreenToggleButton: HTMLButtonElement = fullscreenToggleButtonElement;
const fullscreenStatus: HTMLElement = fullscreenStatusElement;
const mapZoomControls: HTMLElement = mapZoomControlsElement;
const mapZoomOutButton: HTMLButtonElement = mapZoomOutButtonElement;
const mapZoomInButton: HTMLButtonElement = mapZoomInButtonElement;
const mapZoomResetButton: HTMLButtonElement = mapZoomResetButtonElement;
const mapZoomLevel: HTMLOutputElement = mapZoomLevelElement;
const sceneHeading: HTMLElement = sceneHeadingElement;
const gameToolbar: HTMLElement = gameToolbarElement;
const campaignPanel: HTMLElement = campaignPanelElement;
const campaignExitConfirmation: HTMLDialogElement = campaignExitConfirmationElement;
const archivePanel: HTMLDetailsElement = archivePanelElement;
const profileStatus: HTMLElement = profileStatusElement;
const pendingSettlementStatus: HTMLElement = pendingSettlementStatusElement;
const retryPendingSettlementControl: HTMLButtonElement = retryPendingSettlementButtonElement;
const profileRecoveryStatus: HTMLElement = profileRecoveryStatusElement;
const exportCorruptProfileButton: HTMLButtonElement = exportCorruptProfileButtonElement;
const resetCorruptProfileButton: HTMLButtonElement = resetCorruptProfileButtonElement;
const status: HTMLElement = statusElement;
const sceneOpenErrorPanel: HTMLElement = sceneOpenErrorElement;
const sceneOpenErrorMessage: HTMLElement = sceneOpenErrorMessageElement;
const retrySceneOpenControl: HTMLButtonElement = retrySceneOpenButtonElement;
const returnPreviousSceneControl: HTMLButtonElement = returnPreviousSceneButtonElement;
const assetLoadErrorPanel: HTMLElement = assetLoadErrorElement;
const assetLoadErrorMessage: HTMLElement = assetLoadErrorMessageElement;
const retryAssetsControl: HTMLButtonElement = retryAssetsButtonElement;
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
const campaignMenuToggle: HTMLButtonElement = campaignMenuToggleElement;
const settlementCampaignMenuButton: HTMLButtonElement = settlementCampaignMenuButtonElement;
const sceneCaption: HTMLElement = sceneCaptionElement;
const upgradeSampleStatus: HTMLElement = upgradeSampleStatusElement;
const upgradeStatus: HTMLElement = upgradeStatusElement;
const recruitPoolStatus: HTMLElement = recruitPoolStatusElement;
const recruitStatus: HTMLElement = recruitStatusElement;
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
const soundToggleButton: HTMLButtonElement = soundToggleButtonElement;
const soundPlaybackStatus: HTMLElement = soundPlaybackStatusElement;
const retrySoundPlaybackButton: HTMLButtonElement = retrySoundPlaybackButtonElement;
const startWaveControl: HTMLButtonElement = startWaveButton;
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
const mapHireConfirmation: HTMLDialogElement = mapHireConfirmationElement;
const mapHireConfirmationTitle: HTMLElement = mapHireConfirmationTitleElement;
const mapHireConfirmationDetails: HTMLElement = mapHireConfirmationDetailsElement;
const confirmMapHireControl: HTMLButtonElement = confirmMapHireButton;
const cancelMapHireControl: HTMLButtonElement = cancelMapHireButton;
const gamblerDialog: HTMLDialogElement = gamblerDialogElement;
const gamblerDialogTitle: HTMLElement = gamblerDialogTitleElement;
const gamblerDialogMessage: HTMLElement = gamblerDialogMessageElement;
const gamblerPortrait: HTMLImageElement = gamblerPortraitElement;
const gamblerCash: HTMLElement = gamblerCashElement;
const gamblerCards: HTMLOListElement = gamblerCardsElement;
const gamblerResult: HTMLElement = gamblerResultElement;
const playGamblerControl: HTMLButtonElement = playGamblerButton;
const closeGamblerControl: HTMLButtonElement = closeGamblerButton;
const startGamblerSampleControl: HTMLButtonElement = startGamblerSampleButton;
const startGamblerLowCashSampleControl: HTMLButtonElement = startGamblerLowCashSampleButton;
const startTechTownTrainSampleControl: HTMLButtonElement = startTechTownTrainSampleButton;
const campaignWaveIntroDialog: HTMLDialogElement = campaignWaveIntroDialogElement;
const campaignWaveIntroParchment: HTMLImageElement = campaignWaveIntroParchmentElement;
const campaignWaveIntroWave: HTMLElement = campaignWaveIntroWaveElement;
const campaignWaveIntroTitle: HTMLElement = campaignWaveIntroTitleElement;
const campaignWaveIntroText: HTMLElement = campaignWaveIntroTextElement;
const campaignWaveIntroPortrait: HTMLImageElement = campaignWaveIntroPortraitElement;
const campaignWaveIntroConfirmIcon: HTMLImageElement = campaignWaveIntroConfirmIconElement;
const campaignWaveIntroContinueLabel: HTMLElement = campaignWaveIntroContinueLabelElement;
const retryCampaignWaveIntroVoiceControl: HTMLButtonElement = retryCampaignWaveIntroVoiceButtonElement;
const continueCampaignWaveIntroControl: HTMLButtonElement = continueCampaignWaveIntroButtonElement;
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
  mode: 'debug',
});
let view = session.observe();
type GamblerDialogMode = 'closed' | 'prompt' | 'revealing' | 'result';
type GamblerRoundState = NonNullable<ReturnType<GameSession['observe']>['units'][number]['gambler']>['lastRound'];
let gamblerDialogMode: GamblerDialogMode = 'closed';
let gamblerDialogUnitId: string | undefined;
let gamblerDialogRoundId: string | undefined;
let gamblerDialogTimers: number[] = [];
let gamblerCommandNumber = 0;
let profile: ProfileView = {
  settings: { simulationSpeed: DEFAULT_SIMULATION_SPEED, difficulty: 'easy', soundEnabled: true },
  completedScenarios: [],
  highScores: {},
};
let campaignProgressView: CampaignProgressView | undefined;
type CampaignMenuScreenState = 'home' | 'regions' | 'levels' | 'overview' | 'difficulty' | 'options' | 'help';
let campaignMenuState: CampaignMenuScreenState = 'home';
let selectedMenuRegionId: CampaignRegionId = 'new-mexico';
let selectedMenuLevel = 1;
let menuReturnWasPaused = false;
let campaignFeedback: { type: 'loading' | 'load-failed' | 'locked' | 'difficulty-locked' | 'opening' | 'opened' | 'open-failed'; scenarioId?: string } | undefined;
let campaignSelectionBusy = false;
let context: CanvasRenderingContext2D | undefined;
let simulationSpeed = DEFAULT_SIMULATION_SPEED;
let soundEnabled = true;
const failedSoundElements = new Map<string, Set<HTMLAudioElement>>();
let selectedDifficulty: GameDifficulty = 'easy';
let pauseReason: 'manual' | 'background' | 'wave-intro' | undefined;
let campaignWaveIntroCursor = new CampaignWaveIntroCursor();
let pendingCampaignWaveIntro: CampaignWaveIntro | undefined;
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
type PendingFormalSettlement = {
  record: GameSettlementRecord;
  state: 'saving' | 'failed' | 'conflict';
};
const pendingFormalSettlements = new Map<string, PendingFormalSettlement>();
let pendingSettlementSavedNotice = false;
let replaying = false;
let replacingSession = false;
let assetLoadFailureNames: string[] = [];
let assetLoadBusy = false;
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
let lastDefeatFeedback: EnemyDefeatSummary[] = [];
let lastRecruitmentEvent: Extract<GameEvent, { type: 'unit-recruited' | 'unit-recruitment-rejected' }> | undefined;
let lastMapHireEvent: Extract<GameEvent, { type: 'map-unit-hired' | 'map-unit-hire-rejected' }> | undefined;
let pendingRecruitmentType: string | undefined;
let recruitmentCommandNumber = 0;
let mapHireCommandNumber = 0;
let pendingMapHireUnitId: string | undefined;
let lastUpgradeEvent: Extract<GameEvent, { type: 'unit-upgraded' | 'unit-upgrade-rejected' }> | undefined;
let pendingUpgradeUnitId: string | undefined;
let upgradeCommandNumber = 0;
let settingsSaveSequence = 0;
const simulationTime = new SimulationTimeAccumulator();
let mapCamera: MapCamera = createMapCamera();
const MAP_ZOOM_BUTTON_STEP = 0.25;
function speedDisplay(finePer100Ms: number, language: 'en' | 'zh'): string {
  const cellsPerSecond = (finePer100Ms * 10 / 7680).toFixed(2);
  return language === 'en'
    ? `${cellsPerSecond} cells/s (${finePer100Ms} fine/100ms)`
    : `${cellsPerSecond} 格/秒（原始 ${finePer100Ms} fine/100ms）`;
}

function rangeDisplay(fine: number, language: 'en' | 'zh'): string {
  const cells = (fine / 7680).toFixed(2);
  return language === 'en'
    ? `${cells} cells (${fine} fine units)`
    : `${cells} 格（原始 ${fine} fine units）`;
}

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
    retryAssets: 'Retry loading game resources',
    assetLoadFailed: (count: number) => `${count} required game image${count === 1 ? '' : 's'} could not load. The recovery scene remains available; retry before starting a battle.`,
    canvasAssetFallback: 'Map display is paused until required images load.',
    difficultyNames: { easy: 'Easy', medium: 'Medium', hard: 'Hard' } satisfies Record<GameDifficulty, string>,
    campaignDifficultyLocked: 'Hard unlocks after completing the 10th level in any region.',
    campaignDifficultyUnlocked: 'Hard difficulty is unlocked.',
    sceneDifficulty: (difficulty: GameDifficulty) => `DIFFICULTY · ${difficulty.toUpperCase()}`,
    sceneCaption: (scenarioId: string) => {
      if (scenarioId === techTownTrainTestContent.id) return 'Developer-only Tech Town train and Gatling test: move the original five-part train, hire and upgrade Gatling wagons, and fight one slow pioneer on route three. Debug results do not affect campaign progress.';
      if (scenarioId === cowGulchLevelOneContent.id) return 'Official Cow Gulch level 1: eight original waves. Victory records campaign completion and best score.';
      if (scenarioId === apacheValleyLevelTwoContent.id) return 'Official Apache Valley level 2: six original waves across three routes. Victory records campaign completion and best score.';
      if (scenarioId === cowGulchP1aSampleContent.id) return 'One-wave sandbox sample: test movement, targeting, and combat. It does not complete the official campaign.';
      if (scenarioId === cowGulchP1bCampaignContent.id) return 'Archived original-waves sample: waves 1–2 only. It stops before campaign settlement.';
      if (scenarioId === cowGulchP1cCampaignContent.id) return 'Archived original-waves sample: waves 1–3 only. It does not settle the campaign.';
      if (scenarioId === cowGulchP1dCampaignContent.id) return 'Original eight-wave sample: clearing wave 8 settles this sample, not the official level.';
      if (scenarioId === cowGulchUpgradeSampleContent.id) return 'Debug-only upgrade sample: starts with $25 and raises the upgrade limit to 1. It never writes profile progress.';
      if (scenarioId === cowGulchDefeatContent.id) return 'Defeat-path sample: no defenders, one starting life, and no official campaign progress.';
      return 'This scene is not part of official campaign progress.';
    },
    openCampaignStage: (name: string) => `Open ${name}`,
    campaignLocked: (name: string) => `${name} is locked. Complete its prerequisites first.`,
    campaignOpening: (name: string) => `Opening ${name}…`,
    campaignOpened: (name: string) => `${name} opened.`,
    campaignOpenFailed: 'The stage could not be opened. The previous scene remains available.',
    none: 'No unit selected',
    unitName: (type: string) => ({
      mexican: 'Mexican',
      cannon: 'Cannon',
      indian: 'Native',
      sniper: 'Markswoman',
      grandpa: 'Scattergun Grandpa',
      'train-10': 'Train locomotive',
      'train-11': 'Train locomotive',
      'train-12': 'Gatling wagon',
      pyromaniac: 'Pyromaniac',
      salesman: 'Snake Oil Salesman',
      gambler: 'Card Gambler',
    }[type] ?? 'Gunslinger'),
    selected: (name: string) => `${name} selected`,
    selectedCell: (x: number, y: number) => ` · Cell (${x}, ${y})`,
    selectedSleeping: (name: string) => `${name} is waiting to be hired`,
    mapHirePrompt: (name: string, price: number) => `Hire ${name} for $${price}?`,
    confirmMapHire: 'Hire',
    cancelMapHire: 'Cancel',
    closeMapHire: 'OK',
    mapHireInsufficientCash: (price: number, cash: number) => `Not enough cash: need $${price}, have $${cash}.`,
    mapHired: (name: string, price: number) => `${name} hired from the map for $${price}.`,
    mapHireRejected: (name: string, price: number, cash: number) => `Not enough cash to hire ${name}: need $${price}, have $${cash}.`,
    startSample: 'Start one pioneer sample',
    originalWaveContext: 'ORIGINAL CAMPAIGN · 1–8',
    originalWaveNotice: 'This archived slice stops after wave 3 of 8 and does not settle the campaign.',
    originalCampaignNotice: 'All eight original waves are active. Clear Wave 8 to settle the battle.',
    apacheValleyNotice: 'All six original waves are active across three routes. Clear Wave 6 to settle the battle.',
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
    fullscreenEnter: 'Enter fullscreen',
    fullscreenExit: 'Exit fullscreen',
    fullscreenUnsupported: 'Fullscreen is not supported by this browser.',
    fullscreenRequestFailed: 'Could not enter fullscreen. Use your browser’s fullscreen control instead.',
    fullscreenExitFailed: 'Could not exit fullscreen. Use Escape or your browser’s fullscreen control.',
    fullscreenLandscapeLocked: 'Landscape orientation is enabled.',
    fullscreenLandscapeUnavailable: 'Fullscreen is active. Rotate your device to landscape for the best view.',
    mapZoomGroup: 'Map zoom',
    mapZoomLevel: 'Map zoom level',
    mapZoomIn: 'Zoom in',
    mapZoomOut: 'Zoom out',
    mapZoomReset: 'Reset zoom',
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
    defeated: (enemyType: CampaignEnemyType | undefined, count: number, cashReward: number) => {
      const names: Record<CampaignEnemyType, readonly [string, string]> = {
        1: ['Pioneer', 'Pioneers'],
        2: ['Female pioneer', 'Female pioneers'],
        3: ['Horseman', 'Horsemen'],
        4: ['Wagon', 'Wagons'],
        5: ['Stagecoach', 'Stagecoaches'],
        6: ['Gold Transport', 'Gold Transports'],
        8: ['Covered wagon', 'Covered wagons'],
      };
      const [singular, plural] = enemyType ? names[enemyType] : ['Enemy', 'Enemies'];
      return `${count} ${count === 1 ? singular : plural} defeated · +$${cashReward}`;
    },
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
    upgradeButton: (name: string, price: number) => `Upgrade ${name} · $${price}`,
    upgradeSummary: (level: number, speed: number, nextSpeed: number, reload: number, nextReload: number) =>
      `Level ${level} → ${level + 1} · Speed ${speedDisplay(speed, 'en')} → ${speedDisplay(nextSpeed, 'en')} · Reload ${reload} → ${nextReload} ms`,
    upgradeDetails: (level: number, speed: number, nextSpeed: number, damage: number, nextDamage: number,
      range: number, nextRange: number, reload: number, nextReload: number, specialReload: number,
      nextSpecialReload: number, price: number, cash: number) =>
      `Level ${level} → ${level + 1} · Speed ${speedDisplay(speed, 'en')} → ${speedDisplay(nextSpeed, 'en')} · Damage ${damage} → ${nextDamage} base damage/shot · HP loss = trunc(base × target-type modifier / 100) · Range ${rangeDisplay(range, 'en')} → ${rangeDisplay(nextRange, 'en')} · Reload ${reload} → ${nextReload} ms · Special reload ${specialReload} → ${nextSpecialReload} ms · Price $${price} · Cash $${cash}`,
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
    soundPlaybackFailed: 'Sound could not be played. You can continue silently or retry playback.',
    retrySoundPlayback: 'Retry sound playback',
    retryWaveIntroVoice: 'Retry Pedro’s voice',
    soundOn: 'Sound: On',
    soundOff: 'Sound: Off',
    reloadProfile: 'Reload saved profile',
    noSavedProfile: 'Saved profile: no official Cow Gulch level 1 result yet.',
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
      `Saved profile: Cow Gulch level 1${completed ? ' complete' : ''}${score === undefined ? '' : ` · Best $${score}`}.`,
    restartSample: 'Restart this sample',
    restartLevel: 'Restart level',
    settlementSaving: 'Saving result to this browser…',
    settlementSaved: 'Result saved to this browser.',
    settlementFailed: 'Result is not saved. Retry to save it.',
    settlementConflict: 'A newer profile exists. Retry to merge this result.',
    pendingSettlementWaiting: 'A battle result is waiting to be saved.',
    pendingSettlementSaving: 'Saving the pending result…',
    pendingSettlementSaved: 'The pending result was saved.',
    retryPendingSettlement: 'Retry pending save',
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
    retryAssets: '重试加载游戏资源',
    assetLoadFailed: (count: number) => `${count} 项必需游戏图片未能加载。恢复场景仍可查看；请重试加载后再开始战斗。`,
    canvasAssetFallback: '必需图片加载完成前，地图暂不可显示。',
    difficultyNames: { easy: '简单', medium: '中等', hard: '困难' } satisfies Record<GameDifficulty, string>,
    campaignDifficultyLocked: '完成任意区域的第 10 关后解锁困难模式。',
    campaignDifficultyUnlocked: '困难模式已解锁。',
    sceneDifficulty: (difficulty: GameDifficulty) => `难度 · ${({ easy: '简单', medium: '中等', hard: '困难' })[difficulty]}`,
    sceneCaption: (scenarioId: string) => {
      if (scenarioId === techTownTrainTestContent.id) return '仅供开发测试的 Tech Town 列车与加特林样例：移动原版五节列车，雇佣并升级加特林车厢，在第三条路线对付一名慢速拓荒者；不会修改正式战役进度。';
      if (scenarioId === cowGulchLevelOneContent.id) return '正式牛溪谷第 1 关：包含原版 8 波。胜利后记录战役完成状态和最高分。';
      if (scenarioId === apacheValleyLevelTwoContent.id) return '正式阿帕奇山谷第 2 关：包含三条路线上的原版 6 波。胜利后记录战役完成状态和最高分。';
      if (scenarioId === cowGulchP1aSampleContent.id) return '单波沙盒样本：用于检查移动、目标选择和战斗，不计入正式战役通关。';
      if (scenarioId === cowGulchP1bCampaignContent.id) return '原版波次归档样本：仅包含第 1–2 波，不会进行战役结算。';
      if (scenarioId === cowGulchP1cCampaignContent.id) return '原版波次归档样本：仅包含第 1–3 波，不会进行战役结算。';
      if (scenarioId === cowGulchP1dCampaignContent.id) return '原版 8 波样本：完成第 8 波可结算该样本，但不会完成正式关卡。';
      if (scenarioId === cowGulchUpgradeSampleContent.id) return '仅供调试的升级样本：初始现金 $25，升级上限为 1，不会写入正式进度。';
      if (scenarioId === cowGulchDefeatContent.id) return '败北流程样本：不部署防守单位，初始生命为 1，不计入正式战役进度。';
      return '此场景不属于正式战役进度。';
    },
    openCampaignStage: (name: string) => `进入${name}`,
    campaignLocked: (name: string) => `${name}尚未解锁，请先完成前置关卡。`,
    campaignOpening: (name: string) => `正在进入${name}…`,
    campaignOpened: (name: string) => `已进入${name}。`,
    campaignOpenFailed: '无法打开该关卡，之前的场景仍可使用。',
    none: '尚未选择单位',
    unitName: (type: string) => ({
      mexican: '墨西哥人',
      cannon: '加农炮手',
      indian: '原住民',
      sniper: '女神枪手',
      grandpa: '散弹枪爷爷',
      'train-10': '列车机车',
      'train-11': '列车机车',
      'train-12': '加特林车厢',
      pyromaniac: '纵火狂',
      salesman: '蛇油推销员',
      gambler: '纸牌赌徒',
    }[type] ?? '枪手'),
    selected: (name: string) => `已选择${name}`,
    selectedCell: (x: number, y: number) => ` · 格子 (${x}, ${y})`,
    selectedSleeping: (name: string) => `${name}待招募，尚未雇用`,
    mapHirePrompt: (name: string, price: number) => `花费 $${price} 雇佣${name}？`,
    confirmMapHire: '雇佣',
    cancelMapHire: '取消',
    closeMapHire: '确定',
    mapHireInsufficientCash: (price: number, cash: number) => `现金不足：需要 $${price}，当前 $${cash}。`,
    mapHired: (name: string, price: number) => `已花费 $${price} 雇佣地图上的${name}。`,
    mapHireRejected: (name: string, price: number, cash: number) => `现金不足，无法雇佣${name}：需要 $${price}，当前 $${cash}。`,
    startSample: '开始单个拓荒者样本',
    originalWaveContext: '原版战役 · 第 1–8 波',
    originalWaveNotice: '该历史切片在第 3/8 波后停止，不结算战役。',
    originalCampaignNotice: '原版八波内容已启用；完成第 8 波后结算战局。',
    apacheValleyNotice: '三条路线上的原版六波均已启用；完成第 6 波后结算战局。',
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
    fullscreenEnter: '进入全屏',
    fullscreenExit: '退出全屏',
    fullscreenUnsupported: '此浏览器不支持全屏显示。',
    fullscreenRequestFailed: '无法进入全屏，请使用浏览器的全屏控制。',
    fullscreenExitFailed: '无法退出全屏，请按 Esc 键或使用浏览器的全屏控制。',
    fullscreenLandscapeLocked: '已锁定为横屏。',
    fullscreenLandscapeUnavailable: '已进入全屏，请手动将设备旋转至横屏以获得最佳显示效果。',
    mapZoomGroup: '地图缩放',
    mapZoomLevel: '地图缩放倍率',
    mapZoomIn: '放大地图',
    mapZoomOut: '缩小地图',
    mapZoomReset: '重置缩放',
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
    defeated: (enemyType: CampaignEnemyType | undefined, count: number, cashReward: number) => {
      const names: Record<CampaignEnemyType, string> = {
        1: '拓荒者',
        2: '女拓荒者',
        3: '骑马战士',
        4: '马车',
        5: '驿站马车',
        6: '运金车',
        8: '篷车',
      };
      const name = enemyType ? names[enemyType] : '敌人';
      return `${name}被击败 ×${count} · +$${cashReward}`;
    },
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
    upgradeButton: (name: string, price: number) => `升级${name} · $${price}`,
    upgradeSummary: (level: number, speed: number, nextSpeed: number, reload: number, nextReload: number) =>
      `等级 ${level} → ${level + 1} · 移动速度 ${speedDisplay(speed, 'zh')} → ${speedDisplay(nextSpeed, 'zh')} · 装填 ${reload} → ${nextReload} 毫秒`,
    upgradeDetails: (level: number, speed: number, nextSpeed: number, damage: number, nextDamage: number,
      range: number, nextRange: number, reload: number, nextReload: number, specialReload: number,
      nextSpecialReload: number, price: number, cash: number) =>
      `等级 ${level} → ${level + 1} · 移动速度 ${speedDisplay(speed, 'zh')} → ${speedDisplay(nextSpeed, 'zh')} · 伤害 ${damage} → ${nextDamage} 点/发（目标类型倍率前基础伤害）· 实际扣血 = trunc(基础伤害 × 目标类型倍率 / 100) · 射程 ${rangeDisplay(range, 'zh')} → ${rangeDisplay(nextRange, 'zh')} · 装填 ${reload} → ${nextReload} 毫秒 · 特殊装填 ${specialReload} → ${nextSpecialReload} 毫秒 · 价格 $${price} · 当前现金 $${cash}`,
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
    soundPlaybackFailed: '音效无法播放。你可以继续静音游玩，或重试播放。',
    retrySoundPlayback: '重试播放音效',
    retryWaveIntroVoice: '重试佩德罗语音',
    soundOn: '音效：开',
    soundOff: '音效：关',
    reloadProfile: '重新加载已保存档案',
    noSavedProfile: '已保存档案：尚无牛溪谷正式第 1 关结算。',
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
      `已保存档案：牛溪谷第 1 关${completed ? '已完成' : ''}${score === undefined ? '' : ` · 最高分 $${score}`}。`,
    restartSample: '重新开始本样本',
    restartLevel: '重新开始本关',
    settlementSaving: '正在将结算保存到此浏览器…',
    settlementSaved: '结算已保存到此浏览器。',
    settlementFailed: '结算尚未保存。请重试保存。',
    settlementConflict: '档案已有更新版本。重试可合并本次结果。',
    pendingSettlementWaiting: '有一条战局结算尚未保存。',
    pendingSettlementSaving: '正在重试保存待处理的结算…',
    pendingSettlementSaved: '待处理的结算已保存。',
    retryPendingSettlement: '重试保存结算',
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

const gamblerDialogCopy = {
  en: {
    title: 'Card Gambler',
    prompt: 'Show what you’ve got!',
    cashAndStake: (cash: number, stake: number) => `Cash: $${cash} · Wager: $${stake}`,
    insufficientCash: (stake: number, cash: number) => `Not enough cash. You need $${stake}, but have $${cash}.`,
    cooldown: (remainingMs: number) => `Come back in ${formatGamblerCooldown(remainingMs)}.`,
    paused: 'Resume the battle before placing a wager.',
    play: (stake: number) => `Play · $${stake}`,
    cancel: 'Cancel',
    done: 'Done',
    dealing: 'Dealing cards…',
    cashPrize: (payout: number) => `You Win: $${payout}`,
    prize: (name: string) => `Prize: ${name}`,
    cards: 'Gambler hand',
    suits: ['hearts', 'diamonds', 'clubs', 'spades'],
    ranks: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace'],
    result: {
      lost: 'LOST! With such a bad hand you should better try your luck with robbing settlers!',
      'one-pair': 'PAIR! When 2 knaves are fighting, the desperado wins the duel!',
      'two-pair': 'TWO PAIR! A bandit is rarely alone!',
      'three-of-a-kind': 'THREE OF A KIND! With this hand, Gringo, you deserve three gun salute shots from the cannon!',
      'full-house': 'FULL HOUSE! When the tent is full, the native gladly joins your cause!',
      'four-of-a-kind': 'POKER! Since you hit 4 Aces, this accurate lady seems to be a perfect match for you!',
      flush: 'FLUSH! Someone playing as well as you must be as experienced as the old Grandpa!',
      'royal-flush': 'ROYAL FLUSH! An incredible hand like this should be celebrated with the fireworks of a Pyromaniac!',
      straight: 'STRAIGHT! Your hand is as straight as the Snake Oil Salesman is bent!',
      'high-card': 'HIGH CARD! Since your opponents are playing so badly you win some extra money!',
    },
  },
  zh: {
    title: '纸牌赌徒',
    prompt: '亮出你的牌吧！',
    cashAndStake: (cash: number, stake: number) => `现金：$${cash} · 押注：$${stake}`,
    insufficientCash: (stake: number, cash: number) => `现金不足：需要 $${stake}，当前只有 $${cash}。`,
    cooldown: (remainingMs: number) => `请等待 ${formatGamblerCooldown(remainingMs)} 后再来。`,
    paused: '请先恢复战局，再下注。',
    play: (stake: number) => `下注 · $${stake}`,
    cancel: '取消',
    done: '完成',
    dealing: '正在发牌…',
    cashPrize: (payout: number) => `你赢得：$${payout}`,
    prize: (name: string) => `奖品：${name}`,
    cards: '赌徒手牌',
    suits: ['红桃', '方块', '梅花', '黑桃'],
    ranks: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'],
    result: {
      lost: '输啦！牌太差了，不如去抢劫定居者碰碰运气！',
      'one-pair': '一对！两个恶棍打起来，亡命徒赢下了决斗！',
      'two-pair': '两对！土匪很少单独行动！',
      'three-of-a-kind': '三条！这手牌值得加农炮为你鸣放三响礼炮！',
      'full-house': '葫芦！帐篷里人满为患时，原住民也会加入你的队伍！',
      'four-of-a-kind': '四条！你抽中了四张 A，这位神枪手女士正适合加入你！',
      flush: '同花！牌打得这么好，想必你和老爷爷一样经验丰富！',
      'royal-flush': '皇家同花顺！如此惊人的牌局，值得让纵火狂放烟花庆祝！',
      straight: '顺子！你的牌和卖蛇油商人一样“正直”！',
      'high-card': '高牌！对手打得太差，你赢得了一些额外现金！',
    },
  },
} as const;

function formatGamblerCooldown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

function gamblerPrizeMessage(outcome: GamblerOutcome, language: keyof typeof gamblerDialogCopy): string {
  const copy = gamblerDialogCopy[language];
  if (outcome.type === 'cash' && outcome.payout > 0) return copy.cashPrize(outcome.payout);
  if (outcome.type === 'unit') {
    const prizeNames = language === 'en'
      ? { 1: 'Gunslinger', 2: 'Mexican', 3: 'Cannon', 4: 'Native', 5: 'Markswoman', 6: 'Scattergun Grandpa', 35: 'Pyromaniac', 36: 'Snake Oil Salesman' }
      : { 1: '枪手', 2: '墨西哥人', 3: '加农炮', 4: '原住民', 5: '女神枪手', 6: '老爷爷', 35: '纵火狂', 36: '蛇油商人' };
    return copy.prize(prizeNames[outcome.unitType]);
  }
  return '';
}

function gamblerCardLabel(card: GamblerCardView, language: keyof typeof gamblerDialogCopy): string {
  const copy = gamblerDialogCopy[language];
  const rank = copy.ranks[card.rank] ?? String(card.rank);
  const suit = copy.suits[(card.suitCode >>> 8) & 0x3] ?? '';
  const important = card.important
    ? language === 'en' ? ', important card' : '，关键牌'
    : '';
  return language === 'en' ? `${rank} of ${suit}${important}` : `${suit}${rank}${important}`;
}

const campaignMenuCopy = {
  en: {
    start: 'START', help: 'HELP', options: 'OPTIONS', sound: 'SOUND',
    chooseRegion: 'Choose a region', chooseLevel: 'Select a level',
    regionHint: 'Choose a region to view its ten campaign levels.',
    levelHint: 'Select an unlocked level. Unimplemented levels are shown with a lock.',
    back: 'BACK', home: 'MAIN MENU', startLevel: 'PLAY',
    overview: 'LEVEL OVERVIEW', difficulty: 'DIFFICULTY', chooseDifficulty: 'Choose difficulty:',
    easy: 'EASY', medium: 'MEDIUM', hard: 'HARD', hardLocked: 'Complete a tenth level to unlock Hard.',
    available: 'Available', completed: 'Completed', locked: 'Locked',
    unimplemented: 'Not implemented yet',
    noHighScore: 'Your highscore for this level will be shown here as soon as you have played it for the first time.',
    highScoreLabel: 'Best score',
    bestScore: (score: number) => `$ ${score}`,
    levelOneInfo: 'The peaceful and serene hills of Cow Gulch are the destination for many hopeful settlers.',
    levelTwoInfo: 'The idyllic Death Valley provides unforgettable impressions of an unspoiled landscape.',
    regionProgress: (completed: number) => `${completed}/10 levels complete`,
    helpTitle: 'HOW TO PLAY',
    helpLines: [
      'Select a unit, then tap or click a reachable map cell to move it.',
      'Select a sleeping unit on the map and use Hire to recruit it.',
      'Select an enemy to set or clear a priority target.',
      'Drag empty ground to pan the map; use the minimap to move the viewport.',
      'Pause the battle before using single-step or inspection tools.',
    ],
    optionsTitle: 'OPTIONS', speed: 'Simulation speed',
    speedHelp: 'Adjust the test speed from 0.25× to 4×.',
    selectRegion: (name: string) => `Select ${name}`,
    selectLevel: (number: number, title: string, state: string) => `Level ${number}: ${title}. ${state}`,
    levelNumber: (number: number) => `LEVEL ${String(number).padStart(2, '0')}`,
    levelUnavailable: 'This campaign level is not implemented yet.',
    levelLocked: 'Complete the previous level to unlock this level.',
    campaign: 'Campaign',
  },
  zh: {
    start: '开始', help: '帮助', options: '选项', sound: '音效',
    chooseRegion: '选择区域', chooseLevel: '选择关卡',
    regionHint: '选择一个区域，查看其中的十个战役关卡。',
    levelHint: '选择已开放的关卡。尚未实现的关卡会显示锁定标记。',
    back: '返回', home: '主菜单', startLevel: '开始游戏',
    overview: '关卡说明', difficulty: '难度', chooseDifficulty: '选择难度：',
    easy: '简单', medium: '中等', hard: '困难', hardLocked: '完成任意区域第十关后解锁困难难度。',
    available: '可进入', completed: '已完成', locked: '未解锁',
    unimplemented: '尚未实现',
    noHighScore: '玩过本关后，最高分将在此显示。',
    highScoreLabel: '最高分',
    bestScore: (score: number) => `$ ${score}`,
    levelOneInfo: '宁静祥和的牛溪谷山丘，是许多怀抱希望的拓荒者的目的地。',
    levelTwoInfo: '风景如画的死亡谷，将为你留下未受破坏的自然风光印象。',
    regionProgress: (completed: number) => `已完成 ${completed}/10 关`,
    helpTitle: '游戏说明',
    helpLines: [
      '选择单位，再点击或轻触可到达的地图格移动。',
      '选择地图上的休息单位，然后使用雇佣操作招募。',
      '选择敌人可设置或取消优先目标。',
      '拖动空地平移地图；拖动小地图视口框移动视野。',
      '暂停战斗后再使用单步或状态检查工具。',
    ],
    optionsTitle: '选项', speed: '模拟速度',
    speedHelp: '测试速度可在 0.25× 到 4× 之间调整。',
    selectRegion: (name: string) => `选择${name}`,
    selectLevel: (number: number, title: string, state: string) => `第 ${number} 关：${title}。${state}`,
    levelNumber: (number: number) => `第 ${String(number).padStart(2, '0')} 关`,
    levelUnavailable: '此战役关卡尚未实现。',
    levelLocked: '完成上一关后即可解锁。',
    campaign: '战役地图',
  },
};

function profileMessage(language: keyof typeof languageMessages): string {
  const messages = languageMessages[language];
  if (profileLoadFailed) {
    if (profileLoadErrorCode === 'corrupt-data') return messages.profileCorrupt;
    if (profileLoadErrorCode === 'unsupported-version') return messages.profileUnsupported;
    return messages.profileLoadFailed;
  }
  const completed = profile.completedScenarios.includes(cowGulchLevelOneContent.id);
  const score = profile.highScores[cowGulchLevelOneContent.id];
  if (!completed && score === undefined) return messages.noSavedProfile;
  return messages.profileSaved(completed, score);
}

function applyProfileSettings(settings: ProfileView['settings']): void {
  simulationSpeed = settings.simulationSpeed;
  setSoundEnabled(settings.soundEnabled);
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
    && stages.every((stage, index) => rows[index]?.dataset.scenarioId === stage.scenarioId);

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
    const disabled = assetLoadFailureNames.length > 0 || campaignSelectionBusy || settingsSaveBusy || profileLoadFailed || replacingSession || replaying
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

const campaignRegionPositions: Record<CampaignRegionId, { x: number; y: number }> = {
  'new-mexico': { x: 182, y: 188 },
  mississippi: { x: 302, y: 215 },
  oregon: { x: 80, y: 80 },
  dakota: { x: 210, y: 90 },
  nevada: { x: 105, y: 150 },
  alaska: { x: 95, y: 250 },
};

const campaignLevelPositions = [
  { x: 25, y: 25 }, { x: 117, y: 54 }, { x: 34, y: 126 }, { x: 84, y: 208 }, { x: 157, y: 137 },
  { x: 239, y: 60 }, { x: 341, y: 23 }, { x: 352, y: 118 }, { x: 264, y: 167 }, { x: 362, y: 208 },
] as const;

function escapeMenuText(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character);
}

function campaignMenuAssetUrl(filename: string): string {
  return new URL(`${import.meta.env.BASE_URL}assets/menu/${filename}`, window.location.href).toString();
}

function campaignPortraitAssetUrl(filename: string): string {
  return new URL(`${import.meta.env.BASE_URL}assets/${filename}`, window.location.href).toString();
}

function campaignMenuRegionScreen(): string {
  const language = getLanguage();
  const copy = campaignMenuCopy[language];
  const nodes = campaignRegions.map((region, index) => {
    const position = campaignRegionPositions[region.id];
    const title = region.title[language];
    return `<button type="button" class="campaign-region-node" data-action="choose-campaign-region" data-region="${region.id}" data-testid="campaign-region-${region.id}" style="left:${(position.x / 480) * 100}%;top:${(position.y / 320) * 100}%" aria-label="${escapeMenuText(copy.selectRegion(title))}">
      <img src="${campaignMenuAssetUrl('gng_usmap_cross.png')}" alt="" aria-hidden="true"><span class="campaign-region-number">${index + 1}</span><span class="campaign-region-name">${escapeMenuText(title)}</span>
    </button>`;
  }).join('');
  return `<section class="campaign-region-screen" aria-labelledby="campaign-menu-heading">
    <h2 class="campaign-menu-visually-hidden" id="campaign-menu-heading">${copy.chooseRegion}</h2>
    <div class="campaign-menu-map campaign-world-map">
      <img class="campaign-map-paper" src="${campaignMenuAssetUrl('gng_usmap_00_box.png')}" alt="" aria-hidden="true">${nodes}
    </div>
    <p class="campaign-menu-visually-hidden" data-testid="campaign-menu-progress">${copy.regionHint}</p>
    <button type="button" class="campaign-menu-back" data-action="menu-back-home" data-testid="campaign-menu-back" aria-label="${copy.back}"><img src="${campaignMenuAssetUrl('left_button.png')}" alt="" aria-hidden="true"></button>
  </section>`;
}

function campaignMenuLevelScreen(): string {
  const language = getLanguage();
  const copy = campaignMenuCopy[language];
  const region = campaignRegions.find((candidate) => candidate.id === selectedMenuRegionId) ?? campaignRegions[0];
  const levels = campaignCatalog.filter((level) => level.regionId === region.id);
  const completed = levels.filter((level) => campaignLevelState(level.level, campaignProgressView) === 'completed').length;
  const nodes = levels.map((level, index) => {
    const status = campaignLevelState(level.level, campaignProgressView);
    const disabled = status === 'locked' || status === 'unimplemented';
    const statusLabel = status === 'completed' ? copy.completed
      : status === 'available' ? copy.available
        : status === 'locked' ? copy.locked : copy.unimplemented;
    const title = copy.selectLevel(level.level, level.title, statusLabel);
    const artName = `gng_levelmap_${String(level.level).padStart(2, '0')}.png`;
    const position = campaignLevelPositions[index];
    const lock = disabled
      ? `<img class="campaign-level-lock" src="${campaignMenuAssetUrl('lvl_locked.png')}" alt="" aria-hidden="true">`
      : '';
    return `<button type="button" class="campaign-level-node${disabled ? ' is-locked' : ''}${status === 'unimplemented' ? ' is-unimplemented' : ''}" data-action="choose-campaign-level" data-level="${level.level}" data-testid="campaign-level-${String(level.level).padStart(2, '0')}" title="${escapeMenuText(title)}" aria-label="${escapeMenuText(title)}" ${disabled ? 'disabled' : ''} style="left:${(position.x / 480) * 100}%;top:${(position.y / 320) * 100}%">
      <img class="campaign-level-art" src="${campaignMenuAssetUrl(artName)}" alt="" aria-hidden="true">${lock}
    </button>`;
  }).join('');
  return `<section class="campaign-level-screen" aria-labelledby="campaign-menu-heading">
    <h2 class="campaign-menu-visually-hidden" id="campaign-menu-heading">${escapeMenuText(region.title[language])}</h2>
    <div class="campaign-menu-map campaign-level-map">
      <img class="campaign-map-paper" src="${campaignMenuAssetUrl('gng_levelmap_box_00.png')}" alt="" aria-hidden="true">${nodes}
    </div>
    <p class="campaign-menu-visually-hidden" data-testid="campaign-menu-progress">${escapeMenuText(copy.regionProgress(completed))}. ${escapeMenuText(copy.levelHint)}</p>
    <button type="button" class="campaign-menu-back" data-action="menu-back-regions" data-testid="campaign-menu-back" aria-label="${copy.back}"><img src="${campaignMenuAssetUrl('left_button.png')}" alt="" aria-hidden="true"></button>
  </section>`;
}

function campaignMenuMinimapDataUrl(content: ScenarioContent): string {
  const pixelsPerCell = 6;
  const preview = document.createElement('canvas');
  preview.width = content.map.width * pixelsPerCell;
  preview.height = content.map.height * pixelsPerCell;
  const previewContext = preview.getContext('2d');
  if (!previewContext) return '';
  previewContext.imageSmoothingEnabled = false;
  for (const layer of [content.map.background, content.map.streets]) {
    for (const tile of layer) {
      const image = images[tile.asset];
      if (!image) continue;
      previewContext.drawImage(
        image,
        tile.source.x,
        tile.source.y,
        tile.source.width,
        tile.source.height,
        tile.x * pixelsPerCell,
        tile.y * pixelsPerCell,
        tile.width * pixelsPerCell,
        tile.height * pixelsPerCell,
      );
    }
  }
  for (const unit of content.units) {
    previewContext.fillStyle = '#24180f';
    previewContext.fillRect((unit.cell.x + 0.25) * pixelsPerCell, (unit.cell.y + 0.25) * pixelsPerCell, 2, 2);
  }
  return preview.toDataURL('image/png');
}

function campaignMenuOverviewScreen(): string {
  const language = getLanguage();
  const copy = campaignMenuCopy[language];
  const entry = campaignCatalog.find((candidate) => candidate.level === selectedMenuLevel);
  if (!entry) return campaignMenuLevelScreen();
  const stage = campaignProgressView?.stages.find((candidate) => candidate.globalLevel === entry.level);
  if (!stage || (stage.status !== 'available' && stage.status !== 'completed')) return campaignMenuLevelScreen();
  const content = entry.level === 1 ? cowGulchLevelOneContent : apacheValleyLevelTwoContent;
  const description = entry.level === 1 ? copy.levelOneInfo : copy.levelTwoInfo;
  const artName = `gng_levelmap_${String(entry.level).padStart(2, '0')}.png`;
  const score = stage.highScore === undefined
    ? `<p class="campaign-overview-no-score">${escapeMenuText(copy.noHighScore)}</p>`
    : `<img class="campaign-overview-wanted" src="${campaignMenuAssetUrl('gng_highscore_1_wanted.png')}" alt="" aria-hidden="true"><p class="campaign-overview-score-label">${copy.highScoreLabel}</p><p class="campaign-overview-score">${escapeMenuText(copy.bestScore(stage.highScore))}</p>`;
  const campaignFeedbackText = campaignFeedback?.type === 'open-failed' || assetLoadFailureNames.length > 0
    ? languageMessages[language].campaignOpenFailed : '';
  const unavailable = assetLoadFailureNames.length > 0 || campaignSelectionBusy || settingsSaveBusy || profileLoadFailed;
  return `<section class="campaign-overview-screen" aria-labelledby="campaign-menu-heading">
    <button type="button" class="campaign-menu-back" data-action="menu-back-levels" data-testid="campaign-menu-back" aria-label="${copy.back}"><img src="${campaignMenuAssetUrl('left_button.png')}" alt="" aria-hidden="true"></button>
    <article class="campaign-overview-card">
      <h2 id="campaign-menu-heading" class="campaign-overview-title">${escapeMenuText(entry.title)}</h2>
      <div class="campaign-overview-images">
        <img class="campaign-overview-level-art" src="${campaignMenuAssetUrl(artName)}" alt="" aria-hidden="true">
        <img class="campaign-overview-minimap" src="${campaignMenuMinimapDataUrl(content)}" alt="${escapeMenuText(copy.levelNumber(entry.level))} map preview">
      </div>
      <p class="campaign-level-description">${escapeMenuText(description)}</p>
      <div class="campaign-overview-highscore">${score}</div>
      <p class="campaign-menu-error" role="status" data-testid="campaign-menu-error">${escapeMenuText(campaignFeedbackText)}</p>
      <button type="button" class="campaign-overview-play" data-action="open-campaign-difficulty" data-scenario-id="${escapeMenuText(stage.scenarioId)}" data-testid="campaign-stage-play" aria-label="${copy.startLevel}" ${unavailable ? 'disabled' : ''}>
        <img src="${campaignMenuAssetUrl('gng_highscore_2_button.png')}" alt="" aria-hidden="true"><span>${copy.startLevel}</span>
      </button>
      <button type="button" class="campaign-overview-cancel" data-action="menu-back-levels" aria-label="${copy.back}" title="${copy.back}"><img src="${campaignMenuAssetUrl('gng_hud_2_no.png')}" alt="" aria-hidden="true"></button>
    </article>
  </section>`;
}

function campaignMenuDifficultyScreen(): string {
  const language = getLanguage();
  const copy = campaignMenuCopy[language];
  const entry = campaignCatalog.find((candidate) => candidate.level === selectedMenuLevel);
  const stage = campaignProgressView?.stages.find((candidate) => candidate.globalLevel === selectedMenuLevel);
  const region = campaignRegions.find((candidate) => candidate.id === selectedMenuRegionId) ?? campaignRegions[0];
  if (!entry || !stage || (stage.status !== 'available' && stage.status !== 'completed')) return campaignMenuLevelScreen();
  const levels = campaignCatalog.filter((level) => level.regionId === region.id);
  const backdropNodes = levels.map((level, index) => {
    const status = campaignLevelState(level.level, campaignProgressView);
    const locked = status === 'locked' || status === 'unimplemented';
    const position = campaignLevelPositions[index];
    return `<div class="campaign-difficulty-map-node${locked ? ' is-locked' : ''}" style="left:${(position.x / 480) * 100}%;top:${(position.y / 320) * 100}%">
      <img src="${campaignMenuAssetUrl(`gng_levelmap_${String(level.level).padStart(2, '0')}.png`)}" alt="" aria-hidden="true">${locked ? `<img class="campaign-difficulty-map-lock" src="${campaignMenuAssetUrl('lvl_locked.png')}" alt="" aria-hidden="true">` : ''}
    </div>`;
  }).join('');
  const difficulties: readonly GameDifficulty[] = ['easy', 'medium', 'hard'];
  const choices = difficulties.map((difficulty) => {
    const isLocked = difficulty === 'hard' && campaignProgressView?.hardModeUnlocked !== true;
    const isBusy = campaignSelectionBusy || settingsSaveBusy || assetLoadFailureNames.length > 0 || profileLoadFailed;
    const selected = selectedDifficulty === difficulty;
    const labels = { easy: copy.easy, medium: copy.medium, hard: copy.hard };
    const portrait = difficulty === 'easy' ? 'portrait_settlers.png'
      : difficulty === 'medium' ? 'portrait_pedro.png' : 'oregon_dakota_portrait_boss.png';
    return `<button type="button" class="campaign-difficulty-choice${selected ? ' is-selected' : ''}" data-action="choose-campaign-difficulty" data-difficulty="${difficulty}" data-scenario-id="${escapeMenuText(stage.scenarioId)}" data-testid="campaign-difficulty-${difficulty}" aria-pressed="${selected}" ${isLocked || isBusy ? 'disabled' : ''}>
      <img src="${campaignPortraitAssetUrl(portrait)}" alt="" aria-hidden="true"><span>${labels[difficulty]}</span>
    </button>`;
  }).join('');
  const campaignFeedbackText = campaignFeedback?.type === 'open-failed' || assetLoadFailureNames.length > 0
    ? languageMessages[language].campaignOpenFailed : '';
  return `<section class="campaign-difficulty-screen" aria-labelledby="campaign-menu-heading">
    <div class="campaign-difficulty-map" aria-hidden="true"><img class="campaign-map-paper" src="${campaignMenuAssetUrl('gng_levelmap_box_00.png')}" alt="">${backdropNodes}</div>
    <button type="button" class="campaign-menu-back" data-action="menu-back-overview" data-testid="campaign-menu-back" aria-label="${copy.back}"><img src="${campaignMenuAssetUrl('left_button.png')}" alt="" aria-hidden="true"></button>
    <article class="campaign-difficulty-dialog" role="dialog" aria-modal="true">
      <h2 id="campaign-menu-heading">${copy.chooseDifficulty}</h2>
      <div class="campaign-difficulty-choices">${choices}</div>
      <p class="campaign-menu-notice" data-testid="campaign-menu-notice">${campaignProgressView?.hardModeUnlocked ? '' : copy.hardLocked}</p>
      <p class="campaign-menu-error" role="status" data-testid="campaign-menu-error">${escapeMenuText(campaignFeedbackText)}</p>
    </article>
  </section>`;
}

function renderCampaignMenu(): void {
  const language = getLanguage();
  const copy = campaignMenuCopy[language];
  campaignMenuScreen.setAttribute('aria-label', language === 'en' ? 'Campaign menu' : '战役菜单');
  campaignMenuScreen.style.setProperty('--campaign-menu-background', `url("${campaignMenuAssetUrl('gng_startmenu_0_bg_0_sky.png')}")`);
  campaignMenuScreen.style.setProperty('--campaign-menu-cloud-left', `url("${campaignMenuAssetUrl('gng_startmenu_0_bg_1_cloud_1.png')}")`);
  campaignMenuScreen.style.setProperty('--campaign-menu-cloud-right', `url("${campaignMenuAssetUrl('gng_startmenu_0_bg_1_cloud_2.png')}")`);
  campaignMenuScreen.style.setProperty('--campaign-menu-button-background', `url("${campaignMenuAssetUrl('gng_startmenu_2_menu_1_button.png')}")`);
  campaignMenuScreen.style.setProperty('--campaign-menu-card-background', `url("${campaignMenuAssetUrl('gng_highscore_0_box.png')}")`);
  campaignMenuScreen.style.setProperty('--campaign-difficulty-background', `url("${campaignPortraitAssetUrl('gng_hud_2_textbox_large.png')}")`);
  switch (campaignMenuState) {
    case 'home': {
      campaignMenuView.innerHTML = `<section class="campaign-menu-home" aria-label="Guns’n’Glory">
        <div class="campaign-menu-home-brand">
          <img class="campaign-menu-logo" src="${campaignMenuAssetUrl('gng_startmenu_1_logo.png')}" alt="Guns’n’Glory">
          <div class="campaign-menu-wanted">
            <img class="campaign-wanted-frame" src="${campaignMenuAssetUrl('gng_startmenu_3_bandit_0_box.png')}" alt="" aria-hidden="true">
            <img class="campaign-wanted-paper" src="${campaignMenuAssetUrl('gng_startmenu_3_bandit_1_wanted_1.png')}" alt="" aria-hidden="true">
            <img class="campaign-wanted-body" src="${campaignMenuAssetUrl('gng_startmenu_3_bandit_3_body.png')}" alt="" aria-hidden="true">
            <img class="campaign-wanted-head" src="${campaignMenuAssetUrl('gng_startmenu_3_bandit_4_head_0.png')}" alt="" aria-hidden="true">
          </div>
        </div>
        <div class="campaign-menu-home-board">
          <img class="campaign-menu-board-frame" src="${campaignMenuAssetUrl('gng_startmenu_2_menu_0_box.png')}" alt="" aria-hidden="true">
          <nav class="campaign-menu-home-actions" aria-label="${copy.home}">
            <button type="button" class="campaign-wood-button" data-action="menu-start" data-testid="menu-start">${copy.start}</button>
            <button type="button" class="campaign-wood-button" data-action="menu-help" data-testid="menu-help">${copy.help}</button>
            <button type="button" class="campaign-wood-button" data-action="menu-options" data-testid="menu-options">${copy.options}</button>
          </nav>
          <button type="button" class="campaign-menu-sound" data-action="menu-toggle-sound" data-testid="menu-sound" aria-pressed="${soundEnabled}"><img src="${campaignMenuAssetUrl(soundEnabled ? 'gng_startmenu_2_menu_2_sound_on.png' : 'gng_startmenu_2_menu_2_sound_off.png')}" alt="${copy.sound}"></button>
        </div>
      </section>`;
      break;
    }
    case 'regions': campaignMenuView.innerHTML = campaignMenuRegionScreen(); break;
    case 'levels': campaignMenuView.innerHTML = campaignMenuLevelScreen(); break;
    case 'overview': campaignMenuView.innerHTML = campaignMenuOverviewScreen(); break;
    case 'difficulty': campaignMenuView.innerHTML = campaignMenuDifficultyScreen(); break;
    case 'options':
      campaignMenuView.innerHTML = `<section class="campaign-menu-card-screen" aria-labelledby="campaign-menu-heading">
        <article class="campaign-menu-card campaign-options-card">
          <button type="button" class="campaign-menu-back" data-action="menu-back-home" data-testid="campaign-menu-back" aria-label="${copy.back}"><img src="${campaignMenuAssetUrl('left_button.png')}" alt="" aria-hidden="true"></button>
          <h2 id="campaign-menu-heading">${copy.optionsTitle}</h2>
          <button type="button" class="campaign-setting-toggle" data-action="menu-toggle-sound" data-testid="menu-sound" aria-pressed="${soundEnabled}">${copy.sound}: ${soundEnabled ? language === 'en' ? 'On' : '开' : language === 'en' ? 'Off' : '关'}</button>
          <label class="campaign-speed-setting"><span>${copy.speed}</span><output data-testid="menu-simulation-speed-value">${simulationSpeed}×</output><input type="range" min="0.25" max="4" step="0.25" value="${simulationSpeed}" data-testid="menu-simulation-speed" aria-label="${copy.speed}"></label>
          <p class="campaign-menu-subtle">${copy.speedHelp}</p>
          <p class="campaign-menu-status" data-testid="menu-settings-status" role="status"></p>
        </article>
      </section>`;
      break;
    case 'help':
      campaignMenuView.innerHTML = `<section class="campaign-menu-card-screen" aria-labelledby="campaign-menu-heading">
        <article class="campaign-menu-card campaign-help-card">
          <button type="button" class="campaign-menu-back" data-action="menu-back-home" data-testid="campaign-menu-back" aria-label="${copy.back}"><img src="${campaignMenuAssetUrl('left_button.png')}" alt="" aria-hidden="true"></button>
          <h2 id="campaign-menu-heading">${copy.helpTitle}</h2>
          <ol>${copy.helpLines.map((line) => `<li>${escapeMenuText(line)}</li>`).join('')}</ol>
        </article>
      </section>`;
      break;
  }
}

function showBattleScene(): void {
  campaignMenuScreen.hidden = true;
  campaignPanel.hidden = true;
  sceneHeading.hidden = false;
  gameToolbar.hidden = false;
}

function showCampaignMenu(screen: CampaignMenuScreenState = 'home'): void {
  campaignMenuState = screen;
  campaignMenuScreen.hidden = false;
  campaignPanel.hidden = true;
  sceneHeading.hidden = true;
  gameToolbar.hidden = true;
  renderCampaignMenu();
  if (screen === 'difficulty') {
    requestAnimationFrame(() => campaignMenuView.querySelector<HTMLButtonElement>('[data-testid="campaign-difficulty-easy"]')?.focus());
  }
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

function rememberPendingSettlement(
  record: GameSettlementRecord,
  state: SettlementSaveResult['status'] | 'saving',
): void {
  if (state === 'saved') {
    const wasPending = pendingFormalSettlements.has(record.settlementId);
    pendingFormalSettlements.delete(record.settlementId);
    pendingSettlementSavedNotice = wasPending;
    return;
  }
  pendingSettlementSavedNotice = false;
  pendingFormalSettlements.set(record.settlementId, {
    record,
    state,
  });
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
    if (activeSettlementRecord?.settlementId === record.settlementId) settlementSaveState = result.status;
    rememberPendingSettlement(record, result.status);
  } catch {
    if (activeSettlementRecord?.settlementId === record.settlementId) settlementSaveState = 'failed';
    rememberPendingSettlement(record, 'failed');
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
  const activePending = activeSettlementRecord
    ? pendingFormalSettlements.get(activeSettlementRecord.settlementId)
    : undefined;
  const pending = activePending ?? pendingFormalSettlements.values().next().value as PendingFormalSettlement | undefined;
  if (!pending || (pending.state !== 'failed' && pending.state !== 'conflict')) return;
  const settlementId = pending.record.settlementId;
  const isActiveSettlement = activeSettlementRecord?.settlementId === settlementId;
  if (isActiveSettlement) settlementSaveState = 'saving';
  rememberPendingSettlement(pending.record, 'saving');
  renderStatus();
  try {
    const result = await progress.retrySettlement(settlementId);
    profile = result.profile;
    if (result.status !== 'failed') {
      profileLoadFailed = false;
      profileLoadErrorCode = undefined;
    }
    if (activeSettlementRecord?.settlementId === settlementId) settlementSaveState = result.status;
    rememberPendingSettlement(pending.record, result.status);
  } catch {
    if (activeSettlementRecord?.settlementId === settlementId) settlementSaveState = 'failed';
    rememberPendingSettlement(pending.record, 'failed');
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

function renderMapZoomControls(language: keyof typeof languageMessages = getLanguage()): void {
  const messages = languageMessages[language];
  mapZoomControls.hidden = !view.wave || gameToolbar.hidden || campaignWaveIntroDialog.open || !settlementPanel.hidden;
  mapZoomControls.setAttribute('aria-label', messages.mapZoomGroup);
  mapZoomOutButton.setAttribute('aria-label', messages.mapZoomOut);
  mapZoomInButton.setAttribute('aria-label', messages.mapZoomIn);
  mapZoomResetButton.setAttribute('aria-label', messages.mapZoomReset);
  mapZoomResetButton.textContent = messages.mapZoomReset;
  mapZoomLevel.setAttribute('aria-label', messages.mapZoomLevel);
  mapZoomLevel.textContent = `${Number(mapCamera.zoom.toFixed(2))}×`;
  mapZoomOutButton.disabled = mapCamera.zoom <= MIN_MAP_ZOOM;
  mapZoomInButton.disabled = mapCamera.zoom >= MAX_MAP_ZOOM;
  mapZoomResetButton.disabled = mapCamera.zoom === 1 && mapCamera.offsetX === 0 && mapCamera.offsetY === 0;
}

function renderStatus(events: readonly GameEvent[] = view.events): void {
  const language = getLanguage();
  const unit = view.units.find((candidate) => candidate.selected);
  const messages = languageMessages[language];
  renderCampaign();
  if (!campaignMenuScreen.hidden) renderCampaignMenu();
  renderCampaignWaveIntro();
  renderMapZoomControls(language);
  const actionLocked = replaying || replacingSession;
  if (view.wave?.settlement && gamblerDialog.open) closeGamblerDialog();
  renderGamblerDialog(language, actionLocked);
  sceneOpenErrorPanel.hidden = sceneOpenFailure === undefined;
  retrySceneOpenControl.textContent = messages.retrySceneOpen;
  retrySceneOpenControl.disabled = actionLocked;
  returnPreviousSceneControl.textContent = messages.returnPreviousScene;
  returnPreviousSceneControl.disabled = actionLocked;
  assetLoadErrorPanel.hidden = assetLoadFailureNames.length === 0;
  assetLoadErrorMessage.textContent = assetLoadFailureNames.length > 0
    ? messages.assetLoadFailed(assetLoadFailureNames.length)
    : '';
  retryAssetsControl.textContent = messages.retryAssets;
  retryAssetsControl.disabled = assetLoadBusy;
  if (sceneOpenFailure) {
    sceneOpenErrorMessage.textContent = messages.sceneOpenErrors[sceneOpenFailure.code];
  }
  const profileText = profileMessage(language);
  if (profileStatus.textContent !== profileText) profileStatus.textContent = profileText;
  const pendingSettlement = pendingFormalSettlements.values().next().value as PendingFormalSettlement | undefined;
  pendingSettlementStatus.hidden = !pendingSettlement && !pendingSettlementSavedNotice;
  pendingSettlementStatus.textContent = pendingSettlement
    ? pendingSettlement.state === 'saving' ? messages.pendingSettlementSaving : messages.pendingSettlementWaiting
    : pendingSettlementSavedNotice ? messages.pendingSettlementSaved : '';
  retryPendingSettlementControl.hidden = pendingSettlement === undefined;
  retryPendingSettlementControl.disabled = pendingSettlement?.state === 'saving';
  retryPendingSettlementControl.textContent = messages.retryPendingSettlement;
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
  const defeatFeedback = summarizeEnemyDefeats(events, view.enemies);
  if (defeatFeedback.length > 0) lastDefeatFeedback = defeatFeedback;
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
      + messages.selectedCell(unit.cell.x + 1, unit.cell.y + 1)
    : messages.none;
  if (status.textContent !== selectionText) status.textContent = selectionText;
  simulationSpeedValue.textContent = simulationSpeed + '×';
  soundToggleButton.textContent = soundEnabled ? messages.soundOn : messages.soundOff;
  soundToggleButton.setAttribute('aria-pressed', String(soundEnabled));
  soundPlaybackStatus.hidden = failedSoundElements.size === 0;
  soundPlaybackStatus.textContent = failedSoundElements.size > 0 ? messages.soundPlaybackFailed : '';
  retrySoundPlaybackButton.hidden = failedSoundElements.size === 0 || !soundEnabled;
  retrySoundPlaybackButton.textContent = messages.retrySoundPlayback;
  const pauseMessage = view.paused && pauseReason !== 'wave-intro'
    ? pauseReason === 'background' ? messages.battlePausedInBackground : messages.battlePaused
    : '';
  pauseStatus.textContent = pauseMessage;
  pauseStatus.hidden = !view.paused || pauseReason === 'wave-intro';
  pauseControl.textContent = view.paused ? messages.resumeBattle : messages.pauseBattle;
  pauseControl.disabled = actionLocked || pauseReason === 'wave-intro' || (!view.paused
    && view.wave?.phase !== 'active'
    && !view.units.some((candidate) => candidate.moving));
  singleStepControl.textContent = messages.singleStep;
  singleStepControl.disabled = actionLocked || pauseReason === 'wave-intro' || !view.paused || view.wave?.settlement !== undefined;
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
  const inspectionRoutes = view.routes ?? (view.route ? [view.route] : []);
  inspectionRoute.textContent = messages.inspectionRoute(inspectionRoutes.length
    ? inspectionRoutes.map((route, index) => `${inspectionRoutes.length > 1 ? `${index + 1}: ` : ''}${route.map((point) => `(${point.x.toFixed(1)}, ${point.y.toFixed(1)})`).join(' → ')}`).join(' · ')
    : messages.noRoute);
  const settingsText = settingsStatusKey ? messages[settingsStatusKey] : '';
  if (settingsStatus.textContent !== settingsText) settingsStatus.textContent = settingsText;
  const campaignMenuSettingsStatus = campaignMenuView.querySelector<HTMLElement>('[data-testid="menu-settings-status"]');
  if (campaignMenuSettingsStatus) campaignMenuSettingsStatus.textContent = settingsText;
  simulationSpeedInput.disabled = !campaignProgressView && !profileLoadFailed;
  soundToggleButton.disabled = !campaignProgressView && !profileLoadFailed;
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
  } else {
    waveStatus.textContent = '';
    startWaveControl.textContent = messages.startSample;
  }
  const combatText = lastDefeatFeedback
    .map(({ enemyType, count, cashReward }) => messages.defeated(enemyType, count, cashReward))
    .join(' · ');
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
  recruitControl.hidden = session.startRecord.mode === 'formal' || !recruitDefinition;
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
  const techTownTrainSample = view.scenarioId === techTownTrainTestContent.id;
  sceneTitle.textContent = upgradeScenario
    ? messages.upgradeSceneTitle
    : techTownTrainSample
      ? techTownTrainTestContent.title[language]
    : originalWaveScenario
      ? originalWaveContent.title[language]
    : activeCampaignStage?.title[language] ?? 'Cow Gulch';
  sceneContext.textContent = upgradeScenario
    ? messages.upgradeSceneContext
    : techTownTrainSample
      ? language === 'zh' ? '开发测试 · 列车' : 'DEVELOPER TEST · TRAIN'
    : originalWaveScenario
      ? messages.originalWaveContext
    : activeCampaignStage ? `NEW MEXICO · ${String(activeCampaignStage.globalLevel).padStart(2, '0')}`
      : language === 'zh' ? '进度验收样本' : 'PROGRESS SAMPLE';
  sceneCaption.textContent = messages.sceneCaption(view.scenarioId);
  upgradeSampleStatus.textContent = techTownTrainSample
    ? ''
    : upgradeScenario
    ? messages.debugUpgradeFixture
    : originalWaveScenario ? originalWaveNotice
      : activeCampaignStage?.scenarioId === apacheValleyLevelTwoContent.id
        ? messages.apacheValleyNotice
        : activeCampaignStage ? messages.originalCampaignNotice : messages.originalUpgradeLimit;
  const selectedUnit = unit;
  const upgradeUnitName = selectedUnit
    ? messages.unitName(selectedUnit.type)
    : messages.unitName('gunslinger');
  const nextUpgrade = selectedUnit?.nextUpgrade;
  let upgradeText = '';
  if (lastUpgradeEvent?.type === 'unit-upgraded') {
    const upgradedUnitId = lastUpgradeEvent.unitId;
    const unitName = messages.unitName(view.units.find(({ id }) => id === upgradedUnitId)?.type ?? 'gunslinger');
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
    upgradeControl.textContent = messages.upgradeButton(upgradeUnitName, nextUpgrade.price);
  } else {
    upgradeControl.textContent = messages.upgradeButton(upgradeUnitName, 0);
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
  if (pendingMapHireUnitId) renderMapHireConfirmation(language);
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
  if (settlement && mapHireConfirmation.open) closeMapHireConfirmation();
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
  startWaveControl.hidden = !view.wave || Boolean(view.wave.totalWaves && !campaignExhausted);
  startWaveControl.disabled = assetLoadFailureNames.length > 0 || actionLocked || !waveNotStarted || view.paused;
  recruitControl.disabled = actionLocked || Boolean(settlement) || !recruitDefinition || view.paused;
  upgradeControl.hidden = !nextUpgrade;
  upgradeControl.disabled = actionLocked || Boolean(settlement) || !nextUpgrade || view.paused;
  startUpgradeSampleControl.hidden = upgradeScenario || originalWaveScenario || Boolean(activeCampaignStage);
  returnCowGulchControl.hidden = !upgradeScenario && !originalWaveScenario && !activeCampaignStage;
  returnCowGulchControl.textContent = messages.returnCowGulchSample;
  restartControl.textContent = activeCampaignStage ? messages.restartLevel : messages.restartSample;
  startDefeatControl.disabled = actionLocked || !waveNotStarted || view.scenarioId !== 'cow-gulch' || view.paused;
  clearSelectionControl.disabled = actionLocked || Boolean(settlement) || view.paused;
  const canvasLabel = techTownTrainSample
    ? language === 'zh' ? 'Tech Town 列车与加特林测试地图' : 'Tech Town train and Gatling test map'
    : upgradeScenario
    ? language === 'zh' ? '牛溪谷升级规则测试地图' : 'Cow Gulch upgrade rules test map'
    : activeCampaignStage
      ? language === 'zh' ? `${activeCampaignStage.title[language]}游戏地图` : `${activeCampaignStage.title[language]} game map`
      : language === 'zh' ? '牛溪谷游戏地图' : 'Cow Gulch game map';
  if (canvas.getAttribute('aria-label') !== canvasLabel) canvas.setAttribute('aria-label', canvasLabel);
}

function clearGamblerDialogTimers(): void {
  for (const timer of gamblerDialogTimers) window.clearTimeout(timer);
  gamblerDialogTimers = [];
}

function cardAssetUrl(assetName: string): string {
  return images[assetName]?.src
    ?? new URL(import.meta.env.BASE_URL + 'assets/' + gameAssetRelativePath(assetName), window.location.href).toString();
}

function updateGamblerCardLabels(round: GamblerRoundState, language: keyof typeof gamblerDialogCopy): void {
  if (!round) return;
  [...gamblerCards.children].forEach((element, index) => {
    const card = round.cards[index];
    if (!card || !(element instanceof HTMLLIElement)) return;
    element.setAttribute('aria-label', gamblerCardLabel(card, language));
    const front = element.querySelector<HTMLElement>('.gambler-card-front');
    front?.setAttribute('aria-label', gamblerCardLabel(card, language));
  });
}

function renderGamblerCards(round: GamblerRoundState, language: keyof typeof gamblerDialogCopy): void {
  if (!round) return;
  if (gamblerDialogRoundId !== round.id) {
    gamblerDialogRoundId = round.id;
    const nodes = round.cards.map((card, index) => {
      const item = document.createElement('li');
      item.className = card.important ? 'gambler-card is-important' : 'gambler-card';
      item.style.setProperty('--card-index', String(index));
      const scale = gameFrame.getBoundingClientRect().width / GAME_VIEWPORT.width;
      item.style.setProperty('--collect-offset', `${(60 + 8 * index) * scale}px`);
      item.style.setProperty('--final-offset', `${(card.important ? 0 : 16 + index) * scale}px`);
      item.style.setProperty('--card-duration', `${350 + 15 * index}ms`);
      item.dataset.suit = String((card.suitCode >>> 8) & 0x3);
      item.setAttribute('aria-label', gamblerCardLabel(card, language));

      const back = document.createElement('img');
      back.className = 'gambler-card-back';
      back.src = cardAssetUrl('card_back');
      back.alt = '';
      back.draggable = false;

      const front = document.createElement('div');
      front.className = 'gambler-card-front';
      front.setAttribute('role', 'img');
      front.setAttribute('aria-label', gamblerCardLabel(card, language));
      front.style.backgroundImage = `url("${cardAssetUrl('card_front')}")`;

      const rank = document.createElement('span');
      rank.className = 'gambler-card-rank';
      rank.dataset.rank = String(card.rank);
      rank.style.backgroundImage = `url("${cardAssetUrl('card_numbers')}")`;
      rank.style.backgroundSize = '208px 16px';
      rank.style.backgroundPosition = `${-card.rank * 16}px 0`;
      rank.setAttribute('aria-hidden', 'true');

      const suit = document.createElement('span');
      suit.className = 'gambler-card-suit';
      suit.dataset.suit = String((card.suitCode >>> 8) & 0x3);
      suit.style.backgroundImage = `url("${cardAssetUrl('card_symbols')}")`;
      suit.style.backgroundSize = '64px 16px';
      suit.style.backgroundPosition = `${-(((card.suitCode >>> 8) & 0x3) * 16)}px 0`;
      suit.setAttribute('aria-hidden', 'true');
      front.append(rank, suit);
      item.append(back, front);
      return item;
    });
    gamblerCards.replaceChildren(...nodes);
    gamblerCards.dataset.phase = 'hidden';
    if (gamblerDialogMode === 'revealing') {
      window.requestAnimationFrame(() => {
        if (gamblerDialog.open && gamblerDialogMode === 'revealing') gamblerCards.dataset.phase = 'collecting';
      });
    }
  }
  updateGamblerCardLabels(round, language);
}

function renderGamblerDialog(language: keyof typeof languageMessages, actionLocked = replaying || replacingSession): void {
  if (!gamblerDialog.open || !gamblerDialogUnitId) return;
  const unit = view.units.find(({ id, type }) => id === gamblerDialogUnitId && type === 'gambler');
  const gambler = unit?.gambler;
  if (!unit || !gambler) {
    closeGamblerDialog();
    return;
  }

  const copy = gamblerDialogCopy[language];
  const cash = view.wave?.cash ?? 0;
  const stake = gambler.nextStake;
  const round = gambler.lastRound?.id === gamblerDialogRoundId ? gambler.lastRound : undefined;
  gamblerDialogTitle.textContent = copy.title;
  gamblerPortrait.src = cardAssetUrl('portrait_gambler');
  gamblerCash.textContent = copy.cashAndStake(cash, stake);
  gamblerCards.setAttribute('aria-label', copy.cards);
  playGamblerControl.textContent = copy.play(stake);
  closeGamblerControl.textContent = gamblerDialogMode === 'result' ? copy.done : copy.cancel;
  closeGamblerControl.hidden = gamblerDialogMode === 'revealing';
  playGamblerControl.hidden = gamblerDialogMode !== 'prompt';
  playGamblerControl.disabled = actionLocked || view.paused || !unit.selected || !view.wave
    || cash < stake || gambler.cooldownRemainingMs > 0;

  if (gamblerDialogMode === 'revealing') {
    gamblerDialogMessage.textContent = copy.dealing;
    gamblerResult.textContent = '';
    if (round) renderGamblerCards(round, language);
    return;
  }

  if (gamblerDialogMode === 'result' && round) {
    gamblerDialogMessage.textContent = copy.result[round.outcome.hand];
    gamblerResult.textContent = gamblerPrizeMessage(round.outcome, language);
    gamblerCards.dataset.phase = 'result';
    renderGamblerCards(round, language);
    return;
  }

  gamblerCards.replaceChildren();
  delete gamblerCards.dataset.phase;
  gamblerDialogRoundId = undefined;
  gamblerResult.textContent = '';
  if (view.paused) gamblerDialogMessage.textContent = copy.paused;
  else if (gambler.cooldownRemainingMs > 0) gamblerDialogMessage.textContent = copy.cooldown(gambler.cooldownRemainingMs);
  else if (cash < stake) gamblerDialogMessage.textContent = copy.insufficientCash(stake, cash);
  else gamblerDialogMessage.textContent = copy.prompt;
}

function closeGamblerDialog(): void {
  clearGamblerDialogTimers();
  gamblerDialogMode = 'closed';
  gamblerDialogUnitId = undefined;
  gamblerDialogRoundId = undefined;
  if (gamblerDialog.open) gamblerDialog.close();
  gamblerCards.replaceChildren();
  canvas.focus({ preventScroll: true });
}

function openGamblerDialog(unitId: string): void {
  if (gamblerDialog.open || replaying || replacingSession || view.wave?.settlement) return;
  const unit = view.units.find(({ id, type }) => id === unitId && type === 'gambler');
  if (!unit?.gambler) return;
  clearGamblerDialogTimers();
  gamblerDialogMode = 'prompt';
  gamblerDialogUnitId = unitId;
  gamblerDialogRoundId = undefined;
  gamblerCards.replaceChildren();
  gamblerDialog.show();
  renderGamblerDialog(getLanguage());
  (playGamblerControl.disabled ? closeGamblerControl : playGamblerControl).focus({ preventScroll: true });
}

function playGamblerRound(): void {
  if (!gamblerDialog.open || gamblerDialogMode !== 'prompt' || !gamblerDialogUnitId || playGamblerControl.disabled) return;
  const unitId = gamblerDialogUnitId;
  const previousRoundId = view.units.find(({ id }) => id === unitId)?.gambler?.lastRound?.id;
  gamblerDialogMode = 'revealing';
  gamblerDialogMessage.textContent = gamblerDialogCopy[getLanguage()].dealing;
  gamblerResult.textContent = '';
  dispatch({ type: 'play-gambler', unitId, commandId: `${session.id}:gambler:${++gamblerCommandNumber}` });

  const round = view.units.find(({ id }) => id === unitId)?.gambler?.lastRound;
  if (!round || round.id === previousRoundId) {
    gamblerDialogMode = 'prompt';
    renderGamblerDialog(getLanguage());
    return;
  }

  renderGamblerCards(round, getLanguage());
  playAudioAsset('sound_cards_collect');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gamblerCards.dataset.phase = 'dealing';
    playAudioAsset('sound_cards_deal');
    gamblerCards.dataset.phase = 'result';
    gamblerDialogMode = 'result';
    renderStatus();
    return;
  }

  gamblerCards.dataset.phase = 'collecting';
  gamblerDialogTimers.push(window.setTimeout(() => {
    if (!gamblerDialog.open || gamblerDialogMode !== 'revealing') return;
    playAudioAsset('sound_cards_deal');
    gamblerCards.dataset.phase = 'dealing';
    gamblerDialogTimers.push(window.setTimeout(() => {
      if (!gamblerDialog.open || gamblerDialogMode !== 'revealing') return;
      gamblerCards.dataset.phase = 'result';
      gamblerDialogMode = 'result';
      renderStatus();
      closeGamblerControl.focus({ preventScroll: true });
    }, 410));
  }, 410));
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
  const unitName = messages.unitName(unit.type);
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

function renderMapHireConfirmation(language: keyof typeof languageMessages): void {
  const unit = view.units.find((candidate) => candidate.id === pendingMapHireUnitId);
  if (!unit || !unit.selected || unit.activity !== 4 || unit.hirePrice === undefined || !view.wave) {
    closeMapHireConfirmation();
    return;
  }

  const price = unit.hirePrice;
  const cash = view.wave.cash;
  const affordable = cash >= price;
  mapHireConfirmationTitle.textContent = languageMessages[language].mapHirePrompt(
    languageMessages[language].unitName(unit.type),
    price,
  );
  mapHireConfirmationDetails.textContent = affordable
    ? ''
    : languageMessages[language].mapHireInsufficientCash(price, cash);
  confirmMapHireControl.textContent = languageMessages[language].confirmMapHire;
  confirmMapHireControl.hidden = !affordable;
  confirmMapHireControl.disabled = !affordable;
  cancelMapHireControl.textContent = affordable
    ? languageMessages[language].cancelMapHire
    : languageMessages[language].closeMapHire;
}

function closeMapHireConfirmation(): void {
  pendingMapHireUnitId = undefined;
  if (mapHireConfirmation.open) mapHireConfirmation.close();
  confirmMapHireControl.hidden = false;
  confirmMapHireControl.disabled = false;
}

function openMapHireConfirmation(unitId: string): void {
  if (mapHireConfirmation.open || replaying || replacingSession || view.paused
    || Boolean(view.wave?.settlement)) return;
  const unit = view.units.find((candidate) => candidate.id === unitId && candidate.selected
    && candidate.activity === 4 && candidate.hirePrice !== undefined);
  if (!unit || !view.wave) return;
  pendingMapHireUnitId = unit.id;
  renderMapHireConfirmation(getLanguage());
  mapHireConfirmation.show();
  (confirmMapHireControl.hidden ? cancelMapHireControl : confirmMapHireControl).focus({ preventScroll: true });
}

function redraw(resize = false): void {
  const viewportChanged = syncGameViewportToCanvas();
  const displayPixelScale = getDisplayPixelScale();
  if (resize || viewportChanged || !context) context = resizeCanvas(canvas, displayPixelScale);
  try {
    drawGame(context, view, images, displayPixelScale, mapCamera, showInspectionOverlay, getLanguage());
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    const missingImage = /^Missing game image: (.+)$/.exec(error.message)?.[1];
    if (!missingImage) throw error;
    if (!assetLoadFailureNames.includes(missingImage)) assetLoadFailureNames = [...assetLoadFailureNames, missingImage];
    context.save();
    context.fillStyle = '#251c14';
    context.fillRect(0, 0, GAME_VIEWPORT.width, GAME_VIEWPORT.height);
    context.fillStyle = '#f5ead4';
    context.font = '18px ui-sans-serif, system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(languageMessages[getLanguage()].canvasAssetFallback, GAME_VIEWPORT.width / 2, GAME_VIEWPORT.height / 2);
    context.restore();
  }
}

function syncGameViewportToCanvas(): boolean {
  const logicalViewport = document.fullscreenElement === gameFrame
    ? fitLogicalViewportToScreen(
      canvas.clientWidth,
      canvas.clientHeight,
      BASE_GAME_VIEWPORT.width,
      BASE_GAME_VIEWPORT.height,
    )
    : BASE_GAME_VIEWPORT;
  const changed = Math.abs(GAME_VIEWPORT.width - logicalViewport.width) >= 0.01
    || Math.abs(GAME_VIEWPORT.height - logicalViewport.height) >= 0.01;
  if (changed) setGameViewport(logicalViewport.width, logicalViewport.height);
  return changed;
}

function getDisplayPixelScale(): number {
  const cssWidth = canvas.getBoundingClientRect().width;
  const cssScale = cssWidth > 0 ? cssWidth / GAME_VIEWPORT.width : 1;
  return cssScale * Math.max(1, window.devicePixelRatio || 1);
}

function currentGameStepEnvironment(): { tileSizePixels: number } {
  const displayPixelScale = getDisplayPixelScale();
  const mapViewport = getMapViewport(view, displayPixelScale, mapCamera);
  return { tileSizePixels: Math.max(1, Math.trunc(mapViewport.tileSize * displayPixelScale)) };
}

const assetNames = new Set([
  ...techTownMapEntityAssets,
  ...techTownTrainTestContent.map.background.map(({ asset }) => asset),
  ...techTownTrainTestContent.map.streets.map(({ asset }) => asset),
  ...(techTownTrainTestContent.map.decorations ?? []).map(({ asset }) => asset),
  ...techTownTrainTestContent.units.map(({ asset }) => asset),
  ...gamblerDialogAssets,
  ...view.map.background.map((tile) => tile.asset),
  ...view.map.streets.map((tile) => tile.asset),
  ...(view.map.decorations ?? []).map((decoration) => decoration.asset),
  ...view.units.map((unit) => unit.asset),
  ...(view.units.some((unit) => unit.activity === 4) ? ['sfx_sleeping'] : []),
  ...[cowGulchLevelOneContent, apacheValleyContent, fortKaboomLevelThreeContent].flatMap((content) => [
    ...content.map.background.map((tile) => tile.asset),
    ...content.map.streets.map((tile) => tile.asset),
    ...(content.map.decorations ?? []).map((decoration) => decoration.asset),
    ...content.units.map((unit) => unit.asset),
  ]),
  'pioneer_male',
  'pioneer_female',
  'horseman',
  'horseman_turn',
  'wagon',
  'wagon_turn',
  'stagecoach',
  'stagecoach_turn',
  'goldtransport',
  'goldtransport_turn',
  'horse_wagon',
  'horse_wagon_white',
  'horse_wagon_turn',
  'horse_wagon_turn_white',
  'gng_frame',
  'sfx_death_pioneers',
  'sfx_smoke_explosion',
  'sfx_exploding_parts',
  'bonus_box',
  'sfx_bonus_box',
  'gng_speechbubble',
  'sfx_lok_steam',
  'hud_bonus_sheriff',
  'hud_bonus_cash',
  'hud_bonus_speed',
  'hud_bonus_damage',
  'player_gatling',
  'player_gatling_shot',
  'player_gunslinger_shot',
  'player_mexican',
  'player_mexican_shot',
  'player_cannon',
  'player_cannon_sleep',
  'player_cannon_shot',
  'player_indian',
  'player_indian_sleep',
  'player_indian_shot',
  'player_scout',
  'player_scout_sleep',
  'player_scout_shot',
  'player_geezer',
  'player_geezer_sleep',
  'player_geezer_shot',
  'player_pyromaniac',
  'player_pyromaniac_sleep',
  'player_pyromaniac_shot',
  'player_salesman',
  'player_salesman_sleep',
  'player_salesman_shot',
  'cursor',
  'hud_crosshair',
  'sfx_mexican_dynamite',
  'sfx_explosion',
  'sfx_pyromaniac_rocket',
  'sfx_salesman_bottle',
  'sfx_poison',
  'sfx_rocket_explosion',
  'sfx_rocket_sparkles',
  'gng_wave_arrow_a',
  'gng_wave_arrow_b',
  'gng_wave_arrow_c',
  'gng_wave_arrow_d',
  'boss_hat',
  'gng_hud_0_top',
  'gng_hud_0_top_left',
  'gng_hud_0_top_right',
  'gng_hud_1_top_pause',
  'gng_hud_1_top_pause_pressed',
  'gng_hud_1_top_star',
  'gng_hud_1_top_star_0',
  'hud_font_numbers_scaled',
  'portrait_pedro',
  'portrait_indian',
  'portrait_settlers',
  'portrait_deserter',
  'portrait_pyromaniac',
  'portrait_salesman',
]);
const images: Record<string, HTMLImageElement> = {};
const audioElements = new Map<string, HTMLAudioElement[]>();
let presentationRandom = new JavaUtilRandom(deriveSessionRandomSeed(session.startRecord.randomSeed, 'presentation'));
const gameSoundEffects = new SoundEffectsManager((bound) => presentationRandom.nextInt(bound));
let backgroundMusic: HTMLAudioElement | undefined;
let backgroundMusicTrack: CowGulchMusicTrack | undefined;
let battleMusicWaveNumber: number | undefined;
const blockedSoundElements = new Map<string, Set<HTMLAudioElement>>();
let audioUserGestureObserved = false;

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
  image.src = new URL(import.meta.env.BASE_URL + 'assets/' + gameAssetRelativePath(assetName), window.location.href).toString();
  await image.decode();
  images[assetName] = image;
}

async function loadGameAssets(): Promise<string[]> {
  const results = await Promise.all([...assetNames].map(async (assetName) => {
    try {
      await loadImage(assetName);
      return undefined;
    } catch {
      delete images[assetName];
      return assetName;
    }
  }));
  return results.filter((assetName): assetName is string => assetName !== undefined);
}

const [failedAssets] = await Promise.all([loadGameAssets(), loadSettings()]);
assetLoadFailureNames = failedAssets;
redraw(true);
renderStatus();

type FullscreenStatusKey =
  | 'fullscreenUnsupported'
  | 'fullscreenRequestFailed'
  | 'fullscreenExitFailed'
  | 'fullscreenLandscapeLocked'
  | 'fullscreenLandscapeUnavailable';
let fullscreenStatusKey: FullscreenStatusKey | undefined;

function renderFullscreenControl(): void {
  const fullscreenActive = document.fullscreenElement === gameFrame;
  gameFrame.classList.toggle('is-fullscreen', fullscreenActive);
  document.body.classList.toggle('gng-game-fullscreen', fullscreenActive);
  const label = fullscreenActive
    ? languageMessages[getLanguage()].fullscreenExit
    : languageMessages[getLanguage()].fullscreenEnter;
  fullscreenToggleButton.textContent = '⛶';
  fullscreenToggleButton.setAttribute('aria-label', label);
  fullscreenToggleButton.title = label;
  fullscreenToggleButton.setAttribute('aria-pressed', String(fullscreenActive));
}

function renderFullscreenStatus(): void {
  const message = fullscreenStatusKey ? languageMessages[getLanguage()][fullscreenStatusKey] : undefined;
  fullscreenStatus.textContent = message ?? '';
  fullscreenStatus.hidden = message === undefined;
}

function setFullscreenStatus(key?: FullscreenStatusKey): void {
  fullscreenStatusKey = key;
  renderFullscreenStatus();
}

function supportsTouchOrientationLock(): boolean {
  return navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
}

async function toggleGameFullscreen(): Promise<void> {
  if (document.fullscreenElement === gameFrame) {
    if (typeof document.exitFullscreen !== 'function') {
      setFullscreenStatus('fullscreenExitFailed');
      return;
    }
    try {
      await document.exitFullscreen();
    } catch {
      setFullscreenStatus('fullscreenExitFailed');
    }
    return;
  }

  if (typeof gameFrame.requestFullscreen !== 'function') {
    setFullscreenStatus('fullscreenUnsupported');
    return;
  }

  try {
    await gameFrame.requestFullscreen();
  } catch {
    setFullscreenStatus('fullscreenRequestFailed');
    return;
  }

  renderFullscreenControl();
  if (!supportsTouchOrientationLock()) {
    setFullscreenStatus();
    return;
  }

  try {
    const orientation = screen.orientation;
    if (!orientation || typeof orientation.lock !== 'function') {
      setFullscreenStatus('fullscreenLandscapeUnavailable');
      return;
    }
    await orientation.lock('landscape');
    setFullscreenStatus('fullscreenLandscapeLocked');
  } catch {
    setFullscreenStatus('fullscreenLandscapeUnavailable');
  }
}

fullscreenToggleButton.addEventListener('click', () => void toggleGameFullscreen());
renderFullscreenControl();
document.addEventListener('fullscreenchange', () => {
  const fullscreenActive = document.fullscreenElement === gameFrame;
  renderFullscreenControl();
  if (!fullscreenActive) {
    setFullscreenStatus();
    try {
      screen.orientation?.unlock();
    } catch {
      // Orientation unlock may be unavailable or rejected after a browser-controlled exit.
    }
  }
  redraw(true);
});
window.addEventListener('orientationchange', () => redraw(true));
screen.orientation?.addEventListener('change', () => redraw(true));

if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(() => redraw(true)).observe(gameFrame);
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
type MapPanGesture = { kind: 'world' | 'minimap'; lastPoint: PointerPoint };

let activePointerId: number | undefined;
let activePointerOrigin: PointerPoint | undefined;
let activeDragUnitId: string | undefined;
let dragStarted = false;
let pointerMovedBeyondTolerance = false;
let multiTouchGestureLocked = false;
let pinchGesture: PinchGesture | undefined;
let activeMapPan: MapPanGesture | undefined;
const trackedPointers = new Map<number, TrackedPointer>();
const DRAG_START_TOLERANCE = 20;
const MINIMAP_DRAG_START_TOLERANCE = 2;

function stopGameLoop(): void {
  loopGeneration += 1;
  if (animationFrame !== 0) window.cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  previousTimestamp = undefined;
  simulationTime.reset();
}

function isOfficialCowGulchSession(): boolean {
  return session.startRecord.mode === 'formal'
    && session.startRecord.scenarioId === cowGulchLevelOneContent.id;
}

function waveIntrosForScenario(scenarioId: string): readonly CampaignWaveIntro[] {
  if (scenarioId === cowGulchLevelOneContent.id) return cowGulchWaveIntros;
  if (scenarioId === apacheValleyLevelTwoContent.id) return apacheValleyWaveIntros;
  if (scenarioId === fortKaboomLevelThreeContent.id) return fortKaboomWaveIntros;
  return [];
}

function isOfficialCampaignSession(): boolean {
  return session.startRecord.mode === 'formal'
    && officialCampaignStages.some(({ scenarioId }) => scenarioId === session.startRecord.scenarioId);
}

function removeAudioPlayer(
  playersBySound: Map<string, Set<HTMLAudioElement>>,
  sound: string,
  audio: HTMLAudioElement,
): void {
  const players = playersBySound.get(sound);
  if (!players) return;
  players.delete(audio);
  if (players.size === 0) playersBySound.delete(sound);
}

function isAutoplayPolicyRejection(error: unknown): boolean {
  return typeof error === 'object' && error !== null
    && 'name' in error && error.name === 'NotAllowedError';
}

function recordSoundPlaybackFailure(sound: string, audio: HTMLAudioElement): void {
  removeAudioPlayer(blockedSoundElements, sound, audio);
  const failedPlayers = failedSoundElements.get(sound) ?? new Set<HTMLAudioElement>();
  if (failedPlayers.has(audio)) return;
  failedPlayers.add(audio);
  failedSoundElements.set(sound, failedPlayers);
  renderStatus();
}

function handleSoundPlaybackFailure(sound: string, audio: HTMLAudioElement, error: unknown): void {
  if (!audioUserGestureObserved && isAutoplayPolicyRejection(error)) {
    const blockedPlayers = blockedSoundElements.get(sound) ?? new Set<HTMLAudioElement>();
    blockedPlayers.add(audio);
    blockedSoundElements.set(sound, blockedPlayers);
    return;
  }
  recordSoundPlaybackFailure(sound, audio);
}

function playSound(sound: string, audio: HTMLAudioElement, resetPosition = true): void {
  try {
    if (resetPosition) audio.currentTime = 0;
    removeAudioPlayer(blockedSoundElements, sound, audio);
    void audio.play().then(() => {
      removeAudioPlayer(blockedSoundElements, sound, audio);
      const failedPlayers = failedSoundElements.get(sound);
      if (!failedPlayers?.delete(audio)) return;
      if (failedPlayers.size === 0) failedSoundElements.delete(sound);
      renderStatus();
    }).catch((error: unknown) => handleSoundPlaybackFailure(sound, audio, error));
  } catch (error) {
    handleSoundPlaybackFailure(sound, audio, error);
  }
}

function eventTargetsSoundToggle(event: Event): boolean {
  const target = event.target;
  return target instanceof Element && target.closest('[data-action="toggle-sound"]') !== null;
}

function retryCurrentAudioOnFirstGesture(event: Event): void {
  if (audioUserGestureObserved) return;
  audioUserGestureObserved = true;
  document.removeEventListener('pointerdown', retryCurrentAudioOnFirstGesture, true);
  document.removeEventListener('keydown', retryCurrentAudioOnFirstGesture, true);

  const pending = [...blockedSoundElements.entries()];
  blockedSoundElements.clear();
  if (!soundEnabled || document.hidden || eventTargetsSoundToggle(event)) return;

  const currentMusicSound = backgroundMusicTrack ? `music:${backgroundMusicTrack}` : undefined;
  const currentVoiceSound = pendingCampaignWaveIntro?.voiceSound;
  for (const [sound, players] of pending) {
    for (const audio of players) {
      const currentMusic = audio === backgroundMusic && sound === currentMusicSound;
      const currentVoice = audio !== backgroundMusic && sound === currentVoiceSound;
      if (currentMusic || currentVoice) playSound(sound, audio, !currentMusic);
    }
  }
}

document.addEventListener('pointerdown', retryCurrentAudioOnFirstGesture, true);
document.addEventListener('keydown', retryCurrentAudioOnFirstGesture, true);

function retryFailedSoundPlayback(): void {
  for (const [sound, players] of failedSoundElements) {
    for (const audio of players) playSound(sound, audio, audio !== backgroundMusic);
  }
}

function playAudioAsset(sound: string): void {
  if (!soundEnabled) return;
  const players = audioElements.get(sound) ?? [];
  const audio = acquireAudioPlayer(players, () => {
    const createdAudio = new Audio(new URL(
      import.meta.env.BASE_URL + 'assets/sounds/' + sound + '.ogg',
      window.location.href,
    ).toString());
    createdAudio.addEventListener('error', () => recordSoundPlaybackFailure(sound, createdAudio));
    return createdAudio;
  });
  if (!audio) return;
  audioElements.set(sound, players);
  playSound(sound, audio);
}

function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  if (enabled) {
    playBackgroundMusic();
    return;
  }
  blockedSoundElements.clear();
  silenceAudioPlayers([...audioElements.values()].flat());
  pauseBackgroundMusic(true);
}

function playBackgroundMusic(): void {
  if (!soundEnabled || document.hidden || !backgroundMusic || !backgroundMusicTrack || !backgroundMusic.paused) return;
  playSound(`music:${backgroundMusicTrack}`, backgroundMusic, false);
}

function pauseBackgroundMusic(resetPosition = false): void {
  if (!backgroundMusic) return;
  backgroundMusic.pause();
  if (resetPosition) backgroundMusic.currentTime = 0;
}

function setCowGulchBackgroundMusic(track: CowGulchMusicTrack): void {
  if (!isOfficialCowGulchSession()) return;
  if (backgroundMusicTrack === track && backgroundMusic) {
    playBackgroundMusic();
    return;
  }

  if (backgroundMusicTrack) {
    failedSoundElements.delete(`music:${backgroundMusicTrack}`);
    if (backgroundMusic) removeAudioPlayer(blockedSoundElements, `music:${backgroundMusicTrack}`, backgroundMusic);
  }
  pauseBackgroundMusic(true);
  backgroundMusicTrack = track;
  if (!backgroundMusic) {
    const audio = new Audio();
    audio.loop = true;
    audio.addEventListener('error', () => {
      const activeTrack = backgroundMusicTrack;
      if (activeTrack) recordSoundPlaybackFailure(`music:${activeTrack}`, audio);
    });
    backgroundMusic = audio;
  }
  backgroundMusic.src = new URL(
    import.meta.env.BASE_URL + 'assets/music/' + track + '.ogg',
    window.location.href,
  ).toString();
  backgroundMusic.load();
  playBackgroundMusic();
  renderStatus();
}

function stopCowGulchBackgroundMusic(): void {
  pauseBackgroundMusic(true);
  if (backgroundMusicTrack) {
    failedSoundElements.delete(`music:${backgroundMusicTrack}`);
    if (backgroundMusic) removeAudioPlayer(blockedSoundElements, `music:${backgroundMusicTrack}`, backgroundMusic);
  }
  backgroundMusicTrack = undefined;
  battleMusicWaveNumber = undefined;
}

function retryCampaignWaveIntroVoice(): void {
  const intro = pendingCampaignWaveIntro;
  if (intro?.voiceSound && soundEnabled) playAudioAsset(intro.voiceSound);
}

const positionalUnitShotSounds: Readonly<Record<UnitShotSound, { id: number; assets: readonly string[] }>> = {
  sound_cannon: { id: 1, assets: ['sound_cannon', 'sound_cannon2'] },
  sound_fire_arrow: { id: 2, assets: ['sound_fire_arrow', 'sound_fire_arrow2'] },
  sound_gattling_gun: { id: 3, assets: ['sound_gattling_gun', 'sound_gattling_gun2'] },
  sound_shotgun: { id: 4, assets: ['sound_shotgun', 'sound_shotgun'] },
  sound_rifle: { id: 5, assets: ['sound_rifle', 'sound_rifle'] },
  sound_rocket_launch: { id: 6, assets: ['sound_rocket_launch_1', 'sound_rocket_launch_2'] },
  sound_rocket_explosion: { id: 7, assets: ['sound_rocket_explosion_1', 'sound_rocket_explosion_2'] },
  sound_poison_splash: { id: 8, assets: ['sound_poison_splash_1', 'sound_poison_splash_2'] },
};
const unitHireSoundVariations = {
  sound_pyromaniac: ['sound_pyromaniac_1', 'sound_pyromaniac_2'],
  sound_snakeoilsalesman: ['sound_snakeoilsalesman_1', 'sound_snakeoilsalesman_2'],
} as const;

function playRequestedSounds(
  events: readonly GameEvent[],
  eventWaveNumber = view.wave?.number,
  deltaMs = 0,
): void {
  gameSoundEffects.advance(deltaMs);
  const mapViewport = getMapViewport(view, getDisplayPixelScale(), mapCamera);
  const soundViewport = {
    origin: mapViewport.origin,
    tileSize: mapViewport.tileSize,
    width: GAME_VIEWPORT.width,
    height: GAME_VIEWPORT.height,
  };
  for (const event of events) {
    if (event.type === 'sound-requested') {
      if (!('positionFine' in event)) {
        const variations = event.sound in unitHireSoundVariations
          ? unitHireSoundVariations[event.sound as keyof typeof unitHireSoundVariations]
          : undefined;
        playAudioAsset(variations ? chooseSoundVariation(variations, () => presentationRandom.nextDouble())! : event.sound);
        continue;
      }
      if (event.sound === 'sound_revolver') {
        const asset = gameSoundEffects.request({
          id: 0,
          positionFine: event.positionFine,
          assets: ['sound_revolver', 'sound_revolver2'],
        }, soundViewport);
        if (asset) playAudioAsset(asset);
      } else if (event.sound === 'sound_dynamite' || event.sound === 'sound_wagon_explode') {
        const asset = gameSoundEffects.request({
          id: event.sound === 'sound_dynamite' ? 10 : 12,
          positionFine: event.positionFine,
          assets: [event.sound],
        }, soundViewport);
        if (asset) playAudioAsset(asset);
      } else {
        const request = positionalUnitShotSounds[event.sound as UnitShotSound];
        if (request) {
          const asset = gameSoundEffects.request({
            ...request,
            positionFine: event.positionFine,
          }, soundViewport);
          if (asset) playAudioAsset(asset);
        }
      }
    }
    if (!isOfficialCowGulchSession()) continue;
    if (event.type === 'unit-fired' && eventWaveNumber !== undefined && battleMusicWaveNumber !== eventWaveNumber) {
      battleMusicWaveNumber = eventWaveNumber;
      // GameView numbers waves from 1; the APK's GunsAndGloryThread.wave counter starts at 0.
      setCowGulchBackgroundMusic(cowGulchBattleMusicForWave(eventWaveNumber - 1));
    }
    if (event.type === 'wave-settled') {
      setCowGulchBackgroundMusic(event.settlement.outcome === 'victory'
        ? cowGulchVictoryMusic
        : cowGulchAmbientMusic);
    }
  }
}

function renderCampaignWaveIntro(): void {
  const intro = pendingCampaignWaveIntro;
  if (!intro) return;
  const language = getLanguage();
  const totalWaves = view.wave?.totalWaves ?? 8;
  campaignWaveIntroWave.textContent = language === 'en'
    ? `Wave ${intro.waveNumber} of ${totalWaves}`
    : `第 ${intro.waveNumber} 波 · 共 ${totalWaves} 波`;
  campaignWaveIntroTitle.textContent = intro.speaker[language];
  campaignWaveIntroText.textContent = intro.text[language];
  campaignWaveIntroPortrait.alt = intro.speaker[language];
  const parchmentUrl = new URL(
    import.meta.env.BASE_URL + 'assets/gng_hud_2_textbox_large.png',
    window.location.href,
  ).toString();
  if (campaignWaveIntroParchment.src !== parchmentUrl) campaignWaveIntroParchment.src = parchmentUrl;
  const portraitUrl = new URL(
    import.meta.env.BASE_URL + 'assets/' + intro.portraitAsset + '.png',
    window.location.href,
  ).toString();
  if (campaignWaveIntroPortrait.src !== portraitUrl) campaignWaveIntroPortrait.src = portraitUrl;
  const confirmIconUrl = new URL(
    import.meta.env.BASE_URL + 'assets/gng_hud_2_yes.png',
    window.location.href,
  ).toString();
  if (campaignWaveIntroConfirmIcon.src !== confirmIconUrl) campaignWaveIntroConfirmIcon.src = confirmIconUrl;
  retryCampaignWaveIntroVoiceControl.textContent = languageMessages[language].retryWaveIntroVoice;
  retryCampaignWaveIntroVoiceControl.hidden = !soundEnabled || !intro.voiceSound || !failedSoundElements.has(intro.voiceSound);
  campaignWaveIntroContinueLabel.textContent = language === 'en' ? 'Continue' : '继续';
  retryCampaignWaveIntroVoiceControl.setAttribute('aria-label', languageMessages[language].retryWaveIntroVoice);
  campaignWaveIntroDialog.dataset.waveNumber = String(intro.waveNumber);
}

function showCampaignWaveIntroForCurrentWave(): boolean {
  if (!isOfficialCampaignSession() || !view.wave) return false;
  const intro = campaignWaveIntroCursor.next(view.wave.number);
  if (!intro) return false;
  battleMusicWaveNumber = undefined;
  if (isOfficialCowGulchSession()) setCowGulchBackgroundMusic(cowGulchAmbientMusic);
  pendingCampaignWaveIntro = intro;
  stopGameLoop();
  pauseReason = 'wave-intro';
  view = session.pause();
  gameFrame.scrollIntoView({ block: 'center', behavior: 'instant' });
  renderCampaignWaveIntro();
  if (!campaignWaveIntroDialog.open) campaignWaveIntroDialog.show();
  continueCampaignWaveIntroControl.focus({ preventScroll: true });
  if (intro.voiceSound) playAudioAsset(intro.voiceSound);
  return true;
}

function showCampaignWaveIntroAfterWaveChange(previousWaveNumber: number | undefined): boolean {
  return view.wave?.number !== previousWaveNumber && showCampaignWaveIntroForCurrentWave();
}

function continueCampaignWaveIntro(): void {
  if (!pendingCampaignWaveIntro) return;
  pendingCampaignWaveIntro = undefined;
  campaignWaveIntroDialog.close();
  playBackgroundMusic();
  if (pauseReason !== 'wave-intro' || !view.paused || document.hidden) return;
  gameFrame.scrollIntoView({ block: 'center', behavior: 'instant' });
  pauseReason = undefined;
  view = session.resume();
  renderStatus();
  redraw();
  startGameLoop();
}

function activateSession(
  nextSession: GameSession,
  nextReplayStatus?: ReplayStatusState,
  nextRestartMode?: Exclude<GameMode, 'replay'>,
): void {
  stopGameLoop();
  if (campaignWaveIntroDialog.open) campaignWaveIntroDialog.close();
  if (gamblerDialog.open) closeGamblerDialog();
  pendingCampaignWaveIntro = undefined;
  const previousSession = session;
  session = nextSession;
  presentationRandom = new JavaUtilRandom(deriveSessionRandomSeed(session.startRecord.randomSeed, 'presentation'));
  gameSoundEffects.reset();
  campaignWaveIntroCursor = new CampaignWaveIntroCursor(waveIntrosForScenario(session.startRecord.scenarioId));
  if (!isOfficialCowGulchSession()) stopCowGulchBackgroundMusic();
  view = session.observe();
  pauseReason = undefined;
  mapCamera = createMapCamera();
  previousSession.close();
  lastDefeatFeedback = [];
  lastRecruitmentEvent = undefined;
  lastMapHireEvent = undefined;
  pendingRecruitmentType = undefined;
  recruitmentCommandNumber = 0;
  lastUpgradeEvent = undefined;
  pendingUpgradeUnitId = undefined;
  upgradeCommandNumber = 0;
  gamblerCommandNumber = 0;
  if (recruitConfirmation.open) recruitConfirmation.close();
  if (upgradeConfirmation.open) upgradeConfirmation.close();
  confirmUpgradeControl.hidden = false;
  activeSettlementRecord = undefined;
  settlementSaveState = undefined;
  settlementPanel.hidden = true;
  replayStatusState = nextReplayStatus;
  restartModeOverride = nextRestartMode;
  showCampaignWaveIntroForCurrentWave();
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

async function openCampaignStage(scenarioId: string): Promise<boolean> {
  if (assetLoadFailureNames.length > 0 || campaignSelectionBusy || settingsSaveBusy) return false;
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
      return false;
    }
    if (stage.status === 'locked') {
      campaignFeedback = { type: 'locked', scenarioId };
      return false;
    }
    if (requestedDifficulty === 'hard' && !campaignProgressView.hardModeUnlocked) {
      selectedDifficulty = profile.settings.difficulty === 'hard' ? 'easy' : profile.settings.difficulty;
      campaignDifficultySelect.value = selectedDifficulty;
      campaignFeedback = { type: 'difficulty-locked' };
      return false;
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
    if (opened) showBattleScene();
    return opened;
  } catch {
    campaignProgressView = undefined;
    campaignFeedback = { type: 'load-failed' };
    return false;
  } finally {
    campaignSelectionBusy = false;
    renderStatus();
  }
}

async function selectCampaignDifficultyAndOpen(scenarioId: string, difficulty: GameDifficulty): Promise<void> {
  if (campaignSelectionBusy || settingsSaveBusy || (difficulty === 'hard' && !campaignProgressView?.hardModeUnlocked)) return;
  selectedDifficulty = difficulty;
  campaignDifficultySelect.value = difficulty;
  campaignFeedback = undefined;
  await saveSettings({ simulationSpeed, difficulty: selectedDifficulty, soundEnabled });
  const opened = await openCampaignStage(scenarioId);
  if (!opened && !campaignMenuScreen.hidden) renderCampaignMenu();
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

function saveSettings(settings: ProfileView['settings'], onFailure?: () => void): Promise<void> {
  const sequence = ++settingsSaveSequence;
  settingsSaveBusy = true;
  settingsStatusKey = undefined;
  renderStatus();
  return progress.saveSettings(settings).then((saved) => {
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
  saveSettings({ simulationSpeed: requestedSpeed, difficulty: selectedDifficulty, soundEnabled });
});

retrySoundPlaybackButton.addEventListener('click', retryFailedSoundPlayback);

soundToggleButton.addEventListener('click', () => {
  setSoundEnabled(!soundEnabled);
  saveSettings({ simulationSpeed, difficulty: selectedDifficulty, soundEnabled });
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
    { simulationSpeed, difficulty: selectedDifficulty, soundEnabled },
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
  activeMapPan = undefined;
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
  activeMapPan = undefined;
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
  pauseBackgroundMusic();
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

  playBackgroundMusic();

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
    let stepEnvironment: { tileSizePixels: number } | undefined;
    for (const stepMs of simulationTime.advanceElapsed(deltaMs, simulationSpeed)) {
      stepEnvironment ??= currentGameStepEnvironment();
      const previousWaveNumber = view.wave?.number;
      view = loopSession.advance({ deltaMs: stepMs, ...stepEnvironment });
      frameEvents.push(...view.events);
      playRequestedSounds(view.events, previousWaveNumber, stepMs);
      if (showCampaignWaveIntroAfterWaveChange(previousWaveNumber)) break;
      if (view.wave?.phase !== 'active') break;
    }
    renderStatus(frameEvents);
    redraw();
    if (view.paused) {
      animationFrame = 0;
      previousTimestamp = undefined;
      simulationTime.reset();
      return;
    }
    animationFrame = window.requestAnimationFrame(tick);
  };
  animationFrame = window.requestAnimationFrame(tick);
}

function dispatch(intent: GameIntent): void {
  if (replaying || replacingSession) return;
  if (!session.submitIntent(intent)) return;
  const eventWaveNumber = view.wave?.number;
  view = session.advance(currentGameStepEnvironment());
  playRequestedSounds(view.events, eventWaveNumber, 0);
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
  const eventWaveNumber = view.wave?.number;
  view = session.singleStep({ deltaMs: 16, ...currentGameStepEnvironment() });
  playRequestedSounds(view.events, eventWaveNumber, 16);
  if (showCampaignWaveIntroAfterWaveChange(eventWaveNumber)) {
    renderStatus();
    redraw();
    return;
  }
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

campaignMenuView.addEventListener('click', (event: MouseEvent) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLButtonElement>('button[data-action]');
  if (!button || button.disabled) return;
  switch (button.dataset.action) {
    case 'menu-start': showCampaignMenu('regions'); break;
    case 'menu-help': showCampaignMenu('help'); break;
    case 'menu-options': showCampaignMenu('options'); break;
    case 'menu-back-home': showCampaignMenu('home'); break;
    case 'menu-back-regions': showCampaignMenu('regions'); break;
    case 'menu-back-levels': showCampaignMenu('levels'); break;
    case 'menu-back-overview': showCampaignMenu('overview'); break;
    case 'choose-campaign-region': {
      const region = campaignRegions.find((candidate) => candidate.id === button.dataset.region);
      if (!region) return;
      selectedMenuRegionId = region.id;
      showCampaignMenu('levels');
      break;
    }
    case 'choose-campaign-level': {
      const level = Number(button.dataset.level);
      const entry = campaignCatalog.find((candidate) => candidate.level === level);
      if (!entry || campaignLevelState(level, campaignProgressView) === 'locked'
        || campaignLevelState(level, campaignProgressView) === 'unimplemented') return;
      selectedMenuLevel = level;
      showCampaignMenu('overview');
      break;
    }
    case 'choose-campaign-difficulty': {
      const difficulty = button.dataset.difficulty;
      const scenarioId = button.dataset.scenarioId;
      if (!isGameDifficulty(difficulty) || !scenarioId) return;
      void selectCampaignDifficultyAndOpen(scenarioId, difficulty);
      break;
    }
    case 'open-campaign-difficulty': {
      const scenarioId = button.dataset.scenarioId;
      if (scenarioId) showCampaignMenu('difficulty');
      break;
    }
    case 'menu-toggle-sound':
      setSoundEnabled(!soundEnabled);
      saveSettings({ simulationSpeed, difficulty: selectedDifficulty, soundEnabled });
      renderCampaignMenu();
      break;
    default: break;
  }
});

campaignMenuView.addEventListener('input', (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.dataset.testid !== 'menu-simulation-speed') return;
  simulationSpeed = normalizeSimulationSpeed(Number(target.value));
  simulationSpeedInput.value = String(simulationSpeed);
  simulationSpeedValue.textContent = `${simulationSpeed}×`;
  const output = campaignMenuView.querySelector<HTMLOutputElement>('[data-testid="menu-simulation-speed-value"]');
  if (output) output.textContent = `${simulationSpeed}×`;
  settingsStatusKey = undefined;
});

campaignMenuView.addEventListener('change', (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.dataset.testid !== 'menu-simulation-speed') return;
  saveSettings({ simulationSpeed, difficulty: selectedDifficulty, soundEnabled });
});

function enterCampaignMenu(): void {
  campaignExitConfirmation.close();
  stopGameLoop();
  previousTimestamp = undefined;
  simulationTime.reset();
  pauseBackgroundMusic();
  cancelPointerGesture();
  showCampaignMenu('home');
  renderStatus();
}

campaignMenuToggle.addEventListener('click', () => {
  if (campaignExitConfirmation.open) return;
  menuReturnWasPaused = view.paused;
  if (!view.paused) {
    cancelPointerGesture();
    stopGameLoop();
    pauseReason = 'manual';
    view = session.pause();
    renderStatus();
    redraw();
  }
  campaignExitConfirmation.showModal();
});

campaignExitConfirmation.querySelector<HTMLButtonElement>('[data-action="cancel-campaign-exit"]')?.addEventListener('click', () => {
  campaignExitConfirmation.close();
  if (!menuReturnWasPaused) {
    pauseReason = undefined;
    view = session.resume();
    renderStatus();
    redraw();
    startGameLoop();
  }
});

campaignExitConfirmation.querySelector<HTMLButtonElement>('[data-action="confirm-campaign-exit"]')?.addEventListener('click', enterCampaignMenu);
settlementCampaignMenuButton.addEventListener('click', enterCampaignMenu);

startWaveControl.addEventListener('click', () => dispatch({ type: 'start-wave' }));
confirmMapHireControl.addEventListener('click', () => {
  const unitId = pendingMapHireUnitId;
  closeMapHireConfirmation();
  if (!unitId) return;
  dispatch({
    type: 'hire-map-unit',
    unitId,
    commandId: `${session.id}:map-hire:${++mapHireCommandNumber}`,
  });
  canvas.focus({ preventScroll: true });
});
cancelMapHireControl.addEventListener('click', () => {
  closeMapHireConfirmation();
  canvas.focus({ preventScroll: true });
});
mapHireConfirmation.addEventListener('cancel', (event: Event) => {
  event.preventDefault();
  closeMapHireConfirmation();
  canvas.focus({ preventScroll: true });
});
mapHireConfirmation.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  closeMapHireConfirmation();
  canvas.focus({ preventScroll: true });
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
  recruitConfirmation.show();
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
  if (!recruitControl.disabled && !recruitControl.hidden) recruitControl.focus({ preventScroll: true });
});
cancelRecruitControl.addEventListener('click', () => {
  pendingRecruitmentType = undefined;
  recruitConfirmation.close();
  recruitControl.focus({ preventScroll: true });
});
recruitConfirmation.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  pendingRecruitmentType = undefined;
  recruitConfirmation.close();
  recruitControl.focus({ preventScroll: true });
});
continueCampaignWaveIntroControl.addEventListener('click', continueCampaignWaveIntro);
retryCampaignWaveIntroVoiceControl.addEventListener('click', retryCampaignWaveIntroVoice);
campaignWaveIntroDialog.addEventListener('cancel', (event: Event) => {
  event.preventDefault();
  continueCampaignWaveIntro();
});
campaignWaveIntroDialog.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  continueCampaignWaveIntro();
});
startUpgradeSampleControl.addEventListener('click', () => {
  void replaceSession(requestScenarioOpen('cow-gulch-upgrade-sample', 'debug'));
});
startGamblerSampleControl.addEventListener('click', () => {
  void replaceSession(requestScenarioOpen('gambler-ui-sample', 'debug'));
});
startGamblerLowCashSampleControl.addEventListener('click', () => {
  void replaceSession(requestScenarioOpen('gambler-ui-low-cash-sample', 'debug'));
});
startTechTownTrainSampleControl.addEventListener('click', () => {
  void replaceSession(requestScenarioOpen(techTownTrainTestContent.id, 'debug'));
});
returnCowGulchControl.addEventListener('click', () => {
  void replaceSession(requestScenarioOpen(cowGulchP1aSampleContent.id, 'formal'));
});
upgradeControl.addEventListener('click', () => {
  const unit = view.units.find((candidate) => candidate.selected && candidate.nextUpgrade);
  if (!unit || upgradeConfirmation.open || view.wave?.cash === undefined) return;
  pendingUpgradeUnitId = unit.id;
  renderUpgradeConfirmation(getLanguage());
  upgradeConfirmation.show();
  (confirmUpgradeControl.hidden ? cancelUpgradeControl : confirmUpgradeControl).focus();
});
playGamblerControl.addEventListener('click', playGamblerRound);
closeGamblerControl.addEventListener('click', closeGamblerDialog);
gamblerDialog.addEventListener('cancel', (event: Event) => {
  event.preventDefault();
  closeGamblerDialog();
});
gamblerDialog.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeGamblerDialog();
    return;
  }
  if (event.key !== 'Tab') return;
  const focusable = [...gamblerDialog.querySelectorAll<HTMLButtonElement>('button:not([disabled]):not([hidden])')];
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
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
  else if (!upgradeControl.disabled) upgradeControl.focus({ preventScroll: true });
});
cancelUpgradeControl.addEventListener('click', () => {
  pendingUpgradeUnitId = undefined;
  upgradeConfirmation.close();
  confirmUpgradeControl.hidden = false;
  if (!upgradeControl.hidden && !upgradeControl.disabled) upgradeControl.focus({ preventScroll: true });
  else canvas.focus({ preventScroll: true });
});
upgradeConfirmation.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  pendingUpgradeUnitId = undefined;
  upgradeConfirmation.close();
  confirmUpgradeControl.hidden = false;
  if (!upgradeControl.hidden && !upgradeControl.disabled) upgradeControl.focus({ preventScroll: true });
  else canvas.focus({ preventScroll: true });
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
retryAssetsControl.addEventListener('click', () => {
  if (assetLoadBusy || assetLoadFailureNames.length === 0) return;
  assetLoadBusy = true;
  renderStatus();
  void loadGameAssets().then(async (failedAssets) => {
    assetLoadFailureNames = failedAssets;
    redraw(true);
    if (failedAssets.length === 0 && campaignProgressView) {
      await openCampaignStage(cowGulchLevelOneContent.id);
    }
  }).finally(() => {
    assetLoadBusy = false;
    renderStatus();
  });
});
returnPreviousSceneControl.addEventListener('click', () => {
  sceneOpenFailure = undefined;
  renderStatus();
});
retrySettlementControl.addEventListener('click', () => { void retryFormalSettlement(); });
retryPendingSettlementControl.addEventListener('click', () => { void retryFormalSettlement(); });
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

function zoomMapAt(requestedZoom: number, screenAnchor: PointerPoint): void {
  if (!view.wave) return;
  const displayPixelScale = getDisplayPixelScale();
  const baseViewport = getMapViewport(view, displayPixelScale);
  const currentViewport = getMapViewport(view, displayPixelScale, mapCamera);
  const mapAnchor = screenToMapCell(currentViewport, screenAnchor.x, screenAnchor.y);
  mapCamera = cameraForAnchor(
    baseViewport,
    view.map.width,
    view.map.height,
    GAME_VIEWPORT.width,
    GAME_VIEWPORT.height,
    requestedZoom,
    mapAnchor,
    screenAnchor,
    displayPixelScale,
  );
  redraw();
  renderMapZoomControls();
}

function resetMapZoom(): void {
  mapCamera = createMapCamera();
  redraw();
  renderMapZoomControls();
}

mapZoomInButton.addEventListener('click', () => zoomMapAt(
  mapCamera.zoom + MAP_ZOOM_BUTTON_STEP,
  { x: GAME_VIEWPORT.width / 2, y: GAME_VIEWPORT.height / 2 },
));
mapZoomOutButton.addEventListener('click', () => zoomMapAt(
  mapCamera.zoom - MAP_ZOOM_BUTTON_STEP,
  { x: GAME_VIEWPORT.width / 2, y: GAME_VIEWPORT.height / 2 },
));
mapZoomResetButton.addEventListener('click', resetMapZoom);

canvas.addEventListener('wheel', (event: WheelEvent) => {
  if (!view.wave) return;
  const point = pointerLogicalPosition(event.clientX, event.clientY);
  if (!point) return;
  event.preventDefault();
  if (event.deltaY === 0) return;
  const deltaPixels = event.deltaMode === WheelEvent.DOM_DELTA_LINE
    ? event.deltaY * 16
    : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
      ? event.deltaY * GAME_VIEWPORT.height
      : event.deltaY;
  const exponent = Math.max(-0.7, Math.min(0.7, -deltaPixels * 0.0015));
  zoomMapAt(mapCamera.zoom * Math.exp(exponent), point);
}, { passive: false });

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
  activeMapPan = undefined;
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

function pointInHudMinimap(point: PointerPoint): boolean {
  if (!view.wave) return false;
  const viewport = getMapViewport(view, getDisplayPixelScale(), mapCamera);
  const panel = getHudMinimapGeometry(view, viewport).panel;
  return point.x >= panel.x && point.x < panel.x + panel.width
    && point.y >= panel.y && point.y < panel.y + panel.height;
}

function panMapByPointerDelta(kind: MapPanGesture['kind'], delta: PointerPoint): void {
  const displayPixelScale = getDisplayPixelScale();
  const viewport = getMapViewport(view, displayPixelScale, mapCamera);
  let mapDelta = delta;
  if (kind === 'minimap') {
    const geometry = getHudMinimapGeometry(view, viewport);
    mapDelta = {
      x: -delta.x * viewport.mapWidth / geometry.map.width,
      y: -delta.y * viewport.mapHeight / geometry.map.height,
    };
  }
  mapCamera = panCameraByScreenDelta(
    getMapViewport(view, displayPixelScale),
    view.map.width,
    view.map.height,
    GAME_VIEWPORT.width,
    GAME_VIEWPORT.height,
    mapCamera,
    mapDelta.x,
    mapDelta.y,
    displayPixelScale,
  );
  redraw();
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
  const minimapHit = pointInHudMinimap(point);
  if (view.wave) {
    const hudAction = gameHudPointerActionAt(point.x, point.y);
    if (hudAction && !minimapHit) {
      event.preventDefault();
      if (hudAction === 'pause') pauseControl.click();
      return;
    }
  }
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
  activeMapPan = undefined;
  dragStarted = false;
  pointerMovedBeyondTolerance = false;
  if (minimapHit) {
    activeMapPan = { kind: 'minimap', lastPoint: point };
    return;
  }
  if (event.pointerType === 'touch') {
    const mapViewport = getMapViewport(view, getDisplayPixelScale(), mapCamera);
    const mapCell = screenToMapCell(mapViewport, point.x, point.y);
    activeDragUnitId = selectedUnitAt(mapCell.x, mapCell.y);
    if (!activeDragUnitId && view.wave) activeMapPan = { kind: 'world', lastPoint: point };
    return;
  }

  const mapPoint = pointerMapPosition(event);
  if (!mapPoint) {
    finishPointerMovement(event.pointerId);
    return;
  }
  dispatch({ type: 'select-at', x: mapPoint.mapX, y: mapPoint.mapY });
  activeDragUnitId = view.units.find((unit) => unit.selected
    && mapPoint.mapX >= unit.hitArea.x && mapPoint.mapX < unit.hitArea.x + unit.hitArea.width
    && mapPoint.mapY >= unit.hitArea.y && mapPoint.mapY < unit.hitArea.y + unit.hitArea.height)?.id;
  if (!activeDragUnitId && view.wave) activeMapPan = { kind: 'world', lastPoint: point };
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
  const dragStartTolerance = activeMapPan?.kind === 'minimap'
    ? MINIMAP_DRAG_START_TOLERANCE
    : DRAG_START_TOLERANCE;
  if (!pointerMovedBeyondTolerance
    && Math.abs(logicalPoint.x - activePointerOrigin.x) <= dragStartTolerance
    && Math.abs(logicalPoint.y - activePointerOrigin.y) <= dragStartTolerance) return;

  pointerMovedBeyondTolerance = true;
  event.preventDefault();
  if (pointer.pointerType === 'touch' && !activeDragUnitId) {
    const viewport = getMapViewport(view, getDisplayPixelScale(), mapCamera);
    const origin = screenToMapCell(viewport, activePointerOrigin.x, activePointerOrigin.y);
    dispatch({ type: 'select-at', x: origin.x, y: origin.y });
    activeDragUnitId = selectedUnitAt(origin.x, origin.y);
    if (activeDragUnitId) activeMapPan = undefined;
  }
  if (activeMapPan) {
    const delta = { x: logicalPoint.x - activeMapPan.lastPoint.x, y: logicalPoint.y - activeMapPan.lastPoint.y };
    activeMapPan.lastPoint = logicalPoint;
    panMapByPointerDelta(activeMapPan.kind, delta);
    return;
  }
  if (!activeDragUnitId || !view.units.some((unit) => unit.id === activeDragUnitId && unit.selected)) return;

  const point = pointerMapPosition(event);
  if (!point) {
    finishPointerContact(event.pointerId);
    return;
  }

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
  if (pointer.pointerType === 'touch' && !pointerMovedBeyondTolerance && activeMapPan?.kind !== 'minimap') {
    const point = pointerMapPosition(event);
    if (point) dispatch({ type: 'select-at', x: point.mapX, y: point.mapY });
  }
  if (!pointerMovedBeyondTolerance && activeMapPan?.kind !== 'minimap') {
    const point = pointerMapPosition(event);
    const tappedMapHireUnit = point && view.units.find((unit) => unit.selected && unit.activity === 4
      && unit.hirePrice !== undefined
      && point.mapX >= unit.hitArea.x && point.mapX < unit.hitArea.x + unit.hitArea.width
      && point.mapY >= unit.hitArea.y && point.mapY < unit.hitArea.y + unit.hitArea.height);
    const tappedGambler = point && view.units.find((unit) => unit.type === 'gambler' && unit.selected
      && point.mapX >= unit.hitArea.x && point.mapX < unit.hitArea.x + unit.hitArea.width
      && point.mapY >= unit.hitArea.y && point.mapY < unit.hitArea.y + unit.hitArea.height);
    if (tappedMapHireUnit) {
      const unitId = tappedMapHireUnit.id;
      // Let the browser dispatch the touch-generated click before focusing the dialog button.
      window.setTimeout(() => openMapHireConfirmation(unitId), 0);
    }
    else if (tappedGambler) openGamblerDialog(tappedGambler.id);
  }
  finishPointerMovement(event.pointerId);
});

canvas.addEventListener('pointercancel', (event: PointerEvent) => finishPointerContact(event.pointerId));
canvas.addEventListener('lostpointercapture', (event: PointerEvent) => finishPointerContact(event.pointerId));
window.addEventListener('blur', cancelPointerGesture);

subscribeLanguage(() => {
  renderStatus();
  renderCampaignMenu();
  renderFullscreenControl();
  renderFullscreenStatus();
  redraw();
  renderExperimentComparison();
  renderSavedComparisonOptions();
  renderSavedComparisonStatus();
});

const testBattleStart = import.meta.env.DEV && new URLSearchParams(window.location.search).get('testBattle') === '1';
if (testBattleStart) {
  archivePanel.hidden = false;
  archivePanel.open = true;
  campaignPanel.hidden = false;
  showBattleScene();
  if (assetLoadFailureNames.length === 0 && campaignProgressView) {
    await openCampaignStage(cowGulchLevelOneContent.id);
  }
} else {
  showCampaignMenu('home');
  renderStatus();
}
