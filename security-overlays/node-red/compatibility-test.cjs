'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');const http=require('node:http');const {spawn}=require('node:child_process');
const req=require('node:module').createRequire('/opt/flow-dependencies/package.json');
const passed=[];async function check(n,fn){await fn();passed.push(n);}
(async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'flow-compatibility-'));
 await check('Cast protobuf6-to7 exact wire compatibility and decoder',async()=>{
  const p=req('castv2/lib/proto');await new Promise(r=>setTimeout(r,100));
  const m={protocolVersion:0,sourceId:'sender-0',destinationId:'receiver-0',namespace:'urn:x-cast:com.google.cast.tp.heartbeat',payloadType:0,payloadUtf8:JSON.stringify({type:'PING'})};
  const wire=Buffer.from(p.CastMessage.serialize(m));
  assert.equal(wire.toString('hex'),'0800120873656e6465722d301a0a72656365697665722d30222775726e3a782d636173743a636f6d2e676f6f676c652e636173742e74702e6865617274626561742800320f7b2274797065223a2250494e47227d');
  const out=p.CastMessage.parse(wire);assert.equal(out.payloadUtf8,m.payloadUtf8);assert.equal(out.destinationId,m.destinationId);
  assert.equal(typeof req('castv2-client').Client,'function');assert.equal(req('protobufjs/package.json').version,'7.6.6');
 });
 await check('Home Assistant schema + WebSocket auth and state request compatibility',async()=>{
  assert.equal(req('joi').object({state:req('joi').string().required()}).validate({state:'on'}).error,undefined);
  const {WebSocketServer}=req('ws');const server=new WebSocketServer({host:'127.0.0.1',port:0});await new Promise(r=>server.on('listening',r));
  server.on('connection',s=>{s.send(JSON.stringify({type:'auth_required',ha_version:'2026.10.0'}));s.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='auth')s.send(JSON.stringify({type:'auth_ok',ha_version:'2026.10.0'}));else if(m.id)s.send(JSON.stringify({id:m.id,type:'result',success:true,result:m.type==='get_states'?[{entity_id:'sensor.security_probe',state:'on',attributes:{}}]:{}}));});});
  const ha=req('home-assistant-js-websocket');let c;
  try{c=await ha.createConnection({auth:ha.createLongLivedTokenAuth('http://127.0.0.1:'+server.address().port,'synthetic-only-token')});const states=await c.sendMessagePromise({type:'get_states'});assert.equal(states[0].state,'on');}finally{if(c)c.close();for(const client of server.clients)client.terminate();await new Promise(r=>server.close(r));}
 });
 await check('Email MIME parsing, Unicode IMAP names, SMTP package registration',async()=>{
  const {simpleParser}=req('mailparser');const email=await simpleParser('From: sender@example.test\r\nTo: receiver@example.test\r\nSubject: dependency probe\r\n\r\nPreserved body');assert.equal(email.subject,'dependency probe');assert.match(email.text,/Preserved body/);
  const {createRequire}=require('node:module');const emailReq=createRequire(req.resolve('node-red-node-email/package.json'));const utf7=emailReq('imap').parseHeader;assert.equal(typeof utf7,'function');assert.equal(typeof req('nodemailer').createTransport,'function');assert.equal(typeof req('smtp-server').SMTPServer,'function');assert.equal(emailReq('semver').satisfies('24.22.1','>=18'),true);
 });
 await check('Serial native binding loads and time/UUID helpers remain usable',async()=>{
  const serialReq=require('node:module').createRequire(req.resolve('node-red-node-serialport/package.json'));assert.equal(typeof serialReq('serialport').SerialPort,'function');assert.match(req('uuid').v4(),/^[a-f0-9-]{36}$/);assert.equal(req('moment')('2026-10-24').isValid(),true);
 });
 let deliveredEmail=0;const {SMTPServer}=req('smtp-server');const smtpServer=new SMTPServer({disabledCommands:['STARTTLS','AUTH'],authOptional:true,onData(stream,session,callback){stream.on('data',()=>{});stream.on('end',()=>{deliveredEmail++;callback();});}});await new Promise(r=>smtpServer.listen(0,'127.0.0.1',r));
 await fs.symlink('/opt/flow-dependencies/node_modules',path.join(dir,'node_modules'));
 await fs.copyFile('/opt/flow-dependencies/package.json',path.join(dir,'package.json'));
 await fs.writeFile(path.join(dir,'settings.js'),'module.exports={uiHost:"127.0.0.1",uiPort:14880,flowFile:"flows.json",logging:{console:{level:"warn",metrics:false,audit:false}},editorTheme:{projects:{enabled:false}}};\n');
 await fs.writeFile(path.join(dir,'flows.json'),JSON.stringify([{id:'test-tab',type:'tab',label:'isolated-security-test'},{id:'test-in',type:'http in',z:'test-tab',name:'',url:'/dependency-probe',method:'get',wires:[['test-function']]},{id:'test-function',type:'function',z:'test-tab',func:'msg.payload={ok:true,channel:msg.req.query.channel||"probe"};return msg;',outputs:1,wires:[['test-response']]},{id:'test-response',type:'http response',z:'test-tab',statusCode:'',headers:{},wires:[]},{id:'test-mail-inject',type:'inject',z:'test-tab',props:[{p:'payload'},{p:'topic',vt:'str'},{p:'from',v:'probe@example.test',vt:'str'}],payload:'Preserved email body',payloadType:'str',topic:'dependency compatibility',once:true,onceDelay:1,repeat:'',wires:[['test-mail']]},{id:'test-mail',type:'e-mail',z:'test-tab',server:'127.0.0.1',port:smtpServer.server.address().port,name:'recipient@example.test',secure:false,tls:false,authtype:'NONE',wires:[]}]));
 await check('Node-RED startup, every installed plugin and all active plugin flow types register; HTTP function flow executes',async()=>{
  const logs=[];const child=spawn(process.execPath,['/usr/src/node-red/node_modules/node-red/red.js','--userDir',dir,'--settings',path.join(dir,'settings.js')],{stdio:['ignore','pipe','pipe']});child.stdout.on('data',x=>logs.push(x.toString()));child.stderr.on('data',x=>logs.push(x.toString()));
  try{
   let ready=false;for(let i=0;i<90;i++){try{const r=await fetch('http://127.0.0.1:14880/dependency-probe?channel=preserved');const body=await r.json();if(r.status===200&&body.ok&&body.channel==='preserved'){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));if(child.exitCode!==null)break;}
   assert.equal(ready,true,'isolated HTTP function flow must run');const res=await fetch('http://127.0.0.1:14880/nodes',{headers:{Accept:'application/json'}});const nodes=await res.json();assert.equal(Array.isArray(nodes),true);
   const types=new Set(nodes.flatMap(n=>n.types||[]));
   for(const type of ['api-call-service','api-current-state','ha-time','server-state-changed','ha-zone','BooleanLogicUltimate','time-range-switch','wake on lan','ollama-generate','mqtt in'])assert.equal(types.has(type),true,'registered active flow type: '+type);
   const packages=new Set(nodes.map(n=>n.module));for(const name of Object.keys(req('/opt/flow-dependencies/package.json').dependencies)){if(name==='@node-red-contrib-themes/theme-collection')continue;assert.equal(packages.has(name),true,'palette plugin registered: '+name);}
   assert.equal(nodes.some(n=>n.err),false,'no palette node-load errors');for(let i=0;i<15&&deliveredEmail===0;i++)await new Promise(r=>setTimeout(r,1000));assert.equal(deliveredEmail,1,'real Node-RED e-mail output delivered through nodemailer10');
  }catch(e){console.error(JSON.stringify({scratchNodeRedLog:logs.join('').slice(-8000)}));throw e;}finally{child.kill('SIGTERM');await new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);setTimeout(()=>{child.kill('SIGKILL');resolve();},8000).unref();});}
 });
 await new Promise(r=>smtpServer.close(r));await fs.rm(dir,{recursive:true,force:true});console.log(JSON.stringify({ok:true,tests:passed,node:process.version,pluginCount:Object.keys(req('/opt/flow-dependencies/package.json').dependencies).length}));process.exit(0);
})().catch(e=>{console.error(JSON.stringify({ok:false,completed:passed,error:e.message}));process.exit(1);});
