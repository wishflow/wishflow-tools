import { isGameDifficulty, type GameDifficulty, type GameSettlementRecord } from '../game';
import { DEFAULT_SIMULATION_SPEED, isSimulationSpeed, normalizeSimulationSpeed } from '../game/time-scaling';
import {
  cloneProfileData,
  ProfileRepositoryError,
  type ProfileData,
  type ProfileRepository,
  type VersionedProfile,
  type WriteProfileRequest,
} from './profile-repository';

export interface GameSettings {
  simulationSpeed: number;
  difficulty: GameDifficulty;
  soundEnabled: boolean;
}

/** Settings supplied by existing consumers may omit the additive sound preference. */
export interface GameSettingsInput {
  simulationSpeed: number;
  difficulty: GameDifficulty;
  soundEnabled?: boolean;
}

export interface ProfileView {
  settings: GameSettings;
  completedScenarios: readonly string[];
  highScores: Readonly<Record<string, number>>;
}

export interface CampaignStageDefinition {
  scenarioId: string;
  contentVersion: string;
  title: { en: string; zh: string };
  globalLevel: number;
  requiresCompletedScenarioIds: readonly string[];
}

export interface CampaignStageProgress extends CampaignStageDefinition {
  status: 'available' | 'locked' | 'completed';
  highScore?: number;
}

export interface CampaignProgressView {
  profile: ProfileView;
  stages: readonly CampaignStageProgress[];
  completedCount: number;
  hardModeUnlocked: boolean;
}

export interface SettlementSaveResult {
  status: 'saved' | 'conflict' | 'failed';
  profile: ProfileView;
}

export interface Progress {
  loadProfile(): Promise<ProfileView>;
  loadCampaign(): Promise<CampaignProgressView>;
  loadSettings(): Promise<GameSettings>;
  saveSettings(settings: GameSettingsInput): Promise<GameSettings>;
  retrySettings(): Promise<GameSettings>;
  exportSavedProfile(): Promise<string | null>;
  resetCorruptProfile(snapshot: string): Promise<ProfileView>;
  applySettlement(settlement: GameSettlementRecord): Promise<SettlementSaveResult>;
  retrySettlement(settlementId: string): Promise<SettlementSaveResult>;
}

export class ProgressError extends Error {
  constructor(readonly code: ProfileRepositoryError['code'] | 'difficulty-locked', message: string) {
    super(message);
    this.name = 'ProgressError';
  }
}

function progressError(error: unknown): Error {
  if (error instanceof ProgressError) return error;
  if (error instanceof ProfileRepositoryError) return new ProgressError(error.code, error.message);
  return error instanceof Error ? error : new Error(String(error));
}

function createDefaultProfileData(): ProfileData {
  return {
    settings: { simulationSpeed: DEFAULT_SIMULATION_SPEED, difficulty: 'easy', soundEnabled: true },
    completedScenarios: [],
    highScores: {},
    appliedSettlementIds: [],
  };
}

function publicProfile(data: ProfileData): ProfileView {
  const simulationSpeed = data.settings.simulationSpeed;
  if (simulationSpeed !== undefined && !isSimulationSpeed(simulationSpeed)) {
    throw new ProgressError('corrupt-data', 'Invalid saved simulation speed');
  }
  const difficulty = data.settings.difficulty;
  if (difficulty !== undefined && !isGameDifficulty(difficulty)) {
    throw new ProgressError('corrupt-data', 'Invalid saved game difficulty');
  }
  const soundEnabled = data.settings.soundEnabled;
  if (soundEnabled !== undefined && typeof soundEnabled !== 'boolean') {
    throw new ProgressError('corrupt-data', 'Invalid saved sound setting');
  }
  return Object.freeze({
    settings: Object.freeze({
      simulationSpeed: simulationSpeed === undefined ? DEFAULT_SIMULATION_SPEED : simulationSpeed,
      difficulty: difficulty === undefined ? 'easy' : difficulty,
      soundEnabled: soundEnabled === undefined ? true : soundEnabled,
    }),
    completedScenarios: Object.freeze([...data.completedScenarios]),
    highScores: Object.freeze({ ...data.highScores }),
  });
}

