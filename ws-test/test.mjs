import WebSocket from 'ws';

const ws = new WebSocket('ws://[::1]:30000/', ['ws', 'http']);

ws.on('open', () => {
  console.log('open');
  ws.send('Hello world!');
});

ws.on('message', data => {
  console.log('received:', data);
});

ws.on('unexpected-response', (req, res) => {
  console.log('unexpected-response', res.rawHeaders, res.code, res.statusMessage);
});

ws.on('redirect', e => {
  console.log('redirect', e.statusCode, e.statusMessage, e.headers);
});

ws.on('upgrade', e => {
  console.log('upgrade', e.statusCode, e.statusMessage, e.headers);
});

ws.on('ping', (...args) => {
  console.log('ping', ...args);
});

ws.on('pong', (...args) => {
  console.log('pong', ...args);
});

ws.on('close', (code, reason) => {
  console.log('close', code, reason);
});

ws.on('error', e => {
  console.error(e);
});
