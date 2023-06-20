import { RecordingEventTypes } from './types';

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
export const kInterAppMessageVersion = 2;

export enum kMainScreens {
  Record,
  Play,
  Patch
};

export const kRecordingEventTypes = [
  RecordingEventTypes.GameLaunched,
  RecordingEventTypes.GameInfo,
  RecordingEventTypes.GameFeaturesSet,
  RecordingEventTypes.GameEvent,
  RecordingEventTypes.InfoUpdate,
  RecordingEventTypes.GameEventError,
  RecordingEventTypes.LauncherLaunched,
  RecordingEventTypes.LauncherUpdated,
  RecordingEventTypes.LauncherTerminated,
  RecordingEventTypes.LauncherFeaturesSet,
  RecordingEventTypes.LauncherEvent,
  RecordingEventTypes.LauncherInfoUpdate
]
