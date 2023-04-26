import { classNames } from '../../utils';

import './DatePicker.scss';

export type DatePickerProps = {
  placeholder?: string
  value: Date | null
  onChange(value: Date | null): void
  className?: string
}

export function DatePicker({
  placeholder,
  value,
  onChange,
  className
}: DatePickerProps) {
  function dateToString(date: Date) {
    return date.toISOString().split('T')[0];
  }

  return (
    <input
      placeholder={placeholder}
      value={value ? dateToString(value) : ''}
      onChange={e => onChange(e.target.valueAsDate)}
      type="date"
      min="2023-01-01"
      className={classNames('DatePicker', className)}
    />
  );
}
