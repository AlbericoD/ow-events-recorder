import { useEffect, useState } from 'react';
import { HotkeyChangedEvent, HotkeyService, WindowTunnel } from 'ow-libs';

import { kHotkeyServiceName } from '../constants/config';

// get HotkeysService instance from background window
const hotkeysService = WindowTunnel.get<HotkeyService>(kHotkeyServiceName);

export function useHotkey(gameId: number, hotkeyName: string) {
  const [binding, setBinding] = useState(() => {
    return hotkeysService.getHotkeyBinding(hotkeyName, gameId);
  });

  function assign(key: number, modifiers: any) {
    return hotkeysService.assignHotkey({
      name: hotkeyName,
      virtualKey: key,
      gameId,
      modifiers
    });
  }

  function unassign() {
    return hotkeysService.unassignHotkey({ name: hotkeyName, gameId });
  }

  useEffect(() => {
    const binding = hotkeysService.getHotkeyBinding(hotkeyName, gameId) || 'Unassigned';

    setBinding(binding);
  }, [gameId, hotkeyName]);

  useEffect(() => {
    const onHotkeyChanged = (e?: HotkeyChangedEvent) => {
      if (e?.name === hotkeyName) {
        const binding = hotkeysService.getHotkeyBinding(hotkeyName, gameId) || 'Unassigned';

        setBinding(binding);
      }
    }

    hotkeysService.addListener('changed', onHotkeyChanged);

    return () => {
      hotkeysService.removeListener('changed', onHotkeyChanged);
    };
  }, [gameId, hotkeyName]);

  return {
    binding,
    assign,
    unassign
  };
}
