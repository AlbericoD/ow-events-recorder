import { useMemo } from 'react';

import { kDefaultLocale, kRecordingEventTypes } from '../../constants/config';
import { eventBus } from '../../services/event-bus';
import { classNames, formatTime } from '../../utils';
import { useCommonState } from '../../hooks/use-common-state';
import { usePersState } from '../../hooks/use-pers-state';
import { useFeatures } from '../../hooks/use-features';

import { DropDownMultiple, DropDownMultipleOption } from '../DropDownMultiple/DropDownMultiple';

import './RecordingInfo.scss';

export type RecordingInfoProps = {
  className?: string
}

type DropDownOptions = DropDownMultipleOption<string | null>[];

const typesOptions: DropDownOptions = [
  { title: 'No filter', value: null },
  ...kRecordingEventTypes.map(type => ({
    title: type,
    value: type
  }))
];

export function RecordingInfo({ className }: RecordingInfoProps) {
  const recording = useCommonState('recording');

  const
    typesFilter = usePersState('typesFilter'),
    featuresFilter = usePersState('featuresFilter'),
    speed = usePersState('playerSpeed');

  const features = useFeatures(recording?.uid ?? '');

  const setSpeed = (speed: number) => {
    eventBus.emit('speed', speed);
  };

  const onToggleFeature = (feature: string | null) => {
    const oldFilter = featuresFilter ?? [];

    let newFilter: string[] = [];

    if (feature === null) {
      newFilter = [];
    } else if (oldFilter !== null && oldFilter.includes(feature)) {
      newFilter = oldFilter.filter(v => v !== feature);
    } else {
      newFilter = [...oldFilter, feature];
    }

    eventBus.emit('featuresFilter', newFilter.length > 0 ? newFilter : null);
  };

  const onToggleType = (type: string | null) => {
    const oldFilter = typesFilter ?? [];

    let newFilter: string[] = [];

    if (type === null) {
      newFilter = [];
    } else if (oldFilter !== null && oldFilter.includes(type)) {
      newFilter = oldFilter.filter(v => v !== type);
    } else {
      newFilter = [...oldFilter, type];
    }

    eventBus.emit('typesFilter', newFilter.length > 0 ? newFilter : null);
  };

  const length = useMemo(() => {
    return recording ? recording.endTime - recording.startTime : 0;
  }, [recording]);

  const dateStr = useMemo(() => {
    return new Date(recording?.startTime ?? 0).toLocaleString(
      kDefaultLocale,
      { timeStyle: 'medium', dateStyle: 'long' }
    );
  }, [recording]);

  const gamesStr = useMemo(() => {
    return Object.values({
      ...recording?.games,
      ...recording?.launchers
    }).join(', ');
  }, [recording]);

  const featuresOptions = useMemo<DropDownOptions>(() => {
    const list = features.map(feature => ({
      title: feature,
      value: feature
    }));

    if (featuresFilter !== null) {
      for (let feature of featuresFilter) {
        if (!features.includes(feature)) {
          list.push({
            title: feature,
            value: feature
          });
        }
      }
    }

    return [
      { title: 'No filter', value: null },
      ...list
    ];
  }, [features, featuresFilter]);


  if (!recording) {
    return <></>;
  }

  return (
    <ul className={classNames('RecordingInfo', className)}>
      <li>
        Play speed:
        <div className="play-speed">
          <button
            onClick={() => setSpeed(.5)}
            className={classNames({ active: speed === .5 })}
          >0.5x</button>
          <button
            onClick={() => setSpeed(1)}
            className={classNames({ active: speed === 1 })}
          >1x</button>
          <button
            onClick={() => setSpeed(2)}
            className={classNames({ active: speed === 2 })}
          >2x</button>
          <button
            onClick={() => setSpeed(4)}
            className={classNames({ active: speed === 4 })}
          >4x</button>
          <button
            onClick={() => setSpeed(8)}
            className={classNames({ active: speed === 8 })}
          >8x</button>
        </div>
      </li>
      <li>
        Disable event types:
        <DropDownMultiple<string | null>
          options={typesOptions}
          selected={
            (typesFilter && typesFilter?.length > 0)
              ? typesFilter
              : [null]
          }
          onSelect={onToggleType}
        />
      </li>
      <li>
        Disable GEP events by feature:
        <DropDownMultiple<string | null>
          options={featuresOptions}
          selected={
            (featuresFilter && featuresFilter.length > 0)
              ? featuresFilter
              : [null]
          }
          onSelect={onToggleFeature}
        />
      </li>
      <li>Recorded by: <strong>{recording.author} on {dateStr}</strong></li>
      <li>Length: <strong>{formatTime(length, true)}</strong></li>
      <li>Games: <strong>{gamesStr ?? 'No games ran'}</strong></li>
    </ul>
  );
}
