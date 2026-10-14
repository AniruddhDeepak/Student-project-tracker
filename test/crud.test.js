import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const directory = mkdtempSync(join(tmpdir(), 'student-project-tracker-'));
const databaseFile = join(directory, 'projects.db');

async function findAvailablePort() {
  const listener = createServer();
  await new Promise((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', resolve);
  });
  const { port } = listener.address();
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  return port;
}

const port = await findAvailablePort();
const origin = `http://127.0.0.1:${port}`;
let server;
let serverOutput = '';

async function startServer() {
  server = spawn(process.execPath, ['server.js'], {
    cwd: process.cwd(),
    env: { ...process.env, DB_FILE: databaseFile, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.setEncoding('utf8').on('data', text => { serverOutput += text; });
  server.stderr.setEncoding('utf8').on('data', text => { serverOutput += text; });

  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) {
      throw new Error(`Server exited before becoming ready.\n${serverOutput}`);
    }
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  throw new Error(`Server did not start.\n${serverOutput}`);
}

async function stopServer() {
  if (!server || server.exitCode !== null) return;
  await new Promise(resolve => {
    server.once('exit', resolve);
    server.kill();
  });
}

function jsonRequest(method, body) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

test('SQLite-backed API supports CRUD, validation, persistence, and frontend delivery', async () => {
  try {
    await startServer();
    assert.deepEqual(await (await fetch(`${origin}/api/projects`)).json(), []);

    assert.equal((await fetch(`${origin}/api/projects`, jsonRequest('POST', {
      name: ' ',
      status: 'Planned'
    }))).status, 400);
    assert.equal((await fetch(`${origin}/api/projects`, jsonRequest('POST', {
      name: 'IoT',
      status: 'Unknown'
    }))).status, 400);
    assert.equal((await fetch(`${origin}/api/projects`, jsonRequest('POST', {
      name: 'x'.repeat(81),
      status: 'Planned'
    }))).status, 400);

    const createdResponse = await fetch(`${origin}/api/projects`, jsonRequest('POST', {
      name: "  IoT Monitor's test  ",
      status: 'Planned'
    }));
    assert.equal(createdResponse.status, 201);
    const created = await createdResponse.json();
    assert.equal(created.name, "IoT Monitor's test");
    assert.equal(created.status, 'Planned');
    assert.equal(typeof created.id, 'number');

    const updatedResponse = await fetch(
      `${origin}/api/projects/${created.id}`,
      jsonRequest('PUT', { name: 'Smart Home', status: 'Completed' })
    );
    assert.equal(updatedResponse.status, 200);
    assert.deepEqual(await updatedResponse.json(), {
      id: created.id,
      name: 'Smart Home',
      status: 'Completed'
    });

    await stopServer();
    await startServer();
    assert.deepEqual(await (await fetch(`${origin}/api/projects`)).json(), [{
      id: created.id,
      name: 'Smart Home',
      status: 'Completed'
    }]);

    assert.equal((await fetch(`${origin}/api/projects/0`, { method: 'DELETE' })).status, 400);
    assert.equal((await fetch(
      `${origin}/api/projects/999999`,
      jsonRequest('PUT', { name: 'Missing', status: 'Planned' })
    )).status, 404);
    assert.equal((await fetch(`${origin}/api/projects/${created.id}`, {
      method: 'DELETE'
    })).status, 200);
    assert.equal((await fetch(`${origin}/api/projects/${created.id}`, {
      method: 'DELETE'
    })).status, 404);
    assert.equal((await fetch(`${origin}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{'
    })).status, 400);
    assert.equal((await fetch(`${origin}/api/unknown`)).status, 404);
    assert.match(await (await fetch(`${origin}/`)).text(), /Student Project Tracker/);
    assert.deepEqual(await (await fetch(`${origin}/api/projects`)).json(), []);
  } finally {
    await stopServer();
    rmSync(directory, { recursive: true, force: true });
  }
});
