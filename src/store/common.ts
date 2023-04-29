import { makeNiceState, StateManager, Viewport } from 'ow-libs';

import { RecordingHeader, RecordingTimeline } from '../shared';

export interface CommonState {
  playerSeek: number,
  playerLoaded: boolean,
  playerConnected: boolean,
  isPlaying: boolean,
  isRecording: boolean,
  recordingStartedOn: number,
  recording: RecordingHeader | null,
  recordingTimeline: RecordingTimeline | null,
  recordings: RecordingHeader[],
  gameRunningId: number | null,
  launcherRunningId: number | null,
  gameInFocus: boolean,
  viewport: Viewport | null
};

const initialState: CommonState = {
  playerSeek: 0,
  playerLoaded: false,
  playerConnected: false,
  isPlaying: false,
  isRecording: false,
  recordingStartedOn: -1,
  recording: null,
  recordingTimeline: null,
  recordings: [],
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
