import { isRecordingGEPLEPEvent } from '../constants/type-guards';
import { RecordingTimeline } from '../constants/types';

type classNamesArg =
  string |
  undefined |
  Record<string, boolean | null | undefined>;

export function classNames(...args: classNamesArg[]) {
  const classes: string[] = [];

  for (const arg of args) {
    if (!arg) continue;

    if (typeof arg === 'string') {
      classes.push(arg);
    } else if (
      arg !== null &&
      typeof arg === 'object' &&
      !Array.isArray(arg)
    ) {
      Object.entries(arg).forEach(([key, value]) => {
        if (value) {
          classes.push(key);
        }
      });
    }
  }

  return classes.join(' ');
}

export const isNumeric = (n: any) => (!isNaN(parseFloat(n)) && isFinite(n))

export const toFixed = (input: any, fractionDigits: number) => {
  return parseFloat(input as string).toFixed(fractionDigits);
}

export const capitalize = (input: string) => {
  return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
}

export const padNumber = (num: number, length: number) => {
  var str = num.toString();

  while (str.length < length) {
    str = '0' + str;
  }

  return str;
}

export const formatTime = (ms: number, includeMs = false) => {
  const
    msAbs = Math.abs(ms),
    hours = Math.floor((msAbs / (1000 * 60 * 60)) % 24),
    minutes = Math.floor((msAbs / (1000 * 60)) % 60),
    seconds = Math.floor((msAbs / 1000) % 60),
    milliseconds = Math.round(msAbs % 1000);

  let out = '';

  if (ms < 0) {
    out += '-';
  }

  if (hours > 0 || hours < 0) {
    out += padNumber(hours, 2) + ':';
  }

  out += padNumber(minutes, 2) + ':';

  out += padNumber(seconds, 2);

  if (includeMs) {
    out += '.' + padNumber(milliseconds, 3);
  }

  return out;
}

export const clamp = (number: number, min: number, max: number) => {
  return Math.min(Math.max(number, min), max);
}

export function dir(path: string): Promise<overwolf.io.DirResult> {
  return new Promise(resolve => overwolf.io.dir(path, resolve));
}

export function writeFile(path: string, content: string): Promise<void> {
  return new Promise((resolve, reject) => {
    overwolf.io.writeFileContents(
      path,
      content,
      overwolf.io.enums.eEncoding.UTF8,
      true,
      result => {
        if (result.success) {
          resolve();
        } else {
          reject(result);
        }
      }
    );
  });
}

export const sanitizePath = (path: string): string => {
  return path.replaceAll('\\', '/');
}

export const sanitizeDirPath = (path: string): string => {
  if (path[path.length - 1] !== '/') {
    path += '/';
  }

  return sanitizePath(path);
}

export const dirName = (path: string): string => {
  return sanitizeDirPath(path.split('/').slice(0, -1).join('/'));
}

export const arraysAreEqual = (array1: string[], array2: string[]): boolean => {
  array1.sort();
  array2.sort();

  return (JSON.stringify(array1) === JSON.stringify(array2));
}

export const filterTimeline = (
  timeline: RecordingTimeline | null,
  typesFilter: string[],
  featuresFilter: string[]
) => {
  if (!timeline) {
    return null;
  }

  if (typesFilter.length === 0 && featuresFilter.length === 0) {
    return timeline;
  }

  return timeline.filter(([, event]) => (
    !typesFilter.includes(event.type) &&
    !(
      isRecordingGEPLEPEvent(event) &&
      featuresFilter.includes(event.data.feature)
    )
  ));
}
