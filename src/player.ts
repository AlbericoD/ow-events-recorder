import { kServerUID, kInterAppMessageVersion } from './constants/config';
import { isWSServerLoad, isWSServerPlay, isWSServerPause, isWSServerSetSeek, isWSServerSetSettings } from './constants/type-guards';
import { ExtensionMessageEvent, NullableResultCallback, PlayerSettings, RecordingEvent, WSClientMessage, WSClientMessageTypes, WSClientUpdate, WSServerMessage } from './constants/types';
import { OverwolfAPI } from './services/overwolf-api';
import { PlayerService } from './services/player';
import { RecordingReader } from './services/recording-reader';

class PlayerController {
  readonly #api = new OverwolfAPI();
  readonly #player = new PlayerService();
  readonly #rr = new RecordingReader();

  #messageID = 0;

  async start() {
    try {
      await this.#start();
    } catch (e) {
      console.log('Event Player: start(): error:');
      console.error(e);
    }
  }

  async #start() {
    console.log('Event Player: starting');

    this.#api.replace();

    this.#bindAPIEvents();
    this.#bindPlayerEvents();

    console.log('Event Player: sync ready');

    if (await this.#isStartWindow()) {
      await this.#bindServerMessages();

      this.#emitPlayerUpdate();

      console.log('Event Player: ready');
    } else {
      console.log('Event Player: not start window');
    }
  }

  async #isStartWindow() {
    const [startWindow, currentWindow] = await Promise.all([
      this.#getStartWindowName(),
      this.#getCurrentWindowName()
    ]);

    return (startWindow === currentWindow);
  }

  #getStartWindowName(): Promise<string> {
    return new Promise((resolve, reject) => {
      overwolf.extensions.current.getManifest(result => {
        if (result.success) {
          resolve(result.data.start_window);
        } else {
          reject(result.error);
        }
      });
    });
  }

  #getCurrentWindowName(): Promise<string> {
    return new Promise((resolve, reject) => {
      overwolf.windows.getCurrentWindow(result => {
        if (result.success) {
          resolve(result.window.name);
        } else {
          reject(result.error);
        }
      });
    });
  }

  #bindAPIEvents() {
    this.#api.on({
      getRunningGameInfo: cb => {
        this.#player.getRunningGameInfo(
          cb as NullableResultCallback<overwolf.games.GetRunningGameInfoResult>
        );
      },
      getRunningGameInfo2: cb => this.#player.getRunningGameInfo2(cb),
      getRunningLaunchersInfo: cb => this.#player.getRunningLaunchersInfo(cb),
      setGameRequiredFeatures: cb => this.#player.setGameRequiredFeatures(cb),
      setLauncherRequiredFeatures: cb => {
        this.#player.setLauncherRequiredFeatures(cb);
      }
    });
  }

  #bindPlayerEvents() {
    this.#player.on({
      unload: () => this.#emitPlayerUpdate(),
      load: () => this.#emitPlayerUpdate(),
      seek: () => this.#emitPlayerUpdate(),
      playing: () => this.#emitPlayerUpdate(),
      playFrames: events => this.#playFrames(events)
    });
  }

  #playFrames(events: RecordingEvent[]) {
    for (var e of events) {
      this.#api.fireEvent(e);
    }
  }

  #emitPlayerUpdate() {
    this.#sendMessageToServer<WSClientUpdate>({
      type: WSClientMessageTypes.Update,
      loaded: this.#player.loaded,
      seek: this.#player.seek,
      playing: this.#player.playing
    });
  }

  #sendMessageToServer<T extends WSClientMessage>(
    message: Omit<T, 'messageID'>
  ) {
    const messageWithID = {
      messageID: this.#messageID++,
      version: kInterAppMessageVersion,
      ...message
    };

    // console.log('Event Player: #sendMessageToServer():', messageWithID);

    overwolf.extensions.setInfo(messageWithID);
  }

  async #bindServerMessages() {
    await new Promise<void>((resolve, reject) => {
      overwolf.extensions.registerInfo(
        kServerUID,
        v => this.#handleServerMessage(v),
        result => result.success ? resolve() : reject(result.error)
      );
    });
  }

  #handleServerMessage(event: ExtensionMessageEvent) {
    // console.log('Event Player: #handleServerMessage():', event);

    if (
      event.isRunning &&
      typeof event.info === 'object' &&
      event.info !== null
    ) {
      const message: WSServerMessage = event.info;

      if (message.version !== kInterAppMessageVersion) {
        console.log(
          'Event Player: #handleServerMessage(): version mismatch:',
          message.version, '!=', kInterAppMessageVersion
        );
        return;
      }

      if (isWSServerLoad(message)) {
        this.#playerLoad(message.recordingUID, message.settings);
      } else if (isWSServerPlay(message)) {
        this.#player.play();
      } else if (isWSServerPause(message)) {
        this.#player.pause();
      } else if (isWSServerSetSeek(message)) {
        this.#player.setSeek(message.seek);
      } else if (isWSServerSetSettings(message)) {
        this.#player.setSettings(message.settings);
      }
    }
  }

  async #playerLoad(recordingUID: string, settings: PlayerSettings) {

    this.#player.unload();

    const recording = await this.#rr.getRecording(recordingUID);

    if (recording) {
      this.#player.load(recording, settings);
    }
  }
}

(new PlayerController()).start();
