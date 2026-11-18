const { spawn } = require('node:child_process');
const path = require('node:path');
const env = { ...process.env };
if (process.platform === 'win32') {
  const preload = path.join(__dirname, 'windows-fs.cjs').replaceAll('\\', '/');
  env.NODE_OPTIONS = `${env.NODE_OPTIONS || ''} --require="${preload}"`.trim();
}
const cli = path.join(path.dirname(require.resolve('next/package.json')), 'dist/bin/next');
function run(args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { env, stdio: 'inherit', ...options });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Build step exited with ${code}`)));
  });
}

async function main() {
  if (process.env.VERCEL === '1') {
    // Release the type checker's memory before Webpack starts. Keep generated
    // route types and the complete project check; a failure stops the build.
    await run([cli, 'typegen']);
    const tsc = require.resolve('typescript/lib/tsc.js');
    await run(['--max-old-space-size=5120', tsc, '--noEmit', '--incremental', 'false']);
    await run(['--max-old-space-size=3072', cli, 'build', '--webpack'], {
      env: { ...env, NEXTCRM_TYPES_CHECKED: '1' },
    });
  } else {
    await run([cli, 'build', '--webpack']);
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