function validSettlement(settlement: GameSettlementRecord): void {
  if (settlement.mode !== 'formal') throw new Error('Progress only accepts formal game settlements');
  if (!settlement.settlementId || !settlement.sessionId || !settlement.scenarioId
    || !Number.isSafeInteger(settlement.waveNumber) || settlement.waveNumber < 1
    || settlement.settlementId !== `${settlement.sessionId}:${settlement.scenarioId}:${settlement.waveNumber}`
    || !['victory', 'defeat'].includes(settlement.outcome)
    || !Number.isSafeInteger(settlement.scoreBase) || settlement.scoreBase < 0
    || !Number.isSafeInteger(settlement.displayScore) || settlement.displayScore < 0
    || !Number.isSafeInteger(settlement.highScoreCandidate) || settlement.highScoreCandidate < 0) {
    throw new Error('Formal game settlement is invalid');
  }
}

function settlementOperationId(settlement: GameSettlementRecord, expectedRevision: number | null): string {
  return `settlement:${settlement.settlementId}:${expectedRevision ?? 'new'}`;
}

function settingsOperationId(
  speed: number,
  difficulty: GameDifficulty,
  soundEnabled: boolean,
  expectedRevision: number | null,
): string {
  return `settings:${expectedRevision ?? 'new'}:${speed}:${difficulty}:${soundEnabled}`;
}

function hardModeUnlocked(data: ProfileData, campaignStages: readonly CampaignStageDefinition[]): boolean {
  const completed = new Set(data.completedScenarios);
  return campaignStages.some(({ scenarioId, globalLevel }) =>
    globalLevel % 10 === 0 && completed.has(scenarioId));
}

