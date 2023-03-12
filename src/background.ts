import { EventEmitter, LauncherStatus, GameStatus, HotkeyService, OverwolfWindow, WindowTunnel, log } from 'ow-libs';

import { kWindowNames, kEventBusName, kHotkeyServiceName, kWebSocketServerPorts } from './constants/config';
import { EventBusEvents } from './constants/types';
import { WebSocketServer } from './services/web-socket-server';
import { kWebsocketPath, writeFile, kWebsocketFilePath } from './shared';
import { makeCommonStore } from './store/common';
import { makePersStore } from './store/pers';

class BackgroundController {
  readonly eventBus = new EventEmitter<EventBusEvents>();
  readonly launcherStatus = new LauncherStatus();
  readonly gameStatus = new GameStatus();
  readonly hotkeyService = new HotkeyService();
  readonly state = makeCommonStore();
  readonly persState = makePersStore();
  readonly mainWin = new OverwolfWindow(kWindowNames.main);
  readonly wss = new WebSocketServer();

  get startedWithGame() {
    return window.location.search.includes('source=gamelaunchevent');
  }

  get gameRunning() {
    return this.state.gameRunningId !== null;
  }

  get gameRunningId() {
    return this.state.gameRunningId;
  }

  set gameRunningId(v) {
    this.state.gameRunningId = v;
  }

  get launcherRunning() {
    return this.state.launcherRunningId !== null;
  }

  get launcherRunningId() {
    return this.state.launcherRunningId;
  }

  set launcherRunningId(v) {
    this.state.launcherRunningId = v;
  }

  get gameInFocus() {
    return this.state.gameInFocus;
  }

  set gameInFocus(v) {
    this.state.gameInFocus = v;
  }

  async start() {
    console.log('start()');

    overwolf.extensions.current.getManifest(e => {
      console.log('start(): app version:', e.meta.version);
    });

    if (this.startedWithGame && !this.persState.enableAutoLaunch) {
      console.log('start(): autolaunch disabled, closing');
      return window.close();
    }

    this.initTunnels();

    await Promise.all([
      this.hotkeyService.start(),
      this.launcherStatus.start(),
      this.gameStatus.start(),
      this.updateViewports()
    ]);

    this.eventBus.on({
      mainPositionedFor: v => this.persState.mainPositionedFor = v,
      setAutoLaunch: v => this.persState.enableAutoLaunch = v
    });

    this.launcherStatus.addListener('running', () => {
      this.onLauncherRunningChanged();
    });

    this.gameStatus.on({
      '*': () => this.updateViewports(),
      running: () => this.onGameRunningChanged(),
      focus: v => this.gameInFocus = v
    });

    this.onGameRunningChanged();
    this.onLauncherRunningChanged();

    this.hotkeyService.addListener('pressed', v => this.onHotkeyPressed(v));

    overwolf.windows.onMainWindowRestored.addListener(() => {
      this.mainWin.restore();
    });

    if (!this.startedWithGame) {
      this.mainWin.restore();
    }

    await this.startWebsocketServer();

    console.log('start(): success');
  }

  /** Make these objects available to all windows via a WindowTunnel */
  initTunnels() {
    WindowTunnel.set(kEventBusName, this.eventBus);
    WindowTunnel.set(kHotkeyServiceName, this.hotkeyService);
  }

  async startWebsocketServer() {
    await this.wss.startServer(
      kWebSocketServerPorts,
      kWebsocketPath
    );
  }

  async onHotkeyPressed(hotkeyName: string) {
    console.log('onHotkeyPressed():', hotkeyName);

    /* switch (hotkeyName) {
      case kHotkeyStartStop:

    } */
  }

  onLauncherRunningChanged() {
    if (!this.launcherRunning && this.launcherStatus.isRunning) {
      console.log('onLauncherRunningChanged(): launcher started');
      this.launcherRunningId = this.launcherStatus.launcherID;
    }

    if (this.launcherRunning && !this.launcherStatus.isRunning) {
      console.log('onLauncherRunningChanged(): launcher stopped');
      this.launcherRunningId = null;
    }
  }

  onGameRunningChanged() {
    if (!this.gameRunning && this.gameStatus.isRunning) {
      console.log('onGameRunningChanged(): game started');
      this.gameRunningId = this.gameStatus.gameID;
    }

    if (this.gameRunning && !this.gameStatus.isRunning) {
      console.log('onGameRunningChanged(): game stopped');
      this.gameRunningId = null;
    }
  }

  async updateViewports() {
    const viewport = await OverwolfWindow.getPrimaryViewport();

    const oldViewport = this.state.viewport;

    if (!oldViewport || oldViewport.hash !== viewport?.hash) {
      this.state.viewport = viewport;

      console.log('updateViewports():', ...log(viewport));
    }
  }
}

(new BackgroundController())
  .start()
  .catch(e => {
    console.log('start(): error:');
    console.error(e);
  });
