import { useState, useEffect, useRef, useMemo } from 'react';
import { CSSTransition } from 'react-transition-group';

import { classNames } from '../../utils';

import './DropDownMultiple.scss';

export type DropDownMultipleOption<T> = {
  title: string,
  value: T
}

export type DropDownMultipleProps<T> = {
  options: DropDownMultipleOption<T>[]
  selected: T[]
  onSelect(value: T): void
  placeholder?: string
  className?: string
}

export function DropDownMultiple<T>({
  options,
  selected,
  onSelect,
  placeholder = '',
  className
}: DropDownMultipleProps<T>) {

  const elRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);

  const selectedText = useMemo(() => {
    if (selected && selected.length > 0) {
      const selectedOptions = options.filter(({ value }) => {
        return selected.includes(value);
      });

      if (selectedOptions.length >= 2) {
        return `${selectedOptions.length} selected`;
      } else if (selectedOptions.length > 0) {
        return selectedOptions.map(option => option.title).join(', ');
      }
    }

    return placeholder ?? '';
  }, [options, placeholder, selected]);

  function renderOptions() {
    return options.map(({ title, value }) => (
      <button
        className={classNames(
          'option',
          { selected: selected?.includes(value) }
        )}
        onClick={() => onSelect(value)}
        key={String(title + '-' + value)}
      >{title}</button>
    ));
  }

  function handleClickOutside(e: MouseEvent) {
    if (
      elRef.current !== null &&
      elRef.current !== e.target &&
      !elRef.current.contains(e.target as Node)
    ) {
      setOpen(false);
    }
  }

  useEffect(() => {
    document.body.addEventListener('click', handleClickOutside);

    return () => document.body.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div
      className={classNames('DropDownMultiple', className, { open })}
      ref={elRef}
    >
      <button
        className={classNames(
          'current-value',
          { placeholder: !(selected && selected.length > 0) }
        )}
        onClick={() => setOpen(!open)}
      >{selectedText}</button>

      <CSSTransition
        in={open}
        classNames="options"
        timeout={200}
        mountOnEnter={true}
        unmountOnExit={true}
      >
        <div className="options">{renderOptions()}</div>
      </CSSTransition>
    </div>
  );
}
