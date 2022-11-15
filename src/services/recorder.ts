import { EventEmitter, delay, log } from 'ow-libs';

import { kLeagueLauncherId } from '../constants/config';

import { IncompleteRecording, CompleteRecording, RecordingGameLaunched, RecordingEventTypes, RecordingGameInfo, RecordingError, RecordingLauncherLaunched, RecordingLauncherUpdated, RecordingLauncherTerminated } from '../constants/types';

export interface RecorderServiceEvents {
  onComplete: CompleteRecording
}

const kMaxRetries = 25;

export class RecorderService extends EventEmitter<RecorderServiceEvents> {
  #launcherFeatures: string[] = [];
  #gameFeatures: string[] = [];

  #isRecording: boolean = false;
  #recording: IncompleteRecording | CompleteRecording | null = null;

  #removeListeners() {
    overwolf.games.launchers.onLaunched.removeListener(this.#onLauncherLaunched);
    overwolf.games.launchers.onUpdated.removeListener(this.#onLauncherUpdated);
    overwolf.games.launchers.onTerminated.removeListener(this.#onLauncherTerminated);

    overwolf.games.onGameLaunched.removeListener(this.#onGameLaunched);
    overwolf.games.onGameInfoUpdated.removeListener(this.#onGameInfoUpdated);
  }

  #setListeners() {
    this.#removeGameEventListeners();

    overwolf.games.launchers.onLaunched.addListener(this.#onLauncherLaunched);
    overwolf.games.launchers.onUpdated.addListener(this.#onLauncherUpdated);
    overwolf.games.launchers.onTerminated.addListener(this.#onLauncherTerminated);

    overwolf.games.onGameLaunched.addListener(this.#onGameLaunched);
    overwolf.games.onGameInfoUpdated.addListener(this.#onGameInfoUpdated);
  }

  #removeLauncherEventListeners() {
    overwolf.games.launchers.events.onInfoUpdates.removeListener(this.#onLauncherInfoUpdate);
    overwolf.games.launchers.events.onNewEvents.removeListener(this.#onLauncherNewEvent);
  }

  #setLauncherEventListeners() {
    this.#removeLauncherEventListeners();

    overwolf.games.launchers.events.onInfoUpdates.addListener(this.#onLauncherInfoUpdate);
    overwolf.games.launchers.events.onNewEvents.addListener(this.#onLauncherNewEvent);
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

  #onLauncherLaunched = (data: overwolf.games.launchers.LauncherInfo) => {
    console.log('RecorderService.#onLauncherLaunched()', ...log(data));

    if (!this.#isRecording || !this.#recording) {
      return;
    }

    this.#setLauncherRequiredFeatures();

    const time = Date.now();

    const recordedUpdate: RecordingLauncherLaunched = {
      type: RecordingEventTypes.LauncherLaunched,
      time,
      data
    };

    const recordedUpdates = this.#recording.timeline.get(time) || [];

    recordedUpdates.push(recordedUpdate);

    this.#recording.timeline.set(time, recordedUpdates);
  }

  #onLauncherUpdated = (data: overwolf.games.launchers.UpdatedEvent) => {
    console.log('RecorderService.#onLauncherUpdate()', ...log(data));

    if (!this.#isRecording || !this.#recording) {
      return;
    }

    const time = Date.now();

    const recordedUpdate: RecordingLauncherUpdated = {
      type: RecordingEventTypes.LauncherUpdated,
      time,
      data
    };

    const recordedUpdates = this.#recording.timeline.get(time) || [];

    recordedUpdates.push(recordedUpdate);

    this.#recording.timeline.set(time, recordedUpdates);
  }

  #onLauncherTerminated = (data: overwolf.games.launchers.LauncherInfo) => {
    console.log('RecorderService.#onLauncherTerminated()', ...log(data));

    if (!this.#isRecording || !this.#recording) {
      return;
    }

    this.#removeLauncherEventListeners();

    const time = Date.now();

    const recordedUpdate: RecordingLauncherTerminated = {
      type: RecordingEventTypes.LauncherTerminated,
      time,
      data
    };

    const recordedUpdates = this.#recording.timeline.get(time) || [];

    recordedUpdates.push(recordedUpdate);

    this.#recording.timeline.set(time, recordedUpdates);
  }

  #onGameLaunched = (data: overwolf.games.RunningGameInfo) => {
    console.log('RecorderService.#onGameLaunched()', ...log(data));

    if (!this.#isRecording || !this.#recording) {
      return;
    }

    const time = Date.now();

    const recordedUpdate: RecordingGameLaunched = {
      type: RecordingEventTypes.GameLaunched,
      time,
      data
    };

    const recordedUpdates = this.#recording.timeline.get(time) || [];

    recordedUpdates.push(recordedUpdate);

    this.#recording.timeline.set(time, recordedUpdates);
  }

  #onGameInfoUpdated = (gameInfo: overwolf.games.GameInfoUpdatedEvent) => {
    console.log('RecorderService.#onGameInfoUpdated()', ...log(gameInfo));

    if (!this.#isRecording || !this.#recording) {
      return;
    }

    if (gameInfo.runningChanged) {
      if (gameInfo.gameInfo?.isRunning) {
        this.#setGameRequiredFeatures();
      } else {
        this.#removeLauncherEventListeners();
      }
    }

    const time = Date.now();

    const recordedUpdate: RecordingGameInfo = {
      type: RecordingEventTypes.GameInfo,
      time,
      data: gameInfo
    };

    const recordedUpdates = this.#recording.timeline.get(time) || [];

    recordedUpdates.push(recordedUpdate);

    this.#recording.timeline.set(time, recordedUpdates);
  }

  #onLauncherInfoUpdate = (data: any) => {
    console.log('RecorderService.#onLauncherInfoUpdate()', data);

    // if (!this.#isRecording || !this.#recording) {
    //   return;
    // }

    // const time = Date.now();

    // const info = data.info as Record<string, Record<string, any>>;

    // const recordedUpdates = this.#recording.timeline.get(time) || [];

    // for (const category in info) {
    //   for (const key in info[category]) {
    //     recordedUpdates.push({
    //       type: RecordingEventTypes.InfoUpdate,
    //       time,
    //       feature: data.feature,
    //       key,
    //       category,
    //       data: info[category][key]
    //     });
    //   }
    // }

    // this.#recording.timeline.set(time, recordedUpdates);
  }

  #onLauncherNewEvent = (data: any) => {
    console.log('RecorderService.#onLauncherNewEvent()', data);

    // if (!this.#isRecording || !this.#recording) {
    //   return;
    // }

    // const time = Date.now();

    // const recordedEvents = this.#recording.timeline.get(time) || [];

    // for (const { name, data } of data) {
    //   recordedEvents.push({
    //     type: RecordingEventTypes.GameEvent,
    //     time,
    //     name,
    //     data
    //   });
    // }

    // this.#recording.timeline.set(time, recordedEvents);
  }

  #onInfoUpdate = (update: overwolf.games.events.InfoUpdates2Event) => {
    console.log('RecorderService.#onInfoUpdate()', update);

    if (!this.#isRecording || !this.#recording) {
      return;
    }

    const time = Date.now();

    const info = update.info as Record<string, Record<string, any>>;

    const recordedUpdates = this.#recording.timeline.get(time) || [];

    for (const category in info) {
      for (const key in info[category]) {
        recordedUpdates.push({
          type: RecordingEventTypes.InfoUpdate,
          time,
          feature: update.feature,
          key,
          category,
          data: info[category][key]
        });
      }
    }

    this.#recording.timeline.set(time, recordedUpdates);
  }

  #onNewEvent = ({ events }: overwolf.games.events.NewGameEvents) => {
    console.log('RecorderService.#onNewEvent()', events);

    if (!this.#isRecording || !this.#recording) {
      return;
    }

    const time = Date.now();

    const recordedEvents = this.#recording.timeline.get(time) || [];

    for (const { name, data } of events) {
      recordedEvents.push({
        type: RecordingEventTypes.GameEvent,
        time,
        name,
        data
      });
    }

    this.#recording.timeline.set(time, recordedEvents);
  }

  #onError = (error: overwolf.games.events.ErrorEvent) => {
    console.log('RecorderService.#onError()', ...log(error));

    if (!this.#isRecording || !this.#recording) {
      return;
    }

    const time = Date.now();

    const recordedError: RecordingError = {
      type: RecordingEventTypes.Error,
      time,
      data: error
    };

    const recordedErrors = this.#recording.timeline.get(time) || [];

    recordedErrors.push(recordedError);

    this.#recording.timeline.set(time, recordedErrors);
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
      result: overwolf.games.launchers.events.SetRequiredFeaturesResult | null = null;

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
        `RecorderService.#setLauncherRequiredFeatures(): failure after ${tries + 1} tries:`,
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
        `RecorderService.#setGameRequiredFeatures(): failure after ${tries + 1} tries:`,
        result
      );
    }
  }

  #finishRecording() {
    if (!this.#recording) {
      return;
    }

    this.#recording.endTime = Date.now();
    this.#recording.complete = true;
  }

  /**
   * Call overwolf.games.events.setRequiredFeatures and bind listeners
   * @see https://overwolf.github.io/docs/api/overwolf-games-events#setrequiredfeaturesfeatures-callback
   */
  async start(gameFeatures: string[] = [], launcherFeatures: string[] = []) {
    if (this.#isRecording) {
      console.log('RecorderService.start(): recording already');
      return;
    }

    this.stop();

    this.#gameFeatures = gameFeatures;
    this.#launcherFeatures = launcherFeatures;

    this.#setListeners();

    this.#isRecording = true;
    this.#recording = RecorderService.#makeNewRecording();
  }

  async stop() {
    if (!this.#isRecording || !this.#recording) {
      console.error('RecorderService.stop(): no recording');
      return null;
    }

    this.#removeListeners();
    this.#removeLauncherEventListeners();
    this.#removeGameEventListeners();
    this.#finishRecording();

    const recording = this.#recording;

    this.#recording = null;
    this.#isRecording = false;

    return recording as CompleteRecording;
  }

  static #makeNewRecording(): IncompleteRecording {
    return {
      startTime: Date.now(),
      gameFeatures: null,
      setGameFeaturesResult: null,
      launcherFeatures: null,
      setLauncherFeaturesResult: null,
      endTime: null,
      timeline: new Map(),
      complete: false
    }
  }

  static isCompletedRecording(
    recording: IncompleteRecording | CompleteRecording
  ): recording is CompleteRecording {
    return recording.complete;
  }
}
