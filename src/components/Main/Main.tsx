import { OverwolfWindow } from 'ow-libs';
import { useCallback, useEffect, useRef } from 'react';

import { kMainScreens } from '../../constants/config';
import { useCommonState } from '../../hooks/use-common-state';
import { usePersState } from '../../hooks/use-pers-state';
import { eventBus } from '../../services/event-bus';

import { AppHeader } from '../AppHeader/AppHeader';
import { Play } from '../Play/Play';
import { Record } from '../Record/Record';

import './Main.scss';

const win = new OverwolfWindow('main');

export function Main() {
  const viewport = useCommonState('viewport');

  const screen = usePersState('screen');
  const positioned = usePersState('mainPositionedFor');

  const mainEl = useRef<HTMLElement | null>(null);

  function setScreen(screen: kMainScreens) {
    eventBus.emit('setScreen', screen);
  }

  const adjustWindow = useCallback(async () => {
    if (mainEl.current) {
      await win.changeSize(
        mainEl.current.clientWidth,
        mainEl.current.clientHeight,
        false
      );
    }

    if (viewport && positioned?.hash !== viewport.hash) {
      await win.centerInViewport(viewport);
      eventBus.emit('mainPositionedFor', viewport);
    }
  }, [positioned?.hash, viewport]);

  useEffect(() => {
    adjustWindow();
  }, [adjustWindow, screen]);

  function renderContent() {
    switch (screen) {
      case kMainScreens.Play:
        return <Play onResize={adjustWindow} />;
      case kMainScreens.Record:
        return <Record onResize={adjustWindow} />;
    }
  }

  return (
    <main className="Main" ref={mainEl}>
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
