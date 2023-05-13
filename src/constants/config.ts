export const kDevMode = (process.env.NODE_ENV !== 'production');

export const enum kWindowNames {
  background = 'background',
  main = 'main'
};

export const kHotkeyStartStop = 'event-recorder-start-stop';
export const kHotkeyToggle = 'event-recorder-toggle';

export const kHotkeyServiceName = 'HotkeyService';
export const kRecordingReaderWriterName = 'RecordingReaderWriter';
export const kEventBusName = 'EventBus';

export const kDefaultLocale = 'en-GB';

export enum kMainScreens {
  Record,
  Play
};
