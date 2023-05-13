import { EventEmitter, LauncherStatus, GameStatus, OverwolfWindow, WindowTunnel, log } from 'ow-libs';
import { debounce } from 'throttle-debounce';

import { kWindowNames, kEventBusName, kRecordingReaderWriterName } from './constants/config';
import { EventBusEvents, OpenFilePickerMultiResult } from './constants/types';
import { RecorderService } from './services/recorder';
import { ExtensionMessageEvent, WSClientMessage, WSServerLoad, WSServerMessage, WSServerMessageTypes, WSServerPause, WSServerPlay, WSServerSetSeek, isWSClientUpdate, kRecordingExportedExt } from './shared';
import { makeCommonStore } from './store/common';
import { makePersStore } from './store/pers';
import { RecordingReaderWriter } from './services/recording-writer';

class BackgroundController {
  readonly eventBus = new EventEmitter<EventBusEvents>();
  readonly launcherStatus = new LauncherStatus();
  readonly gameStatus = new GameStatus();
  readonly state = makeCommonStore();
  readonly persState = makePersStore();
  readonly mainWin = new OverwolfWindow(kWindowNames.main);
  readonly rs = new RecorderService();
  readonly rw = new RecordingReaderWriter();

  readonly seekDebounced = debounce(200, this.seek);

  messageID = 0;

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
      setClientUID: uid => {
        this.persState.clientUID = uid;
        this.bindClientMessages();
      },

      record: () => this.toggleRecord(),
      rename: ({ uid, title }) => this.rename(uid, title),
      remove: uid => this.remove(uid),

      load: uid => this.load(uid),
      playPause: () => this.togglePlay(),
      seek: seek => this.seekDebounced(seek),

