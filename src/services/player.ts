import { Recording, RecordingEvent } from '../constants/types';

const kTickInterval = 10; //ms

export class PlayerService {
  #recording: Recording | null = null;
  #playing: boolean = false;
  #currentSeek: number = -1;

  get recording() {
    return this.#recording;
  }

  get playing() {
    return this.#playing;
  }

  get seek() {
    return this.#currentSeek;
  }

  get recordingLength() {
    if (this.#recording === null) {
      return 0;
    }

    return this.#recording.endTime - this.#recording.startTime;
  }

  get ready() {
    return this.#recording !== null;
  }

  load(recording: Recording) {
    this.#recording = recording;
  }

  play(startFrom: number = 0) {
    if (!this.ready || this.#playing) {
      return;
    }

    this.#playing = true;
    this.#currentSeek = startFrom;

    this.#setupTick();
  }

  stop() {
    if (!this.ready || !this.#playing) {
      return;
    }

    this.#recording = null;
    this.#playing = false;
    this.#currentSeek = -1;
  }

  resume() {
    if (!this.ready || this.#playing) {
      return;
    }

    this.#playing = true;

    this.#setupTick();
  }

  pause() {
    if (!this.ready || !this.#playing) {
      return;
    }

    this.#playing = false;
  }

  setSeek(seek: number) {
    if (!this.ready || !this.#playing) {
      return;
    }

    this.#currentSeek = Math.min(Math.max(0, seek), this.recordingLength);
  }

  #setupTick() {
    if (!this.ready || !this.#playing) {
      return;
    }

    const before = Date.now();

    setTimeout(() => {
      if (!this.ready || !this.#playing) {
        return;
      }

      const
        now = Date.now(),
        elapsed = now - before,
        seek = this.#currentSeek,
        newSeek = seek + elapsed;

      if (seek >= 0) {
        this.#playFrames(this.#getFrames(seek, newSeek));
      }

      this.#currentSeek = newSeek;

      if (this.#currentSeek >= this.recordingLength) {
        this.pause();
      } else {
        this.#setupTick();
      }
    }, kTickInterval);
  }

  #getFrames(start: number, end: number) {
    if (!this.#recording) {
      return [];
    }

    const
      startAdjTime = this.#recording.startTime + start,
      endAdjTime = this.#recording.startTime + end;

    return this.#recording.timeline.filter(([time]) => {
      return (time >= startAdjTime && time < endAdjTime);
    });
  }

  #playFrames(frames: [number, RecordingEvent][]) {
    frames.forEach(v => this.#playFrame(...v));
  }

  #playFrame(time: number, event: RecordingEvent) {
    console.log('event', time, event);
  }
}
