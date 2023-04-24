import { useEffect, useMemo, useState } from 'react';

import { useCommonState } from '../../hooks/use-common-state';
import { classNames, formatTime } from '../../utils';
import { eventBus } from '../../services/event-bus';

import { Recording } from '../Recording/Recording';

import './Record.scss';

export type RecordProps = {
  className?: string
}

const kTimerInterval = 1000 / 24; // 24fps

export function Record({ className }: RecordProps) {
  const
    isRecording = useCommonState('isRecording'),
    recordings = useCommonState('recordings');

  const [elapsed, setElapsed] = useState('');
  const [, setTimerHandle] = useState<number | null>(null);

  const [showRecordings, setShowRecordings] = useState(false);

  const newRecordings = useMemo(() => {
    const
      now = Date.now(),
      dayInMs = (24 * 60 * 60 * 1000),
      todayStart = now - (now % dayInMs);

    return recordings.filter(r => r.startTime >= todayStart);
  }, [recordings]);

  function startStopRecord() {
    eventBus.emit('record');
  }

  useEffect(() => {
    if (isRecording) {
      const startTime = Date.now();

      setTimerHandle(handle => {
        if (handle !== null) {
          window.clearInterval(handle);
        }

        return window.setInterval(() => {
          setElapsed(formatTime(Date.now() - startTime, true));
        }, kTimerInterval);
      });
    } else {
      setTimerHandle(handle => {
        if (handle !== null) {
          window.clearInterval(handle);
        }

        return null;
      });
    }
  }, [isRecording]);

  useEffect(() => {
    return () => {
      setTimerHandle(handle => {
        if (handle !== null) {
          window.clearInterval(handle);
        }

        return null;
      });
    };
  });

  return (
    <div className={classNames('Record', className)}>
      <button
        className={classNames('record-btn', { recording: isRecording })}
        onClick={startStopRecord}
      >
        {
          isRecording
          ? <>
            Recording&hellip;
            <time>{elapsed}</time>
          </>
          : 'Start recording'
        }
      </button>

      <button
        className={classNames('expand', { expanded: showRecordings })}
        onClick={() => setShowRecordings(v => !v)}
      >
        {newRecordings.length} new recordings today
      </button>

      {
        showRecordings &&
        <div className="recordings-list">
          {
            newRecordings.length > 0
              ? newRecordings.map(v => <Recording key={v.uid} recording={v} />)
              : <div className="empty">No recordings today&hellip; yet!</div>
          }
        </div>
      }
    </div>
  );
}
