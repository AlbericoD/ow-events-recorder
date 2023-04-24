import { useState } from 'react';
import { debounce } from 'throttle-debounce';

import { classNames, formatTime } from '../../utils';
import { RecordingHeader } from '../../shared';
import { eventBus } from '../../services/event-bus';

import './Recording.scss';

export type RecordingProps = {
  recording: RecordingHeader
  className?: string,
}

export function Recording({ recording, className }: RecordingProps) {
  const [renaming, setRenaming] = useState(false);

  const rename = debounce(1000, (title: string) => {
    eventBus.emit('rename', { uid: recording.uid, title });
  });

  function remove() {
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

  return (
    <div className={classNames('Recording', className)}>
      <header className="header">
        <h4
          className="title"
          contentEditable={renaming}
          onInput={e => rename(e.currentTarget.textContent ?? '')}
        >{recording.title}</h4>

        <button
          className="rename"
          onClick={() => setRenaming(v => !v)}
        >Rename</button>

        <button className="remove" onClick={remove}>Delete</button>

        <time className="date">
          {new Date(recording.startTime).toLocaleTimeString()}
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
