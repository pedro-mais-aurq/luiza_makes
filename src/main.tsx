import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import Home from './Home';
import Booking from './Booking';
import AdminPanel from './AdminPanel';
import {apiFetch,home} from './lib/platform';
import './styles.css';
import {legacyRouteTarget} from './lib/routes.mjs';
const directRoute=legacyRouteTarget(location.pathname,location.search,import.meta.env.BASE_URL);
if(directRoute)history.replaceState(null,'',directRoute);
function Admin(){const [state,setState]=useState('loading');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
useEffect(()=>{const check=()=>apiFetch('/api/session').then(r=>setState(r.ok?'ready':'login')).catch(e=>{setError(e.message);setState('login')});check();const expired=()=>setState('login');window.addEventListener('luiza-session-expired',expired);return()=>window.removeEventListener('luiza-session-expired',expired)},[]);
if(state==='ready')return <AdminPanel/>;return <main className="restricted"><a href={home} className="brand">Luíza Araújo<span>ÁREA DA PROFISSIONAL</span></a><div className="login-box"><h1>Seu ateliê.<br/><em>Sua agenda.</em></h1>{state==='loading'?<p>Verificando o acesso…</p>:<form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');const f=new FormData(e.currentTarget);try{const r=await apiFetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:f.get('password')})});const d=await r.json();if(!r.ok)throw new Error(d.error);sessionStorage.setItem('luiza-admin-session',d.token);setState('ready');}catch(e){setError(e instanceof Error?e.message:'Não foi possível acessar.')}finally{setBusy(false)}}}><label className="field">Senha de administração<input name="password" type="password" autoComplete="current-password" required/></label>{error&&<p className="error" role="alert">{error}</p>}<button className="dark-button full" disabled={busy}>{busy?'Entrando…':'Entrar no painel'}</button></form>}</div></main>}
function App(){const [route,setRoute]=useState(location.hash.split('?')[0]);useEffect(()=>{const change=()=>{setRoute(location.hash.split('?')[0]);if(location.hash.startsWith('#/'))window.scrollTo(0,0)};window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change)},[]);return route==='#/agendar'?<Booking/>:route==='#/admin'?<Admin/>:<Home/>}
createRoot(document.getElementById('root')!).render(<App/>);
