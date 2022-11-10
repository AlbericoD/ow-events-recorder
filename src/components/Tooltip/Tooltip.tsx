import { useState, useCallback, createElement, useRef, useEffect, AnimationEventHandler, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { v4 as uuid } from 'uuid';

import { classNames } from '../../utils';

import './Tooltip.scss';

type TooltipProps = {
  position?: 'left' | 'right'
  adjustPosition?: [number, number],
  areaElName?: string
  className?: string
  tipClassName?: string,
  children?: React.ReactNode
  tipContent: React.ReactNode
  margin?: number
  [key: string]: any
}

export function Tooltip({
  position = 'left',
  adjustPosition,
  areaElName = 'div',
  className = '',
  tipClassName = '',
  children = [],
  tipContent = '',
  margin = 8,
  ...props
}: TooltipProps) {
  const [uid] = useState(() => uuid());

  const [shown, setShown] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  const [tipContentWidth, setTipContentWidth] = useState(0);
  const [tipContentHeight, setTipContentHeight] = useState(0);

  const areaRef = useRef<HTMLElement>(null);

  const tipContentRef = useCallback((node: HTMLElement | null) => {
    setTipContentWidth((node && node.clientWidth) ? node.clientWidth : 0);
    setTipContentHeight((node && node.clientHeight) ? node.clientHeight : 0);
  }, []);

  const left = useMemo(() => {
    if (!areaRef.current) {
      return 0;
    }

    let { left, right } = areaRef.current.getBoundingClientRect();

    if (position === 'right') {
      left = right - tipContentWidth;
    }

    if (adjustPosition) {
      left += adjustPosition[0];
    }

    return Math.max(Math.round(left), 0);
  }, [adjustPosition, position, tipContentWidth]);

  const top = useMemo(() => {
    if (!areaRef.current) {
      return 0;
    }

    let { top } = areaRef.current.getBoundingClientRect();

    top = top - margin - tipContentHeight;

    if (adjustPosition) {
      top += adjustPosition[1];
    }

    return Math.max(Math.round(top), 0);
  }, [adjustPosition, margin, tipContentHeight]);

  const onAnimationEnd: AnimationEventHandler<HTMLDivElement> = e => {
    if (e.animationName === 'tooltip-fade-out') {
      setShown(false);
    }
  };

  const onMouseEnter = () => {
    setFadingOut(false);
    setShown(true);
  };

  const onMouseLeave = () => {
    setFadingOut(true);
  };

  const onMouseScroll = () => {
    setFadingOut(false);
    setShown(false);
  };

  const renderTooltipElement = useMemo(() => (
    <div
      className={classNames("tooltip-layer", { 'fade-out': fadingOut })}
      onAnimationEnd={onAnimationEnd}
    >
      <div
        className={classNames(
          'tooltip-tip',
          tipClassName,
          position
        )}
        style={{ left: `${left}px`, top: `${top}px` }}
        ref={tipContentRef}
      >{tipContent}</div>
    </div>
  ), [fadingOut, left, position, tipClassName, tipContent, tipContentRef, top]);

  useEffect(() => {
    window.addEventListener('wheel', onMouseScroll);

    return () => window.removeEventListener('wheel', onMouseScroll);
  }, []);

  return createElement(
    areaElName,
    {
      className: `Tooltip ${className}`,
      onMouseEnter,
      onMouseLeave,
      ref: areaRef,
      ...props
    },
    children,
    (shown && tipContent)
      ? createPortal(renderTooltipElement, document.body, uid)
      : null
  );
}
