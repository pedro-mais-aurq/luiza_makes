import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes,scryptSync} from 'node:crypto';
const temp=mkdtempSync(join(tmpdir(),'luiza-test-'));const staticDirectory=join(temp,'dist');mkdirSync(join(staticDirectory,'assets'),{recursive:true});writeFileSync(join(staticDirectory,'index.html'),'<!doctype html><html><body>Luíza route fixture</body></html>');writeFileSync(join(staticDirectory,'assets','app.js'),'console.log("route fixture")');process.env.DB_PATH=join(temp,'test.sqlite');
const password='Only-for-tests-'+randomBytes(12).toString('hex');const salt=randomBytes(16).toString('hex');process.env.ADMIN_PASSWORD_HASH='scrypt:'+salt+':'+scryptSync(password,salt,64).toString('hex');process.env.ALLOWED_ORIGINS='http://localhost:5173';
const {createServer}=await import('../server/index.mjs');const {sqlite,openDatabase}=await import('../server/db.mjs');
let server,base,token;
const date=(()=>{const d=new Date(Date.now()+7*86400000);while([0,6].includes(d.getUTCDay()))d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10)})();
async function call(path,body,admin=false,origin='http://localhost:5173'){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(admin?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json(),headers:r.headers};}
test.before(async()=>{server=createServer({staticDirectory});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;});
test.after(async()=>{await new Promise(resolve=>server.close(resolve));sqlite.close();rmSync(temp,{recursive:true,force:true});});
test('login seguro, origem autorizada e sessão revogável',async()=>{
 assert.equal((await call('/api/admin')).status,401);
 const rejected=await fetch(base+'/api/admin',{headers:{'oai-authenticated-user-email':'admin@example.com'}});assert.equal(rejected.status,401);
 assert.equal((await call('/api/login',{password},false,'https://attacker.example')).status,403);
 assert.equal((await call('/api/login',{password:'incorrect'})).status,401);
 const result=await call('/api/login',{password});assert.equal(result.status,200);token=result.data.token;assert.equal(token.length,64);
 assert.equal((await call('/api/admin',null,true)).status,200);
 assert.equal((await call('/api/session',null,true)).status,200);
 assert.equal((await call('/api/admin',null,true)).headers.get('access-control-allow-origin'),'http://localhost:5173');
});
let booked;
test('duas solicitações concorrentes não reservam o mesmo horário',async()=>{
 const result=await call(`/api/availability?date=${date}&service=social`);assert.equal(result.status,200);assert(result.data.slots.includes(540));
 const body={date,start:540,service:'social',name:'Cliente teste',phone:'31987654321'};
 const results=await Promise.all([call('/api/bookings',body),call('/api/bookings',body)]);assert.deepEqual(results.map(x=>x.status).sort(),[201,400]);booked=results.find(x=>x.status===201).data;
 assert.equal(sqlite.prepare('SELECT count(*) AS n FROM appointments').get().n,1);
 assert.equal(sqlite.prepare('SELECT count(*) AS n FROM occupancy').get().n,3);
 const slots=(await call(`/api/availability?date=${date}&service=social`)).data.slots;
 assert(!slots.includes(540)&&!slots.includes(570)&&!slots.includes(600));
});
test('bloqueios ocupam todos os intervalos e podem ser liberados',async()=>{
 const blocked=await call('/api/admin',{action:'reserve',kind:'block',date,start:660,duration:120,name:'Compromisso pessoal'},true);assert.equal(blocked.status,201);
 let slots=(await call(`/api/availability?date=${date}&service=social`)).data.slots;assert(!slots.includes(630)&&!slots.includes(660)&&!slots.includes(750));
 assert.equal((await call('/api/admin',{action:'status',id:blocked.data.id,status:'confirmed'},true)).status,400);
 assert.equal((await call('/api/admin',{action:'status',id:blocked.data.id,status:'cancelled'},true)).status,200);
 slots=(await call(`/api/availability?date=${date}&service=social`)).data.slots;assert(slots.includes(660));
});
test('confirmação, notificações, cancelamento e persistência',async()=>{
 assert.equal((await call('/api/admin',null,true)).data.appointments.find(x=>x.id===booked.id).unread,1);
 assert.equal((await call('/api/admin',{action:'status',id:booked.id,status:'confirmed'},true)).status,200);
 assert.equal((await call('/api/admin',{action:'status',id:booked.id,status:'cancelled'},true)).status,200);
 assert((await call(`/api/availability?date=${date}&service=social`)).data.slots.includes(540));
 assert.equal(sqlite.prepare('SELECT status FROM appointments WHERE id = ?').get(booked.id).status,'cancelled');
 const reopened=openDatabase(process.env.DB_PATH);assert.equal(reopened.prepare('SELECT status FROM appointments WHERE id = ?').get(booked.id).status,'cancelled');reopened.close();
 const c=(await call('/api/admin',null,true)).data.config;c.open=600;
 assert.equal((await call('/api/admin',{action:'config',config:c},true)).status,200);
 assert.equal((await call('/api/availability')).data.config.open,600);
 assert.equal((await call('/api/admin',{action:'read'},true)).status,200);
 assert.equal((await call('/api/logout',{},true)).status,200);
 assert.equal((await call('/api/admin',null,true)).status,401);
});
test('dados incompletos e datas inválidas são recusados',async()=>{
 assert.equal((await call('/api/bookings',{date,start:600,service:'social',name:'A',phone:'12'})).status,400);
 assert.equal((await call('/api/bookings',{date:'2026-99-99',start:600,service:'social',name:'Cliente teste',phone:'31987654321'})).status,400);
 assert.equal((await call('/api/bookings',{date,start:600,service:'social',name:'Cliente teste',phone:'31987654321',website:'spam'})).status,400);
});

test('rotas locais diretas, recarregamento e arquivos da aplicação',async()=>{
 for(const path of ['/admin','/admin/','/agendar?servico=noiva']){
  const response=await fetch(base+path,{redirect:'manual'});assert.equal(response.status,302);
  const target=path.startsWith('/admin')?'/#/admin':'/#/agendar?servico=noiva';assert.equal(response.headers.get('location'),target);
  const page=await fetch(new URL(target,base));assert.equal(page.status,200);assert.match(page.headers.get('content-type'),/text\/html/);assert.match(await page.text(),/Luíza route fixture/);
 }
 const asset=await fetch(base+'/assets/app.js');assert.equal(asset.status,200);assert.match(asset.headers.get('content-type'),/javascript/);
 assert.equal((await fetch(base+'/missing.js')).status,404);
 assert.equal((await fetch(base+'/.env.local')).status,404);
 const original=process.env.BASE_PATH;process.env.BASE_PATH='/luiza/';
 try{const direct=await fetch(base+'/luiza/admin',{redirect:'manual'});assert.equal(direct.status,302);assert.equal(direct.headers.get('location'),'/luiza/#/admin');assert.equal((await fetch(base+'/luiza/')).status,200);}finally{if(original===undefined)delete process.env.BASE_PATH;else process.env.BASE_PATH=original;}
});
