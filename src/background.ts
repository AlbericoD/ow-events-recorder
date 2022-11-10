import { EventEmitter, LauncherStatus, GameStatus, HotkeyService, OverwolfWindow, WindowTunnel, log } from 'ow-libs';

import { kWindowNames, kEventBusName, kHotkeyServiceName } from './constants/config';
import { EventBusEvents } from './constants/types';
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

  get startedWithGame() {
    return window.location.search.includes('source=gamelaunchevent');
  }

  get gameRunning() {
    return this.state.gameRunning;
  }

  set gameRunning(v) {
    this.state.gameRunning = v;
  }

  get launcherRunning() {
    return this.state.launcherRunning;
  }

  set launcherRunning(v) {
    this.state.launcherRunning = v;
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
      this.updateScreens()
    ]);

    this.eventBus.on({
      mainPositionedFor: v => this.persState.mainPositionedFor = v,
      setAutoLaunch: v => this.persState.enableAutoLaunch = v
    });

    this.launcherStatus.addListener('running', () => {
      this.onLauncherRunningChanged();
    });

    this.gameStatus.on({
      '*': () => this.updateScreens(),
      running: () => this.onGameRunningChanged(),
      focus: v => this.gameInFocus = v
    });

    await this.onGameRunningChanged();
    await this.onLauncherRunningChanged();

    this.hotkeyService.addListener('pressed', v => this.onHotkeyPressed(v));

    overwolf.windows.onMainWindowRestored.addListener(() => {
      this.mainWin.restore();
    });

    console.log('start(): success');
  }

  /** Make these objects available to all windows via a WindowTunnel */
  initTunnels() {
    WindowTunnel.set(kEventBusName, this.eventBus);
    WindowTunnel.set(kHotkeyServiceName, this.hotkeyService);
  }

  async onHotkeyPressed(hotkeyName: string) {
    console.log('onHotkeyPressed():', hotkeyName);

    /* switch (hotkeyName) {
      case kHotkeyStartStop:

    } */
  }

  async onLauncherRunningChanged() {
    if (!this.launcherRunning && this.launcherStatus.isRunning) {
      console.log('onLauncherRunningChanged(): launcher started');
      this.launcherRunning = true;
    }

    if (this.launcherRunning && !this.launcherStatus.isRunning) {
      console.log('onLauncherRunningChanged(): launcher stopped');
      this.launcherRunning = false;
    }
  }

  async onGameRunningChanged() {
    if (!this.gameRunning && this.gameStatus.isRunning) {
      console.log('onGameRunningChanged(): game started');
      this.gameRunning = true;
    }

    if (this.gameRunning && !this.gameStatus.isRunning) {
      console.log('onGameRunningChanged(): game stopped');
      this.gameRunning = false;
    }
  }

  async updateScreens() {
    const [
      viewport,
      monitors
    ] = await Promise.all([
      OverwolfWindow.getViewportSize(),
      OverwolfWindow.getMonitorsList()
    ]);

    const
      scale = window.devicePixelRatio,
      old = this.state.viewport;

    if (
      !old ||
      old.width !== viewport.width ||
      old.height !== viewport.height ||
      old.scale !== scale
    ) {
      const newViewport = { ...viewport, scale };

      this.state.viewport = newViewport;

      console.log('updateScreens(): viewport:', ...log(newViewport));
    }

    if (monitors && monitors.success) {
      this.state.monitors = monitors.displays;
      console.log('updateScreens(): monitors:', ...log(monitors.displays));
    } else {
      this.state.monitors = [];
    }
  }
}

(new BackgroundController())
  .start()
  .catch(e => {
    console.log('start(): error:');
    console.error(e);
  });
