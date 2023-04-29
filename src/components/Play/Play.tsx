import { Fragment, useEffect, useMemo, useState } from 'react';

import { useCommonState } from '../../hooks/use-common-state';
import { usePersState } from '../../hooks/use-pers-state';
import { eventBus } from '../../services/event-bus';
import { classNames, formatTime } from '../../utils';
import { RecordingHeader } from '../../shared';
import { kDefaultLocale } from '../../constants/config';

import { Recording } from '../Recording/Recording';
import { ProgressBar } from '../ProgressBar/ProgressBar';
import { SetClient } from '../InputUID/SetClient';
import { DropDown, DropDownOption } from '../DropDown/DropDown';
import { DatePicker } from '../DatePicker/DatePicker';

import './Play.scss';

export type PlayProps = {
  className?: string
}

export function Play({ className }: PlayProps) {
  const
    isPlaying = useCommonState('isPlaying'),
    recordings = useCommonState('recordings'),
    recording = useCommonState('recording'),
    connected = useCommonState('playerConnected'),
    seek = useCommonState('playerSeek'),
    loaded = useCommonState('playerLoaded');

  const clientUID = usePersState('clientUID');

  const [search, setSearch] = useState('');
  const [gameFilter, setGameFilter] = useState<number | null>(null);
  const [authorFilter, setAuthorFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<Date | null>(null);

  const gameFilterOptions = useMemo<DropDownOption[]>(() => {
    const games: Record<number, string> = {};

    for (const r of recordings) {
      Object.assign(games, r.games, r.launchers);
    }

    const options = Object.entries(games).map(([value, title]) => ({
      title,
      value: Number(value)
    }));

    return [
      { title: 'Any game', value: null },
      ...options
    ];
  }, [recordings]);

  const authorFilterOptions = useMemo<DropDownOption[]>(() => {
    const authors: string[] = [];

    for (const r of recordings) {
      if (!authors.includes(r.author)) {
        authors.push(r.author);
      }
    }

    const options = authors
      .sort((a: any, b: any) => a - b)
      .map(v => ({ title: v, value: v }));

    return [
      { title: 'Any author', value: null },
      ...options
    ];
  }, [recordings]);

  const controlsEnabled = useMemo(
    () => Boolean(recording && connected && loaded),
    [connected, loaded, recording]
  );

  const length = useMemo(() => {
    return recording
      ? recording.endTime - recording.startTime
      : 0;
  }, [recording]);

  const filtered = useMemo(() => {
    const searchSane = search.trim().toLowerCase();

    return recordings.filter(r => {
      if (searchSane && !r.title.trim().toLowerCase().includes(searchSane)) {
        return false;
      }

      if (
        gameFilter !== null && (
          r.games[gameFilter] === undefined &&
          r.launchers[gameFilter] === undefined
        )
      ) {
        return false;
      }

      if (authorFilter && r.author !== authorFilter) {
        return false;
      }

      if (dateFilter) {
        const dateString = dateFilter.toDateString();

        if (
          new Date(r.startTime).toDateString() !== dateString ||
          new Date(r.endTime).toDateString() !== dateString
        ) {
          return false;
        }
      }

      return true;
    });
  }, [authorFilter, dateFilter, gameFilter, recordings, search]);

  const buttonText = useMemo(() => {
    if (!connected) {
      return 'Client app is not running';
    }

    if (!recording) {
      return 'Select a recording';
    }

    if (!loaded) {
      return 'Loading…';
    }

    if (isPlaying) {
      return 'Stop';
    }

    return `Play «${recording.title}»`;
  }, [connected, isPlaying, loaded, recording]);

  function resetClientUID() {
    eventBus.emit('setClientUID', null);
  }

  function loadRecording(uid: string) {
    eventBus.emit('load', uid);
  }

  function playPause() {
    eventBus.emit('playPause');
  }

  function setSeek(v: number) {
    eventBus.emit('seek', v * length);
  }

  function renderControls() {
    return <>
      <button
        className={classNames('play-btn', { playing: isPlaying })}
        disabled={!controlsEnabled}
        onClick={playPause}
      >
        {buttonText}
        {
          controlsEnabled &&
          <time>
            <strong>{formatTime(seek)}</strong>/{formatTime(length)}
          </time>
        }
      </button>

      <ProgressBar
        disabled={!controlsEnabled}
        value={seek / length}
        onChange={setSeek}
      />
    </>;
  }

  function renderRecordings() {
    if (filtered.length === 0) {
      return (
        <div className="empty">
          {
            (recordings.length > 0)
              ? 'No recordings found'
              : 'No recordings… yet!'
          }
        </div>
      );
    }

    const grouped: Record<string, RecordingHeader[]> = {};

    for (const r of filtered) {
      const date = new Date(r.startTime).toLocaleDateString(
        kDefaultLocale,
        { dateStyle: 'full'}
      );

      if (!grouped[date]) {
        grouped[date] = [];
      }

      grouped[date].push(r);
    }

    return Object.entries(grouped).map(([date, list]) => (
      <Fragment key={date}>
        <h4 className="date-group">{date}</h4>
        {list.map(renderRecording)}
      </Fragment>
    ));
  }

  function renderRecording(v: RecordingHeader) {
    return (
      <Recording
        key={v.uid}
        recording={v}
        selected={v.uid === recording?.uid}
        onClick={() => loadRecording(v.uid)}
      />
    );
  }

  return (
    <div className={classNames('Play', className)}>
      <div className="current">
        {clientUID ? renderControls() : <SetClient />}

        <div className="actions">
          {
            clientUID &&
            <button
              className="change-client"
              onClick={resetClientUID}
            >Change client app</button>
          }
          <button>Export Recordings</button>
          <button>Import Recordings</button>
        </div>
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
          {
            search.length > 0 &&
            <button
              className="search-clear"
              onClick={() => setSearch('')}
            />
          }
        </div>

        <div className="filters">
          <DropDown
            placeholder="Game"
            options={gameFilterOptions}
            onChange={setGameFilter}
            value={gameFilter}
          />
          <DropDown
            placeholder="Author"
            options={authorFilterOptions}
            onChange={setAuthorFilter}
            value={authorFilter}
          />
          <DatePicker
            value={dateFilter}
            onChange={v => setDateFilter(v)}
          />
        </div>

        <div className="recordings-list">{renderRecordings()}</div>
      </div>
    </div>
  );
}
