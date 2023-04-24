import { makeNiceState, StateManager, Viewport } from 'ow-libs';
import { kMainScreens } from '../constants/config';

export interface PersState {
  screen: kMainScreens,
  appSelected: string | null,
  mainPositionedFor: Viewport | null
};

export const initialPersState: PersState = {
  screen: kMainScreens.Record,
  appSelected: null,
  mainPositionedFor: null
};

export const kPersStoreName = 'pers';

/** Store that persists between sessions */
export const makePersStore = () => {
  return makeNiceState(
    new StateManager(kPersStoreName, initialPersState, true)
  );
};
