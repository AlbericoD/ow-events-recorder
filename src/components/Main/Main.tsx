import { WindowTunnel, EventEmitter, OverwolfWindow } from 'ow-libs';
import { useEffect, useState } from 'react';

import { kEventBusName, kHotkeyStartStop, kHotkeyToggle } from '../../constants/config';
import { EventBusEvents } from '../../constants/types';
import { useCommonState } from '../../hooks/use-common-state';
import { useHotkey } from '../../hooks/use-hotkey';
import { usePersState } from '../../hooks/use-pers-state';
import { classNames } from '../../utils';

import './Main.scss';

const eventBus = WindowTunnel.get<EventEmitter<EventBusEvents>>(kEventBusName);

export function Main() {
  const [win] = useState(() => new OverwolfWindow('main'));

  const gameRunningId = useCommonState('gameRunningId');
  const viewport = useCommonState('viewport');

  const positioned = usePersState('mainPositionedFor');

  const { binding: hotkeyStartStop } = useHotkey(
    kHotkeyStartStop,
    (gameRunningId !== null) ? gameRunningId : undefined
  );

  const { binding: hotkeyToggle } = useHotkey(
    kHotkeyToggle,
    (gameRunningId !== null) ? gameRunningId : undefined
  );

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
    <main className={classNames('Main')}>
      <div className="app-header" onMouseDown={() => win.dragMove()}>
        <h1 className="app-title">iTero</h1>

        {
          gameRunningId !== null &&
          <div
            className="hotkey"
            onMouseDown={e => e.stopPropagation()}
          >
            Show/Hide&nbsp;<kbd>{hotkeyToggle}</kbd>
          </div>
        }

        <div className="window-controls" onMouseDown={e => e.stopPropagation()}>
          <button
            className="window-control minimize"
            onClick={() => win.minimize()}
          />
          <button
            className="window-control close"
            onClick={() => win.close()}
          />
        </div>
      </div>

      {hotkeyStartStop}
    </main>
  );
}
