import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
export function openDatabase(path=process.env.DB_PATH||'./data/luiza.sqlite'){
 if(path!==':memory:')mkdirSync(dirname(resolve(path)),{recursive:true});
 const sqlite=new DatabaseSync(path);sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;');
 sqlite.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
 if(!sqlite.prepare('SELECT version FROM schema_migrations WHERE version = ?').get('001')){sqlite.exec('BEGIN IMMEDIATE');try{sqlite.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));sqlite.prepare('INSERT INTO schema_migrations VALUES (?,?)').run('001',new Date().toISOString());sqlite.exec('COMMIT');}catch(e){sqlite.exec('ROLLBACK');sqlite.close();throw e;}}
 return sqlite;
}
export const sqlite=openDatabase();
class Statement{constructor(sql,args=[]){this.sql=sql;this.args=args;}bind(...args){return new Statement(this.sql,args);}first(){return Promise.resolve(sqlite.prepare(this.sql).get(...this.args)||null);}all(){return Promise.resolve({results:sqlite.prepare(this.sql).all(...this.args)});}run(){return Promise.resolve(this.execute());}execute(){return sqlite.prepare(this.sql).run(...this.args);}}
export const database={prepare:sql=>new Statement(sql),async batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>s.execute());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
