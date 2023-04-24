import { OverwolfWindow } from 'ow-libs';
import { useEffect, useState } from 'react';

import { kMainScreens } from '../../constants/config';
import { useCommonState } from '../../hooks/use-common-state';
import { usePersState } from '../../hooks/use-pers-state';
import { eventBus } from '../../services/event-bus';

import { AppHeader } from '../AppHeader/AppHeader';
import { Play } from '../Play/Play';
import { Record } from '../Record/Record';

import './Main.scss';

export function Main() {
  const [win] = useState(() => new OverwolfWindow('main'));

  const gameInFocus = useCommonState('gameInFocus');
  // const gameRunningId = useCommonState('gameRunningId');
  const viewport = useCommonState('viewport');

  const screen = usePersState('screen');
  const positioned = usePersState('mainPositionedFor');

  function setScreen(screen: kMainScreens) {
    eventBus.emit('setScreen', screen);
  }

  function renderContent() {
    switch (screen) {
      case kMainScreens.Play:
        return <Play />;
      case kMainScreens.Record:
        return <Record />;
    }
  }

  useEffect(() => {
    const positionWindow = async () => {
      if (viewport && positioned?.hash !== viewport.hash) {
        await win.centerInViewport(viewport);
        eventBus.emit('mainPositionedFor', viewport);
      }
    };

    positionWindow();
  }, [positioned, viewport, win]);

  return (
    <main className="Main">
      <AppHeader
        screen={screen}
        onChangeScreen={setScreen}
        onDrag={() => win.dragMove()}
        onClose={() => win.close()}
        onMinimize={() => win.minimize()}
      />
      {renderContent()}
    </main>
  );
}
