import { database } from './db.mjs';
export { isAdmin, sameOrigin } from './security.mjs';
import { defaults, validDate, upcomingDate } from '../src/lib/config.ts';
export function db() { return database; }
export async function config() { const v = await db().prepare('SELECT value FROM settings WHERE key = ?').bind('config').first(); return v ? JSON.parse(v.value) : defaults; }
export function response(data, status = 200) { return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } }); }
export async function available(date, duration) { const c = await config(); if (!validDate(date))
    return []; if (!c.days.includes(new Date(date + 'T12:00:00Z').getUTCDay()))
    return []; const { results } = await db().prepare('SELECT minute FROM occupancy WHERE date = ?').bind(date).all(); const occupied = new Set(results.map(r => r.minute)); const slots = []; for (let m = c.open; m + duration <= c.close; m += 30) {
    if (!upcomingDate(date, m, c.notice))
        continue;
    let free = true;
    for (let k = m; k < m + duration; k += 30)
        if (occupied.has(k))
            free = false;
    if (free)
        slots.push(m);
} return slots; }
export async function reserve(body, admin = false) {
    const c = await config();
    const block = admin && body.kind === 'block';
    const service = c.services.find(s => s.id === body.service);
    const duration = block ? Number(body.duration) : service?.duration;
    const date = body.date;
    const start = Number(body.start);
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.replace(/\D/g, '') : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 1500) : '';
    if (!validDate(date) || !Number.isInteger(start) || start % 30 || start < 0 || !duration || !Number.isInteger(duration) || duration % 30 || duration < 30 || duration > 1440 || start + duration > 1440)
        throw new Error('Confira a data e o horário.');
    if (!block && (!service || name.length < 2 || name.length > 120 || !/^(?:55)?\d{10,11}$/.test(phone)))
        throw new Error('Preencha seu nome e um WhatsApp com DDD válido.');
    if (!block && !(await available(date, duration)).includes(start))
        throw new Error('Este horário não está mais disponível. Escolha outro.');
    if (block && !upcomingDate(date, start))
        throw new Error('Escolha um horário futuro.');
    const id = crypto.randomUUID();
    const statements = [db().prepare('INSERT INTO appointments (id,date,start,duration,name,phone,service,notes,status,unread,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(id, date, start, duration, block ? (name || 'Horário bloqueado') : name, block ? '' : phone, block ? 'block' : service.name, notes, block ? 'blocked' : admin ? 'confirmed' : 'pending', admin ? 0 : 1, new Date().toISOString())];
    for (let m = start; m < start + duration; m += 30)
        statements.push(db().prepare('INSERT INTO occupancy (date,minute,appointment_id) VALUES (?,?,?)').bind(date, m, id));
    try {
        await db().batch(statements);
    }
    catch (e) {
        console.error('Reservation write failed', e);
        throw new Error('O horário foi reservado ou bloqueado. Escolha outro.');
    }
    return { id, date, start, duration, service: service?.name };
}
