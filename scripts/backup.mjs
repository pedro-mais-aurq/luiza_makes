import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const file=process.env.DB_PATH||'./data/luiza.sqlite';mkdirSync('data/backups',{recursive:true});const db=new DatabaseSync(file,{readOnly:true});const target=resolve('data/backups/luiza-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite');try{await backup(db,target);console.log('Backup criado:',target);}finally{db.close();}
