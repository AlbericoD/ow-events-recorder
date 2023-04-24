import { EventEmitter, log, OverwolfPlugin } from 'ow-libs'

type WSSPCallback = (args: overwolf.Result) => void;

interface WebSocketServerPlugin {
  onMessageReceived: overwolf.Event<string>;

  send(message: string, callback?: WSSPCallback): void
  startServer(port: number, path?: string, callback?: WSSPCallback): void
  stopServer(callback?: WSSPCallback): void
  stopServerSync(): void
}

interface WebSocketServerEvents<MessageType> {
  message: MessageType
}

export class WebSocketServer<MessageType>
  extends EventEmitter<WebSocketServerEvents<MessageType>> {
  #wssp = new OverwolfPlugin<WebSocketServerPlugin>('websocket-server-plugin');

  async startServer(
    portOrPorts: number | number[],
    path: string = ''
  ): Promise<number> {
    await this.#wssp.loadPlugin();

    let port: number;

    if (typeof portOrPorts === 'number') {
      await this.#startServer(portOrPorts, path);

      port = portOrPorts;
    } else {
      port = await this.#startServerRange(portOrPorts, path);
    }

    this.#wssp.plugin.onMessageReceived.addListener(this.#handleMessage);

    return port;
  }

  #handleMessage = (message: string) => {
    let parsed: MessageType | undefined;

    try {
      parsed = JSON.parse(message);
    } catch (e) {
      console.log(
        'WebSocketServer.#handleMessage(): error parsing:',
        message,
        ...log(e)
      );
    }

    if (parsed !== undefined) {
      this.emit('message', parsed);
    }
  }

  async #startServer(
    port: number,
    path: string = ''
  ): Promise<void> {
    console.log(`WebSocketServer.startServer(): ${port}${path} launching:`);

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
    console.log(`WebSocketServer.#startServerRange(): ${path} launching:`);

    await this.#wssp.loadPlugin();

    for (const port of ports) {
      const success = await this.#startServer(port, path)
        .then(() => true)
        .catch(e => {
          console.log(
            'WebSocketServer.#startServerRange(): ' +
            `couldn't start on port ${port}`,
            ...log(e)
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
