import { db, reserve, response, sameOrigin } from './domain.mjs';
export async function POST(req) { if (!sameOrigin(req))
    return response({ error: 'Solicitação inválida.' }, 403); if (Number(req.headers.get('content-length')) > 8000)
    return response({ error: 'Dados muito longos.' }, 413); try {
    const b = await req.json();
    if (b.website)
        return response({ error: 'Solicitação inválida.' }, 400);
    const ip = req.headers.get('cf-connecting-ip') || 'unknown';
    const raw = new TextEncoder().encode(ip);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', raw))).map(v => v.toString(16).padStart(2, '0')).join('');
    const key = hash + ':' + Math.floor(Date.now() / 3600000);
    const n = await db().prepare('INSERT INTO limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key, Date.now() + 3600000).first();
    if (n && n.count > 8)
        return response({ error: 'Muitas solicitações. Tente novamente mais tarde.' }, 429);
    await db().prepare('DELETE FROM limits WHERE expires < ?').bind(Date.now()).run();
    return response(await reserve(b), 201);
}
catch (e) {
    return response({ error: e instanceof Error ? e.message : 'Não foi possível reservar.' }, 400);
} }
