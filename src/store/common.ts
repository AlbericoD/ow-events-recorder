import { makeNiceState, StateManager, Viewport } from 'ow-libs';

export interface CommonState {
  gameRunningId: number | null,
  launcherRunningId: number | null,
  gameInFocus: boolean,
  viewport: Viewport | null,
};

const initialState: CommonState = {
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
