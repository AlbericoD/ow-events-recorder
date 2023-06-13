import { EventEmitter } from 'ow-libs';

import { isRecordingGameInfo, isRecordingLauncherLaunched, isRecordingLauncherUpdated, isRecordingLauncherTerminated, isRecordingGameFeaturesSet, isRecordingLauncherFeaturesSet } from '../constants/type-guards';
import { RecordingEvent, Recording, NullableResultCallback, ResultCallback, RecordingTimeline } from '../constants/types';

const
  kTickInterval = 10, // ms
  kEventEveryNTicks = 10; // every ~100ms

export type PlayerServiceEvents = {
  unload: void
  load: string
  playing: boolean
  seek: number
  speed: number
  playFrames: RecordingEvent[]
};

export class PlayerService extends EventEmitter<PlayerServiceEvents> {
  #recording: Recording | null = null;
  #playing = false;
  #seek = 0;
  #speed = 1;
  #tickCounter = 0;
  #nextTickTimeout: number | null = null;

  get loaded() {
    return this.#recording !== null;
  }

  get recording() {
    return this.#recording;
  }

  get playing() {
    return this.#playing;
  }

  get seek() {
    return this.#seek;
  }

  get speed() {
    return this.#speed;
  }

  get stopped() {
    return (!this.#playing && this.#seek >= this.recordingLength);
  }

  get recordingLength() {
    if (this.#recording === null) {
      return 0;
    }

    return this.#recording.endTime - this.#recording.startTime;
  }

  load(recording: Recording) {
    this.pause();

    this.#recording = recording;

    this.emit('load', recording.uid);

    console.log(
      'Event Player: loaded recording:',
      recording.title,
      recording.uid
    );
  }

  unload() {
    this.pause();

    this.#recording = null;
    this.#seek = 0;

    this.emit('unload');
  }

  play() {
    if (this.#playing) {
      // console.log('PlayerService.play(): playing already');
      return;
    }

    if (!this.#recording) {
      // console.log('PlayerService.play(): no recording');
      return;
    }

    this.#playing = true;
    this.#tickCounter = 0;

    this.emit('playing', true);

    if (this.#seek >= this.recordingLength) {
      this.setSeek(0);
    }

    this.#prepareTick();
  }

  pause() {
    if (!this.#playing) {
      // console.log('PlayerService.pause(): not playing already');
      return;
    }

    if (!this.#recording) {
      // console.log('PlayerService.pause(): no recording');
      return;
    }

    this.#playing = false;
    this.#tickCounter = 0;

    this.#cancelTick();

    this.emit('playing', false);
  }

  setSeek(seek: number) {
    if (!this.#recording) {
      console.log('Event Player: setSeek(): no recording');
      return;
    }

    const newSeek = Math.min(
      Math.max(Math.round(seek), 0),
      this.recordingLength
    );

    if (this.#seek !== newSeek) {
      this.#seek = newSeek;
      this.emit('seek', newSeek);
    }
  }

  setSpeed(speed: number) {
    if (this.#speed !== speed) {
      this.#speed = speed;
      this.emit('speed', speed);
    }
  }

  #cancelTick() {
    if (this.#nextTickTimeout !== null) {
      window.clearTimeout(this.#nextTickTimeout);
      this.#nextTickTimeout = null;
    }
  }

  #prepareTick() {
    if (!this.#recording || !this.#playing) {
      return;
    }

    const before = Date.now();

    if (this.#nextTickTimeout !== null) {
      window.clearTimeout(this.#nextTickTimeout);
    }

    this.#nextTickTimeout = window.setTimeout(() => {
      this.#tick(before);
    }, kTickInterval);
  }

  #tick(before: number) {
    if (!this.#recording || !this.#playing) {
      return;
    }

    const
      now = Date.now(),
      elapsed = Math.round((now - before) * this.#speed),
      seek = this.#seek,
      recordingLength = this.recordingLength,
      newSeek = seek + elapsed;

    if (this.#seek >= recordingLength) {
      this.#seek = recordingLength;
      this.pause();
      return;
    }

    // console.log('PlayerService.#tick():', { seek, newSeek, elapsed });

    this.#tickCounter++;
    this.#seek = newSeek;

    this.#playFrames(seek, newSeek);

    if ((this.#tickCounter % kEventEveryNTicks) === 0) {
      this.emit('seek', this.#seek);
    }

    this.#prepareTick();
  }

  #playFrames(start: number, end: number) {
    if (!this.#recording) {
      return;
    }

    const
      startAdjTime = this.#recording.startTime + start,
      endAdjTime = this.#recording.startTime + end;

    const events = this.#recording.timeline
      .filter(([time]) => (time >= startAdjTime && time < endAdjTime))
      .map(([, event]) => event);

    if (events.length > 0) {
      // console.log('Event Player: playFrames:', events);
      this.emit('playFrames', events);
    }
  }

  getRunningGameInfo(cb: NullableResultCallback<
    overwolf.games.GetRunningGameInfoResult
  >) {
    if (!this.#recording) {
      console.log('Event Player: no recording');
      return cb(null);
    }

    const before = this.#recording.startTime + this.#seek;

    const event = PlayerService.getEventByTypeRecent(
      this.#recording.timeline,
      before,
      isRecordingGameInfo
    );

    if (!event || !event.data || !event.data.gameInfo) {
      return cb(null);
    }

    cb({
      success: true,
      ...event.data.gameInfo,
      overlayInfo: {}
    });
  }

  getRunningGameInfo2(cb: ResultCallback<
    overwolf.games.GetRunningGameInfoResult2
  >) {
    try {
      if (!this.#recording) {
        throw new Error('Event Player: no recording');
      }

      const before = this.#recording.startTime + this.#seek;

      const event = PlayerService.getEventByTypeRecent(
        this.#recording.timeline,
        before,
        isRecordingGameInfo
      );

      const gameInfo = (event?.data.gameInfo)
        ? {
          ...event.data.gameInfo,
          overlayInfo: {}
        }
        : null;

      cb({
        success: true,
        gameInfo
      });
    } catch (e) {
      console.warn(e);

      cb({
        success: false,
        error: String(e),
        gameInfo: null
      });
    }
  }

  getRunningLaunchersInfo(cb: ResultCallback<
    overwolf.games.launchers.GetRunningLaunchersInfoResult
  >) {
    try {
      if (!this.#recording) {
        throw new Error('Event Player: no recording');
      }

      const before = this.#recording.startTime + this.#seek;

      const launchedEvent = PlayerService.getEventByTypeRecent(
        this.#recording.timeline,
        before,
        isRecordingLauncherLaunched
      );

      const updatedEvent = PlayerService.getEventByTypeRecent(
        this.#recording.timeline,
        before,
        isRecordingLauncherUpdated
      );

      const closedEvent = PlayerService.getEventByTypeRecent(
        this.#recording.timeline,
        before,
        isRecordingLauncherTerminated
      );

      console.log(
        'Event Player: DEBUG: getRunningLaunchersInfo():',
        { launchedEvent, updatedEvent, closedEvent }
      );

      const launchers: overwolf.games.launchers.LauncherInfo[] = [];

      if (
        updatedEvent &&
        (!closedEvent || updatedEvent.time > closedEvent.time)
      ) {
        launchers.push(updatedEvent.data.info);
      } else if (
        launchedEvent &&
        (!closedEvent || launchedEvent.time > closedEvent.time)
      ) {
        launchers.push(launchedEvent.data);
      }

      cb({
        success: true,
        launchers
      });
    } catch (e) {
      console.warn(e);

      cb({
        success: false,
        error: String(e),
        launchers: []
      });
    }
  }

  setGameRequiredFeatures(cb: ResultCallback<
    overwolf.games.events.SetRequiredFeaturesResult
  >) {
    try {
      if (!this.#recording) {
        throw new Error('Event Player: no recording');
      }

      const after = this.#recording.startTime + this.#seek - 20000;

      const featuresSetEvent = PlayerService.getEventByTypeAfter(
        this.#recording.timeline,
        after,
        isRecordingGameFeaturesSet
      );

      if (featuresSetEvent) {
        cb(featuresSetEvent.data);
      } else {
        throw new Error('Event Player: features set not found');
      }
    } catch (e) {
      console.warn(e);

      cb({
        success: false,
        error: String(e),
        supportedFeatures: []
      });
    }
  }

  setLauncherRequiredFeatures(cb: ResultCallback<
    overwolf.games.launchers.events.SetRequiredFeaturesResult
  >) {
    try {
      if (!this.#recording) {
        throw new Error('Event Player: no recording');
      }

      const after = this.#recording.startTime + this.#seek - 20000;

      const featuresSetEvent = PlayerService.getEventByTypeAfter(
        this.#recording.timeline,
        after,
        isRecordingLauncherFeaturesSet
      );

      if (featuresSetEvent) {
        cb(featuresSetEvent.data);
      } else {
        throw new Error('Event Player: launcher features set not found');
      }
    } catch (e) {
      console.warn(e);

      cb({
        success: false,
        error: String(e),
        supportedFeatures: []
      });
    }
  }

  static getEventByTypeRecent<T extends RecordingEvent>(
    timeline: RecordingTimeline,
    before: number,
    guard: (e: RecordingEvent) => e is T
  ) {
    const startFrom = timeline.length - 1;

    for (let i = startFrom; i >= 0; i--) {
      const [time, event] = timeline[i];

      if (time <= before && guard(event)) {
        return event;
      }
    }

    return null;
  }

  static getEventByTypeAfter<T extends RecordingEvent>(
    timeline: RecordingTimeline,
    after: number,
    guard: (e: RecordingEvent) => e is T
  ) {
    const timelineLength = timeline.length;

    for (let i = 0; i < timelineLength; i++) {
      const [time, event] = timeline[i];

      if (time > after && guard(event)) {
        return event;
      }
    }

    return null;
  }
}
