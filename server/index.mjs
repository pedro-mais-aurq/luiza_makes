import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sqlite} from './db.mjs';
import {legacyRouteTarget} from '../src/lib/routes.mjs';
import {GET as availability} from './availability.mjs';
import {POST as bookings} from './bookings.mjs';
import {GET as adminGet,POST as adminPost} from './admin.mjs';
import {response} from './domain.mjs';
import {allowedOrigins,sameOrigin,isAdmin,verifyPassword,createSession,tokenHash} from './security.mjs';
const defaultRoot=resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
async function login(request,ip){if(!sameOrigin(request))return response({error:'Origem não autorizada.'},403);if(!process.env.ADMIN_PASSWORD_HASH)return response({error:'A senha administrativa ainda não foi configurada no servidor.'},503);const key='login:'+tokenHash(ip)+':'+Math.floor(Date.now()/900000);const count=sqlite.prepare('INSERT INTO limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').get(key,Date.now()+900000).count;sqlite.prepare('DELETE FROM limits WHERE expires < ?').run(Date.now());if(count>10)return response({error:'Muitas tentativas. Aguarde 15 minutos.'},429);const {password}=await request.json();if(!verifyPassword(password,process.env.ADMIN_PASSWORD_HASH))return response({error:'Senha incorreta.'},401);return response({token:createSession()});}
export function createServer({staticDirectory=defaultRoot}={}){const root=resolve(staticDirectory);return http.createServer(async(req,res)=>{const origin=req.headers.origin;const cors=origin&&allowedOrigins().has(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'}:{};const security={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY',...cors};const send=async r=>{res.writeHead(r.status,{...security,...Object.fromEntries(r.headers)});res.end(Buffer.from(await r.arrayBuffer()));};try{
 const url=new URL(req.url,'http://'+(req.headers.host||'localhost'));
 if(req.method==='OPTIONS'){res.writeHead(origin&&allowedOrigins().has(origin)?204:403,security);res.end();return;}
 if(url.pathname.startsWith('/api/')){
  if(!['GET','POST'].includes(req.method))return send(response({error:'Método não permitido.'},405));
  if(req.method==='POST'&&!sameOrigin(new Request(url,{headers:req.headers})))return send(response({error:'Origem não autorizada.'},403));
  const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>16384)return send(response({error:'Dados muito longos.'},413));chunks.push(chunk);}
  const headers=new Headers(req.headers);headers.set('cf-connecting-ip',req.socket.remoteAddress||'unknown');
  const request=new Request(url,{method:req.method,headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})});
  if(req.method==='POST'&&!['/api/logout'].includes(url.pathname)&&!request.headers.get('content-type')?.includes('application/json'))return send(response({error:'Envie os dados em JSON.'},415));
  if(url.pathname==='/api/availability'&&req.method==='GET')return send(await availability(request));
  if(url.pathname==='/api/bookings'&&req.method==='POST')return send(await bookings(request));
  if(url.pathname==='/api/login'&&req.method==='POST')return send(await login(request,req.socket.remoteAddress||'unknown'));
  if(url.pathname==='/api/session'&&req.method==='GET')return send(isAdmin(request)?response({ok:true}):response({error:'Entre no painel.'},401));
  if(url.pathname==='/api/logout'&&req.method==='POST'){const token=request.headers.get('authorization')?.replace(/^Bearer /,'');if(token)sqlite.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token));return send(response({ok:true}));}
  if(url.pathname==='/api/admin')return send(req.method==='GET'?await adminGet(request):await adminPost(request));
  return send(response({error:'Endpoint não encontrado.'},404));
 }
 if(!['GET','HEAD'].includes(req.method))return send(response({error:'Método não permitido.'},405));
 let pathname=decodeURIComponent(url.pathname);const base=process.env.BASE_PATH||'/';const target=legacyRouteTarget(pathname,url.search,base);if(target){res.writeHead(302,{...security,'Location':target,'Cache-Control':'no-store'});res.end();return;}if(base!=='/'&&pathname.startsWith(base))pathname='/'+pathname.slice(base.length);
 const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!path.startsWith(root+sep))return send(response({error:'Acesso negado.'},403));
 try{if(!(await stat(path)).isFile())throw new Error();const bytes=await readFile(path);const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.json':'application/json','.woff2':'font/woff2'}[extname(path)]||'application/octet-stream';res.writeHead(200,{...security,'Content-Type':type,'Cache-Control':pathname.includes('/assets/')?'public, max-age=31536000, immutable':'no-cache'});res.end(req.method==='HEAD'?undefined:bytes);}catch{return send(response({error:'Arquivo não encontrado. Execute npm run build para servir o site.'},404));}
 }catch(e){console.error('Request failed:',e.message);await send(response({error:'Não foi possível processar a solicitação.'},400));}});}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT||3001);const host=process.env.HOST||'127.0.0.1';const server=createServer();server.listen(port,host,()=>{console.log(`Luíza Araújo: http://${host}:${port}`);console.log('Banco SQLite:',resolve(process.env.DB_PATH||'./data/luiza.sqlite'));if(!process.env.ADMIN_PASSWORD_HASH)console.log('Configure a senha com npm run admin:password para acessar o painel.');});for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(()=>{sqlite.close();process.exit(0)}));}
