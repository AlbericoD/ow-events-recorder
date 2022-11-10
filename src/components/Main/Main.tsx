import { WindowTunnel, EventEmitter, OverwolfWindow } from 'ow-libs';
import { useEffect } from 'react';

import { kEventBusName, kHotkeyStartStop, kWindowNames } from '../../constants/config';
import { EventBusEvents } from '../../constants/types';
import { useCommonState } from '../../hooks/use-common-state';
import { useHotkey } from '../../hooks/use-hotkey';
import { usePersState } from '../../hooks/use-pers-state';
import { classNames } from '../../utils';

import './Main.scss';

const eventBus = WindowTunnel.get<EventEmitter<EventBusEvents>>(kEventBusName);

const win = new OverwolfWindow('main');

export function Main() {
  const viewport = useCommonState('viewport');

  const positionedFor = usePersState('mainPositionedFor');

  const { binding: hotkeyStartStop } = useHotkey(kHotkeyStartStop);

  useEffect(() => {
    const positionWindow = async () => {
      if (
        !positionedFor ||
        positionedFor.width !== viewport.width ||
        positionedFor.height !== viewport.height ||
        positionedFor.scale !== viewport.scale
      ) {
        await win.center();
        eventBus.emit('mainPositionedFor', viewport);
      }
    };

    positionWindow();
  }, [positionedFor, viewport]);

  return (
    <main className={classNames('Main')}>
      <div className="app-header" onMouseDown={() => win.dragMove()}>
        <h1 className="app-title">iTero</h1>

        {
          winName === kWindowNames.ingame &&
          <div
            className="hotkey"
            onMouseDown={e => e.stopPropagation()}
          >
            Show/Hide&nbsp;
            <kbd onClick={() => setScreen(Screens.Settings)}>
              {hotkey}
            </kbd>
          </div>
        }

        <div className="window-controls" onMouseDown={e => e.stopPropagation()}>
          <button
            className="window-control twitter"
            onClick={openTwitter}
          />
          <button
            className="window-control discord"
            onClick={openDiscord}
          />
          {
            winName === kWindowNames.desktop &&
            isReady &&
            ftueSeen &&
            <button
              className={classNames(
                'window-control',
                'settings',
                { active: (screen === Screens.Settings) }
              )}
              onClick={() => setScreen(Screens.Settings)}
            />
          }
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
