#!/usr/bin/env python3
"""Run on SVD01 after the release coordinator grants the application stop gate.
Only this Compose service and its dependency files are changed. No raw logs/env.
"""
import json,subprocess,pathlib,sys,time,hashlib,urllib.request
image,expected_new,revision,expected_lock=sys.argv[1:]
old_image='sha256:1c532f9dd00d6f77750bb2a9fedcdbb3f178ca6e539cbefb66084494d9e568d6'
old_ref='nodered/node-red@sha256:e085d4a06591fd0aca2ea2a91364d27f1a0e31e885675f77935e10f95412a963'
compose=pathlib.Path('/mnt/local_disk_01/docker/hass/compose.yaml');data=pathlib.Path('/mnt/local_disk_01/docker/hass/data/node_red')
root=pathlib.Path('/home/tackle/urgent-node-security-20261024/flow-monitor/node-red');root.mkdir(parents=True,exist_ok=True);root.chmod(0o700)
ops=pathlib.Path(__file__).resolve().parent;stamp=time.strftime('%Y%m%d%H%M%S');record=root/('release-'+stamp+'.json');backup=root/('data-before-'+stamp+'.tar.gz');restore=root/('restore-check-'+stamp);artifact=root/('dependencies-'+revision+'.tar.gz');saved_compose=root/('compose-before-'+stamp+'.yaml')
base=['docker','compose','-f',str(compose)]
def run(args,**kwargs):
 r=subprocess.run(args,capture_output=True,**kwargs)
 if r.returncode:raise RuntimeError('Reviewed operation failed: '+args[0]+' '+(args[1] if len(args)>1 else '')+' (output kept private)')
 return r.stdout
old=json.loads(run(['docker','inspect','hass-nodered']))[0];assert old['Image']==old_image and old['State']['Running']
new=json.loads(run(['docker','image','inspect',image]))[0];assert new['Id']==expected_new
assert hashlib.sha256(run(['docker','exec','hass-nodered','cat','/data/package-lock.json'])).hexdigest()==expected_lock
before=compose.read_text();assert before.count(old_ref)==1
saved_compose.write_text(before);saved_compose.chmod(0o600)
d={'service':'hass-nodered','revision':revision,'previous_image':old_image,'new_image':expected_new,'previous_ref':old_ref,'new_ref':image,'compose_backup':str(saved_compose),'data_backup':str(backup),'restore_check':str(restore),'artifact':str(artifact),'status':'prepared','rollback':'Stop selected nodered service; restore previous Compose image and only saved dependency paths/package manifests; restart. Flow/credentials/settings are not rolled back. Full cold archive retained separately.'}
def save():record.write_text(json.dumps(d,indent=2));record.chmod(0o600)
def protected_digest():
 code="const fs=require('fs'),c=require('crypto'),h=c.createHash('sha256');let files=fs.readdirSync('/data').filter(x=>/^flows.*\\.json$/.test(x)||x==='settings.js'||x==='.config.runtime.json').sort();for(const f of files){h.update(f);h.update(fs.readFileSync('/data/'+f));}console.log(JSON.stringify({count:files.length,sha256:h.digest('hex')}));"
 return json.loads(run(['docker','exec','hass-nodered','node','-e',code]))
d['protected_flow_files']=protected_digest();save()
# Export the tested immutable dependency tree before interrupting service.
with artifact.open('wb') as f:
 r=subprocess.run(['docker','run','--rm','--user','0','--entrypoint','tar',image,'czf','-','-C','/opt/flow-dependencies','node_modules','package.json','package-lock.json','vendor'],stdout=f,stderr=subprocess.PIPE)
 if r.returncode:raise RuntimeError('Dependency artifact export failed')
