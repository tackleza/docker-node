#!/usr/bin/env python3
"""Recreate one bare-Docker container with exact config and a new immutable image.
No environment/credential values enter argv, logs, or persisted records.
Retains the stopped previous container for rollback; runs on the Docker host.
"""
import http.client,socket,json,sys,time,pathlib,urllib.parse
class UnixHTTP(http.client.HTTPConnection):
 def connect(self):
  self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);self.sock.settimeout(120);self.sock.connect('/var/run/docker.sock')
def call(method,path,body=None):
 c=UnixHTTP('localhost');raw=json.dumps(body).encode() if body is not None else None
 c.request(method,'/v1.47'+path,raw,{'Content-Type':'application/json'});r=c.getresponse();data=r.read();c.close()
 if r.status>=400:raise RuntimeError('Docker request failed '+str(r.status)+' '+path+' [response omitted]')
 return json.loads(data) if data else None
name,image,expected=sys.argv[1:4];allow_stopped='--source-stopped-for-backup' in sys.argv[4:];q=urllib.parse.quote
old=call('GET',f'/containers/{q(name)}/json')
if old['Image']!=expected:raise RuntimeError('Current image differs from reviewed expected image')
newimg=call('GET',f'/images/{q(image,safe="")}/json')
if not old['State']['Running'] and not (allow_stopped and old['State']['Status']=='exited'):raise RuntimeError('Expected running source container or explicitly cold-backed-up stopped source')
stamp=time.strftime('%Y%m%d%H%M%S');previous=name+'-rollback-'+stamp
record={'container':name,'previous_name':previous,'previous_image':old['Image'],'new_image':newimg['Id'],'status':'prepared','time':stamp,'rollback':'Stop/rename new container, rename previous_name to original name and start; no home-volume/data rollback.'}
root=pathlib.Path('/home/tackle/urgent-node-security-20261024/flow-monitor/rollback');root.mkdir(parents=True,exist_ok=True);root.chmod(0o700);out=root/(name+'-'+stamp+'.json')
def save():
 out.write_text(json.dumps(record,indent=2));out.chmod(0o600)
save()
config=dict(old['Config']);config['Image']=newimg['Id'];config['HostConfig']=old['HostConfig']
endpoints={}
for network,ep in old['NetworkSettings']['Networks'].items():
 e={k:ep[k] for k in ['IPAMConfig','Links','Aliases','DriverOpts'] if ep.get(k) is not None}
 # Drop only aliases which encode the old container's generated ID.
 if e.get('Aliases'):e['Aliases']=[a for a in e['Aliases'] if a not in [old['Id'],old['Id'][:12]]]
 endpoints[network]=e
config['NetworkingConfig']={'EndpointsConfig':endpoints}
created=None
try:
 call('POST',f'/containers/{old["Id"]}/stop?t=30');call('POST',f'/containers/{old["Id"]}/rename?name={q(previous)}');record['status']='previous_retained';save()
 created=call('POST',f'/containers/create?name={q(name)}',config);record['new_container']=created['Id'];save()
 call('POST',f'/containers/{created["Id"]}/start');record['status']='started_pending_acceptance';save()
 # Compare recreated settings while excluding generated image/hostname identifiers.
 now=call('GET',f'/containers/{created["Id"]}/json')
 differences=[]
 for k,v in old['Config'].items():
  if k=='Labels':
   expected_labels={**(newimg['Config'].get('Labels') or {}),**(v or {})}
   if now['Config'].get(k)!=expected_labels:differences.append('Config.Labels')
  elif k=='User' and v in ['', 'root', '0', '0:0', 'root:root'] and now['Config'].get(k) in ['', 'root', '0', '0:0', 'root:root']:
   if now['Config'].get(k)!=v:record['equivalent_root_user_forms']=True
  elif k not in ['Image'] and now['Config'].get(k)!=v:differences.append('Config.'+k)
 for k in ['Binds','Mounts','PortBindings','RestartPolicy','NetworkMode','Privileged','CapAdd','CapDrop','SecurityOpt','Devices','ExtraHosts','Dns','ReadonlyRootfs','GroupAdd']:
  if old['HostConfig'].get(k)!=now['HostConfig'].get(k):differences.append('HostConfig.'+k)
 if differences:raise RuntimeError('Unexpected recreated configuration differences: '+', '.join(differences))
 save();print(json.dumps(record))
except Exception:
 record['status']='failed_rolling_back';save()
 if created:
  try:call('POST',f'/containers/{created["Id"]}/stop?t=15')
  except Exception:pass
  call('POST',f'/containers/{created["Id"]}/rename?name={q(name+"-failed-"+stamp)}')
 if call('GET',f'/containers/{old["Id"]}/json')['Name'].lstrip('/')!=name:call('POST',f'/containers/{old["Id"]}/rename?name={q(name)}')
 call('POST',f'/containers/{old["Id"]}/start');record['status']='previous_restored';save();raise
