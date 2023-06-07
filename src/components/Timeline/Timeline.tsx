import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { EventTooltip } from '../EventTooltip/EventTooltip';

import { RecordingEvent, RecordingTimeline } from '../../shared';
import { useCommonState } from '../../hooks/use-common-state';
import { useTimeline } from '../../hooks/use-timeline';
import { usePersState } from '../../hooks/use-pers-state';
import { eventBus } from '../../services/event-bus';
import { clamp, classNames, formatTime } from '../../utils';

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

type TimelineSectorData = {
  size: number
  length: number
  position: number
  sectorCount: number
  currentSector: number
  prevSector: number
  nextSector: number
}

const
  kPositionOffset = .2,
  kSectorSize = 20000, // ms
  kEventChunkInterval = 500, // ms
  kMaxMouseMoveFactor = 750, // px
  kMaxMoveIncrement = 1000, // ms
  kMoveTickInterval = 100; // ms

const getSectorSeconds = (sectorN: number, sectorSize: number) => {
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

const getSectorEvents = (
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
      const lastChunk = out[out.length-1];

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

export function Timeline({ className }: TimelineProps) {

  const elRef = useRef<HTMLDivElement>(null);

  const
    recording = useCommonState('recording'),
    playerSeek = useCommonState('playerSeek'),
    isPlaying = useCommonState('isPlaying');

  const
    // speed = usePersState('playerSpeed'),
    scale = usePersState('timelineScale');

  const timeline = useTimeline(recording?.uid ?? '');

  const
    [mouseDownPos, setMouseDownPos] = useState<number | null>(null),
    [changing, setChanging] = useState(false),
    [userSeek, setUserSeek] = useState(() => playerSeek);

  const seek = useMemo(
    () => (mouseDownPos !== null || changing) ? userSeek : playerSeek,
    [changing, mouseDownPos, playerSeek, userSeek]
  );

  const {
    size,
    length,
    position,
    sectorCount,
    currentSector,
    prevSector,
    nextSector
  } = useMemo<TimelineSectorData>(() => {
    if (!recording) {
      return {
        size: kSectorSize,
        length: 1,
        position: 0,
        sectorCount: 0,
        currentSector: 0,
        prevSector: -1,
        nextSector: 1
      };
    }

    const
      size = kSectorSize * scale,
      length = recording.endTime - recording.startTime,
      lengthInSectors = length / size,
      sectorCount = Math.ceil(lengthInSectors),
      position = Math.min(seek / length, 1),
      positionAdjusted = (position * (lengthInSectors / sectorCount)),
      positionWithOffset = positionAdjusted - (kPositionOffset / sectorCount),
      currentSector = Math.floor(position * lengthInSectors),
      prevSector = currentSector - 1,
      nextSector = currentSector + 1;

    return {
      size,
      length,
      position: positionWithOffset,
      sectorCount,
      currentSector,
      prevSector,
      nextSector
    };
  }, [recording, scale, seek]);

  const onMouseDown = (e: MouseEvent) => {
    if (recording && !isPlaying && elRef.current === e.target) {
      setMouseDownPos(e.clientX);
    }
  };

  const setScale = (scale: number) => eventBus.emit('setTimelineScale', scale);

  const renderTime = ({ pos, value }: Tick) => (
    <div
      key={pos}
      className={value ? 'second' : 'tick'}
      style={{ left: `${pos * 100}%` }}
    >{value}</div>
  );

  const renderSector = useCallback((sectorN: number) => {
    if (!recording || !timeline) {
      return <></>;
    }

    const sectorWidth = 100 / sectorCount;

    const seconds = getSectorSeconds(sectorN, size);

    const events = getSectorEvents(
      sectorN,
      size,
      timeline,
      recording?.startTime ?? 0,
      (scale >= 4) ? kEventChunkInterval * 2 : kEventChunkInterval
    );

    const renderChunk = ({ pos, time, events }: EventsChunk) => (
      <EventTooltip
        key={time}
        time={time}
        startTime={recording?.startTime ?? 0}
        events={events}
        style={{ left: `${pos * 100}%` }}
        className="events-chunk"
      />
    );

    return (
      <div
        key={sectorN}
        className="sector"
        style={{
          width: `${sectorWidth}%`,
          left: `${sectorN * sectorWidth}%`
        }}
      >
        {seconds.map(renderTime)}
        {events.map(renderChunk)}
      </div>
    );
  }, [recording, scale, timeline, sectorCount, size]);

  const prevSectorRendered = useMemo(
    () => renderSector(prevSector),
    [renderSector, prevSector]
  );

  const currentSectorRendered = useMemo(
    () => renderSector(currentSector),
    [renderSector, currentSector]
  );

  const nextSectorRendered = useMemo(
    () => renderSector(nextSector),
    [renderSector, nextSector]
  );

  useEffect(() => {
    setChanging(false);
    setUserSeek(playerSeek);
  }, [playerSeek]);

  useEffect(() => {
    if (isPlaying || mouseDownPos === null) {
      return;
    }

    let
      tickIntervalHandle: number | null = null,
      moveFactor = 0;

    const onMouseMoved = (e: MouseEvent) => {
      let value = e.clientX - mouseDownPos;

      value = clamp(value, -kMaxMouseMoveFactor, kMaxMouseMoveFactor);

      moveFactor = value / kMaxMouseMoveFactor;
    };

    const onMoveTick = (fireEvent = false) => {
      setUserSeek(value => {
        value += kMaxMoveIncrement * moveFactor;

        value = Math.round(value);

        value = clamp(value, 0, length);

        if (fireEvent) {
          setChanging(true);
          eventBus.emit('seek', value);
        }

        return value;
      });
    };

    const onMouseUp = () => {
      onMoveTick(true);
      setMouseDownPos(null);
    };

    const onBlur = () => setMouseDownPos(null);

    window.addEventListener('blur', onBlur);

    if (mouseDownPos !== null) {
      onMoveTick();
      tickIntervalHandle = window.setInterval(onMoveTick, kMoveTickInterval);

      document.documentElement.addEventListener('mousemove', onMouseMoved);
      document.documentElement.addEventListener('mouseup', onMouseUp);
      window.addEventListener('blur', onBlur);
    }

    return () => {
      if (tickIntervalHandle !== null) {
        window.clearInterval(tickIntervalHandle);
      }

      document.documentElement.removeEventListener('mousemove', onMouseMoved);
      document.documentElement.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [isPlaying, mouseDownPos, length]);

  if (!recording || !timeline) {
    return (
      <div className={classNames('Timeline', className)}>
        <div className="empty">
          {recording ? 'Loading…' : 'Select a recording'}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={elRef}
      className={classNames(
        'Timeline',
        className,
        { 'mouse-down': mouseDownPos !== null }
      )}
      onMouseDown={e => onMouseDown(e.nativeEvent)}
    >
      <div
        className="line"
        style={{
          width: `${sectorCount * 100}%`,
          transform: `translateX(${position * -100}%)`,
          // transition: `${100 * speed}ms transform linear`
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

      <div
        className="scale-switch"
        onMouseDown={e => e.stopPropagation()}
      >
        <button
          onClick={() => setScale(.5)}
          className={classNames({ active: scale === .5 })}
        >200%</button>
        <button
          onClick={() => setScale(1)}
          className={classNames({ active: scale === 1 })}
        >100%</button>
        <button
          onClick={() => setScale(2)}
          className={classNames({ active: scale === 2 })}
        >50%</button>
        <button
          onClick={() => setScale(4)}
          className={classNames({ active: scale === 4 })}
        >25%</button>
      </div>
    </div>
  );
}
