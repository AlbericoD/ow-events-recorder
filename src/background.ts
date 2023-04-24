import { EventEmitter, LauncherStatus, GameStatus, OverwolfWindow, WindowTunnel, log } from 'ow-libs';
import { debounce } from 'throttle-debounce';

import { kWindowNames, kEventBusName } from './constants/config';
import { EventBusEvents } from './constants/types';
import { RecorderService } from './services/recorder';
import { ExtensionMessageEvent, RecordingManager, WSClientMessage, WSServerLoad, WSServerMessage, WSServerMessageTypes, WSServerPause, WSServerPlay, WSServerSetSeek, isWSClientUpdate } from './shared';
import { makeCommonStore } from './store/common';
import { makePersStore } from './store/pers';

class BackgroundController {
  readonly eventBus = new EventEmitter<EventBusEvents>();
  readonly launcherStatus = new LauncherStatus();
  readonly gameStatus = new GameStatus();
  readonly state = makeCommonStore();
  readonly persState = makePersStore();
  readonly mainWin = new OverwolfWindow(kWindowNames.main);
  readonly rs = new RecorderService();
  readonly rm = new RecordingManager();

  readonly seekRecordingDebounced = debounce(200, this.seekRecording);

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

    this.bindAppShutdown();

    overwolf.extensions.current.getManifest(e => {
      console.log('start(): app version:', e.meta.version);
    });

    this.initTunnels();

    await Promise.all([
      this.launcherStatus.start(),
      this.gameStatus.start(),
      this.rs.init(),
      this.updateRecordings(),
      this.updateViewports()
    ]);

    this.eventBus.on({
      mainPositionedFor: vp => this.persState.mainPositionedFor = vp,
      setScreen: screen => this.persState.screen = screen,
      setAppSelected: appUID => {
        this.persState.appSelected = appUID;
        this.bindClientMessages();
      },

      record: () => this.startStopRecord(),
      rename: ({ uid, title }) => this.renameRecording(uid, title),
      remove: uid => this.removeRecording(uid),

      load: uid => this.loadRecording(uid),
      play: () => this.playRecording(),
      pause: () => this.pauseRecording(),
      seek: seek => this.seekRecordingDebounced(seek)
    });

    this.rs.on({
      started: () => this.state.isRecording = true,
      complete: () => this.state.isRecording = false
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

    if (this.persState.appSelected) {
      await this.bindClientMessages();
    }

    overwolf.windows.onMainWindowRestored.addListener(() => {
      this.mainWin.restore();
    });

    await this.mainWin.restore();

    console.log('start(): success');
  }

  bindAppShutdown() {
    window.addEventListener('beforeunload', e => {
      delete e.returnValue;

      console.log('App shutting down');
    });
  }

  /** Make these objects available to all windows via a WindowTunnel */
  initTunnels() {
    WindowTunnel.set(kEventBusName, this.eventBus);
  }

  async bindClientMessages(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.persState.appSelected === null) {
        console.log('bindClientMessages(): no app selected');
        reject('no app selected');
        return
      }

      overwolf.extensions.registerInfo(
        this.persState.appSelected,
        v => this.handleClientMessages(v),
        result => result.success ? resolve() : reject(result.error)
      );
    });
  }

  async startStopRecord() {
    if (!this.rs.isRecording) {
      this.rs.start();
    } else {
      const recording = this.rs.stop();

      if (recording) {
        await this.rm.set(recording);
        await this.updateRecordings();
      }
    }
  }

  handleClientMessages(event: ExtensionMessageEvent) {
    console.log('handleClientMessage():', event);

    this.state.clientConnected = Boolean(event.isRunning);

    if (
      event.success &&
      this.persState.appSelected === event.id &&
      event.isRunning &&
      typeof event.info === 'object'
    ) {
      const message: WSClientMessage = event.info;

      if (isWSClientUpdate(message)) {
        this.state.loaded = message.loaded;
        this.state.seek = message.seek;
        this.state.isPlaying = message.playing;
      }
    }
  }

  sendMessageToClient<T extends WSServerMessage>(message: T) {
    overwolf.extensions.setInfo(message);
  }

  loadRecording(uid: string) {
    const { recordings } = this.state;

    const recording = recordings.find(r => r.uid === uid) ?? null;

    this.state.recording = recording;

    if (recording !== null) {
      this.sendMessageToClient<WSServerLoad>({
        type: WSServerMessageTypes.Load,
        recordingUID: uid
      });
    }
  }

  playRecording() {
    this.sendMessageToClient<WSServerPlay>({
      type: WSServerMessageTypes.Play
    });
  }

  pauseRecording() {
    this.sendMessageToClient<WSServerPause>({
      type: WSServerMessageTypes.Pause
    });
  }

  seekRecording(seek: number) {
    console.log(seek);

    this.sendMessageToClient<WSServerSetSeek>({
      type: WSServerMessageTypes.SetSeek,
      seek
    });
  }

  async updateRecordings() {
    this.state.recordings = await this.rm.getHeaders();
  }

  async renameRecording(uid: string, title: string) {
    const header = await this.rm.getHeader(uid);

    if (header) {
      header.title = title;

      await this.rm.setHeader(header);

      await this.updateRecordings();
    }
  }

  async removeRecording(uid: string) {
    await this.rm.remove(uid);

    await this.updateRecordings();
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
