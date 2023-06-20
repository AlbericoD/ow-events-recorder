import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { EventTooltip } from '../EventTooltip/EventTooltip';

import { RecordingEvent } from '../../constants/types';
import { useCommonState } from '../../hooks/use-common-state';
import { useTimeline } from '../../hooks/use-timeline';
import { usePersState } from '../../hooks/use-pers-state';
import { eventBus } from '../../services/event-bus';
import { getSectorSeconds, getSectorEvents } from './timeline-utils';
import { clamp, classNames } from '../../utils';

import './Timeline.scss';

export type TimelineProps = {
  className?: string
}

export type EventsChunk = {
  pos: number
  time: number
  events: RecordingEvent[]
}

export type Tick = {
  pos: number
  value: string | null
}

type TimelineSectorData = {
  size: number
  length: number
  position: number
  sectorCount: number
  currentSector: number
}

const
  kPositionOffset = .2,
  kSectorSize = 20000, // ms
  kEventChunkInterval = 500, // ms
  kMoveIncrement = 50, // ms
  kMoveTickInterval = 50, // ms
  kMaxSpeedMultiplier = 6;

enum MovingDirection {
  None = 0,
  Forward = 1,
  Backward = -1
}

export function Timeline({ className }: TimelineProps) {

  const elRef = useRef<HTMLDivElement>(null);

  const
    recording = useCommonState('recording'),
    playerSeek = useCommonState('playerSeek'),
    isPlaying = useCommonState('isPlaying');

  const
    speed = usePersState('playerSpeed'),
    scale = usePersState('timelineScale'),
    typesFilter = usePersState('typesFilter'),
    featuresFilter = usePersState('featuresFilter');

  const timeline = useTimeline(
    recording?.uid ?? '',
    typesFilter,
    featuresFilter
  );

  const
    [moving, setMoving] = useState(MovingDirection.None),
    [changing, setChanging] = useState(false),
    [userSeek, setUserSeek] = useState(() => playerSeek);

  const lineTransitionFactor = changing ? 1 : Math.min(speed, 2.5);

  const seek = useMemo(
    () => (changing) ? userSeek : playerSeek,
    [changing, playerSeek, userSeek]
  );

  const {
    size,
    length,
    position,
    sectorCount,
    currentSector
  } = useMemo<TimelineSectorData>(() => {
    if (!recording) {
      return {
        size: kSectorSize,
        length: 1,
        position: 0,
        sectorCount: 0,
        currentSector: 0
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
      currentSector = Math.floor(position * lengthInSectors);

    return {
      size,
      length,
      position: positionWithOffset,
      sectorCount,
      currentSector
    };
  }, [recording, scale, seek]);

  const onPanClick = (e: React.MouseEvent, direction: MovingDirection) => {
    e.stopPropagation();

    if (!isPlaying) {
      setMoving(direction);
    }
  };

  const onTimelineClick = (e: MouseEvent) => {
    if (!elRef.current || elRef.current !== e.target) {
      return;
    }

    if (!recording || isPlaying) {
      return;
    }

    const
      { left, width } = elRef.current.getBoundingClientRect(),
      clickPos = ((e.clientX - left) / width) - kPositionOffset,
      targetSeek = Math.round(seek + (clickPos * size));

    setChanging(true);
    eventBus.emit('seek', targetSeek);
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

    const
      sectorWidth = 100 / sectorCount,
      seconds = getSectorSeconds(sectorN, size),
      chunkInterval = (scale >= 4)
        ? kEventChunkInterval * 4
        : kEventChunkInterval;

    const events = getSectorEvents(
      sectorN,
      size,
      timeline,
      recording?.startTime ?? 0,
      chunkInterval
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
    () => renderSector(currentSector - 1),
    [currentSector, renderSector]
  );

  const currentSectorRendered = useMemo(
    () => renderSector(currentSector),
    [renderSector, currentSector]
  );

  const nextSectorRendered = useMemo(
    () => renderSector(currentSector + 1),
    [renderSector, currentSector]
  );

  useEffect(() => {
    setChanging(false);
    setUserSeek(playerSeek);
  }, [playerSeek]);

  useEffect(() => {
    let
      tickIntervalHandle: number | null = null,
      iteration = 0,
      speedMultiplier = 1;

    const onMoveTick = (fireEvent = false) => {
      speedMultiplier = Math.min(
        speedMultiplier + (.01 * iteration),
        kMaxSpeedMultiplier
      );

      iteration++;

      // console.log('onMoveTick()', speedMultiplier, iteration);

      setChanging(true);

      setUserSeek(value => {
        switch (moving) {
          case MovingDirection.Forward:
            value += kMoveIncrement * speedMultiplier;
            break;
          case MovingDirection.Backward:
            value -= kMoveIncrement * speedMultiplier;
            break;
        }

        value = clamp(Math.round(value), 0, length);

        if (fireEvent) {
          eventBus.emit('seek', value);
        }

        return value;
      });
    };

    const onMouseUp = () => setMoving(direction => {
      if (direction !== MovingDirection.None) {
        onMoveTick(true);
      }

      return MovingDirection.None;
    });

    document.documentElement.addEventListener('mouseup', onMouseUp);

    if (moving !== MovingDirection.None) {
      onMoveTick();
      tickIntervalHandle = window.setInterval(onMoveTick, kMoveTickInterval);
    }

    return () => {
      if (tickIntervalHandle !== null) {
        window.clearInterval(tickIntervalHandle);
      }

      document.documentElement.removeEventListener('mouseup', onMouseUp);
    };
  }, [length, moving]);

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
      className={classNames('Timeline', className)}
      onClick={e => onTimelineClick(e.nativeEvent)}
    >
      <div
        className="line"
        style={{
          width: `${sectorCount * 100}%`,
          transform: `translateX(${position * -100}%)`,
          transition: `${lineTransitionFactor * 100}ms transform linear`
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

      <button
        className="backward"
        onMouseDown={e => onPanClick(e, MovingDirection.Backward)}
      />
      <button
        className="forward"
        onMouseDown={e => onPanClick(e, MovingDirection.Forward)}
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
