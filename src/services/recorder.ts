import { EventEmitter, delay, log } from 'ow-libs';
import { v4 as uuid } from 'uuid';

import { Recording, RecordingInProgress, OverwolfGameFeatures, RecordingLauncherLaunched, RecordingEventTypes, RecordingLauncherUpdated, RecordingLauncherTerminated, RecordingGameLaunched, RecordingGameInfo, RecordingLauncherInfoUpdate, RecordingLauncherEvent, RecordingInfoUpdate, RecordingGameEvent, RecordingGameEventError, RecordingEvent, RecordingLauncherFeaturesSet, RecordingGameFeaturesSet, RecordingTimelineRaw, RecordingTimeline } from '../constants/types';

export interface RecorderServiceEvents {
  started: number
  complete: Recording
}

const kMaxRetries = 25;

export class RecorderService extends EventEmitter<RecorderServiceEvents> {
  #launcherId: number | null = null;
  #gameId: number | null = null;
  #author: string = '';
  #recording: RecordingInProgress | null = null;

  get isRecording() {
    return (this.#recording !== null);
  }

  async init() {
    this.#watchLoginChange();
    await this.#updateUser();
  }

  /**
   * Start recording
   */
  start() {
    if (this.#recording) {
      console.log('RecorderService.start(): recording already');
      return false;
    }

    this.#setListeners();

    this.#recording = this.#makeNewRecording();

    console.log('RecorderService.start(): new recording:', this.#recording);

    this.emit('started', this.#recording.startTime);

    return true;
  }

  /**
   * Stop recording
   */
  stop(): Recording | null {
    if (!this.#recording) {
      console.error('RecorderService.stop(): no recording');
      return null;
    }

    this.#removeListeners();
    this.#removeLauncherEventListeners();
    this.#removeGameEventListeners();

    const recording: Recording = {
      ...this.#recording,
      endTime: Date.now(),
      author: this.#author,
      complete: true,
      timeline: RecorderService.#convertRawTimeline(this.#recording.timeline)
    };

    console.log('RecorderService.stop(): complete recording:', recording);

    this.#recording = null;

    this.emit('complete', recording);

    return recording;
  }

  #watchLoginChange() {
    overwolf.profile.onLoginStateChanged.addListener(e => {
      if (e.username) {
        this.#author = e.username;

        if (this.#recording) {
          this.#recording.author = e.username;
        }
      }
    });
  }

  async #updateUser() {
    const profile = await RecorderService.#getOverwolfProfile();

    if (profile.success && profile.username) {
      this.#author = profile.username;

      if (this.#recording) {
        this.#recording.author = profile.username;
      }
    }
  }

  async #getFeatures(gameId: number): Promise<string[]> {
    const response = await fetch(
      `https://game-events-status.overwolf.com/${gameId}_prod.json`
    );

    if (response.ok) {
      const result: OverwolfGameFeatures | null = await response.json()
        .catch(() => null);

      if (result && (result.state === 1 || result.state === 2)) {
        return result.features.map(v => v.name);
      }
    }

    return [];
  }

