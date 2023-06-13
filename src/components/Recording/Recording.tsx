import { useEffect, useRef, useState } from 'react';
import { debounce } from 'throttle-debounce';

import { classNames, formatTime } from '../../utils';
import { eventBus } from '../../services/event-bus';
import { kDefaultLocale } from '../../constants/config';
import { RecordingHeader } from '../../constants/types';

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

  const onTitleInput = debounce(1000, (e: React.FormEvent) => {
    const title = e.currentTarget.textContent?.replace(/\n/g,' ') ?? 'Untitled';

    eventBus.emit('rename', { uid: recording.uid, title });
  });

  function onTitleClick(e: React.MouseEvent) {
    e.stopPropagation();
    setRenaming(true);
  }

  function onRenameClick(e: React.MouseEvent) {
    e.stopPropagation();
    setRenaming(v => !v);
  }

  function onTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setRenaming(false);
    }
  }

  function removeRecording() {
    eventBus.emit('remove', recording.uid);
  }

  function renderGames() {
    const games = Object.values({
      ...recording.launchers,
      ...recording.games
    });

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
      onClick={(!renaming) ? onClick : undefined}
    >
      <header className="header">
        <div
          className="title"
          ref={titleEl}
          contentEditable={renaming}
          onKeyDown={onTitleKeyDown}
          onInput={onTitleInput}
          onClick={onTitleClick}
          onBlur={() => setRenaming(false)}
          spellCheck={false}
        />

        {
          !renaming && <>
            <button
              className="rename"
              onClick={onRenameClick}
            />

            <button
              className="remove"
              onClick={() => setDeleting(true)}
            />
          </>
        }

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
        deleting && !renaming &&
        <DeleteModal
          recording={recording}
          onConfirm={removeRecording}
          onCancel={() => setDeleting(false)}
        />
      }
    </div>
  );
}