artifact.chmod(0o600);d['artifact_sha256']=hashlib.sha256(artifact.read_bytes()).hexdigest();save()
stopped=False;swapped=False
try:
 run(base+['stop','nodered']);stopped=True;d['status']='stopped_for_cold_backup';save()
 with backup.open('wb') as f:
  r=subprocess.run(['docker','run','--rm','--user','0','--entrypoint','tar','--mount',f'type=bind,source={data},target=/source,readonly',image,'czf','-','-C','/source','.'],stdout=f,stderr=subprocess.PIPE)
  if r.returncode:raise RuntimeError('Cold backup failed')
 backup.chmod(0o600);d['backup_sha256']=hashlib.sha256(backup.read_bytes()).hexdigest();restore.mkdir(mode=0o700)
 run(['docker','run','--rm','--user','0','--entrypoint','tar','--mount',f'type=bind,source={root},target=/backup',image,'xzf','/backup/'+backup.name,'-C','/backup/'+restore.name])
 verified=run(['docker','run','--rm','--user','0','--entrypoint','node','--mount',f'type=bind,source={data},target=/source,readonly','--mount',f'type=bind,source={restore},target=/restore,readonly','--mount',f'type=bind,source={ops / "verify-tree.cjs"},target=/verify-tree.cjs,readonly',image,'/verify-tree.cjs','/source','/restore'])
 d['backup_restore_verified']=json.loads(verified);d['status']='cold_backup_verified';save()
 # Extraction and atomic renames run as root to retain existing ownership.
 script="""set -eu
for f in node_modules package.json package-lock.json vendor; do test ! -e /data/.security-before-REV-$f; done
mkdir -p /data/.security-stage-REV
trap 'rm -rf /data/.security-stage-REV' EXIT
tar xzf /backup/ARTIFACT -C /data/.security-stage-REV
for f in node_modules package.json package-lock.json vendor; do
 if [ -e /data/$f ]; then mv /data/$f /data/.security-before-REV-$f; fi
 mv /data/.security-stage-REV/$f /data/$f
done
""".replace('REV',revision).replace('ARTIFACT',artifact.name)
 swapped=True
 run(['docker','run','--rm','--user','0','--entrypoint','sh','--mount',f'type=bind,source={data},target=/data','--mount',f'type=bind,source={root},target=/backup,readonly',image,'-c',script])
 compose.write_text(before.replace(old_ref,image));d['status']='starting_candidate';save();run(base+['up','-d','--no-deps','--pull','never','nodered'])
 for _ in range(90):
  now=json.loads(run(['docker','inspect','hass-nodered']))[0]
  try:
   with urllib.request.urlopen('http://127.0.0.1:1880/',timeout=3) as r:ok=r.status==200
  except Exception:ok=False
  if now['Image']==expected_new and now['State']['Running'] and (now['State'].get('Health') or {}).get('Status')=='healthy' and ok:break
  time.sleep(1)
 else:raise RuntimeError('Candidate Node-RED health/origin acceptance failed')
 assert protected_digest()==d['protected_flow_files'],'Protected flow/settings/credential content changed'
 versions=run(['docker','exec','hass-nodered','node','-e',"console.log(JSON.stringify({node:process.version,protobuf:require('/data/node_modules/protobufjs/package.json').version,email:require('/data/node_modules/node-red-node-email/package.json').version}))"])
 d['versions']=json.loads(versions);d['status']='accepted_pending_full_dependency_audit';save();print(json.dumps(d))
except Exception:
 d['status']='failed_restoring_dependencies';save()
 try:run(base+['stop','nodered'])
 except Exception:pass
 if swapped:
  script="""set -eu
for f in node_modules package.json package-lock.json vendor; do
 if [ -e /data/.security-before-REV-$f ]; then
  if [ -e /data/$f ]; then mv /data/$f /data/.security-failed-REV-$f; fi
  mv /data/.security-before-REV-$f /data/$f
 elif [ "$f" = vendor ] && [ -e /data/$f ]; then mv /data/$f /data/.security-failed-REV-$f; fi
done
""".replace('REV',revision)
  run(['docker','run','--rm','--user','0','--entrypoint','sh','--mount',f'type=bind,source={data},target=/data',image,'-c',script])
 compose.write_text(before);run(base+['up','-d','--no-deps','--pull','never','nodered']);d['status']='previous_restored';save();raise
