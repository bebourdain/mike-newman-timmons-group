const { spawn } = require('node:child_process');
const path = require('node:path');
const env = { ...process.env };
if (process.platform === 'win32') {
  const preload = path.join(__dirname, 'windows-fs.cjs').replaceAll('\\', '/');
  env.NODE_OPTIONS = `${env.NODE_OPTIONS || ''} --require="${preload}"`.trim();
}
const cli = path.join(path.dirname(require.resolve('next/package.json')), 'dist/bin/next');
const child = spawn(process.execPath, [cli, 'build', '--webpack'], { env, stdio: 'inherit' });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
