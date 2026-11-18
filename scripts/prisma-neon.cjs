const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');
require('dotenv').config({ quiet: true });

async function main() {
  const args = process.argv.slice(2);
  const connection = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  const url = connection && new URL(connection);
  const sockets = new Set();
  let server;
  const env = { ...process.env };
  if (url?.hostname.endsWith('.neon.tech') && process.env.NEON_MIGRATION_TRANSPORT === 'websocket') {
    const { neonConfig } = require('@neondatabase/serverless');
    const endpoint = 'wss://' + new neonConfig().wsProxyAddrForHost(url.hostname, Number(url.port || 5432)) + '?address=' + encodeURIComponent(url.hostname + ':' + (url.port || 5432));
    server = net.createServer(socket => {
      sockets.add(socket);
      socket.pause();
      const ws = new WebSocket(endpoint);
      ws.binaryType = 'arraybuffer';
      ws.addEventListener('open', () => socket.resume());
      socket.on('data', data => { if (ws.readyState === WebSocket.OPEN) ws.send(data); });
      ws.addEventListener('message', event => socket.write(Buffer.from(event.data)));
      ws.addEventListener('error', () => { console.error('Neon migration WebSocket transport failed'); socket.destroy(); });
      ws.addEventListener('close', () => socket.end());
      socket.on('error', () => ws.close());
      socket.on('close', () => { sockets.delete(socket); ws.close(); });
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    // Only the loopback leg is plaintext. Remote traffic uses certificate-verified WSS.
    url.hostname = '127.0.0.1';
    url.port = String(server.address().port);
    url.searchParams.set('sslmode', 'disable');
    url.searchParams.delete('channel_binding');
    env.DATABASE_URL_UNPOOLED = url.toString();
    console.log('Prisma migration transport: loopback -> encrypted Neon WebSocket');
  }
  const cli = path.join(path.dirname(require.resolve('prisma/package.json')), 'build/index.js');
  const child = spawn(process.execPath, [cli, ...args], { env, stdio: 'inherit' });
  const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
  for (const socket of sockets) socket.destroy();
  if (server) await new Promise(resolve => server.close(resolve));
  process.exitCode = code ?? 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
