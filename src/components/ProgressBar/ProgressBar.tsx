import { useCallback, useEffect, useRef, useState } from 'react';

import { classNames } from '../../utils';

import './ProgressBar.scss';

export type ProgressBarProps = {
  value: number,
  onChange(value: number): void,
  className?: string
  disabled?: boolean
}

export function ProgressBar({
  value,
  onChange,
  className,
  disabled = false
}: ProgressBarProps) {
  const [userValue, setUserValue] = useState(0);
  const [mouseDown, setMouseDown] = useState(false);

  const elRef = useRef<HTMLDivElement>(null);

  const perc = `${(mouseDown ? userValue : value) * 100}%`;

  const onMouseDown = (e: MouseEvent) => {
    onMouseMoved(e);
    setMouseDown(true);
  };

  const onMouseMoved = useCallback((e: MouseEvent, fireEvent = false) => {
    e.preventDefault();

    if (disabled || !mouseDown || !elRef.current) {
      return;
    }

    const { left, width } = elRef.current.getBoundingClientRect();

    const position = (e.clientX - left) / width;

    const newValue = Math.min(Math.max(position, 0), 1);

    setUserValue(newValue);

    if (fireEvent) {
      onChange(newValue);
    }
  }, [disabled, mouseDown, onChange]);

  const onMouseUp = useCallback((e: MouseEvent) => {
    onMouseMoved(e, true);
    setMouseDown(false);
  }, [onMouseMoved]);

  useEffect(() => {
    if (mouseDown) {
      document.documentElement.addEventListener('mousemove', onMouseMoved);
    } else {
      document.documentElement.removeEventListener('mousemove', onMouseMoved);
    }

    return () => {
      document.documentElement.removeEventListener('mousemove', onMouseMoved);
    };
  }, [mouseDown, onMouseMoved]);

  useEffect(() => {
    document.documentElement.addEventListener('mouseup', onMouseUp);

    return () => {
      document.documentElement.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseUp]);

  return (
    <div
      className={classNames('ProgressBar', className, { disabled })}
      onMouseDown={e => onMouseDown(e.nativeEvent)}
      ref={elRef}
    >
      <div className="fill" style={{ width: perc }} />
      {!disabled && <div className="handle" style={{ left: perc }} />}
    </div>
  );
}
