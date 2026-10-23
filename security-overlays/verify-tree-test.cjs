'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'restore-verifier-')),a=path.join(tmp,'source'),b=path.join(tmp,'restore');
for(const dir of [a,b]){fs.mkdirSync(dir);fs.mkdirSync(path.join(dir,'node_modules'));fs.mkdirSync(path.join(dir,'.security-stage-test'));fs.writeFileSync(path.join(dir,'flows.json'),'protected-flow');fs.chmodSync(path.join(dir,'flows.json'),0o600);fs.symlinkSync('flows.json',path.join(dir,'flow-link'));}
const verify=(state)=>spawnSync(process.execPath,[path.join(__dirname,'verify-tree.cjs'),a,b,...(state?['--state-only']:[])],{encoding:'utf8'}).status;
assert.equal(verify(false),0,'complete restored metadata/content agrees');
fs.writeFileSync(path.join(a,'node_modules','different'),'installed');fs.writeFileSync(path.join(b,'.security-stage-test','different'),'staged');
assert.notEqual(verify(false),0,'full verifier rejects missing dependency bytes');assert.equal(verify(true),0,'mutable-state verifier excludes only designated rebuild/staging paths');
fs.writeFileSync(path.join(b,'flows.json'),'tampered-flow');assert.notEqual(verify(true),0,'protected flow content mismatch must fail');fs.writeFileSync(path.join(b,'flows.json'),'protected-flow');fs.chmodSync(path.join(b,'flows.json'),0o644);assert.notEqual(verify(true),0,'protected permissions mismatch must fail');
fs.rmSync(tmp,{recursive:true,force:true});console.log(JSON.stringify({ok:true,checks:5}));
