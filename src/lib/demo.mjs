import {defaults, validDate, upcomingDate} from './config.ts';

export const DEMO_KEY = 'luiza-agenda-demo-v1';
const json = (data, status = 200) => Response.json(data, {status});
const empty = () => ({version: 1, config: structuredClone(defaults), appointments: []});

/** Browser-only demonstration. No network requests or real authentication. */
export function createDemoStore(storage, key = DEMO_KEY) {
  function load() {
    const raw = storage.getItem(key);
    if (!raw) return empty();
    const state = JSON.parse(raw);
    if (state.version !== 1 || !state.config || !Array.isArray(state.appointments))
      throw new Error('Os dados da demonstração não puderam ser lidos. Reinicie a demonstração nas preferências.');
    return state;
  }
  function save(state) {
    // Commit before reporting success: a full/disabled storage must never pretend to save.
    storage.setItem(key, JSON.stringify(state));
  }
  function slots(state, date, duration) {
    const c = state.config;
    if (!validDate(date) || !c.days.includes(new Date(date + 'T12:00:00Z').getUTCDay())) return [];
    const busy = state.appointments.filter(a => a.date === date && a.status !== 'cancelled');
    const free = [];
    for (let start = c.open; start + duration <= c.close; start += 30)
      if (upcomingDate(date, start, c.notice) && !busy.some(a => start < a.start + a.duration && start + duration > a.start)) free.push(start);
    return free;
  }
  function reserve(state, body, admin) {
    const block = admin && body.kind === 'block';
    const service = state.config.services.find(s => s.id === body.service);
    const duration = block ? Number(body.duration) : service?.duration;
    const date = body.date, start = Number(body.start);
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.replace(/\D/g, '') : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 1500) : '';
    if (!validDate(date) || !Number.isInteger(start) || start % 30 || start < 0 || !Number.isInteger(duration) || duration < 30 || duration > 1440 || duration % 30 || start + duration > 1440)
      throw new Error('Confira a data e o horário.');
    if (!block && (!service || name.length < 2 || name.length > 120 || !/^(?:55)?\d{10,11}$/.test(phone)))
      throw new Error('Preencha seu nome e um WhatsApp com DDD válido.');
    if (!block && !slots(state, date, duration).includes(start))
      throw new Error('Este horário não está mais disponível. Escolha outro.');
    if (block && !upcomingDate(date, start)) throw new Error('Escolha um horário futuro.');
    if (state.appointments.some(a => a.date === date && a.status !== 'cancelled' && start < a.start + a.duration && start + duration > a.start))
      throw new Error('O horário foi reservado ou bloqueado. Escolha outro.');
    const row = {id: crypto.randomUUID(), date, start, duration, name: block ? name || 'Horário bloqueado' : name,
      phone: block ? '' : phone, service: block ? 'block' : service.name, notes,
      status: block ? 'blocked' : admin ? 'confirmed' : 'pending', unread: admin ? 0 : 1, created_at: new Date().toISOString()};
    state.appointments.push(row);
    save(state);
    return json({id: row.id, date, start, duration, service: row.service}, 201);
  }
  function validateConfig(c) {
    if (!c || !Number.isInteger(c.open) || !Number.isInteger(c.close) || c.open < 0 || c.close > 1440 || c.open >= c.close || c.open % 30 || c.close % 30 ||
        !Array.isArray(c.days) || c.days.some(x => !Number.isInteger(x) || x < 0 || x > 6) || !Number.isInteger(c.notice) || c.notice < 0 || c.notice > 10080 ||
        !Array.isArray(c.services) || c.services.length < 1 || c.services.length > 10 ||
        c.services.some(s => typeof s.id !== 'string' || !s.id || typeof s.name !== 'string' || !s.name.trim() || s.name.length > 100 || !Number.isInteger(s.duration) || s.duration < 30 || s.duration > 600 || s.duration % 30) ||
        new Set(c.services.map(s => s.id)).size !== c.services.length)
      throw new Error('Confira os horários e as durações (múltiplos de 30 minutos).');
  }
  return {
    request(path, init = {}) {
      try {
        const u = new URL(path, 'https://demo.local');
        const method = (init.method || 'GET').toUpperCase();
        if (u.pathname === '/api/session' && method === 'GET') return json({demo: true});
        if (u.pathname === '/api/logout' && method === 'POST') return json({ok: true});
        const state = load();
        if (u.pathname === '/api/availability' && method === 'GET') {
          const service = state.config.services.find(s => s.id === u.searchParams.get('service'));
          return json({config: state.config, slots: service ? slots(state, u.searchParams.get('date'), service.duration) : []});
        }
        if (u.pathname === '/api/admin' && method === 'GET')
          return json({config: state.config, appointments: state.appointments.sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start)});
        if (method !== 'POST') return json({error: 'Operação indisponível na demonstração.'}, 404);
        const body = JSON.parse(init.body || '{}');
        if (u.pathname === '/api/bookings') {
          if (body.website) throw new Error('Solicitação inválida.');
          return reserve(state, body, false);
        }
        if (u.pathname !== '/api/admin') return json({error: 'Operação indisponível na demonstração.'}, 404);
        if (body.action === 'reserve') return reserve(state, body, true);
        if (body.action === 'read') state.appointments.forEach(a => { a.unread = 0; });
        else if (body.action === 'config') { validateConfig(body.config); state.config = body.config; }
        else if (body.action === 'status') {
          if (!['confirmed', 'completed', 'cancelled'].includes(body.status)) throw new Error('Status inválido.');
          const row = state.appointments.find(a => a.id === body.id);
          if (!row) throw new Error('Agendamento não encontrado.');
          if (row.status === 'cancelled') throw new Error('Este agendamento já foi cancelado.');
          if (row.status === 'blocked' && body.status !== 'cancelled') throw new Error('Um bloqueio só pode ser liberado.');
          row.status = body.status; row.unread = 0;
        } else throw new Error('Ação inválida.');
        save(state);
        return json({ok: true});
      } catch (error) {
        const storageError = error?.name === 'QuotaExceededError' || error?.name === 'SecurityError';
        return json({error: storageError ? 'O navegador não permitiu salvar os dados. Libere o armazenamento deste site e tente novamente.' : error instanceof Error ? error.message : 'Não foi possível salvar a demonstração.'}, 400);
      }
    },
    reset() { storage.removeItem(key); }
  };
}
