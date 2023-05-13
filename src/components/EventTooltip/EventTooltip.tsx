import { useState, useCallback, createElement, useRef, useMemo, useEffect, Fragment } from 'react';
import { createPortal } from 'react-dom';

import { RecordingEvent } from '../../shared';
import { classNames, formatTime } from '../../utils';

import './EventTooltip.scss';

type EventTooltipProps = {
  startTime: number
  time: number
  events: RecordingEvent[]
  style: Partial<HTMLElement['style']>
  className?: string
}

const
  kHorizontalOffset = 12,
  kTopOffset = -20;

export function EventTooltip({
  startTime,
  time,
  events,
  style,
  className
}: EventTooltipProps) {
  const [shown, setShown] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  const [tipWidth, setTipWidth] = useState(0);

  const areaRef = useRef<HTMLElement | null>(null);
  const tipRefRef = useRef<HTMLElement | null>(null);

  const tipRef = useCallback((node: HTMLElement | null) => {
    tipRefRef.current = node;
    setTipWidth(node?.clientWidth ?? 0);
  }, []);

  const left = useMemo(() => {
    if (!areaRef.current || !shown) {
      return 0;
    }

    const rect = areaRef.current.getBoundingClientRect();

    let value = rect.right + kHorizontalOffset;

    if (value + tipWidth > window.innerWidth) {
      value = rect.left - tipWidth - kHorizontalOffset;
    }

    return Math.max(Math.round(value), 0);
  }, [shown, tipWidth]);

  const top = useMemo(() => {
    if (!areaRef.current || !shown) {
      return 0;
    }

    const rect = areaRef.current.getBoundingClientRect();

    let value = rect.top + kTopOffset;

    return Math.max(Math.round(value), 0);
  }, [shown]);

  const onAnimationEnd = (e: React.AnimationEvent<HTMLElement>) => {
    if (e.animationName === 'EventTooltipContent-fade-out') {
      setShown(false);
    }
  }

  const toggle = (e: MouseEvent) => {
    if (
      tipRefRef.current === e.target ||
      tipRefRef.current?.contains(e.target as Node)
    ) {
      return;
    }

    if (shown) {
      hide();
    } else {
      show();
    }
  }

  const show = () => {
    setFadingOut(false);
    setShown(true);
  }

  const hide = () => {
    setFadingOut(true);
  }

  const renderChunk = () => {
    if (events.length > 3) {
      return <>
        <div className="event" />
        <div className="count">{events.length}</div>
      </>;
    }

    return events.map((e, i) => <div className="event" key={`${e.time}-${i}`} />)
  }

  const renderTooltip = () => (
    <div
      className={classNames('EventTooltipContent', { 'fade-out': fadingOut })}
      style={{
        left: `${left}px`,
        top: `${top}px`
      }}
      ref={tipRef}
      onAnimationEnd={onAnimationEnd}
    >
      <button className="close" onClick={hide} />
      <h3 className="chunk-title">{events.length} events</h3>
      {events.map(renderEvent)}
    </div>
  )

  const renderEvent = (event: RecordingEvent, index: number) => {
    const
      data = JSON.stringify(event.data, null, '  '),
      formattedTime = formatTime(event.time - startTime, true);

    return (
      <div className="event" key={`${event.time}-${index}`}>
        <h6 className="title">
          #{index + 1} <strong>{event.type}</strong> at {formattedTime}
        </h6>
        <pre className="data">{data}</pre>
      </div>
    );
  }

  const renderPortal = () => createPortal(
    renderTooltip(),
    document.body,
    `EventTooltipContent-${time}`
  )

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {

      if (
        shown &&
        areaRef.current !== null &&
        areaRef.current !== e.target &&
        !areaRef.current.contains(e.target as Node) &&
        tipRefRef.current !== null &&
        tipRefRef.current !== e.target &&
        !tipRefRef.current.contains(e.target as Node)
      ) {
        hide();
      }
    }

    document.body.addEventListener('click', handleClickOutside);

    return () => document.body.removeEventListener('click', handleClickOutside);
  }, [shown]);

  return createElement(
    'div',
    {
      style,
      className: `EventTooltip ${className}`,
      onClick: toggle,
      ref: areaRef
    },
    renderChunk(),
    shown ? renderPortal() : null
  );
}
