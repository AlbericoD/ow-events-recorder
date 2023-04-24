import { makeNiceState, StateManager, Viewport } from 'ow-libs';

import { RecordingHeader, RecordingTimeline } from '../shared';

export interface CommonState {
  seek: number,
  loaded: boolean,
  isPlaying: boolean,
  isRecording: boolean,
  recording: RecordingHeader | null,
  recordingTimeline: RecordingTimeline | null,
  recordings: RecordingHeader[],
  clientConnected: boolean,
  gameRunningId: number | null,
  launcherRunningId: number | null,
  gameInFocus: boolean,
  viewport: Viewport | null
};

const initialState: CommonState = {
  seek: 0,
  loaded: false,
  isPlaying: false,
  isRecording: false,
  recording: null,
  recordingTimeline: null,
  recordings: [],
  clientConnected: false,
  gameRunningId: null,
  launcherRunningId: null,
  gameInFocus: false,
  viewport: null
};

export const kCommonStoreName = 'common';

/**
 * Store that is shared between all windows. Doesn't persist between sessions
 */
export const makeCommonStore = () => {
  return makeNiceState(new StateManager(kCommonStoreName, initialState));
};
