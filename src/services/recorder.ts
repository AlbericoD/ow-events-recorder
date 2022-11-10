import { EventEmitter, delay, log } from 'ow-libs';

export interface RecorderServiceEvents {
  onComplete: Recording
}

export const enum RecordingEventTypes {
  SetFeatures,
  GameEvent,
  InfoUpdate,
  Error
}

export interface RecordingEvent {
  type: RecordingEventTypes
  time: number
  data: any
}

export interface RecordingSetFeatures extends RecordingEvent {
  type: RecordingEventTypes.SetFeatures
  data: overwolf.games.events.SetRequiredFeaturesResult
}

export interface RecordingGameEvent extends RecordingEvent {
  type: RecordingEventTypes.GameEvent
  name: string
}

export interface RecordingInfoUpdate extends RecordingEvent {
  type: RecordingEventTypes.InfoUpdate
  feature: string
  category: string
  key: string
}

export interface RecordingError extends RecordingEvent {
  type: RecordingEventTypes.Error
}

export type RecordingTimeline = Map<number, RecordingEvent[]>;

export interface IncompleteRecording {
  startTime: number
  endTime: number | null
  timeline: RecordingTimeline
  complete: boolean
}

export interface Recording extends IncompleteRecording {
  endTime: number
  complete: true
}

const kMaxRetries = 25;

export class RecorderService extends EventEmitter<RecorderServiceEvents> {
  #features: string[] = [];
  #retriesLeft: number = kMaxRetries;

  #isRecording: boolean = false;
  #recording: IncompleteRecording | null = null;

  // constructor() {
  //   super();
  // }

  #removeListeners() {
    overwolf.games.events.onError.removeListener(this.#onError);
    overwolf.games.events.onInfoUpdates2.removeListener(this.#onInfoUpdate);
    overwolf.games.events.onNewEvents.removeListener(this.#onNewEvent);
  }

  #setListeners() {
    this.#removeListeners();
    overwolf.games.events.onError.addListener(this.#onError);
    overwolf.games.events.onInfoUpdates2.addListener(this.#onInfoUpdate);
    overwolf.games.events.onNewEvents.addListener(this.#onNewEvent);
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

    const [
      recentTime = null,
      recentErrors
    ] = this.#recording.errors[this.#recording.events.length - 1];

    if (recentTime === time) {
      recentErrors.push(recordedError);
    } else {
      this.#recording.errors.push([time, [recordedError]]);
    }
  }

  #onInfoUpdate = (update: overwolf.games.events.InfoUpdates2Event) => {
    console.log('RecorderService.#onInfoUpdate()', update);

    if (!this.#isRecording || !this.#recording) {
      return;
    }

    const time = Date.now();

    const info = update.info as Record<string, Record<string, any>>;

    const recordedUpdates: RecordingInfoUpdate[] = [];

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

    const [
      recentTime = null,
      recentUpdates
    ] = this.#recording.infoUpdates[this.#recording.events.length - 1];

    if (recentTime === time) {
      recentUpdates.push(...recordedUpdates);
    } else {
      this.#recording.infoUpdates.push([time, recordedUpdates]);
    }
  }

  #onNewEvent = ({ events }: overwolf.games.events.NewGameEvents) => {
    console.log('RecorderService.#onNewEvent()', events);

    if (!this.#isRecording || !this.#recording) {
      return;
    }

    const time = Date.now();

    const recordedEvents: RecordingGameEvent[] = [];

    for (const { name, data } of events) {
      recordedEvents.push({
        type: RecordingEventTypes.GameEvent,
        time,
        name,
        data
      });
    }

    const [
      recentTime = null,
      recentEvents
    ] = this.#recording.events[this.#recording.events.length - 1];

    if (recentTime === time) {
      recentEvents.push(...recordedEvents);
    } else {
      this.#recording.events.push([time, recordedEvents]);
    }
  }

  #tryToSetRequiredFeatures(): Promise<
    overwolf.games.events.SetRequiredFeaturesResult
  > {
    return new Promise(resolve => {
      overwolf.games.events.setRequiredFeatures(this.#features, resolve);
    });
  }

  async #setRequiredFeatures() {
    this.#retriesLeft = kMaxRetries;

    let
      tries = 0,
      result: overwolf.games.events.SetRequiredFeaturesResult | null = null;

    while (tries < this.#retriesLeft) {
      result = await this.#tryToSetRequiredFeatures();

      if (result.success) {
        console.log(...log(
          'RecorderService.#setRequiredFeatures(): success:',
          result
        ));

        return Boolean(
          result.supportedFeatures &&
          result.supportedFeatures.length
        );
      }

      await delay(2000);
      tries++;
    }

    console.log(
      `RecorderService.#setRequiredFeatures(): failure after ${tries + 1} tries:`,
      result
    );

    return false;
  }

  #finishRecording() {
    if (!this.#recording) {
      return;
    }

    this.#recording.endTime = Date.now();
  }

  /**
   * Call overwolf.games.events.setRequiredFeatures and bind listeners
   * @see https://overwolf.github.io/docs/api/overwolf-games-events#setrequiredfeaturesfeatures-callback
   */
  async start(features: string[]) {
    if (this.#isRecording) {
      console.log('RecorderService.start(): recording already');
      return;
    }

    this.stop();

    this.#features = features;

    const success = await this.#setRequiredFeatures();

    if (success) {
      this.#setListeners();
      this.#isRecording = true;
      this.#recording = RecorderService.#makeNewRecording();
    }
  }

  async stop() {
    if (!this.#isRecording) {
      console.log('RecorderService.stop(): no recording');
      return;
    }

    this.#removeListeners();
    this.#finishRecording();
    this.#isRecording = false;
  }

  static #makeNewRecording(): IncompleteRecording {
    return {
      startTime: Date.now(),
      endTime: null,
      setFeatures: [],
      events: [],
      infoUpdates: [],
      errors: [],
      complete: false
    }
  }
}
