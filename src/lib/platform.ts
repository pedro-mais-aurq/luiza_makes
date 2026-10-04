const base=import.meta.env.BASE_URL;
const endpoint=(import.meta.env.VITE_API_URL||'').replace(/\/$/,'');
export const home=base;
export const asset=(path:string)=>base+path.replace(/^\//,'');
export async function apiFetch(path:string,init:RequestInit={}){
 if(!endpoint&&(import.meta.env.VITE_STATIC_HOST==='true'||location.hostname.endsWith('github.io')))throw new Error('A agenda ainda não está conectada. Configure a URL do servidor para receber reservas.');
 const headers=new Headers(init.headers);const token=sessionStorage.getItem('luiza-admin-session');if(token)headers.set('Authorization','Bearer '+token);
 const response=await fetch(endpoint+path,{...init,headers,credentials:'omit'});
 if(response.status===401){sessionStorage.removeItem('luiza-admin-session');window.dispatchEvent(new Event('luiza-session-expired'));}
 return response;
}
export async function logout(e?:React.MouseEvent){e?.preventDefault();try{await apiFetch('/api/logout',{method:'POST'});}finally{sessionStorage.removeItem('luiza-admin-session');window.dispatchEvent(new Event('luiza-session-expired'));location.hash='/admin';}}
