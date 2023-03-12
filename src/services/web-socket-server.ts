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
    ports: number | number[],
    path: string = ''
  ): Promise<number> {
    await this.#wssp.loadPlugin();

    if (typeof ports === 'number') {
      await this.#startServer(ports, path);

      return ports;
    } else {
      return this.#startServerRange(ports, path);
    }
  }

  async #startServer(
    port: number,
    path: string = ''
  ): Promise<void> {
    console.log(...log(
      `WebSocketServer.startServer(): ${port}${path} launching:`,
      { port, path }
    ));

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

  async #startServerRange(
    ports: number[],
    path: string = ''
  ): Promise<number> {
    console.log(...log(
      `WebSocketServer.#startServerRange(): ${path} launching:`,
      { ports, path }
    ));

    await this.#wssp.loadPlugin();

    for (const port of ports) {
      const success = await this.#startServer(port, path)
        .then(() => true)
        .catch(e => {
          console.log(
            `WebSocketServer.#startServerRange(): ` +
            `couldn't start on port ${port}`,
            e
          );

          return false;
        });

      if (success) {
        return port;
      }
    }

    throw new Error(
      `WebSocketServer.#startServerRange(): couldn't start server`
    );
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