      import: () => this.import(),
      importFromPaths: paths => this.importFromPaths(paths),
      export: uid => this.export(uid)
    });

    this.rs.on({
      started: time => {
        this.state.isRecording = true;
        this.state.recordingStartedOn = time;
      },
      complete: () => {
        this.state.isRecording = false;
        this.state.recordingStartedOn = -1;
      }
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

    await this.bindClientMessages();

    overwolf.windows.onMainWindowRestored.addListener(() => {
      this.mainWin.restore();
    });

    await this.mainWin.restore();

    console.log('start(): success');
  }

  /** Make these objects available to all windows via a WindowTunnel */
  initTunnels() {
    WindowTunnel.set(kEventBusName, this.eventBus);
    WindowTunnel.set(kRecordingReaderWriterName, this.rw);
  }

  bindClientMessages(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.persState.clientUID === null) {
        console.log('bindClientMessages(): no app selected');
        return resolve();
      }

      overwolf.extensions.registerInfo(
        this.persState.clientUID,
        v => this.handleClientMessages(v),
        result => result.success ? resolve() : reject(result.error)
      );
    });
  }

  async toggleRecord() {
    if (this.state.isPlaying) {
      console.log('toggleRecord(): currently playing');
      return;
    }

    if (this.rs.isRecording || this.state.isPlaying) {
      const recording = this.rs.stop();

      if (recording) {
        await this.rw.set(recording);
        await this.updateRecordings();
      }
    } else {
      this.rs.start();
    }
  }

  handleClientMessages(event: ExtensionMessageEvent) {
    console.log('handleClientMessage():', event);

    if (
      this.persState.clientUID === event.id &&
      event.isRunning &&
      typeof event.info === 'object'
    ) {
      const message: WSClientMessage = event.info;

      if (isWSClientUpdate(message)) {
        this.state.playerLoaded = message.loaded;
        this.state.playerSeek = message.seek;
        this.state.isPlaying = message.playing;
      }
    }

    const connected = Boolean(event.isRunning);

    if (this.state.playerConnected !== connected) {
      this.state.playerConnected = connected;

      if (connected) {
        this.onClientConnected();
      } else {
        this.onClientDisconnected();
      }
    }
  }

  onClientConnected() {
    console.log('onClientConnected()');

    const { recording } = this.state;

    if (recording) {
      this.load(recording.uid);
    }
  }

  onClientDisconnected() {
    console.log('onClientDisconnected()');
    this.state.playerLoaded = false;
    this.state.playerSeek = 0;
    this.state.isPlaying = false;
  }

  sendMessageToClient<T extends WSServerMessage>(
    message: Omit<T, 'messageID'>
  ) {
    const messageWithID = {
      messageID: this.messageID++,
      ...message
    };

    console.log('sendMessageToClient():', messageWithID);

    overwolf.extensions.setInfo(messageWithID);
  }

  load(uid: string) {
    if (this.rs.isRecording) {
      console.log('load(): currently recording');
      return;
    }

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

  launchClient() {
    if (this.persState.clientUID === null) {
      console.log('launchClient(): no app selected');
    } else {
      overwolf.extensions.launch(this.persState.clientUID);
    }
  }

  togglePlay() {
    if (this.rs.isRecording) {
      console.log('togglePlay(): currently recording');
      return;
    }

    if (!this.state.playerConnected) {
      console.log('togglePlay(): player not connected, launching');
      this.launchClient();
      return;
    }

    if (!this.state.playerLoaded) {
      console.log('togglePlay(): player not loaded');
      return;
    }

    if (this.state.isPlaying) {
      this.sendMessageToClient<WSServerPause>({
        type: WSServerMessageTypes.Pause
      });
    } else {
      this.sendMessageToClient<WSServerPlay>({
        type: WSServerMessageTypes.Play
      });
    }
  }

  seek(seek: number) {
    this.sendMessageToClient<WSServerSetSeek>({
      type: WSServerMessageTypes.SetSeek,
      seek
    });
  }

  async updateRecordings() {
    this.state.recordings = await this.rw.getHeaders();
  }

  async rename(uid: string, title: string) {
    const header = await this.rw.getHeader(uid);

    console.log('rename():', uid, header, header?.title, title);

    if (header) {
      header.title = title;

      await this.rw.setHeader(header);

      await this.updateRecordings();
    }
  }

  async remove(uid: string) {
    console.log('remove():', uid);

    await this.rw.remove(uid);

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

  openFilePicker(
    filter: string,
    initialPath: string,
    multiSelect: boolean,
  ): Promise<OpenFilePickerMultiResult> {
    return new Promise(resolve => {
      overwolf.utils.openFilePicker(
        filter,
        initialPath,
        resolve,
        multiSelect
      );
    });
  }

  openFolderPicker(
    intialPath: string
  ): Promise<overwolf.utils.OpenFolderPickerResult> {
    return new Promise(resolve => {
      overwolf.utils.openFolderPicker(intialPath, resolve);
    });
  }

  async import() {
    const filePickResult = await this.openFilePicker(
      `.${kRecordingExportedExt}`,
      this.persState.lastPath ?? overwolf.io.paths.documents,
      true
    );

    console.log('import():', filePickResult);

    if (
      !filePickResult.success ||
      !filePickResult.files ||
      filePickResult.files.length === 0
    ) {
      return;
    }

    for (const path of filePickResult.files) {
      await this.rw.import(path);
    }

    await this.updateRecordings();
  }

  async importFromPaths(filePaths: string[]) {
    console.log('importFromPaths():', filePaths);

    for (const path of filePaths) {
      await this.rw.import(path);
    }

    await this.updateRecordings();
  }

  async export(uid: string) {
    console.log('export():', uid);

    const folderPickResult = await this.openFolderPicker(
      this.persState.lastPath ?? overwolf.io.paths.documents
    );

    if (folderPickResult.success && folderPickResult.path) {
      this.persState.lastPath = folderPickResult.path;

      await this.rw.export(uid, folderPickResult.path);
    } else {
      this.persState.lastPath = null;
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

  bindAppShutdown() {
    window.addEventListener('beforeunload', e => {
      delete e.returnValue;

      console.log('App shutting down');

      if (this.rs.isRecording) {
        console.log('App is recording, stopping to save');
        this.rs.stop();
      }

      if (this.state.isPlaying) {
        console.log('App is playing, stopping');
        this.togglePlay();
      }
    });
  }
}

(new BackgroundController())
  .start()
  .catch(e => {
    console.log('start(): error:');
    console.error(e);
  });
