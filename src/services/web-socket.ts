import { EventEmitter, delay, log } from 'ow-libs';

export type WebSocketOptions = {
  url: string
  maxRetries: number
  timeout: number
}

export type WebSocketEvents<MessageType> = {
  disconnected: string,
  connected: undefined,
  message: MessageType
};

export class WebSocketService<T> extends EventEmitter<WebSocketEvents<T>> {
  #url: WebSocketOptions['url'];
  #maxRetries: WebSocketOptions['maxRetries'];
  #timeout: WebSocketOptions['timeout'];

  #connected: boolean = false;
  #ws: WebSocket | null = null;
  #connectPromise: Promise<boolean> | null = null;

  constructor(
    {
      url,
      maxRetries = Infinity,
      timeout = 10000
    }: WebSocketOptions
  ) {
    super();

    this.#url = url;
    this.#maxRetries = maxRetries;
    this.#timeout = timeout;
  }

  get connected() {
    return this.#connected;
  }

  async connect() {
    if (this.#ws !== null) {
      return true;
    }

    if (this.#connectPromise !== null) {
      return await this.#connectPromise;
    }

    console.log('Websocket connecting');

    this.#connected = false;

    this.#connectPromise = this.#connectWithRetry();

    const success = await this.#connectPromise;

    this.#connectPromise = null;

    this.#connected = success;

    if (success) {
      console.log('Websocket connected');
      this.#bindEvents();
      this.emit('connected');
    } else {
      console.log('Websocket could not connect');
    }

    return success;
  }

  disconnect(message: string, code: number = 1000) {
    if (this.#ws === null) {
      return;
    }

    console.log('Websocket disconnecting', message, code);

    const ws = this.#ws;

    this.#ws = null;
    this.#connectPromise = null;

    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;

    ws.close(code, message);

    this.#connected = false;

    this.emit('disconnected', message);
  }

  #send(payload: string | Blob | ArrayBufferLike | ArrayBufferView) {
    if (this.#ws === null) {
      throw new Error('no connection');
    }

    this.#ws.send(payload);
    return true;
  }

  send(payload: string | Blob | ArrayBufferLike | ArrayBufferView) {
    try {
      return this.#send(payload);
    } catch (err) {
      console.log(...log(
        `Could not send websocket message: ${err} / payload:`,
        payload
      ));
    }

    return false;
  }

  async #connect() {
    const ws = new WebSocket(this.#url);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (
          ws.readyState !== WebSocket.CLOSED ||
          ws.readyState !== WebSocket.CLOSING
        ) {
          ws.close();
        }

        reject(new Error('connection timed out'));
      }, this.#timeout);

      ws.onopen = e => {
        clearTimeout(timeout);
        resolve(e);
      };

      ws.onerror = e => {
        clearTimeout(timeout);
        ws.close();
        reject(e);
      };
    });

    return ws;
  }

  async #connectWithRetry() {
    let retry = 0;

    while (this.#ws === null && retry < this.#maxRetries) {
      try {
        retry++;

        if (retry > 1) {
          console.log(
            'Websocket retrying connection, attempt '
            + retry
            + '/'
            + this.#maxRetries
          );
          await delay(2000);
        }

        this.#ws = await this.#connect();
        return true;
      } catch (e) {
        console.error(...log('Websocket error:', e));
      }
    }

    return false;
  }

  #bindEvents() {
    if (this.#ws === null) {
      return;
    }

    this.#ws.onmessage = (payload: MessageEvent<T>) => {
      let data = payload.data;

      if (typeof data === 'string') {
        try {
          data = JSON.parse(data as string);
        } catch (e) { }
      }

      this.emit('message', data);
    };

    this.#ws.onerror = e => {
      console.error(...log('Websocket error', e));
    };

    this.#ws.onclose = async e => {
      console.log(...log('Websocket closed', e.reason, e));

      this.disconnect(e.reason, e.code);

      if (this.#maxRetries > 0) {
        await this.connect();
      }
    };
  }
}
