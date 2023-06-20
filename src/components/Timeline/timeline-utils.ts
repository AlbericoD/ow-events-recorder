import { Tick, EventsChunk } from './Timeline';

import { RecordingTimeline } from '../../constants/types';
import { formatTime } from '../../utils';

export const getSectorSeconds = (sectorN: number, sectorSize: number) => {
  const
    sectorStart = sectorN * sectorSize,
    sectorEnd = sectorStart + sectorSize,
    incr = sectorSize / 40;

  /** Time in ms from start of recording */
  let time = sectorStart;

  const out: Tick[] = [];

  let lastTime = '';

  while (time < sectorEnd) {
    const tick: Tick = {
      pos: (time - sectorStart) / sectorSize,
      value: null
    };

    if ((time % (incr * 2)) === 0) {
      const value = formatTime(time);

      if (value !== lastTime) {
        lastTime = value;
        tick.value = value;
      }
    }

    out.push(tick);

    time += incr;
  }

  return out;
};

export const getSectorEvents = (
  sectorN: number,
  sectorSize: number,
  timeline: RecordingTimeline,
  startTime: number,
  chunkInterval: number
) => {
  const
    sectorStart = sectorN * sectorSize,
    sectorEnd = sectorStart + sectorSize;

  const out: EventsChunk[] = [];

  for (var [timestamp, event] of timeline) {
    /** Time in ms from start of recording */
    const time = timestamp - startTime;

    if (time >= sectorStart && time <= sectorEnd) {
      const lastChunk = out[out.length - 1];

      if (lastChunk && time < lastChunk.time + chunkInterval) {
        lastChunk.events.push(event);
      } else {
        out.push({
          time,
          pos: (time - sectorStart) / sectorSize,
          events: [event]
        });
      }
    }
  }

  return out;
};
