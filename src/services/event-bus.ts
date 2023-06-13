import { EventEmitter, WindowTunnel } from 'ow-libs';

import { kEventBusName } from '../constants/config';
import { EventBusEvents } from '../constants/types';

export const eventBus = WindowTunnel.get<EventEmitter<EventBusEvents>>(
  kEventBusName
);
