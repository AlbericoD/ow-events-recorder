import { useCallback, useEffect, useMemo, useState } from 'react';

import { RecordingEvent, RecordingTimeline } from '../../shared';
import { useCommonState } from '../../hooks/use-common-state';
import { classNames, formatTime } from '../../utils';

import { EventTooltip } from '../EventTooltip/EventTooltip';
import { useTimeline } from '../../hooks/use-timeline';

import './Timeline.scss';

export type TimelineProps = {
  className?: string
}

type EventsChunk = {
  pos: number
  time: number
  events: RecordingEvent[]
}

type Tick = {
  pos: number
  value: string | null
}

const
  kPositionOffset = .2,
  kSectorSize = 20000,
  kEventChunkInterval = 500;

export function Timeline({ className }: TimelineProps) {
  const
    recording = useCommonState('recording'),
    seek = useCommonState('playerSeek');

  const timeline = useTimeline(recording?.uid ?? '' );

  const [scale, setScale] = useState(1);

  const sectorSize = useMemo(() => kSectorSize * scale, [scale]);

  (window as Record<any, any>).setScale = setScale;

  const {
    position,
    sectorCount,
    currentSector,
    prevSector,
    nextSector
  } = useMemo(() => {
    if (!recording) {
      return {
        position: 0,
        sectorCount: 0,
        currentSector: 0,
        prevSector: -1,
        nextSector: 1
      };
    }

    const
      length = recording.endTime - recording.startTime,
      lengthInSectors = length / sectorSize,
      sectorCount = Math.ceil(lengthInSectors),
      position = Math.min(seek / length, 1),
      positionAdjusted = (position * (lengthInSectors / sectorCount)),
      positionWithOffset = positionAdjusted - (kPositionOffset / sectorCount),
      currentSector = Math.floor(position * lengthInSectors),
      prevSector = currentSector - 1,
      nextSector = currentSector + 1;

    return {
      position: positionWithOffset,
      sectorCount,
      currentSector,
      prevSector,
      nextSector
    };
  }, [recording, sectorSize, seek]);

  const getSectorSeconds = (sector: number, sectorSize: number) => {
    const
      sectorStart = sector * sectorSize,
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

  const getSectorEvents = (
    sector: number,
    sectorSize: number,
    timeline: RecordingTimeline,
    startTime: number
  ) => {
    const
      sectorStart = sector * sectorSize,
      sectorEnd = sectorStart + sectorSize;

    const out: EventsChunk[] = [];

    for (var [timestamp, event] of timeline) {
      /** Time in ms from start of recording */
      const time = timestamp - startTime;

      if (time >= sectorStart && time <= sectorEnd) {
        const lastChunk = out[out.length-1];

        if (lastChunk && time < lastChunk.time + kEventChunkInterval) {
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

  function renderTime({ pos, value }: Tick) {
    return (
      <div
        key={pos}
        className={value ? 'second' : 'tick'}
        style={{ left: `${pos * 100}%` }}
      >{value}</div>
    );
  }

  const renderChunk = useCallback((
    { pos, time, events }: EventsChunk,
    startTime: number
  ) => {
    return (
      <EventTooltip
        key={time}
        time={time}
        startTime={startTime}
        events={events}
        style={{ left: `${pos * 100}%` }}
        className="events-chunk"
      />
    );
  }, []);

  const renderSector = useCallback((sector: number) => {
    if (!recording || !timeline) {
      return <></>;
    }

    const sectorWidth = 100 / sectorCount;

    const seconds = getSectorSeconds(sector, sectorSize);

    const events = getSectorEvents(
      sector,
      sectorSize,
      timeline,
      recording?.startTime ?? 0
    );

    return (
      <div
        key={sector}
        className="sector"
        style={{
          width: `${sectorWidth}%`,
          left: `${sector * sectorWidth}%`
        }}
      >
        {seconds.map(renderTime)}
        {events.map(v => renderChunk(v, recording?.startTime ?? 0))}
      </div>
    );
  }, [recording, renderChunk, sectorCount, sectorSize, timeline])

  const prevSectorRendered = useMemo(
    () => renderSector(prevSector),
    [prevSector, renderSector]
  );

  const currentSectorRendered = useMemo(
    () => renderSector(currentSector),
    [currentSector, renderSector]
  );

  const nextSectorRendered = useMemo(
    () => renderSector(nextSector),
    [nextSector, renderSector]
  );

  if (!recording) {
    return (
      <div className={classNames("Timeline", className)}>
        <div className="empty">Select a recording</div>
      </div>
    );
  }

  return (
    <div className={classNames("Timeline", className)}>
      <div
        className="line"
        style={{
          width: `${sectorCount * 100}%`,
          transform: `translateX(${position * -100}%)`
        }}
      >
        {prevSectorRendered}
        {currentSectorRendered}
        {nextSectorRendered}
      </div>

      <div
        className="current-position"
        style={{ left: `${kPositionOffset * 100}%` }}
      />
    </div>
  );
}
