const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the actual route without a real SMTP server or database.
const server = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
const start = server.indexOf("api.post('/contact',");
const end = server.indexOf('// ===== ADMIN AUTH =====', start);
assert.ok(start >= 0 && end > start);

async function request({ emailOk = true, allowed = true, honeypot = '' } = {}) {
  let handler;
  const sent = [];
  const response = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  vm.runInNewContext(server.slice(start, end), {
    api: { post(route, callback) { handler = callback; } },
    db: { query() { throw new Error('Contact submissions must not access the database'); } },
    checkRateLimit: () => allowed,
    dbNow: () => '2026-10-07 12:00:00',
    sendContactNotification: async message => { sent.push(message); return { ok: emailOk }; },
  });
  await handler({ ip: '127.0.0.1', body: { name: 'Test', email: 'test@example.com', message: 'Hello', honeypot } }, response);
  return { response, sent };
}

test('contact sends email without saving a message', async () => {
  const { response, sent } = await request();
  assert.equal(response.code, 200);
  assert.equal(response.body.status, 'success');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].message, 'Hello');
  assert.equal(sent[0].created_at, '2026-10-07 12:00:00');
});

test('SMTP failure reports failure without claiming the message was saved', async () => {
  const { response, sent } = await request({ emailOk: false });
  assert.equal(response.code, 500);
  assert.equal(response.body.status, 'error');
  assert.equal(response.body.detail, 'Не удалось отправить сообщение на почту. Попробуйте позже.');
  assert.equal(sent.length, 1);
});

test('honeypot does not send email', async () => {
  const { response, sent } = await request({ honeypot: 'bot' });
  assert.equal(response.code, 200);
  assert.equal(sent.length, 0);
});

test('rate limit blocks email sending', async () => {
  const { response, sent } = await request({ allowed: false });
  assert.equal(response.code, 429);
  assert.equal(sent.length, 0);
});
