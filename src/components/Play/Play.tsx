import { useMemo, useState } from 'react';

import { useCommonState } from '../../hooks/use-common-state';
import { eventBus } from '../../services/event-bus';
import { classNames, formatTime } from '../../utils';

import { Recording } from '../Recording/Recording';
import { ProgressBar } from '../ProgressBar/ProgressBar';

import './Play.scss';

export type PlayProps = {
  className?: string
}

export function Play({ className }: PlayProps) {
  const
    isPlaying = useCommonState('isPlaying'),
    recordings = useCommonState('recordings'),
    recording = useCommonState('recording'),
    seek = useCommonState('seek');

  const [search, setSearch] = useState('');

  const length = useMemo(() => {
    return recording
      ? recording.endTime - recording.startTime
      : 0;
  }, [recording]);

  const filtered = useMemo(() => {
    const searchSane = search.trim().toLowerCase();

    return recordings.filter(v => {
      return v.title
        .trim()
        .toLowerCase()
        .includes(searchSane);
    });
  }, [recordings, search]);

  function setSeek(seek: number) {
    eventBus.emit('seek', seek * length);
  }

  return (
    <div className={classNames('Play', className)}>
      <div className="current">
        <button
          className={classNames('play-btn', { playing: isPlaying })}
          disabled={recording === null}
        >
          {isPlaying ? 'Stop' : 'Play'}
          &nbsp;&laquo;{recording?.title || 'Untitled'}&raquo;
          <time>
            <strong>{formatTime(seek)}</strong>/{formatTime(length)}
          </time>
        </button>

        <ProgressBar
          disabled={recording === null}
          value={seek / length}
          onChange={setSeek}
        />
      </div>

      <div className="recordings">
        <div className="search">
          <input
            className="search-input"
            type="text"
            placeholder={`Search ${filtered.length} recordings`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button
            className="search-clear"
            onClick={() => setSearch('')}
          />
        </div>

        <div className="recordings-list">
          {
            filtered.length > 0
              ? filtered.map(v => <Recording key={v.uid} recording={v} />)
              : (
                <div className="empty">
                  {
                    (recordings.length > 0)
                      ? 'No recordings found'
                      : <>No recordings&hellip; yet!</>
                  }
                </div>
              )
          }
        </div>
      </div>
    </div>
  );
}
