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
