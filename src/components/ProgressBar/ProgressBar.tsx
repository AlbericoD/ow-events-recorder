import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { classNames } from '../../utils';

import './ProgressBar.scss';

export type ProgressBarProps = {
  value: number
  onChange(value: number): void
  className?: string
  disabled?: boolean
  timeFormatter(value: number): string
}

export function ProgressBar({
  value,
  onChange,
  className,
  disabled = false,
  timeFormatter
}: ProgressBarProps) {
  const
    [userValue, setUserValue] = useState(() => value),
    [mouseDown, setMouseDown] = useState(false),
    [mouseOver, setMouseOver] = useState(false),
    [changing, setChanging] = useState(false);

  const elRef = useRef<HTMLDivElement>(null);

  const left = useMemo(
    () => `${((mouseDown || changing) ? userValue : value) * 100}%`,
    [mouseDown, changing, userValue, value]
  );

  const onMouseEvent = useCallback((
    { clientX }: MouseEvent,
    fireEvent: boolean = false
  ) => {
    if (!elRef.current) {
      return;
    }

    const { left, width } = elRef.current.getBoundingClientRect();

    const position = (clientX - left) / width;

    const newValue = Math.min(Math.max(position, 0), 1);

    setUserValue(newValue);

    if (fireEvent) {
      onChange(newValue);
    }
  }, [onChange]);

  const onMouseOver = (e: MouseEvent) => {
    onMouseEvent(e);
    setMouseOver(true);
  };

  const onMouseOut = (e: MouseEvent) => {
    onMouseEvent(e);
    setMouseOver(false);
  };

  const onMouseDown = (e: MouseEvent) => {
    onMouseEvent(e);
    setMouseDown(true);
  };

  useEffect(() => setChanging(false), [value]);

  useEffect(() => {
    const onMouseUp = (e: MouseEvent) => {
      setMouseDown(mouseWasDown => {
        if (mouseWasDown) {
          setChanging(true);
          onMouseEvent(e, true);
        }

        return false;
      });
    };

    document.documentElement.addEventListener('mouseup', onMouseUp);

    if (!disabled && (mouseDown || mouseOver)) {
      document.documentElement.addEventListener('mousemove', onMouseEvent);
    } else {
      document.documentElement.removeEventListener('mousemove', onMouseEvent);
    }

    return () => {
      document.documentElement.removeEventListener('mouseup', onMouseUp);
      document.documentElement.removeEventListener('mousemove', onMouseEvent);
    };
  }, [disabled, mouseDown, mouseOver, onMouseEvent]);

  return (
    <div
      ref={elRef}
      className={classNames(
        'ProgressBar',
        className,
        { disabled, changing, 'mouse-down': mouseDown }
      )}
      onMouseOver={e => onMouseOver(e.nativeEvent)}
      onMouseOut={e => onMouseOut(e.nativeEvent)}
      onMouseDown={e => onMouseDown(e.nativeEvent)}
    >
      {
        !disabled && (mouseDown || mouseOver || changing) &&
        <div
          className="hover-value"
          style={{ left: `${userValue * 100}%` }}
        >{timeFormatter(userValue)}</div>
      }

      <div className="fill" style={{ width: `${value * 100}%` }} />

      {
        !disabled &&
        <div className="handle" style={{ left }} />
      }
    </div>
  );
}
