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

export const kServerUID = 'fibomngcacbbghgcjjlolojddapoipoaafjlgpoc';
export const kRecordingExportedExt = 'erp';
export const kRecordingsDir = `${overwolf.io.paths.documents}/overwolf-erp/`;
export const kTempDir = `${kRecordingsDir}temp/`;
export const kRecordingSubDirPrefix = 'recording-';
export const kRecordingHeaderFile = 'header.json';
export const kRecordingTimelineFile = 'timeline.json';
export const kOverwolfFSPrefix = 'overwolf-fs://';

export enum kMainScreens {
  Record,
  Play,
  Patch
};
