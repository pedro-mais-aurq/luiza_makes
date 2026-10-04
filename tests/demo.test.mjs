import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDemoStore} from '../src/lib/demo.mjs';
import {defaults} from '../src/lib/config.ts';

function fixture() {
  const data = new Map();
  const storage = {getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key)};
  const store = createDemoStore(storage);
  let date;
  for (let n = 2; n < 9; n++) {
    const candidate = new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
    if (defaults.days.includes(new Date(candidate + 'T12:00:00Z').getUTCDay())) {date = candidate; break;}
  }
  const booking = {date, start: 540, service: 'social', name: 'Cliente de teste', phone: '(31) 99999-9999'};
  const post = (path, body) => store.request(path, {method: 'POST', body: JSON.stringify(body)});
  const admin = () => store.request('/api/admin').json();
  const availability = () => store.request('/api/availability?date=' + date + '&service=social').json();
  return {store, storage, booking, post, admin, availability};
}

test('demo: reserva pendente persiste ao reabrir, ocupa intervalos e cria aviso', async () => {
  const f = fixture();
  assert.ok((await f.availability()).slots.includes(540));
  assert.equal(f.post('/api/bookings', f.booking).status, 201);
  assert.equal(f.post('/api/bookings', {...f.booking, start: 570}).status, 400);
  const reopened = createDemoStore(f.storage);
  const {appointments} = await reopened.request('/api/admin').json();
  assert.equal(appointments.length, 1);
  assert.equal(appointments[0].status, 'pending');
  assert.equal(appointments[0].unread, 1);
  assert.equal(appointments[0].phone, '31999999999');
  const available = (await f.availability()).slots;
  assert.ok(!available.includes(540) && !available.includes(570) && !available.includes(600));
  assert.ok(available.includes(630));
});

test('demo: confirmação, conclusão e cancelamento preservam histórico e liberam horários', async () => {
  const f = fixture();
  const {id} = await f.post('/api/bookings', f.booking).json();
  for (const status of ['confirmed', 'completed']) {
    assert.equal(f.post('/api/admin', {action: 'status', id, status}).status, 200);
    assert.equal((await f.admin()).appointments[0].status, status);
    assert.ok(!(await f.availability()).slots.includes(540));
  }
  assert.equal(f.post('/api/admin', {action: 'status', id, status: 'cancelled'}).status, 200);
  assert.equal((await f.admin()).appointments[0].status, 'cancelled');
  assert.ok((await f.availability()).slots.includes(540));
  assert.equal(f.post('/api/admin', {action: 'status', id, status: 'confirmed'}).status, 400);
});

test('demo: bloqueios impedem reservas e só podem ser liberados', async () => {
  const f = fixture();
  const block = f.post('/api/admin', {...f.booking, action: 'reserve', kind: 'block', duration: 60});
  assert.equal(block.status, 201);
  const {id} = await block.json();
  assert.equal((await f.admin()).appointments[0].status, 'blocked');
  assert.equal(f.post('/api/bookings', f.booking).status, 400);
  assert.equal(f.post('/api/admin', {action: 'status', id, status: 'confirmed'}).status, 400);
  assert.equal(f.post('/api/admin', {action: 'status', id, status: 'cancelled'}).status, 200);
  assert.equal(f.post('/api/bookings', f.booking).status, 201);
});

test('demo: preferências e avisos persistem; reiniciar restaura base vazia', async () => {
  const f = fixture();
  f.post('/api/bookings', f.booking);
  f.post('/api/admin', {action: 'read'});
  assert.equal((await f.admin()).appointments[0].unread, 0);
  const config = {...structuredClone(defaults), open: 660, notice: 0};
  assert.equal(f.post('/api/admin', {action: 'config', config}).status, 200);
  assert.ok(!(await f.availability()).slots.includes(540));
  assert.equal((await createDemoStore(f.storage).request('/api/admin').json()).config.open, 660);
  f.store.reset();
  const fresh = await f.admin();
  assert.equal(fresh.appointments.length, 0);
  assert.deepEqual(fresh.config, defaults);
});

test('demo: dados inválidos e armazenamento cheio não produzem falso sucesso', async () => {
  const f = fixture();
  assert.equal(f.post('/api/bookings', {...f.booking, phone: '123'}).status, 400);
  assert.equal(f.post('/api/admin', {action: 'config', config: {...defaults, close: 500}}).status, 400);
  assert.equal((await f.admin()).appointments.length, 0);
  f.storage.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
  const failing = createDemoStore(f.storage).request('/api/bookings', {method: 'POST', body: JSON.stringify(f.booking)});
  assert.equal(failing.status, 400);
  assert.match((await failing.json()).error, /não permitiu salvar/);
  assert.equal((await f.admin()).appointments.length, 0);
});

test('demo: atendimentos registrados no painel entram confirmados sem notificação', async () => {
  const f = fixture();
  assert.equal(f.post('/api/admin', {...f.booking, action: 'reserve', kind: 'booking'}).status, 201);
  const {appointments} = await f.admin();
  assert.equal(appointments[0].status, 'confirmed');
  assert.equal(appointments[0].unread, 0);
});
