import { available, config, response } from './domain.mjs';
import { validDate } from '../src/lib/config.ts';
export async function GET(req) { try {
    const c = await config();
    const u = new URL(req.url);
    const date = u.searchParams.get('date');
    const service = c.services.find(s => s.id === u.searchParams.get('service'));
    return response({ config: c, slots: date && service && validDate(date) ? await available(date, service.duration) : [] });
}
catch (e) {
    console.error(e);
    return response({ error: 'Não foi possível carregar a agenda. Tente novamente.' }, 503);
} }
