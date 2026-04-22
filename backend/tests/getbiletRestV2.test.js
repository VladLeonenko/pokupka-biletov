import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { jwtExpMs } from '../services/getbiletRestV2.js';

describe('getbiletRestV2', () => {
  it('jwtExpMs reads exp from JWT', () => {
    // header.payload.sig — payload {"exp":1700000000}
    const payload = Buffer.from(JSON.stringify({ exp: 1700000000 })).toString('base64url');
    const token = `x.${payload}.y`;
    const ms = jwtExpMs(token);
    assert.equal(ms, 1700000000 * 1000);
  });

  it('jwtExpMs returns null for garbage', () => {
    assert.equal(jwtExpMs('not-a-jwt'), null);
  });
});