export function createProgress(
  repository: ProfileRepository,
  campaign: readonly CampaignStageDefinition[] = [],
): Progress {
  const campaignStages = campaign.map((stage) => Object.freeze({
    ...stage,
    title: Object.freeze({ ...stage.title }),
    requiresCompletedScenarioIds: Object.freeze([...stage.requiresCompletedScenarioIds]),
  }));
  const campaignIds = new Set(campaignStages.map(({ scenarioId }) => scenarioId));
  if (campaignIds.size !== campaignStages.length
    || campaignStages.some(({ scenarioId, contentVersion, globalLevel, requiresCompletedScenarioIds }) =>
      !scenarioId || !contentVersion || !Number.isSafeInteger(globalLevel) || globalLevel < 1 || globalLevel > 60
        || requiresCompletedScenarioIds.includes(scenarioId)
        || requiresCompletedScenarioIds.some((requiredId) => !campaignIds.has(requiredId)))) {
    throw new TypeError('Campaign stages require unique IDs, versions and valid completion prerequisites');
  }

  let writeTail: Promise<void> = Promise.resolve();
  let lastKnownData = createDefaultProfileData();
  let lastKnownRevision: number | null = null;
  let hasLoadedProfile = false;
  let pendingSettingsRequest: WriteProfileRequest | undefined;
  const pendingSettlements = new Map<string, GameSettlementRecord>();

  function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = writeTail.then(operation, operation);
    writeTail = result.then(() => undefined, () => undefined);
    return result;
  }

  async function loadStored(): Promise<VersionedProfile | null> {
    const current = await repository.readProfile();
    lastKnownData = current ? cloneProfileData(current.data) : createDefaultProfileData();
    lastKnownRevision = current?.revision ?? null;
    hasLoadedProfile = true;
    return current;
  }

  async function profileAfterFailure(): Promise<ProfileView> {
    try {
      const current = await loadStored();
      return publicProfile(current?.data ?? lastKnownData);
    } catch {
      return publicProfile(lastKnownData);
    }
  }

  async function persistSettlement(settlement: GameSettlementRecord): Promise<SettlementSaveResult> {
    let current: VersionedProfile | null;
    try {
      current = await loadStored();
    } catch {
      pendingSettlements.set(settlement.settlementId, settlement);
      return { status: 'failed', profile: publicProfile(lastKnownData) };
    }

    if (current?.data.appliedSettlementIds.includes(settlement.settlementId)) {
      pendingSettlements.delete(settlement.settlementId);
      return { status: 'saved', profile: publicProfile(current.data) };
    }

    const nextData = cloneProfileData(current?.data ?? createDefaultProfileData());
    const previousScore = nextData.highScores[settlement.scenarioId];
    if (previousScore === undefined || settlement.highScoreCandidate > previousScore) {
      nextData.highScores[settlement.scenarioId] = settlement.highScoreCandidate;
    }
    if (settlement.outcome === 'victory'
      && !nextData.completedScenarios.includes(settlement.scenarioId)) {
      nextData.completedScenarios.push(settlement.scenarioId);
    }
    nextData.appliedSettlementIds.push(settlement.settlementId);

    const request: WriteProfileRequest = {
      data: nextData,
      expectedRevision: current?.revision ?? null,
      operationId: settlementOperationId(settlement, current?.revision ?? null),
    };
    try {
      const saved = await repository.writeProfile(request);
      lastKnownData = nextData;
      lastKnownRevision = saved.revision;
      pendingSettlements.delete(settlement.settlementId);
      return { status: 'saved', profile: publicProfile(nextData) };
    } catch (error) {
      pendingSettlements.set(settlement.settlementId, settlement);
      if (error instanceof ProfileRepositoryError && error.code === 'conflict') {
        try {
          const latest = await loadStored();
          if (latest?.data.appliedSettlementIds.includes(settlement.settlementId)) {
            pendingSettlements.delete(settlement.settlementId);
            return { status: 'saved', profile: publicProfile(latest.data) };
          }
        } catch {
          // Keep the conflict visible; the public caller can request a retry.
        }
        return { status: 'conflict', profile: await profileAfterFailure() };
      }
      return { status: 'failed', profile: await profileAfterFailure() };
    }
  }

  async function loadProfile(): Promise<ProfileView> {
    try {
      const current = await loadStored();
      pendingSettingsRequest = undefined;
      return publicProfile(current?.data ?? createDefaultProfileData());
    } catch (error) {
      throw progressError(error);
    }
  }

  async function loadCampaign(): Promise<CampaignProgressView> {
    try {
      const current = await loadStored();
      const profile = publicProfile(current?.data ?? createDefaultProfileData());
      const completed = new Set(profile.completedScenarios);
      const stages = campaignStages.map((stage): CampaignStageProgress => {
        const isCompleted = completed.has(stage.scenarioId);
        const isAvailable = stage.requiresCompletedScenarioIds.every((scenarioId) => completed.has(scenarioId));
        const highScore = profile.highScores[stage.scenarioId];
        return Object.freeze({
          ...stage,
          status: isCompleted ? 'completed' : isAvailable ? 'available' : 'locked',
          ...(highScore === undefined ? {} : { highScore }),
        });
      });
      return Object.freeze({
        profile,
        stages: Object.freeze(stages),
        completedCount: stages.filter(({ status }) => status === 'completed').length,
        hardModeUnlocked: hardModeUnlocked(current?.data ?? createDefaultProfileData(), campaignStages),
      });
    } catch (error) {
      throw progressError(error);
    }
  }

  async function loadSettings(): Promise<GameSettings> {
    return (await loadProfile()).settings;
  }

  async function saveSettings(settings: GameSettingsInput): Promise<GameSettings> {
    const simulationSpeed = normalizeSimulationSpeed(settings.simulationSpeed);
    return serialize(async () => {
      if (!hasLoadedProfile) {
        try {
          await loadStored();
        } catch (error) {
          throw progressError(error);
        }
      }
      publicProfile(lastKnownData);
      const difficulty = settings.difficulty ?? (lastKnownData.settings.difficulty as GameDifficulty | undefined) ?? 'easy';
      const soundEnabled = settings.soundEnabled ?? (lastKnownData.settings.soundEnabled as boolean | undefined) ?? true;
      if (!isGameDifficulty(difficulty)) {
        throw new ProgressError('invalid-input', 'Game difficulty is invalid');
      }
      if (typeof soundEnabled !== 'boolean') {
        throw new ProgressError('invalid-input', 'Sound setting is invalid');
      }
      const saved: GameSettings = { simulationSpeed, difficulty, soundEnabled };
      if (saved.difficulty === 'hard' && !hardModeUnlocked(lastKnownData, campaignStages)) {
        throw new ProgressError('difficulty-locked', 'Hard difficulty is locked until a level divisible by ten is completed');
      }
      const nextData = cloneProfileData(lastKnownData);
      nextData.settings = { ...nextData.settings, ...saved };
      const request: WriteProfileRequest = {
        data: nextData,
        expectedRevision: lastKnownRevision,
        operationId: settingsOperationId(saved.simulationSpeed, saved.difficulty, saved.soundEnabled, lastKnownRevision),
      };
      pendingSettingsRequest = request;
      try {
        const result = await repository.writeProfile(request);
        lastKnownData = nextData;
        lastKnownRevision = result.revision;
        pendingSettingsRequest = undefined;
        return saved;
      } catch (error) {
        throw progressError(error);
      }
    });
  }

  function retrySettings(): Promise<GameSettings> {
    return serialize(async () => {
      const request = pendingSettingsRequest;
      if (!request) throw new ProgressError('invalid-input', 'No pending settings save is available to retry');
      const speed = request.data.settings.simulationSpeed;
      const difficulty = request.data.settings.difficulty;
      const soundEnabled = request.data.settings.soundEnabled;
      if (!isSimulationSpeed(speed)) {
        throw new ProgressError('corrupt-data', 'Pending simulation speed is corrupt');
      }
      if (!isGameDifficulty(difficulty)) {
        throw new ProgressError('corrupt-data', 'Pending game difficulty is corrupt');
      }
      if (soundEnabled !== undefined && typeof soundEnabled !== 'boolean') {
        throw new ProgressError('corrupt-data', 'Pending sound setting is corrupt');
      }
      try {
        const result = await repository.writeProfile(request);
        lastKnownData = cloneProfileData(request.data);
        lastKnownRevision = result.revision;
        pendingSettingsRequest = undefined;
        return {
          simulationSpeed: speed,
          difficulty,
          soundEnabled: soundEnabled === undefined ? true : soundEnabled,
        };
      } catch (error) {
        throw progressError(error);
      }
    });
  }

  async function exportSavedProfile(): Promise<string | null> {
    try {
      return await repository.exportRawProfileRecord();
    } catch (error) {
      throw progressError(error);
    }
  }

  async function resetCorruptProfile(snapshot: string): Promise<ProfileView> {
    try {
      await repository.resetCorruptProfile(snapshot);
      pendingSettingsRequest = undefined;
      lastKnownData = createDefaultProfileData();
      lastKnownRevision = null;
      hasLoadedProfile = true;
      return publicProfile(lastKnownData);
    } catch (error) {
      throw progressError(error);
    }
  }

  function applySettlement(settlement: GameSettlementRecord): Promise<SettlementSaveResult> {
    const capturedSettlement = Object.freeze({ ...settlement });
    return serialize(async () => {
      validSettlement(capturedSettlement);
      return persistSettlement(capturedSettlement);
    });
  }

  function retrySettlement(settlementId: string): Promise<SettlementSaveResult> {
    return serialize(async () => {
      const pending = pendingSettlements.get(settlementId);
      if (!pending) {
        const current = await loadStored();
        if (current?.data.appliedSettlementIds.includes(settlementId)) {
          return { status: 'saved', profile: publicProfile(current.data) };
        }
        throw new Error('No pending settlement is available to retry');
      }
      return persistSettlement(pending);
    });
  }

  return Object.freeze({
    loadProfile,
    loadCampaign,
    loadSettings,
    saveSettings,
    retrySettings,
    exportSavedProfile,
    resetCorruptProfile,
    applySettlement,
    retrySettlement,
  });
}
