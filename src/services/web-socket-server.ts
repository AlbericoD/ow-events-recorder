import { log, OverwolfPlugin } from 'ow-libs'

type WSSPCallback = (args: overwolf.Result) => void;

interface WebSocketServerPlugin {
  onMessageReceived: overwolf.Event<string>;

  send(message: string, callback?: WSSPCallback): void
  startServer(port: number, path?: string, callback?: WSSPCallback): void
  stopServer(callback?: WSSPCallback): void
  stopServerSync(): void
}

export class WebSocketServer {
  #wssp = new OverwolfPlugin<WebSocketServerPlugin>('websocket-server-plugin');

  async startServer(
    port: number,
    path: string = ''
  ): Promise<void> {
    console.log(...log(
      `WebSocketServer.startServer(): ${path} launching:`,
      { port, path }
    ));

    await this.#wssp.loadPlugin();

    return await new Promise((resolve, reject) => {
      this.#wssp.plugin.startServer(port, path, ({ success, error }) => {
        if (success) {
          resolve();
        } else {
          reject(error);
        }
      });
    });
  }

  async stopServer(): Promise<void> {
    console.log('WebSocketServer.stopServer(): stopping:');

    await this.#wssp.loadPlugin();

    return await new Promise((resolve, reject) => {
      this.#wssp.plugin.stopServer(({ success, error }) => {
        if (success) {
          resolve();
        } else {
          reject(error);
        }
      });
    });
  }

  stopServerSync(): void {
    console.log('WebSocketServer.stopServerSync(): stopping');

    if (this.#wssp.plugin) {
      this.#wssp.plugin.stopServerSync();
    }
  }

  async send(message: string): Promise<void> {
    console.log(`WebSocketServer.send():`, message);

    await this.#wssp.loadPlugin();

    return await new Promise((resolve, reject) => {
      this.#wssp.plugin.send(message, ({ success, error }) => {
        if (success) {
          resolve();
        } else {
          reject(error);
        }
      });
    });
  }
}
