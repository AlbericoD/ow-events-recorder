import { makeNiceState, StateManager } from 'ow-libs';

import { Viewport } from '../constants/types';

export interface CommonState {
  gameRunning: boolean,
  launcherRunning: boolean,
  gameInFocus: boolean,
  monitors: overwolf.utils.Display[],
  viewport: Viewport
};

const initialState: CommonState = {
  gameRunning: false,
  launcherRunning: false,
  gameInFocus: false,
  monitors: [],
  viewport: {
    scale: 1,
    width: -1,
    height: -1
  }
};

export const kCommonStoreName = 'common';

/**
 * Store that is shared between all windows. Doesn't persist between sessions
 */
export const makeCommonStore = () => {
  return makeNiceState(new StateManager(kCommonStoreName, initialState));
};
