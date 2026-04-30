import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTbankEacqToken,
  isTbankEacqConfigured,
  verifyTbankNotificationToken,
} from '../services/payment/tbankEacq.js';

const saved = { ...process.env };

function restoreEnv() {
  process.env = { ...saved };
}

describe('tbankEacq', () => {
  beforeEach(() => {
    process.env = { ...saved };
  });
  afterEach(restoreEnv);

  it('accepts TBANK_KEY as password alias', () => {
    process.env.TBANK_TERMINAL_KEY = '1777563012175DEMO';
    delete process.env.TBANK_PASSWORD;
    process.env.TBANK_KEY = 'secret';

    assert.equal(isTbankEacqConfigured(), true);
  });

  it('builds token from flat root fields and ignores nested objects', () => {
    const root = {
      TerminalKey: '1777563012175DEMO',
      Amount: '10000',
      OrderId: 'ORD-1',
      Description: 'Оплата билетов',
      DATA: { Email: 'customer@example.com' },
      Receipt: { Email: 'receipt@example.com' },
    };

    const token = buildTbankEacqToken(root, 'secret');
    const tokenWithOtherNestedFields = buildTbankEacqToken(
      { ...root, DATA: { Email: 'other@example.com' }, Receipt: { Email: 'other@example.com' } },
      'secret',
    );
    const tokenWithOtherAmount = buildTbankEacqToken({ ...root, Amount: '20000' }, 'secret');

    assert.equal(token, tokenWithOtherNestedFields);
    assert.notEqual(token, tokenWithOtherAmount);
  });

  it('verifies notification token with TBANK_KEY', () => {
    process.env.TBANK_TERMINAL_KEY = '1777563012175DEMO';
    delete process.env.TBANK_PASSWORD;
    process.env.TBANK_KEY = 'secret';

    const body = {
      TerminalKey: '1777563012175DEMO',
      OrderId: 'ORD-1',
      Success: true,
      Status: 'CONFIRMED',
      PaymentId: '123',
    };
    const Token = buildTbankEacqToken(body, 'secret');

    assert.equal(verifyTbankNotificationToken({ ...body, Token }), true);
    assert.equal(verifyTbankNotificationToken({ ...body, Token: 'bad' }), false);
  });
});
