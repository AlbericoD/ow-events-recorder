import { useState, createElement, useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import hlStyle from 'react-syntax-highlighter/dist/esm/styles/hljs/monokai-sublime';

import { RecordingEvent } from '../../constants/types';
import { classNames, formatTime } from '../../utils';

import './EventTooltip.scss';

SyntaxHighlighter.registerLanguage('json', json);

type EventTooltipProps = {
  startTime: number
  time: number
  events: RecordingEvent[]
  style: Partial<HTMLElement['style']>
  className?: string
}

const
  kMargin = 10,
  kLineHeight = 30;

export function EventTooltip({
  startTime,
  time,
  events,
  style,
  className
}: EventTooltipProps) {
  const [isHover, setIsHover] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const [tipRect, setTipRect] = useState<DOMRect | null>(null);
  const [areaRect, setAreaRect] = useState<DOMRect | null>(null);

  const areaRef = useRef<HTMLElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);

  const isShown = useMemo(() => isHover || isOpen, [isHover, isOpen]);

  const { left, top } = useMemo(() => {
    if (!areaRect || !tipRect) {
      return { left: -1, top: -1 };
    }

    let
      left = areaRect.right + kMargin,
      top = areaRect.top + (areaRect.height/2) - (kLineHeight/2);

    if (left + tipRect.width > window.innerWidth) {
      left = areaRect.left - tipRect.width - kMargin;
    }

    if (top + tipRect.height + kMargin > window.innerHeight) {
      top = window.innerHeight - tipRect.height - kMargin;
    }

    left = Math.max(left, 0);

    top = Math.max(top, 0);

    return { left, top };
  }, [areaRect, tipRect]);

  const onClick = (e: MouseEvent) => {
    if (
      tipRef.current !== null &&
      tipRef.current !== e.target &&
      !tipRef.current.contains(e.target as Node)
    ) {
      setIsOpen(v => !v);
    }
  }

  const copyText = (text: string) => {
    overwolf.utils.placeOnClipboard(text);
  }

  const close = () => {
    setIsOpen(false);
    setIsHover(false);
  }

  const onClickOutside = (e: MouseEvent) => {
    if (
      areaRef.current !== null &&
      areaRef.current !== e.target &&
      !areaRef.current.contains(e.target as Node) &&
      tipRef.current !== null &&
      tipRef.current !== e.target &&
      !tipRef.current.contains(e.target as Node)
    ) {
      setIsOpen(false);
    }
  }

  const renderChunk = () => {
    if (events.length > 4) {
      return <>
        <div className="event" />
        <div className="count">{events.length}</div>
      </>;
    }

    return events.map((e, i) => (
      <div className="event" key={`${e.time}-${i}`} />
    ))
  }

  const renderTooltip = () => (
    <div
      ref={tipRef}
      className={classNames('EventTooltipContent', { open: isOpen })}
      style={{
        left: (left === -1) ? '-100000%' : `${left}px`,
        top: (top === -1) ? '-100000%' : `${top}px`
      }}
    >
      {isOpen && <button className="close" onClick={close} />}
      <h3 className="chunk-title">{events.length} events</h3>
      <div className="events-list">{events.map(renderEvent)}</div>
    </div>
  )

  const renderEvent = (event: RecordingEvent, index: number) => {
    const
      eventDataText = isOpen ? JSON.stringify(event.data, null, '  ') : '',
      formattedTime = formatTime(event.time - startTime, true);

    return (
      <div className="event" key={`${event.time}-${index}`}>
        <h6 className="title">
          #{index + 1} <strong>{event.type}</strong> at {formattedTime}
        </h6>

        {
          isOpen && <>
            <SyntaxHighlighter
              className="data"
              language="json"
              style={hlStyle}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >{eventDataText}</SyntaxHighlighter>
            <button
              className="copy"
              onClick={() => copyText(eventDataText)}
            />
          </>
        }
      </div>
    );
  }

  const renderPortal = () => createPortal(
    renderTooltip(),
    document.body,
    `EventTooltipContent-${time}`
  );

  useEffect(() => {
    document.body.addEventListener('click', onClickOutside);

    return () => document.body.removeEventListener('click', onClickOutside);
  }, []);

  useLayoutEffect(() => {
    const updateRects = () => {
      setAreaRect(areaRef.current?.getBoundingClientRect() ?? null);
      setTipRect(tipRef.current?.getBoundingClientRect() ?? null);
    };

    updateRects();

    let handle: number | null = null;

    if (isShown) {
      handle = window.setInterval(updateRects, 1000 / 20);
    }

    return () => {
      if (handle !== null) {
        window.clearInterval(handle);
      }
    };
  }, [isShown]);

  return createElement(
    'div',
    {
      ref: areaRef,
      style,
      className: `EventTooltip ${className}`,
      onClick,
      onMouseEnter: () => setIsHover(true),
      onMouseLeave: () => setIsHover(false)
    },
    renderChunk(),
    isShown ? renderPortal() : null
  );
}
