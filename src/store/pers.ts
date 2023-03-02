import { makeNiceState, StateManager, Viewport } from 'ow-libs';

export interface PersState {
  mainPositionedFor: Viewport | null,
  enableAutoLaunch: boolean
};

export const initialPersState: PersState = {
  mainPositionedFor: null,
  enableAutoLaunch: true
};

export const kPersStoreName = 'pers';

/** Store that persists between sessions */
export const makePersStore = () => {
  return makeNiceState(new StateManager(kPersStoreName, initialPersState, true));
};
