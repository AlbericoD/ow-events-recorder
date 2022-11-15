export type Viewport = {
  scale: number
  width: number
  height: number
}

export type EventBusEvents = {
  mainPositionedFor: Viewport
  setAutoLaunch: boolean
}

export const enum RecordingEventTypes {
  GameLaunched,
  GameInfo,
  LauncherLaunched,
  LauncherUpdated,
  LauncherTerminated,
  SetFeatures,
  GameEvent,
  InfoUpdate,
  Error
}

export interface RecordingGenericEvent {
  type: RecordingEventTypes
  time: number
  data: any
}

export interface RecordingLauncherLaunched extends RecordingGenericEvent {
  type: RecordingEventTypes.LauncherLaunched
  data: overwolf.games.launchers.LauncherInfo
}

export interface RecordingLauncherUpdated extends RecordingGenericEvent {
  type: RecordingEventTypes.LauncherUpdated
  data: overwolf.games.launchers.UpdatedEvent
}

export interface RecordingLauncherTerminated extends RecordingGenericEvent {
  type: RecordingEventTypes.LauncherTerminated
  data: overwolf.games.launchers.LauncherInfo
}

export interface RecordingGameLaunched extends RecordingGenericEvent {
  type: RecordingEventTypes.GameLaunched
  data: overwolf.games.RunningGameInfo
}

export interface RecordingGameInfo extends RecordingGenericEvent {
  type: RecordingEventTypes.GameInfo
  data: overwolf.games.GameInfoUpdatedEvent
}

export interface RecordingGameEvent extends RecordingGenericEvent {
  type: RecordingEventTypes.GameEvent
  name: string
}

export interface RecordingInfoUpdate extends RecordingGenericEvent {
  type: RecordingEventTypes.InfoUpdate
  feature: string
  category: string
  key: string
}

export interface RecordingError extends RecordingGenericEvent {
  type: RecordingEventTypes.Error
}

export type RecordingEvent =
  RecordingLauncherLaunched |
  RecordingLauncherUpdated |
  RecordingLauncherTerminated |
  RecordingGameLaunched |
  RecordingGameInfo |
  RecordingGameEvent |
  RecordingInfoUpdate |
  RecordingError;

export type RecordingTimeline = Map<number, RecordingEvent[]>;

export interface IncompleteRecording {
  startTime: number
  endTime: number | null
  launcherFeatures: string[] | null
  setLauncherFeaturesResult: overwolf.games.launchers.events.SetRequiredFeaturesResult | null
  gameFeatures: string[] | null
  setGameFeaturesResult: overwolf.games.events.SetRequiredFeaturesResult | null
  timeline: RecordingTimeline
  complete: boolean
}

export interface CompleteRecording extends IncompleteRecording {
  endTime: number
  complete: true
}
