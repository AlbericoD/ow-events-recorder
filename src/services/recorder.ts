import { EventEmitter, delay, log } from 'ow-libs';

import { Recording, RecordingInProgress, RecordingEventTypes, RecordingTimelineRaw, RecordingTimeline } from '../shared';
import { kLeagueLauncherId } from '../constants/config';

export interface RecorderServiceEvents {
  started: undefined
  complete: Recording
}

const kMaxRetries = 25;

export class RecorderService extends EventEmitter<RecorderServiceEvents> {
  #launcherFeatures: string[] = [];
  #gameFeatures: string[] = [];

  #recording: RecordingInProgress | null = null;

  get isRecording() {
    return (this.#recording !== null);
  }

  /**
   * Call overwolf.games.events.setRequiredFeatures and bind listeners
   * @see https://overwolf.github.io/docs/api/overwolf-games-events#setrequiredfeaturesfeatures-callback
   */
  start(gameFeatures: string[] = [], launcherFeatures: string[] = []) {
    if (this.#recording) {
      console.log('RecorderService.start(): recording already');
      return false;
    }

    this.stop();

    this.#gameFeatures = gameFeatures;
    this.#launcherFeatures = launcherFeatures;

    this.#setListeners();

    this.#recording = RecorderService.#makeNewRecording();

    this.emit('started');

    return true;
  }

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
      complete: true,
      timelineRaw: null,
      timeline: RecorderService.#processRawRecording(
        this.#recording.timelineRaw
      )
    };

    this.#recording = null;

    this.emit('complete', recording);

    return recording;
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
    if (this.#recording) {
      this.#setLauncherRequiredFeatures();
    }

    this.#recordEvent(RecordingEventTypes.LauncherLaunched, e);
  }

  #onLauncherUpdated = (e: overwolf.games.launchers.UpdatedEvent) => {
    this.#recordEvent(RecordingEventTypes.LauncherUpdated, e);
  }

  #onLauncherTerminated = (e: overwolf.games.launchers.LauncherInfo) => {
    if (this.#recording) {
      this.#removeLauncherEventListeners();
    }

    this.#recordEvent(RecordingEventTypes.LauncherTerminated, e);
  }

  #onGameLaunched = (e: overwolf.games.RunningGameInfo) => {
    this.#recordEvent(RecordingEventTypes.GameLaunched, e);
  }

  #onGameInfoUpdated = (gameInfo: overwolf.games.GameInfoUpdatedEvent) => {
    console.log('RecorderService.#onGameInfoUpdated()', ...log(gameInfo));

    if (this.#recording && gameInfo.runningChanged) {
      if (gameInfo.gameInfo?.isRunning) {
        this.#setGameRequiredFeatures();
      } else {
        this.#removeLauncherEventListeners();
      }
    }

    this.#recordEvent(RecordingEventTypes.GameInfo, gameInfo);
  }

  #onLauncherInfoUpdate = (e: any) => {
    this.#recordEvent(RecordingEventTypes.LauncherInfoUpdate, e);
  }

  #onLauncherNewEvent = (e: any) => {
    this.#recordEvent(RecordingEventTypes.LauncherEvent, e);
  }

  #onInfoUpdate = (e: overwolf.games.events.InfoUpdates2Event) => {
    this.#recordEvent(RecordingEventTypes.InfoUpdate, e);
  }

  #onNewEvent = (e: overwolf.games.events.NewGameEvents) => {
    this.#recordEvent(RecordingEventTypes.GameEvent, e);
  }

  #onError = (e: overwolf.games.events.ErrorEvent) => {
    this.#recordEvent(RecordingEventTypes.GameEventError, e);
  }

  #recordEvent(eventType: RecordingEventTypes, event: any) {
    console.log(
      'RecorderService.#recordEvent():',
      RecordingEventTypes[eventType],
      event
    );

    if (!this.#recording) {
      return;
    }

    const time = Date.now();

    const recordedEvents = this.#recording.timelineRaw.get(time) || [];

    recordedEvents.push({
      type: eventType,
      time,
      data: event
    });

    this.#recording.timelineRaw.set(time, recordedEvents);
  }

  #tryToSetLauncherRequiredFeatures(): Promise<
    overwolf.games.launchers.events.SetRequiredFeaturesResult
  > {
    return new Promise(resolve => {
      overwolf.games.launchers.events.setRequiredFeatures(
        kLeagueLauncherId,
        this.#launcherFeatures,
        resolve
      );
    });
  }

  async #setLauncherRequiredFeatures() {
    let
      tries = 0,
      result:
        overwolf.games.launchers.events.SetRequiredFeaturesResult | null = null;

    while (tries < kMaxRetries) {
      result = await this.#tryToSetLauncherRequiredFeatures();

      if (result.success) {
        break;
      } else {
        await delay(2000);
        tries++;
      }
    }

    if (this.#recording) {
      this.#recording.setLauncherFeaturesResult = result;
      this.#recording.launcherFeatures = this.#launcherFeatures;
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

  #tryToSetGameRequiredFeatures(): Promise<
    overwolf.games.events.SetRequiredFeaturesResult
  > {
    return new Promise(resolve => {
      overwolf.games.events.setRequiredFeatures(this.#gameFeatures, resolve);
    });
  }

  async #setGameRequiredFeatures() {
    let
      tries = 0,
      result: overwolf.games.events.SetRequiredFeaturesResult | null = null;

    while (tries < kMaxRetries) {
      result = await this.#tryToSetGameRequiredFeatures();

      if (result.success) {
        break;
      } else {
        await delay(2000);
        tries++;
      }
    }

    if (this.#recording) {
      this.#recording.setGameFeaturesResult = result;
      this.#recording.gameFeatures = this.#gameFeatures;
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

  static #processRawRecording(entries: RecordingTimelineRaw) {
    const out: RecordingTimeline = [];

    entries.forEach((events, time) => {
      events.forEach(event => out.push([time, event]));
    });

    return out;
  }

  static #makeNewRecording(): RecordingInProgress {
    return {
      startTime: Date.now(),
      endTime: null,
      gameFeatures: null,
      setGameFeaturesResult: null,
      launcherFeatures: null,
      setLauncherFeaturesResult: null,
      timelineRaw: new Map(),
      complete: false
    };
  }

  static isCompletedRecording(
    recording: RecordingInProgress | Recording
  ): recording is Recording {
    return recording.complete;
  }
}
