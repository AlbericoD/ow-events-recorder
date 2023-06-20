import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import hlStyle from 'react-syntax-highlighter/dist/esm/styles/hljs/monokai-sublime';

import { useCommonState } from '../../hooks/use-common-state';
import { useTimeline } from '../../hooks/use-timeline';
import { usePrevious } from '../../hooks/use-previous';
import { RecordingEvent } from '../../constants/types';
import { usePersState } from '../../hooks/use-pers-state';
import { classNames, formatTime } from '../../utils';

import './Log.scss';

SyntaxHighlighter.registerLanguage('json', json);

export type LogProps = {
  className?: string
}

export function Log({ className }: LogProps) {
  const
    recording = useCommonState('recording'),
    seek = useCommonState('playerSeek'),
    isPlaying = useCommonState('isPlaying');

  const
    typesFilter = usePersState('typesFilter'),
    featuresFilter = usePersState('featuresFilter');

  const timeline = useTimeline(
    recording?.uid ?? '',
    typesFilter,
    featuresFilter
  );

  const eventsListRef = useRef<HTMLDivElement | null>(null);

  const [expandedEvents, setExpandedEvents] = useState<number[]>([]);

  const recentIndex = useMemo(() => {
    if (timeline && timeline.length > 0) {
      const
        startFrom = timeline.length - 1,
        seekTime = (recording?.startTime ?? 0) + seek;

      for (var i = startFrom; i >= 0; i--) {
        if (timeline[i][0] && timeline[i][0] <= seekTime) {
          return i;
        }
      }
    }

    return null;
  }, [recording?.startTime, seek, timeline]);

  const prevIndex = usePrevious(recentIndex);

  const toggleExpand = (index: number) => {
    setExpandedEvents(expanded => {
      if (expanded.includes(index)) {
        return expanded.filter(i => i !== index);
      } else {
        return [...expanded, index];
      }
    });
  };

  const onCopyClick = (e: React.MouseEvent, copyText: string) => {
    e.stopPropagation();
    overwolf.utils.placeOnClipboard(copyText);
  };

  const blinkEl = useCallback((el: Element) => {
    if (el.classList.contains('blink')) {
      return;
    }

    el.addEventListener('animationend', (e: any) => {
      if (e.animationName === 'LogRecentBlink') {
        el.classList.remove('blink');
      }
    }, { once: true });

    el.classList.add('blink');
  }, []);

  const scrollToEl = (el: Element, smooth = false) => {
    el.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'nearest'
    });
  };

  const scrollToRecent = (index: number, smooth = false) => {
    if (eventsListRef.current) {
      const recentEl = eventsListRef.current.children[index];

      scrollToEl(recentEl, smooth);
      blinkEl(recentEl);
    }
  };

  const eventsList = useMemo(() => {
    if (!recording || !timeline) {
      return <></>;
    }

    const renderEvent = (
      [time, event]: [number, RecordingEvent],
      index: number
    ) => {
      const
        startTime = recording?.startTime ?? 0,
        timeText = formatTime(time - startTime, true),
        expanded = expandedEvents.includes(index),
        key = index + '-' + time,
        eventDataText = expanded ? JSON.stringify(event.data, null, '  ') : '';

      return (
        <div
          key={key}
          className={classNames(
            'event', { expanded }
          )}
          onClick={() => toggleExpand(index)}
        >
          {timeText + ' — ' + event.type}
          {
            expanded && <>
              <SyntaxHighlighter
                className="data"
                language="json"
                style={hlStyle}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >{eventDataText}</SyntaxHighlighter>
              <button
                className="copy"
                onClick={e => onCopyClick(e, eventDataText)}
              />
            </>
          }
        </div>
      );
    };

    return (
      <div className="events-list" ref={eventsListRef}>
        {timeline.map(renderEvent)}
      </div>
    );
  }, [expandedEvents, recording, timeline]);

  useEffect(() => {
    setExpandedEvents([]);

    if (eventsListRef.current) {
      eventsListRef.current.scrollTop = 0;
    }
  }, [recording?.uid]);

  useEffect(() => {
    if (
      !isPlaying ||
      !eventsListRef.current ||
      recentIndex === null ||
      prevIndex === null
    ) {
      return;
    }

    const recentEl = eventsListRef.current.children[recentIndex];

    if (!recentEl) {
      return;
    }

    scrollToEl(recentEl);

    const diff = recentIndex - prevIndex;

    if (diff === 1) {
      blinkEl(recentEl);
    } else if (diff > 1) {
      for (let i = prevIndex + 1; i <= recentIndex; i++) {
        const el = eventsListRef.current.children[i];

        if (el) {
          blinkEl(el);
        }
      }
    }
  }, [blinkEl, isPlaying, prevIndex, recentIndex]);

  if (!recording || !timeline) {
    return (
      <div className={classNames('Log', className)}>
        <div className="empty">
          {recording ? 'Loading…' : 'Select a recording'}
        </div>
      </div>
    );
  }

  return (
    <div className={classNames('Log', className)}>
      {eventsList}
      {
        !isPlaying && recentIndex !== null &&
        <button
          className="scroll-to-recent"
          onClick={() => scrollToRecent(recentIndex)}
        >Go to recent</button>
      }
    </div>
  );
}
