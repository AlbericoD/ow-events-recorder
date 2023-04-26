import { useState, useEffect, useRef, useMemo } from 'react';
import { CSSTransition } from 'react-transition-group';

import { classNames } from '../../utils';

import './DropDown.scss';

export type DropDownOption = {
  title: string,
  value: any
}

export type DropDownProps = {
  options: DropDownOption[]
  value: any
  onChange(value: any): void
  placeholder?: string
  className?: string
}

export function DropDown({
  options,
  value,
  onChange,
  placeholder = '',
  className
}: DropDownProps) {
  const elRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);

  const selectedText = useMemo(() => {
    const selectedOption = options.find(option => (option.value === value));

    if (selectedOption) {
      return selectedOption.title;
    }

    return placeholder || '';
  }, [placeholder, options, value]);

  function renderOptions() {
    if (options.length === 0) {
      return <div className="option not-found">Nothing found</div>;
    }

    return options.map(({ title, value: optionValue }) => (
      <button
        className={classNames('option', { chosen: (value === optionValue) })}
        onClick={() => handleOptionClick(optionValue)}
        key={optionValue}
      >{title}</button>
    ));
  }

  function handleOptionClick(val: any) {
    setOpen(false);
    onChange(val);
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
      className={classNames('DropDown', className, { open })}
      ref={elRef}
    >
      <button
        className={classNames('selected', { placeholder: (value === null) })}
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
