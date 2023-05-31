import { makeNiceState, StateManager, Viewport } from 'ow-libs';
import { kMainScreens } from '../constants/config';

export interface PersState {
  screen: kMainScreens
  clientUID: string | null
  lastPath: string | null
  mainPositionedFor: Viewport | null
  timelineScale: number
};

export const initialPersState: PersState = {
  screen: kMainScreens.Record,
  clientUID: null,
  lastPath: null,
  mainPositionedFor: null,
  timelineScale: 1
};

export const kPersStoreName = 'pers';

/** Store that persists between sessions */
export const makePersStore = () => {
  return makeNiceState(
    new StateManager(kPersStoreName, initialPersState, true)
  );
};
