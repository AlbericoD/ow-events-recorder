import { useEffect, useRef, useState } from 'react';
import { debounce } from 'throttle-debounce';

import { classNames, formatTime } from '../../utils';
import { RecordingHeader } from '../../shared';
import { eventBus } from '../../services/event-bus';
import { kDefaultLocale } from '../../constants/config';

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

  function handleRemoveClick(
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) {
    e.stopPropagation();
    eventBus.emit('remove', recording.uid);
  }

  function renderGames() {
    const games = Object.entries({
      ...recording.launchers,
      ...recording.games
    });

    if (games.length === 0) {
      return <div className="no-games">No games ran</div>;
    }

    const gamesList = games.map(([gameId, gameTitle]) => (
      <li key={gameId}>{gameTitle}</li>
    ));

    return <ul className="games">{gamesList}</ul>;
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
        >Rename</button>

        <button
          className="remove"
          onClick={handleRemoveClick}
        >Delete</button>

        <time className="date">
          {new Date(recording.startTime).toLocaleString(kDefaultLocale)}
        </time>
      </header>

      <div className="info">
        {renderGames()}

        <time className="duration">
          {formatTime(recording.endTime - recording.startTime)}
        </time>
      </div>
    </div>
  );
}
