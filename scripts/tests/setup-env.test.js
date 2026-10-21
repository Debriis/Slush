const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path');
const { setupEnv, readLocal, lanAddresses } = require('../setup-env');
const { launch, stopChild } = require('../processes');
function workspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'slush-env-test-'));
  fs.mkdirSync(path.join(root, 'backend'));
  fs.mkdirSync(path.join(root, 'frontend'));
  return root;
}
function cleanup(root) {
  const target = path.resolve(root);
  assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
  assert.ok(path.basename(target).startsWith('slush-env-test-'));
  fs.rmSync(target, { recursive: true, force: true });
}
test('setup creates blank credential fields and real supplied LAN address without inventing credentials', () => {
  const root = workspace();
  try {
    setupEnv(root, { env: {}, addresses: ['192.168.1.13'], log: () => {} });
    const backend = readLocal(path.join(root, 'backend/.env')),
      front = readLocal(path.join(root, 'frontend/.env'));
    assert.equal(backend.DATABASE_URL, '');
    assert.equal(backend.SUPABASE_ANON_KEY, '');
    assert.equal(front.EXPO_PUBLIC_API_URL, 'http://192.168.1.13:4000/api');
    assert.ok(backend.CORS_ORIGINS.includes('http://192.168.1.13:8081'));
  } finally {
    cleanup(root);
  }
});
test('setup never overwrites existing configuration or prints secret contents', () => {
  const root = workspace();
  try {
    const content = 'DATABASE_URL="private-test-value"\n';
    fs.writeFileSync(path.join(root, 'backend/.env'), content);
    let logs = [];
    setupEnv(root, { env: {}, addresses: [], log: (value) => logs.push(value) });
    assert.equal(fs.readFileSync(path.join(root, 'backend/.env'), 'utf8'), content);
    assert.ok(!logs.join(' ').includes('private-test-value'));
  } finally {
    cleanup(root);
  }
});
test('setup never copies private API keys to the frontend', () => {
  const root = workspace();
  try {
    setupEnv(root, {
      env: { SUPABASE_ANON_KEY: 'sb_secret_TEST_ONLY_NOT_A_REAL_KEY' },
      addresses: [],
      log: () => {},
    });
    assert.equal(readLocal(path.join(root, 'frontend/.env')).EXPO_PUBLIC_SUPABASE_ANON_KEY, '');
  } finally {
    cleanup(root);
  }
});
test('LAN detection filters virtual/loopback adapters', () => {
  assert.deepEqual(
    lanAddresses({
      WiFi: [{ family: 'IPv4', internal: false, address: '192.168.1.13' }],
      Loopback: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }],
      vEthernet: [{ family: 'IPv4', internal: false, address: '172.16.0.1' }],
    }),
    ['192.168.1.13'],
  );
});
test('services are launched as independent Node children without a command shell', () => {
  let call;
  launch('C:/workspace', 'frontend', ['--port', '8085'], (...args) => {
    call = args;
    return {};
  });
  assert.equal(call[0], process.execPath);
  assert.ok(call[1].includes('--go'));
  assert.equal(call[2].shell, undefined);
  assert.equal(call[2].windowsHide, true);
});
test('shutdown cannot terminate the runner itself', () => {
  stopChild({ pid: process.pid, exitCode: null });
});
