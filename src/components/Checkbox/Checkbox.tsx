import { ReactChildren } from 'react';
import { classNames } from '../../utils';

import './Checkbox.scss';

export type CheckboxProps = {
  value: boolean,
  onChange: (value: boolean) => any,
  className?: string,
  children?: ReactChildren | string
}

export function Checkbox({
  value = false,
  className,
  onChange,
  children
}: CheckboxProps) {
  return (
    <div
      className={classNames('Checkbox', className, { on: value })}
      onClick={() => onChange(!value)}
    >
      {children}
      <button className="checkbox-switch" />
    </div>
  );
}
