'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const net = require('node:net');
const { spawn } = require('node:child_process');
const req = require('node:module').createRequire('/app/package.json');
const passed = [];
async function check(name, fn) { await fn(); passed.push(name); }
const listen = s => new Promise(r => s.listen(0, '127.0.0.1', () => r(s.address().port)));
const close = s => new Promise(r => s.close(r));
(async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kuma-dependencies-'));
  const axios = req('axios'); const tar = req('tar'); const proto = req('protobufjs');
  await check('SQLite vendor native binding read/write', async () => {
    const sqlite = req('@louislam/sqlite3');
    const db = new sqlite.Database(':memory:');
    await new Promise((resolve,reject) => db.exec('CREATE TABLE probe (value TEXT); INSERT INTO probe VALUES (\'preserved\')', e => e ? reject(e) : resolve()));
    const row = await new Promise((resolve,reject) => db.get('SELECT value FROM probe', (e,r) => e ? reject(e) : resolve(r)));
    assert.equal(row.value, 'preserved'); await new Promise(r => db.close(r));
  });
  await check('tar7 vendor download-dist create/extract API + traversal rejection', async () => {
    await fs.mkdir(path.join(dir, 'input')); await fs.writeFile(path.join(dir, 'input', 'sample.txt'), 'archive-content');
    await tar.create({gzip:true,file:path.join(dir,'probe.tgz'),cwd:dir}, ['input']);
    await fs.mkdir(path.join(dir,'output'));
    await tar.x({file:path.join(dir,'probe.tgz'),cwd:path.join(dir,'output')});
    assert.equal(await fs.readFile(path.join(dir,'output/input/sample.txt'),'utf8'), 'archive-content');
    const h=new tar.Header({path:'../escape.txt',mode:420,size:1,mtime:new Date(0),type:'File'});h.encode();await fs.writeFile(path.join(dir,'unsafe.tar'),Buffer.concat([h.block,Buffer.from('x'),Buffer.alloc(511+1024)]));try{await tar.x({file:path.join(dir,'unsafe.tar'),cwd:path.join(dir,'output'),onwarn:()=>{}});}catch{}await assert.rejects(fs.access(path.join(dir,'escape.txt')));
    assert.equal(typeof tar.x, 'function'); assert.equal(typeof tar.create, 'function');
  });
  const httpServer = http.createServer((r,s) => {
    if(r.url === '/redirect') {s.writeHead(302,{Location:'/health'});s.end();return;}
    s.setHeader('Content-Type','application/json');s.end(JSON.stringify({status:'healthy',keyword:'monitor-pass'}));
  });
  const httpPort = await listen(httpServer);
  await check('Axios0.34 HTTP monitor JSON/redirect/status/timeout compatibility', async () => {
    const r = await axios.get(`http://127.0.0.1:${httpPort}/redirect`,{timeout:3000,maxRedirects:3});
    assert.equal(r.status,200);assert.equal(r.data.status,'healthy');
  });
  const grpc = req('@grpc/grpc-js');
  const schema = 'syntax="proto3"; package smoke; message Message { string value=1; } service Probe { rpc Check(Message) returns (Message); }';
  const Message = proto.parse(schema).root.lookupType('smoke.Message');
  const grpcServer = new grpc.Server();
  grpcServer.addService({Check:{path:'/smoke.Probe/Check',requestStream:false,responseStream:false,requestSerialize:x=>Buffer.from(Message.encode(x).finish()),requestDeserialize:b=>Message.decode(b),responseSerialize:x=>Buffer.from(Message.encode(x).finish()),responseDeserialize:b=>Message.decode(b)}},{Check:(call,cb)=>cb(null,{value:'grpc-pass'})});
  const grpcPort=await new Promise((resolve,reject)=>grpcServer.bindAsync('127.0.0.1:0',grpc.ServerCredentials.createInsecure(),(e,p)=>e?reject(e):resolve(p)));
  await check('Real Kuma gRPC-keyword monitor with protobuf7.6.6 and grpc1.14', async () => {
    const {GrpcKeywordMonitorType}=req('/app/server/monitor-types/grpc.js'); const heartbeat={};
    await new GrpcKeywordMonitorType().check({grpcUrl:`127.0.0.1:${grpcPort}`,grpcProtobuf:schema,grpcServiceName:'smoke.Probe',grpcEnableTls:false,grpcMethod:'check',grpcBody:'{"value":"request"}',keyword:'grpc-pass',isInvertKeyword:()=>false},heartbeat);
    assert.equal(heartbeat.status,1);
  });
  grpcServer.forceShutdown();
  let messages=0;
  const smtp=net.createServer(socket=>{
    socket.write('220 scratch ESMTP\r\n'); let buf='',data=false;
    socket.on('data',chunk=>{buf+=chunk.toString();while(buf.includes('\n')){const i=buf.indexOf('\n'),line=buf.slice(0,i+1).trimEnd();buf=buf.slice(i+1);if(data){if(line==='.') {data=false;messages++;socket.write('250 queued\r\n');}continue;}if(/^EHLO|^HELO/.test(line))socket.write('250-scratch\r\n250 SIZE 1000000\r\n');else if(/^DATA/.test(line)){data=true;socket.write('354 send data\r\n');}else if(/^QUIT/.test(line)){socket.end('221 bye\r\n');}else socket.write('250 ok\r\n');}});
  });
  const smtpPort=await listen(smtp);
  await check('Real Kuma SMTP monitor + notification delivery through nodemailer10', async()=>{
    const {SMTPMonitorType}=req('/app/server/monitor-types/smtp.js');const heartbeat={};
    await new SMTPMonitorType().check({port:smtpPort,hostname:'127.0.0.1',smtpSecurity:'nostarttls'},heartbeat);assert.equal(heartbeat.status,1);
    const SMTP=req('/app/server/notification-providers/smtp.js');
    assert.equal(await new SMTP().send({smtpHost:'127.0.0.1',smtpPort,smtpSecure:false,smtpIgnoreSTARTTLS:true,smtpFrom:'probe@example.test',smtpTo:'monitor@example.test'},'Scratch compatibility check'), 'Sent Successfully.');assert.equal(messages,1);
  });
  await close(smtp);
  await check('Liquid notification templates + qs parser + MySQL driver load', async()=>{
    const {Liquid}=req('liquidjs');assert.equal(await new Liquid().parseAndRender('Status {{state}}',{state:'UP'}),'Status UP');assert.deepEqual(req('qs').parse('filter[state]=up'),{filter:{state:'up'}});assert.equal(typeof req('mysql2').createConnection,'function');
  });
  await check('Full Kuma server startup, scratch database, UI and authenticated HTTP monitor heartbeat', async()=>{
    const serverLog=[];const child=spawn(process.execPath,['server/server.js'],{cwd:'/app',env:{...process.env,DATA_DIR:path.join(dir,'server-data'),UPTIME_KUMA_PORT:'13301',UPTIME_KUMA_HOST:'127.0.0.1',UPTIME_KUMA_DB_TYPE:'sqlite'},stdio:['ignore','pipe','pipe']});
    child.stdout.on('data',x=>serverLog.push(x.toString()));child.stderr.on('data',x=>serverLog.push(x.toString()));
    let socket;
    try {
      let ready=false;for(let i=0;i<90;i++){try{const r=await fetch('http://127.0.0.1:13301/');if(r.status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));if(child.exitCode!==null)break;}
      assert.equal(ready,true,'scratch Kuma server must start');
      const handshake=await fetch('http://127.0.0.1:13301/socket.io/?EIO=4&transport=polling');const handshakeText=await handshake.text();assert.equal(handshakeText.startsWith('0{'),true,'Socket.IO polling handshake registered: '+handshake.status+' '+handshakeText.slice(0,80));
      const {io}=req('socket.io-client');socket=io('http://127.0.0.1:13301',{transports:['websocket'],reconnection:false,autoConnect:false,extraHeaders:{Origin:'http://127.0.0.1:13301'}});
      const setupReady=new Promise(resolve=>socket.once('setup',resolve));
      await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('connect_error',e=>reject(new Error('scratch socket failure: '+e.message+' / '+(e.description?.message||e.description||'')+' / '+(e.context?.statusCode||''))));socket.connect();});await setupReady;
      const emit=(event,...args)=>new Promise((resolve,reject)=>socket.timeout(15000).emit(event,...args,(err,result)=>err?reject(err):resolve(result)));
      let r=await emit('setup','scratch-security','Synthetic-Only-Password-2026!');assert.equal(r.ok,true);
      r=await emit('login',{username:'scratch-security',password:'Synthetic-Only-Password-2026!',token:''});assert.equal(r.ok,true);
      const heartbeats=[];socket.on('heartbeat',x=>heartbeats.push(x));
      r=await emit('add',{name:'scratch HTTP compatibility',type:'http',url:`http://127.0.0.1:${httpPort}/health`,method:'GET',interval:20,retryInterval:20,resendInterval:0,maxretries:0,active:true,accepted_statuscodes:['200-299'],notificationIDList:{},timeout:10,ignoreTls:false,upsideDown:false,maxredirects:10,weight:2000,conditions:[],kafkaProducerBrokers:[],kafkaProducerSaslOptions:{},rabbitmqNodes:[]});assert.equal(r.ok,true,'add monitor: '+r.msg);
      let up=false;for(let i=0;i<35;i++){if(heartbeats.some(h=>h.monitorID===r.monitorID&&h.status===1)){up=true;break;}await new Promise(r=>setTimeout(r,1000));}assert.equal(up,true,'real HTTP monitor heartbeat UP');
    } catch(e) { console.error(JSON.stringify({scratchServerLog:serverLog.join('').split('\n').slice(-18).join('\n')}));throw e; } finally {if(socket)socket.close();child.kill('SIGTERM');await new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);setTimeout(()=>{child.kill('SIGKILL');resolve();},8000).unref();});}
  });
  await close(httpServer);await fs.rm(dir,{recursive:true,force:true});
  console.log(JSON.stringify({ok:true,tests:passed,node:process.version,application:req('/app/package.json').version}));process.exit(0);
})().catch(e=>{console.error(JSON.stringify({ok:false,completed:passed,error:e.message}));process.exit(1);});
