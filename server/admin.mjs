import { isAdmin, db, config, response, reserve, sameOrigin } from './domain.mjs';
export async function GET(req) { try {
    if (!await isAdmin(req))
        return response({ error: 'Sua sessão expirou. Entre novamente.' }, 401);
    const { results } = await db().prepare('SELECT * FROM appointments ORDER BY date,start').all();
    return response({ appointments: results, config: await config() });
}
catch (e) {
    console.error(e);
    return response({ error: 'Não foi possível carregar o painel.' }, 503);
} }
export async function POST(req) {
    if (!sameOrigin(req))
        return response({ error: 'Solicitação inválida.' }, 403);
    try {
        if (!await isAdmin(req))
            return response({ error: 'Acesso restrito.' }, 403);
        const b = await req.json();
        if (b.action === 'reserve')
            return response(await reserve(b, true), 201);
        if (b.action === 'read') {
            await db().prepare('UPDATE appointments SET unread = 0 WHERE unread = 1').run();
            return response({ ok: true });
        }
        if (b.action === 'config') {
            const c = b.config;
            if (!c || !Number.isInteger(c.open) || !Number.isInteger(c.close) || c.open < 0 || c.close > 1440 || c.open >= c.close || c.open % 30 || c.close % 30 || !Array.isArray(c.days) || c.days.some(x => !Number.isInteger(x) || x < 0 || x > 6) || !Number.isInteger(c.notice) || c.notice < 0 || c.notice > 10080 || !Array.isArray(c.services) || c.services.length < 1 || c.services.length > 10 || c.services.some(s => !s.id || !s.name || s.name.length > 100 || !Number.isInteger(s.duration) || s.duration < 30 || s.duration > 600 || s.duration % 30) || new Set(c.services.map(s => s.id)).size !== c.services.length)
                throw new Error('Confira os horários e as durações (múltiplos de 30 minutos).');
            await db().prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('config', JSON.stringify(c)).run();
            return response({ ok: true });
        }
        if (b.action === 'status') {
            if (!['confirmed', 'completed', 'cancelled'].includes(b.status))
                throw new Error('Status inválido.');
            const row = await db().prepare('SELECT status FROM appointments WHERE id = ?').bind(b.id).first();
            if (!row)
                throw new Error('Agendamento não encontrado.');
            if (row.status === 'cancelled')
                throw new Error('Este agendamento já foi cancelado.');
            if (row.status === 'blocked' && b.status !== 'cancelled')
                throw new Error('Um bloqueio só pode ser liberado.');
            const statements = [db().prepare('UPDATE appointments SET status = ?,unread = 0 WHERE id = ?').bind(b.status, b.id)];
            if (b.status === 'cancelled')
                statements.push(db().prepare('DELETE FROM occupancy WHERE appointment_id = ?').bind(b.id));
            await db().batch(statements);
            return response({ ok: true });
        }
        throw new Error('Ação inválida.');
    }
    catch (e) {
        console.error(e);
        return response({ error: e instanceof Error ? e.message : 'Não foi possível salvar.' }, 400);
    }
}
