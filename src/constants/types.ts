import { Viewport } from 'ow-libs'

import { kMainScreens } from './config'

export type EventBusEvents = {
  mainPositionedFor: Viewport
  setScreen: kMainScreens
  setClientUID: string | null

  record: void
  rename: { uid: string, title: string }
  remove: string

  load: string
  playPause: void
  seek: number
  speed: number

  import: void
  importFromPaths: string[]
  export: string

  setTimelineScale: number

  patchApp?: string
  patchAppError: string
}

export interface OpenFilePickerMultiResult extends overwolf.Result {
  files?: string[]
  urls?: string[]
}

export interface OverwolfGameFeatureKey {
  category: string
  is_index: boolean
  name: string
  published: boolean
  sample_data: string
  state: number
  type: number
}

export interface OverwolfGameFeatureEntry {
  name: string
  state: number
  keys: OverwolfGameFeatureKey[]
}

export interface OverwolfGameFeatures {
  game_id: number
  state: number
  disabled: boolean
  published: boolean
  features: OverwolfGameFeatureEntry[]
}

export type ResultCallback<T extends overwolf.Result>
  = overwolf.CallbackFunction<T>;
export type NullableResultCallback<T extends overwolf.Result | null>
  = (result: T | null) => void;

/* eslint-disable no-unused-vars */
export enum RecordingEventTypes {
  GameLaunched = 'GameLaunched',
  GameInfo = 'GameInfo',
  GameFeaturesSet = 'GameFeaturesSet',
  GameEvent = 'GameEvent',
  InfoUpdate = 'InfoUpdate',
  GameEventError = 'GameEventError',
  LauncherLaunched = 'LauncherLaunched',
  LauncherUpdated = 'LauncherUpdated',
  LauncherTerminated = 'LauncherTerminated',
  LauncherFeaturesSet = 'LauncherFeaturesSet',
  LauncherEvent = 'LauncherEvent',
  LauncherInfoUpdate = 'LauncherInfoUpdate'
}

export interface RecordingEventBase {
  type: unknown
  time: number
  data: unknown
}

export interface RecordingGameLaunched extends RecordingEventBase {
  type: RecordingEventTypes.GameLaunched
  data: overwolf.games.RunningGameInfo
}

export interface RecordingGameInfo extends RecordingEventBase {
  type: RecordingEventTypes.GameInfo
  data: overwolf.games.GameInfoUpdatedEvent
}

export interface RecordingGameFeaturesSet extends RecordingEventBase {
  type: RecordingEventTypes.GameFeaturesSet
  data: overwolf.games.events.SetRequiredFeaturesResult
}

export interface RecordingGameEvent extends RecordingEventBase {
  type: RecordingEventTypes.GameEvent
  data: overwolf.games.events.NewGameEvents
}

export interface RecordingInfoUpdate extends RecordingEventBase {
  type: RecordingEventTypes.InfoUpdate
  data: overwolf.games.events.InfoUpdates2Event<
    string,
    overwolf.games.events.InfoUpdate2
  >
}

export interface RecordingGameEventError extends RecordingEventBase {
  type: RecordingEventTypes.GameEventError
  data: any
}

export interface RecordingLauncherLaunched extends RecordingEventBase {
  type: RecordingEventTypes.LauncherLaunched
  data: overwolf.games.launchers.LauncherInfo
}

export interface RecordingLauncherUpdated extends RecordingEventBase {
  type: RecordingEventTypes.LauncherUpdated
  data: overwolf.games.launchers.UpdatedEvent
}

export interface RecordingLauncherTerminated extends RecordingEventBase {
  type: RecordingEventTypes.LauncherTerminated
  data: overwolf.games.launchers.LauncherInfo
}

export interface RecordingLauncherFeaturesSet extends RecordingEventBase {
  type: RecordingEventTypes.LauncherFeaturesSet
  data: overwolf.games.launchers.events.SetRequiredFeaturesResult
}

export interface RecordingLauncherEvent extends RecordingEventBase {
  type: RecordingEventTypes.LauncherEvent
  data: any
}

export interface RecordingLauncherInfoUpdate extends RecordingEventBase {
  type: RecordingEventTypes.LauncherInfoUpdate
  data: any
}

export type RecordingEvent =
  RecordingGameLaunched |
  RecordingGameInfo |
  RecordingGameFeaturesSet |
  RecordingGameEvent |
  RecordingInfoUpdate |
  RecordingGameEventError |
  RecordingLauncherLaunched |
  RecordingLauncherUpdated |
  RecordingLauncherTerminated |
  RecordingLauncherFeaturesSet |
  RecordingLauncherEvent |
  RecordingLauncherInfoUpdate

export type RecordingTimelineRaw = Map<number, RecordingEvent[]>

export type RecordingTimeline = [number, RecordingEvent][]

export interface RecordingBase {
  uid: string
  startTime: number
  endTime: number | null
  title: string
  author: string
  games: Record<number, string>
  launchers: Record<number, string>
}

export interface RecordingInProgress extends RecordingBase {
  timeline: RecordingTimelineRaw
  complete: false
}

export interface Recording extends RecordingBase {
  endTime: number
  timeline: RecordingTimeline
  complete: true
}

export type RecordingHeader = Omit<Recording, 'timeline'>;

export enum WSClientMessageTypes {
  Update
}

export interface WSClientMessage {
  type: WSClientMessageTypes
  messageID: number
}

export interface WSClientUpdate extends WSClientMessage {
  type: WSClientMessageTypes.Update
  loaded: boolean
  seek: number
  playing: boolean
  speed?: number
}

export enum WSServerMessageTypes {
  Load,
  Play,
  Pause,
  SetSeek,
  SetSpeed
}

export interface WSServerMessage {
  type: WSServerMessageTypes
  messageID: number
}

export interface WSServerLoad extends WSServerMessage {
  type: WSServerMessageTypes.Load
  recordingUID: string
}

export interface WSServerPlay extends WSServerMessage {
  type: WSServerMessageTypes.Play
  speed?: number
}

export interface WSServerPause extends WSServerMessage {
  type: WSServerMessageTypes.Pause
}

export interface WSServerSetSeek extends WSServerMessage {
  type: WSServerMessageTypes.SetSeek
  seek: number
}

export interface WSServerSetSpeed extends WSServerMessage {
  type: WSServerMessageTypes.SetSpeed
  speed: number
}

export type ExtensionMessageEvent = {
  id?: string
  info?: any
  isRunning?: boolean
}
