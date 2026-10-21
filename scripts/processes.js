const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { readLocal } = require('./setup-env');
function launch(root, service, extra = [], spawnFn = spawn) {
  const cwd = path.join(root, service === 'backend' ? 'backend' : 'frontend');
  const args =
    service === 'backend'
      ? ['--watch', path.join(root, 'backend/src/start.js')]
      : [path.join(root, 'node_modules/expo/bin/cli'), 'start', '--go', ...extra];
  return spawnFn(process.execPath, args, {
    cwd,
    stdio: 'inherit',
    windowsHide: true,
    env: process.env,
  });
}
function stopChild(child, platform = process.platform) {
  if (
    !child?.pid ||
    child.pid === process.pid ||
    !Number.isInteger(child.pid) ||
    child.pid <= 0 ||
    child.exitCode !== null
  )
    return;
  if (platform === 'win32')
    spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
  else child.kill('SIGTERM');
}
async function backendStatus(root) {
  const { readConfig } = await import(pathToFileURL(path.join(root, 'backend/src/config.js')).href);
  try {
    return {
      ready: true,
      config: readConfig({ ...readLocal(path.join(root, 'backend/.env')), ...process.env }),
    };
  } catch (error) {
    return { ready: false, fields: error.fields || [], message: error.message };
  }
}
module.exports = { launch, stopChild, backendStatus };
