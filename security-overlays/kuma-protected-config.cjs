'use strict';
// Emits only aggregate counts/hashes, never monitor targets, credentials or settings.
const sqlite=require('/app/node_modules/@louislam/sqlite3'),crypto=require('node:crypto');
const db=new sqlite.Database((process.argv[2]||process.argv[1]),sqlite.OPEN_READONLY);
db.run('PRAGMA query_only = ON');
const all=sql=>new Promise((resolve,reject)=>db.all(sql,(e,r)=>e?reject(e):resolve(r)));
(async()=>{const check=await all('PRAGMA integrity_check');if(check.some(x=>Object.values(x)[0]!=='ok'))throw new Error('SQLite integrity check failed');const exists=new Set((await all("SELECT name FROM sqlite_master WHERE type='table'")).map(x=>x.name));const out={};for(const table of ['monitor','notification','user','setting','proxy','docker_host','monitor_notification'])if(exists.has(table)){const rows=await all('SELECT * FROM '+table+' ORDER BY rowid');out[table]={count:rows.length,sha256:crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex')};}console.log(JSON.stringify({integrity:'ok',tables:out}));db.close();})().catch(()=>{console.error('Protected Kuma configuration check failed');db.close();process.exitCode=1;});
