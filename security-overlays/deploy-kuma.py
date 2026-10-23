#!/usr/bin/env python3
"""SVD01, after coordinator stop gate. Exact-config container replacement only."""
import json,subprocess,pathlib,sys,time,hashlib,urllib.request
image,expected_new,revision=sys.argv[1:];expected_old='sha256:6ab42038c66c44153ad0ffad5de3c4adccf7549bc802b4446dd554d1001f7b13';name='uptime-kuma-v2-test';data=pathlib.Path('/mnt/local_disk_01/docker/uptime-kuma-v2-test');ops=pathlib.Path(__file__).resolve().parent
root=pathlib.Path('/home/tackle/urgent-node-security-20261024/flow-monitor/uptime-kuma');root.mkdir(parents=True,exist_ok=True);root.chmod(0o700);stamp=time.strftime('%Y%m%d%H%M%S');backup=root/('data-before-'+stamp+'.tar.gz');restore=root/('restore-check-'+stamp);record=root/('release-'+stamp+'.json')
def run(args):
 r=subprocess.run(args,capture_output=True)
 if r.returncode:raise RuntimeError('Reviewed operation failed: '+args[0]+' '+(args[1] if len(args)>1 else '')+' (output kept private)')
 return r.stdout
old=json.loads(run(['docker','inspect',name]))[0];assert old['Image']==expected_old and old['State']['Running'];new=json.loads(run(['docker','image','inspect',image]))[0];assert new['Id']==expected_new
assert json.loads(run(['docker','exec',name,'node','-e',"console.log(JSON.stringify({type:JSON.parse(require('fs').readFileSync('/app/data/db-config.json')).type}))"]))['type']=='sqlite'
d={'service':name,'revision':revision,'previous_image':expected_old,'new_image':expected_new,'data_backup':str(backup),'restore_check':str(restore),'status':'prepared','rollback':'Retained previous container preserves exact configuration. Stop/rename candidate, rename/start previous container. Do not overwrite authoritative data automatically. Full verified cold archive retained for separately assessed data recovery.'}
def save():record.write_text(json.dumps(d,indent=2));record.chmod(0o600)
save();replaced=False
try:
 run(['docker','stop','--time','30',name]);d['status']='stopped_for_cold_backup';save()
 with backup.open('wb') as f:
  r=subprocess.run(['docker','run','--rm','--user','0','--entrypoint','tar','--mount',f'type=bind,source={data},target=/source,readonly',image,'czf','-','-C','/source','.'],stdout=f,stderr=subprocess.PIPE)
  if r.returncode:raise RuntimeError('Cold backup failed')
 backup.chmod(0o600);d['backup_sha256']=hashlib.sha256(backup.read_bytes()).hexdigest();restore.mkdir(mode=0o700)
 run(['docker','run','--rm','--user','0','--entrypoint','tar','--mount',f'type=bind,source={root},target=/backup',image,'xzf','/backup/'+backup.name,'-C','/backup/'+restore.name])
 d['backup_restore_verified']=json.loads(run(['docker','run','--rm','--user','0','--entrypoint','node','--mount',f'type=bind,source={data},target=/source,readonly','--mount',f'type=bind,source={restore},target=/restore,readonly','--mount',f'type=bind,source={ops / "verify-tree.cjs"},target=/verify-tree.cjs,readonly',image,'/verify-tree.cjs','/source','/restore']))
 check=['docker','run','--rm','--user','0','--entrypoint','node','--mount',f'type=bind,source={restore},target=/restore','--mount',f'type=bind,source={ops / "kuma-protected-config.cjs"},target=/config-check.cjs,readonly',image,'/config-check.cjs','/restore/kuma.db']
 d['protected_config_before']=json.loads(run(check));d['status']='cold_backup_verified';save()
 d['container_replacement']=json.loads(run(['python3',str(ops/'replace-bare-container.py'),name,image,expected_old,'--source-stopped-for-backup']));replaced=True;d['status']='candidate_started';save()
 for _ in range(90):
  now=json.loads(run(['docker','inspect',name]))[0]
  if now['Image']==expected_new and now['State']['Running'] and (now['State'].get('Health') or {}).get('Status')=='healthy':break
  time.sleep(1)
 else:raise RuntimeError('Candidate Kuma health acceptance failed')
 d['protected_config_after']=json.loads(run(['docker','exec',name,'node','-e',(ops/'kuma-protected-config.cjs').read_text(),'/app/data/kuma.db']))
 assert d['protected_config_after']==d['protected_config_before'],'Monitor/user/notification/settings content changed'
 d['public_statuses']=[]
 for attempt in range(15):
  probe=subprocess.run(['curl','--silent','--show-error','--location','--max-time','10','--output','/dev/null','--write-out','%{http_code}','https://status.sk-mc.net/'],capture_output=True,text=True)
  d['public_statuses'].append({'exit':probe.returncode,'http':probe.stdout if probe.stdout.isdigit() else 'invalid'});save()
  if probe.returncode==0 and probe.stdout=='200':break
  time.sleep(3)
 else:raise RuntimeError('Public readiness failed after Docker DNS resolver grace')
 d['versions']=json.loads(run(['docker','exec',name,'node','-e',"console.log(JSON.stringify({node:process.version,application:require('/app/package.json').version,protobuf:require('/app/node_modules/protobufjs/package.json').version,tar:require('/app/node_modules/tar/package.json').version,nodemailer:require('/app/node_modules/nodemailer/package.json').version}))"]))
 d['status']='accepted_pending_full_dependency_audit';save();print(json.dumps(d))
except Exception:
 d['status']='failed_restoring_availability';save()
 if replaced:
  previous=d['container_replacement']['previous_name'];run(['docker','stop','--time','15',name]);run(['docker','rename',name,name+'-failed-'+stamp]);run(['docker','rename',previous,name])
 run(['docker','start',name]);d['status']='previous_restored';save();raise
