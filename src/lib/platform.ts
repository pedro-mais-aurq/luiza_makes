const base=import.meta.env.BASE_URL;
const endpoint=(import.meta.env.VITE_API_URL||'').replace(/\/$/,'');
export const isDemo=import.meta.env.VITE_STORAGE_MODE==='demo'||(!endpoint&&import.meta.env.VITE_STORAGE_MODE!=='server');
let demoStore:ReturnType<typeof import('./demo.mjs').createDemoStore>|undefined;
async function localStore(){if(!demoStore){const {createDemoStore,DEMO_KEY}=await import('./demo.mjs');demoStore=createDemoStore(localStorage,DEMO_KEY+':'+base);}return demoStore;}
export async function resetDemo(){if(!isDemo)return;await (await localStore()).reset();window.dispatchEvent(new Event('luiza-demo-changed'));}
export const home=base;
export const asset=(path:string)=>base+path.replace(/^\//,'');
export async function apiFetch(path:string,init:RequestInit={}){
 if(isDemo){init.signal?.throwIfAborted();const store=await localStore();const run=()=>{init.signal?.throwIfAborted();const r=store.request(path,init);if(r.ok&&(init.method||'GET').toUpperCase()==='POST')window.dispatchEvent(new Event('luiza-demo-changed'));return r;};return navigator.locks?await navigator.locks.request('luiza-demo:'+base,run):run();}
 if(!endpoint&&(import.meta.env.VITE_STATIC_HOST==='true'||location.hostname.endsWith('github.io')))throw new Error('A agenda ainda não está conectada. Configure a URL do servidor para receber reservas.');
 const headers=new Headers(init.headers);const token=sessionStorage.getItem('luiza-admin-session');if(token)headers.set('Authorization','Bearer '+token);
 const response=await fetch(endpoint+path,{...init,headers,credentials:'omit'});
 if(response.status===401){sessionStorage.removeItem('luiza-admin-session');window.dispatchEvent(new Event('luiza-session-expired'));}
 return response;
}
export async function logout(e?:React.MouseEvent){e?.preventDefault();if(isDemo){location.href=home;return;}try{await apiFetch('/api/logout',{method:'POST'});}finally{sessionStorage.removeItem('luiza-admin-session');window.dispatchEvent(new Event('luiza-session-expired'));location.hash='/admin';}}
