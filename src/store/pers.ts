import { makeNiceState, StateManager, Viewport } from 'ow-libs';
import { kMainScreens } from '../constants/config';

export interface PersState {
  screen: kMainScreens,
  clientUID: string | null,
  mainPositionedFor: Viewport | null
};

export const initialPersState: PersState = {
  screen: kMainScreens.Record,
  clientUID: null,
  mainPositionedFor: null
};

export const kPersStoreName = 'pers';

/** Store that persists between sessions */
export const makePersStore = () => {
  return makeNiceState(
    new StateManager(kPersStoreName, initialPersState, true)
  );
};
