import { EventEmitter } from 'ow-libs';
import { throttle } from 'throttle-debounce';

import { Recording, RecordingEvent } from '../shared';

const kTickInterval = 10; //ms

export type PlayerServiceEvents = {
  load: Recording
  playState: boolean
  seek: number
  playFrames: RecordingEvent[]
};

export interface IPlayerService extends EventEmitter<PlayerServiceEvents> {
  recording: Recording | null
  playing: boolean
  seek: number
  stopped: boolean
  recordingLength: number
  load(recording: Recording): void
  play(startFrom?: number): void
  stop(): void
  resume(): void
  pause(): void
  setSeek(seek: number): void
}

export class PlayerService extends EventEmitter<PlayerServiceEvents>
  implements IPlayerService {

  #recording: Recording | null = null;
  #playing: boolean = false;
  #currentSeek: number = -1;
  #nextTickTimeout: number | null = null;

  get recording() {
    return this.#recording;
  }

  get playing() {
    return this.#playing;
  }

  get seek() {
    return this.#currentSeek;
  }

  get stopped() {
    return (!this.#playing && this.#currentSeek >= this.recordingLength);
  }

  get recordingLength() {
    if (this.#recording === null) {
      return 0;
    }

    return this.#recording.endTime - this.#recording.startTime;
  }

  load(recording: Recording) {
    this.stop();

    this.#recording = recording;

    this.emit('load', recording);
  }

  play(startFrom: number = 0) {
    if (!this.#recording) {
      console.log('PlayerService.play(): no recording');
      return;
    }

    if (this.#playing) {
      console.log('PlayerService.play(): playing already');
      return;
    }

    this.#playing = true;
    this.#currentSeek = startFrom;

    this.emit('playState', true);

    this.#prepareTick();
  }

  stop() {
    if (!this.#recording) {
      console.log('PlayerService.stop(): no recording');
      return;
    }

    if (!this.#playing) {
      console.log('PlayerService.stop(): not playing already');
      return;
    }

    this.#recording = null;
    this.#playing = false;
    this.#currentSeek = -1;

    this.#cancelTick();

    this.emit('playState', false);
  }

  resume() {
    if (!this.#recording) {
      console.log('PlayerService.resume(): no recording');
      return;
    }

    if (this.#playing) {
      console.log('PlayerService.resume(): playing already');
      return;
    }

    this.#playing = true;

    this.emit('playState', true);

    this.#prepareTick();
  }

  pause() {
    if (!this.#recording) {
      console.log('PlayerService.pause(): no recording');
      return;
    }

    if (!this.#playing) {
      console.log('PlayerService.pause(): not playing already');
      return;
    }

    this.#playing = false;

    this.#cancelTick();

    this.emit('playState', false);
  }

  setSeek(seek: number) {
    if (!this.#recording) {
      console.log('PlayerService.setSeek(): no recording');
      return;
    }

    const newSeek = Math.min(Math.max(0, seek), this.recordingLength);

    if (this.#currentSeek !== newSeek) {
      this.#currentSeek = newSeek;
      this.emit('seek', this.#currentSeek);
    }
  }

  #cancelTick() {
    if (this.#nextTickTimeout !== null) {
      window.clearTimeout(this.#nextTickTimeout);
      this.#nextTickTimeout = null;
    }
  }

  #prepareTick() {
    if (this.#recording && this.#playing) {
      const before = Date.now();

      this.#nextTickTimeout = window.setTimeout(() => {
        this.#tick(before)
      }, kTickInterval);
    }
  }

  #tick(before: number) {
    if (!this.#recording || !this.#playing) {
      return;
    }

    const
      now = Date.now(),
      elapsed = now - before,
      seek = this.#currentSeek,
      newSeek = seek + elapsed;

    if (this.#currentSeek >= this.recordingLength) {
      this.pause();
      return;
    }

    if (seek >= 0) {
      this.#playFrames(seek, newSeek);
    }

    this.#currentSeek = newSeek;
    this.#updateSeek();
    this.#prepareTick();
  }

  // update seek position at 30hz
  #updateSeek = throttle(kTickInterval * 3, () => {
    this.emit('seek', this.#currentSeek);
  })

  #playFrames(start: number, end: number) {
    if (!this.#recording) {
      return;
    }

    const
      startAdjTime = this.#recording.startTime + start,
      endAdjTime = this.#recording.startTime + end;

    const events = this.#recording.timeline
      .filter(([time]) => (time >= startAdjTime && time < endAdjTime))
      .map(([_, event]) => event);

    if (events.length) {
      console.log('PlayerService.playFrames:', events);
      this.emit('playFrames', events);
    }
  }
}