  #removeListeners() {
    overwolf.games.launchers.onLaunched.removeListener(
      this.#onLauncherLaunched
    );
    overwolf.games.launchers.onUpdated.removeListener(this.#onLauncherUpdated);
    overwolf.games.launchers.onTerminated.removeListener(
      this.#onLauncherTerminated
    );

    overwolf.games.onGameLaunched.removeListener(this.#onGameLaunched);
    overwolf.games.onGameInfoUpdated.removeListener(this.#onGameInfoUpdated);
  }

  #setListeners() {
    this.#removeGameEventListeners();

    overwolf.games.launchers.onLaunched.addListener(this.#onLauncherLaunched);
    overwolf.games.launchers.onUpdated.addListener(this.#onLauncherUpdated);
    overwolf.games.launchers.onTerminated.addListener(
      this.#onLauncherTerminated
    );

    overwolf.games.onGameLaunched.addListener(this.#onGameLaunched);
    overwolf.games.onGameInfoUpdated.addListener(this.#onGameInfoUpdated);
  }

  #removeLauncherEventListeners() {
    overwolf.games.launchers.events.onInfoUpdates.removeListener(
      this.#onLauncherInfoUpdate
    );
    overwolf.games.launchers.events.onNewEvents.removeListener(
      this.#onLauncherNewEvent
    );
  }

  #setLauncherEventListeners() {
    this.#removeLauncherEventListeners();

    overwolf.games.launchers.events.onInfoUpdates.addListener(
      this.#onLauncherInfoUpdate
    );
    overwolf.games.launchers.events.onNewEvents.addListener(
      this.#onLauncherNewEvent
    );
  }

  #removeGameEventListeners() {
    overwolf.games.events.onError.removeListener(this.#onError);
    overwolf.games.events.onInfoUpdates2.removeListener(this.#onInfoUpdate);
    overwolf.games.events.onNewEvents.removeListener(this.#onNewEvent);
  }

  #setGameEventListeners() {
    this.#removeGameEventListeners();

    overwolf.games.events.onError.addListener(this.#onError);
    overwolf.games.events.onInfoUpdates2.addListener(this.#onInfoUpdate);
    overwolf.games.events.onNewEvents.addListener(this.#onNewEvent);
  }

  #onLauncherLaunched = (e: overwolf.games.launchers.LauncherInfo) => {
    this.#launcherId = e.classId;

    if (this.#recording) {
      this.#recording.launchers[e.classId] = e.title;
      this.#setLauncherRequiredFeatures();
    }

    this.#recordEvent<RecordingLauncherLaunched>(
      RecordingEventTypes.LauncherLaunched,
      e
    );
  }

  #onLauncherUpdated = (e: overwolf.games.launchers.UpdatedEvent) => {
    this.#recordEvent<RecordingLauncherUpdated>(
      RecordingEventTypes.LauncherUpdated,
      e
    );
  }

  #onLauncherTerminated = (e: overwolf.games.launchers.LauncherInfo) => {
    this.#launcherId = null;

    if (this.#recording) {
      this.#removeLauncherEventListeners();
    }

    this.#recordEvent<RecordingLauncherTerminated>(
      RecordingEventTypes.LauncherTerminated,
      e
    );
  }

  #onGameLaunched = (e: overwolf.games.RunningGameInfo) => {
    if (this.#recording) {
      this.#recording.launchers[e.classId] = e.title;
    }

    this.#recordEvent<RecordingGameLaunched>(
      RecordingEventTypes.GameLaunched,
      e
    );
  }

  #onGameInfoUpdated = (gameInfo: overwolf.games.GameInfoUpdatedEvent) => {
    console.log('RecorderService.#onGameInfoUpdated()', ...log(gameInfo));

    if (this.#recording && gameInfo.runningChanged) {
      if (gameInfo.gameInfo?.isRunning) {
        this.#gameId = gameInfo.gameInfo.classId;

        this.#setGameRequiredFeatures();
      } else {
        this.#gameId = null;

        this.#removeLauncherEventListeners();
      }
    }

    this.#recordEvent<RecordingGameInfo>(
      RecordingEventTypes.GameInfo,
      gameInfo
    );
  }

  #onLauncherInfoUpdate = (e: any) => {
    this.#recordEvent<RecordingLauncherInfoUpdate>(
      RecordingEventTypes.LauncherInfoUpdate,
      e
    );
  }

  #onLauncherNewEvent = (e: any) => {
    this.#recordEvent<RecordingLauncherEvent>(
      RecordingEventTypes.LauncherEvent,
      e
    );
  }

  #onInfoUpdate = (e: overwolf.games.events.InfoUpdates2Event) => {
    this.#recordEvent<RecordingInfoUpdate>(
      RecordingEventTypes.InfoUpdate,
      e
    );
  }

  #onNewEvent = (e: overwolf.games.events.NewGameEvents) => {
    this.#recordEvent<RecordingGameEvent>(
      RecordingEventTypes.GameEvent,
      e
    );
  }

  #onError = (e: overwolf.games.events.ErrorEvent) => {
    this.#recordEvent<RecordingGameEventError>(
      RecordingEventTypes.GameEventError,
      e
    );
  }

  #recordEvent<T extends RecordingEvent>(
    eventType: T['type'],
    data: T['data']
  ) {
    /* console.log(
      'RecorderService.#recordEvent():',
      RecordingEventTypes[eventType],
      data
    ); */

    if (!this.#recording) {
      return;
    }

    const time = Date.now();

    const recordedEvents = this.#recording.timeline.get(time) || [];

    recordedEvents.push({ type: eventType, time, data });

    this.#recording.timeline.set(time, recordedEvents);
  }

  #tryToSetLauncherRequiredFeatures(
    launcherId: number,
    features: string[]
  ): Promise<overwolf.games.launchers.events.SetRequiredFeaturesResult> {
    return new Promise(resolve => {
      overwolf.games.launchers.events.setRequiredFeatures(
        launcherId,
        features,
        resolve
      );
    });
  }

  async #setLauncherRequiredFeatures() {
    if (this.#launcherId === null) {
      console.log(
        'RecorderService.#setLauncherRequiredFeatures(): game not running'
      );
      return;
    }

    const features = await this.#getFeatures(this.#launcherId);

    if (features.length === 0) {
      console.log(
        'RecorderService.#setLauncherRequiredFeatures(): no features to set'
      );
      return;
    }

    console.log(
      'RecorderService.#setLauncherRequiredFeatures(): features:',
      features
    );

    let
      tries = 0,
      result:
        overwolf.games.launchers.events.SetRequiredFeaturesResult | null = null;

    while (tries < kMaxRetries) {
      result = await this.#tryToSetLauncherRequiredFeatures(
        this.#launcherId,
        features
      );

      if (result.success) {
        break;
      } else {
        await delay(500);
        tries++;
      }
    }

    if (this.#recording && result) {
      this.#recordEvent<RecordingLauncherFeaturesSet>(
        RecordingEventTypes.LauncherFeaturesSet,
        result
      );
    }

    if (result?.success) {
      console.log(...log(
        'RecorderService.#setLauncherRequiredFeatures(): success:',
        result
      ));

      this.#setLauncherEventListeners();
    } else {
      console.log(
        'RecorderService.#setLauncherRequiredFeatures(): failure after '
        + String(tries + 1)
        + ' tries:',
        result
      );
    }
  }

  #tryToSetGameRequiredFeatures(
    features: string[]
  ): Promise<overwolf.games.events.SetRequiredFeaturesResult> {
    return new Promise(resolve => {
      overwolf.games.events.setRequiredFeatures(features, resolve);
    });
  }

  async #setGameRequiredFeatures() {
    if (this.#gameId === null) {
      console.log(
        'RecorderService.#setGameRequiredFeatures(): game not running'
      );
      return;
    }

    const features = await this.#getFeatures(this.#gameId);

    if (features.length === 0) {
      console.log(
        'RecorderService.#setGameRequiredFeatures(): no features to set'
      );
      return;
    }

    console.log(
      'RecorderService.#setGameRequiredFeatures(): features:',
      features
    );

    let
      tries = 0,
      result: overwolf.games.events.SetRequiredFeaturesResult | null = null;

    while (tries < kMaxRetries) {
      result = await this.#tryToSetGameRequiredFeatures(features);

      if (result.success) {
        break;
      } else {
        await delay(500);
        tries++;
      }
    }

    if (this.#recording && result) {
      this.#recordEvent<RecordingGameFeaturesSet>(
        RecordingEventTypes.GameFeaturesSet,
        result
      );
    }

    if (result?.success) {
      console.log(...log(
        'RecorderService.#setGameRequiredFeatures(): success:',
        result
      ));

      this.#setGameEventListeners();
    } else {
      console.log(
        'RecorderService.#setGameRequiredFeatures(): failure after '
        + String(tries + 1)
        + ' tries:',
        result
      );
    }
  }

  static #convertRawTimeline(entries: RecordingTimelineRaw) {
    const out: RecordingTimeline = [];

    for (const [time, events] of entries) {
      for (const event of events) {
        out.push([time, event]);
      }
    }

    return out;
  }

  static async #getOverwolfProfile(): Promise<
    overwolf.profile.GetCurrentUserResult
  > {
    return new Promise(resolve => overwolf.profile.getCurrentUser(resolve));
  }

  #makeNewRecording(): RecordingInProgress {
    return {
      uid: uuid(),
      startTime: Date.now(),
      endTime: null,
      title: 'Untitled',
      author: this.#author,
      games: {},
      launchers: {},
      timeline: new Map(),
      complete: false
    };
  }

  static isCompletedRecording(
    recording: RecordingInProgress | Recording
  ): recording is Recording {
    return recording.complete;
  }
}
