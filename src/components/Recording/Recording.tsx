import { useEffect, useRef, useState } from 'react';
import { debounce } from 'throttle-debounce';

import { classNames, formatTime } from '../../utils';
import { RecordingHeader } from '../../shared';
import { eventBus } from '../../services/event-bus';
import { kDefaultLocale } from '../../constants/config';

import { DeleteModal } from '../DeleteModal/DeleteModal';

import './Recording.scss';

export type RecordingProps = {
  recording: RecordingHeader
  className?: string
  onClick?(): void
  selected?: boolean
  playing?: boolean
}

export function Recording({
  recording,
  className,
  onClick,
  selected = false,
  playing = false
}: RecordingProps) {
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const titleEl = useRef<HTMLDivElement | null>(null);

  const rename = debounce(1000, (title: string) => {
    eventBus.emit('rename', { uid: recording.uid, title });
  });

  function handleTitleClick(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    e.stopPropagation();
    setRenaming(true);
  }

  function handleRenameClick(
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) {
    e.stopPropagation();
    setRenaming(v => !v);
  }

  function removeRecording() {
    eventBus.emit('remove', recording.uid);
  }

  function renderGames() {
    const games = Object.values({ ...recording.launchers, ...recording.games });

    if (games.length === 0) {
      return <div className="no-games">No games ran</div>;
    }

    return <div className="games">{games.join(', ')}</div>;
  }

  useEffect(() => {
    if (renaming && titleEl.current) {
      titleEl.current.focus();
    }
  }, [renaming]);

  useEffect(() => {
    if (titleEl.current) {
      titleEl.current.innerText = recording.title;
    }
  }, [recording.title]);

  return (
    <div
      className={classNames(
        'Recording',
        className,
        {
          selected,
          playing,
          clickable: Boolean(onClick)
        }
      )}
      onClick={onClick}
    >
      <header className="header">
        <div
          className="title"
          contentEditable={renaming}
          ref={titleEl}
          onInput={e => rename(e.currentTarget.textContent ?? '')}
          onClick={handleTitleClick}
          onBlur={() => setRenaming(false)}
          spellCheck={false}
        ></div>

        <button
          className="rename"
          onClick={handleRenameClick}
        />

        <button
          className="remove"
          onClick={() => setDeleting(true)}
        />

        <time className="date">
          {new Date(recording.startTime).toLocaleTimeString(
            kDefaultLocale,
            { timeStyle: 'medium' }
          )}
        </time>
      </header>

      <div className="info">
        {renderGames()}

        <time className="duration">
          {formatTime(recording.endTime - recording.startTime)}
        </time>
      </div>

      {
        deleting &&
        <DeleteModal
          recording={recording}
          onConfirm={removeRecording}
          onCancel={() => setDeleting(false)}
        />
      }
    </div>
  );
}
