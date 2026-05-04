import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRestAuthHeaders,
  buildBil24Body,
  getGetbiletConfig,
  GetbiletConfigError,
} from '../services/getbiletClient.js';

const saved = { ...process.env };

function restoreEnv() {
  process.env = { ...saved };
}

describe('getbiletClient', () => {
  beforeEach(() => {
    process.env = { ...saved };
  });
  afterEach(restoreEnv);

  it('getGetbiletConfig uses defaults', () => {
    delete process.env.GETBILET_API_BASE;
    delete process.env.GETBILET_PROTOCOL;
    delete process.env.GETBILET_USER_ID;
    delete process.env.GETBILET_HASH;
    delete process.env.GETBILET_HASH_ID;
    const c = getGetbiletConfig();
    assert.equal(c.baseUrl, 'https://api.getbilet.ru');
    assert.equal(c.protocol, 'bil24_json');
  });

  it('getGetbiletConfig rest_v2', () => {
    process.env.GETBILET_PROTOCOL = 'rest_v2';
    const c = getGetbiletConfig();
    assert.equal(c.protocol, 'rest_v2');
  });

  it('getGetbiletConfig auto → rest_v2 при UserId+Hash', () => {
    process.env.GETBILET_PROTOCOL = 'auto';
    process.env.GETBILET_USER_ID = 'u1';
    process.env.GETBILET_HASH = 'h1';
    const c = getGetbiletConfig();
    assert.equal(c.protocol, 'rest_v2');
  });

  it('getGetbiletConfig auto → bil24 без v2-кредов', () => {
    process.env.GETBILET_PROTOCOL = 'auto';
    delete process.env.GETBILET_USER_ID;
    delete process.env.GETBILET_HASH;
    delete process.env.GETBILET_HASH_ID;
    const c = getGetbiletConfig();
    assert.equal(c.protocol, 'bil24_json');
  });

  it('buildRestAuthHeaders: Bearer без secret', () => {
    process.env.GETBILET_API_KEY = 'tok';
    delete process.env.GETBILET_API_SECRET;
    process.env.GETBILET_AUTH_MODE = 'auto';
    const h = buildRestAuthHeaders();
    assert.equal(h.Authorization, 'Bearer tok');
  });

  it('buildRestAuthHeaders: Basic при auto + secret', () => {
    process.env.GETBILET_API_KEY = 'k';
    process.env.GETBILET_API_SECRET = 's';
    process.env.GETBILET_AUTH_MODE = 'auto';
    const h = buildRestAuthHeaders();
    assert.equal(h.Authorization, 'Basic ' + Buffer.from('k:s', 'utf8').toString('base64'));
  });

  it('buildBil24Body требует fid и token', () => {
    process.env.GETBILET_API_KEY = 'tok';
    process.env.GETBILET_INTERFACE_FID = '1185';
    const b = buildBil24Body('GET_CITIES', {});
    assert.equal(b.command, 'GET_CITIES');
    assert.equal(b.token, 'tok');
    assert.equal(b.fid, 1185);
  });

  it('buildBil24Body без ключа — ошибка', () => {
    delete process.env.GETBILET_API_KEY;
    process.env.GETBILET_INTERFACE_FID = '1';
    assert.throws(() => buildBil24Body('GET_CITIES', {}), GetbiletConfigError);
  });
});
