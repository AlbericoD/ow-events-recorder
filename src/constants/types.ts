import { Viewport } from 'ow-libs'

export type EventBusEvents = {
  mainPositionedFor: Viewport
  setAutoLaunch: boolean
}

export enum RecordingEventTypes {
  GameLaunched,
  GameInfo,
  LauncherLaunched,
  LauncherUpdated,
  LauncherTerminated,
  LauncherEvent,
  LauncherInfoUpdate,
  GameEvent,
  InfoUpdate,
  Error
}

export interface RecordingEvent {
  type: RecordingEventTypes
  time: number
  data: any
}

export interface RecordingLauncherLaunched extends RecordingEvent {
  type: RecordingEventTypes.LauncherLaunched
  data: overwolf.games.launchers.LauncherInfo
}

export interface RecordingLauncherUpdated extends RecordingEvent {
  type: RecordingEventTypes.LauncherUpdated
  data: overwolf.games.launchers.UpdatedEvent
}

export interface RecordingLauncherTerminated extends RecordingEvent {
  type: RecordingEventTypes.LauncherTerminated
  data: overwolf.games.launchers.LauncherInfo
}

export interface RecordingGameLaunched extends RecordingEvent {
  type: RecordingEventTypes.GameLaunched
  data: overwolf.games.RunningGameInfo
}

export interface RecordingGameInfo extends RecordingEvent {
  type: RecordingEventTypes.GameInfo
  data: overwolf.games.GameInfoUpdatedEvent
}

export interface RecordingLauncherEvent extends RecordingEvent {
  type: RecordingEventTypes.LauncherEvent
}

export interface RecordingLauncherInfoUpdate extends RecordingEvent {
  type: RecordingEventTypes.LauncherInfoUpdate
}

export interface RecordingGameEvent extends RecordingEvent {
  type: RecordingEventTypes.GameEvent
}

export interface RecordingInfoUpdate extends RecordingEvent {
  type: RecordingEventTypes.InfoUpdate
}

export interface RecordingError extends RecordingEvent {
  type: RecordingEventTypes.Error
}

export type RecordingTimelineRaw = Map<number, RecordingEvent[]>;

export type RecordingTimeline = [number, RecordingEvent][];

export interface RecordingBase {
  startTime: number
  endTime: number | null
  launcherFeatures: string[] | null
  setLauncherFeaturesResult: overwolf.games.launchers.events.SetRequiredFeaturesResult | null
  gameFeatures: string[] | null
  setGameFeaturesResult: overwolf.games.events.SetRequiredFeaturesResult | null
}

export interface RecordingInProgress extends RecordingBase {
  timelineRaw: RecordingTimelineRaw
  complete: false
}

export interface Recording extends RecordingBase {
  endTime: number
  timelineRaw: null
  timeline: RecordingTimeline
  complete: true
}
