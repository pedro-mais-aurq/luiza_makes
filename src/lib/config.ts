export type Service={id:string;name:string;duration:number;description:string};
export type Config={services:Service[];open:number;close:number;days:number[]; notice:number};
export const defaults:Config={services:[
{id:'social',name:'Maquiagem social',duration:90,description:'Pele luminosa e acabamento pensado para o seu evento.'},
{id:'noiva',name:'Maquiagem para noivas',duration:150,description:'Uma produção delicada, com tempo e cuidado para o seu grande dia.'},
{id:'ensaio',name:'Maquiagem para ensaios',duration:90,description:'Texturas e definição que valorizam você diante das lentes.'}
],open:540,close:1080,days:[1,2,3,4,5,6],notice:120};
export const time=(n:number)=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function dateLabel(d:string){return new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'});}
export function upcomingDate(d:string,minute:number,notice=0){return new Date(`${d}T${time(minute)}:00-03:00`).getTime()>Date.now()+notice*60000;}
export function validDate(d:unknown): d is string { return typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(new Date(d+'T12:00:00Z').getTime())&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d&&d>=today()&&d<=new Date(Date.now()+365*86400000).toISOString().slice(0,10); }
