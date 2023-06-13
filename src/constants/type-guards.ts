import { RecordingEvent, RecordingGameLaunched, RecordingEventTypes, RecordingGameInfo, RecordingGameFeaturesSet, RecordingGameEvent, RecordingInfoUpdate, RecordingGameEventError, RecordingLauncherLaunched, RecordingLauncherUpdated, RecordingLauncherTerminated, RecordingLauncherFeaturesSet, RecordingLauncherEvent, RecordingLauncherInfoUpdate, WSClientMessage, WSClientUpdate, WSClientMessageTypes, WSServerMessage, WSServerLoad, WSServerMessageTypes, WSServerPlay, WSServerPause, WSServerSetSeek, WSServerSetSpeed } from './types';

export function isRecordingGameLaunched(
  e: RecordingEvent
): e is RecordingGameLaunched {
  return e.type === RecordingEventTypes.GameLaunched;
};

export function isRecordingGameInfo(
  e: RecordingEvent
): e is RecordingGameInfo {
  return e.type === RecordingEventTypes.GameInfo;
};

export function isRecordingGameFeaturesSet(
  e: RecordingEvent
): e is RecordingGameFeaturesSet {
  return e.type === RecordingEventTypes.GameFeaturesSet;
};

export function isRecordingGameEvent(
  e: RecordingEvent
): e is RecordingGameEvent {
  return e.type === RecordingEventTypes.GameEvent;
};

export function isRecordingInfoUpdate(
  e: RecordingEvent
): e is RecordingInfoUpdate {
  return e.type === RecordingEventTypes.InfoUpdate;
};

export function isRecordingGameEventError(
  e: RecordingEvent
): e is RecordingGameEventError {
  return e.type === RecordingEventTypes.GameEventError;
};

export function isRecordingLauncherLaunched(
  e: RecordingEvent
): e is RecordingLauncherLaunched {
  return e.type === RecordingEventTypes.LauncherLaunched;
};

export function isRecordingLauncherUpdated(
  e: RecordingEvent
): e is RecordingLauncherUpdated {
  return e.type === RecordingEventTypes.LauncherUpdated;
};

export function isRecordingLauncherTerminated(
  e: RecordingEvent
): e is RecordingLauncherTerminated {
  return e.type === RecordingEventTypes.LauncherTerminated;
};

export function isRecordingLauncherFeaturesSet(
  e: RecordingEvent
): e is RecordingLauncherFeaturesSet {
  return e.type === RecordingEventTypes.LauncherFeaturesSet;
};

export function isRecordingLauncherEvent(
  e: RecordingEvent
): e is RecordingLauncherEvent {
  return e.type === RecordingEventTypes.LauncherEvent;
};

export function isRecordingLauncherInfoUpdate(
  e: RecordingEvent
): e is RecordingLauncherInfoUpdate {
  return e.type === RecordingEventTypes.LauncherInfoUpdate;
};


export function isWSClientUpdate(e: WSClientMessage): e is WSClientUpdate {
  return e.type === WSClientMessageTypes.Update;
};


export function isWSServerLoad(e: WSServerMessage): e is WSServerLoad {
  return e.type === WSServerMessageTypes.Load;
};

export function isWSServerPlay(e: WSServerMessage): e is WSServerPlay {
  return e.type === WSServerMessageTypes.Play;
};

export function isWSServerPause(e: WSServerMessage): e is WSServerPause {
  return e.type === WSServerMessageTypes.Pause;
};

export function isWSServerSetSeek(e: WSServerMessage): e is WSServerSetSeek {
  return e.type === WSServerMessageTypes.SetSeek;
};

export function isWSServerSetSpeed(e: WSServerMessage): e is WSServerSetSpeed {
  return e.type === WSServerMessageTypes.SetSpeed;
};
