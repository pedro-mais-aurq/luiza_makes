import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {sqlite} from './db.mjs';
export const tokenHash=t=>createHash('sha256').update(t).digest('hex');
export function verifyPassword(password,encoded){if(typeof password!=='string'||password.length>256||typeof encoded!=='string')return false;const [algorithm,salt,value]=encoded.split(':');if(algorithm!=='scrypt'||!/^\w{32}$/.test(salt||'')||! /^[a-f0-9]{128}$/.test(value||''))return false;const hash=scryptSync(password,salt,64);return timingSafeEqual(hash,Buffer.from(value,'hex'));}
export function isAdmin(request){const token=request.headers.get('authorization')?.replace(/^Bearer /,'');if(!token||!/^[a-f0-9]{64}$/.test(token))return false;const session=sqlite.prepare('SELECT expires FROM sessions WHERE token_hash = ?').get(tokenHash(token));return !!session&&session.expires>Date.now();}
export function createSession(){const token=randomBytes(32).toString('hex');sqlite.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());sqlite.prepare('INSERT INTO sessions VALUES (?,?)').run(tokenHash(token),Date.now()+8*3600000);return token;}
export function allowedOrigins(){return new Set((process.env.ALLOWED_ORIGINS||'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3001,http://127.0.0.1:3001').split(',').map(x=>x.trim()).filter(Boolean));}
export function sameOrigin(req){const origin=req.headers.get('origin');return !!origin&&allowedOrigins().has(origin);}
