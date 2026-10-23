#!/usr/bin/env python3
"""SVD01 two-phase deployment: prepare immutable deps online; brief gated cutover.
Never execute cutover without coordinator's explicit application-stop gate.
"""
import json,subprocess,pathlib,sys,time,hashlib,urllib.request
mode,image,new_image,revision,old_lock,*extra=sys.argv[1:]
old_image='sha256:1c532f9dd00d6f77750bb2a9fedcdbb3f178ca6e539cbefb66084494d9e568d6'
old_ref='nodered/node-red@sha256:e085d4a06591fd0aca2ea2a91364d27f1a0e31e885675f77935e10f95412a963'
compose=pathlib.Path('/mnt/local_disk_01/docker/hass/compose.yaml');data=pathlib.Path('/mnt/local_disk_01/docker/hass/data/node_red');root=pathlib.Path('/home/tackle/urgent-node-security-20261024/flow-monitor/node-red');ops=pathlib.Path(__file__).resolve().parent
root.mkdir(parents=True,exist_ok=True);root.chmod(0o700);prepared=root/('prepared-'+revision+'.json');stage=data/('.security-stage-'+revision);base=['docker','compose','-f',str(compose)]
def run(args,stdout=None):
 r=subprocess.run(args,stdout=stdout or subprocess.PIPE,stderr=subprocess.PIPE)
 if r.returncode:raise RuntimeError('Reviewed operation failed: '+args[0]+' '+(args[1] if len(args)>1 else '')+' (private output omitted)')
 return r.stdout
def helper(entry,args,mounts=()):return ['docker','run','--rm','--user','0','--entrypoint',entry,*sum((['--mount',x] for x in mounts),[]),image,*args]
def mounts(**mapping):return [f'type=bind,source={v[0]},target={k}'+(',readonly' if v[1] else '') for k,v in mapping.items()]
def preflight():
 d=json.loads(run(['docker','inspect','hass-nodered']))[0];assert d['Image']==old_image and d['State']['Running']
 assert json.loads(run(['docker','image','inspect',image]))[0]['Id']==new_image
 assert hashlib.sha256(run(['docker','exec','hass-nodered','cat','/data/package-lock.json'])).hexdigest()==old_lock
 return d
def tree(a,b,source,target,state=False):
 m=mounts(**{'/source':(source,True),'/restore':(target,True),'/verify-tree.cjs':(ops/'verify-tree.cjs',True)})
 return json.loads(run(helper('node',['/verify-tree.cjs',a,b]+(['--state-only'] if state else []),m)))
def save(p,d):p.write_text(json.dumps(d,indent=2));p.chmod(0o600)
def protected():
 code="const fs=require('fs'),h=require('crypto').createHash('sha256');let files=fs.readdirSync('/data').filter(x=>/^flows.*\\.json$/.test(x)||x==='settings.js'||x==='.config.runtime.json').sort();for(const f of files){h.update(f);h.update(fs.readFileSync('/data/'+f));}console.log(JSON.stringify({count:files.length,sha256:h.digest('hex')}));"
 return json.loads(run(['docker','exec','hass-nodered','node','-e',code]))
if mode=='prepare':
 assert len(extra)==1,'Supply the completed preparatory data archive path'
 preflight();archive=pathlib.Path(extra[0]).resolve();assert archive.is_relative_to(root) and archive.is_file()
 # Reading immutable module files needs no service stop; no palette install may
 # run concurrently. The source lock is revalidated before and after preparation.
 restore=root/('dependency-restore-'+revision);restore.mkdir(mode=0o700)
 run(helper('tar',['xzf','/backup/'+archive.name,'-C','/restore','./node_modules','./package.json','./package-lock.json'],mounts(**{'/backup':(root,True),'/restore':(restore,False)})))
 checked=tree('/source','/restore',data/'node_modules',restore/'node_modules')
 assert hashlib.sha256((restore/'package-lock.json').read_bytes()).hexdigest()==old_lock
 artifact=root/('dependencies-'+revision+'.tar.gz');assert artifact.is_file();assert not stage.exists()
 run(helper('sh',['-c','mkdir /data/.security-stage-'+revision+' && tar xzf /backup/'+artifact.name+' -C /data/.security-stage-'+revision],mounts(**{'/data':(data,False),'/backup':(root,True)})))
 # Compare candidate staged module bytes/modes/owners with the immutable image.
 new_checked=json.loads(run(helper('node',['/verify-tree.cjs','/opt/flow-dependencies/node_modules','/stage/node_modules'],mounts(**{'/stage':(stage,True),'/verify-tree.cjs':(ops/'verify-tree.cjs',True)}))))
 preflight();save(prepared,{'status':'online_dependencies_restored_verified_candidate_staged','revision':revision,'image':new_image,'old_image':old_image,'old_lock_sha256':old_lock,'dependency_archive':str(archive),'dependency_archive_sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'dependency_restore':str(restore),'old_dependency_tree':checked,'candidate_stage':str(stage),'candidate_tree':new_checked,'new_lock_sha256':hashlib.sha256((stage/'package-lock.json').read_bytes()).hexdigest(),'note':'Preparatory archive is used for verified immutable dependencies only. Mutable state gets its own final brief cold backup.'});print(json.dumps(json.load(open(prepared))))
elif mode=='cutover':
 assert not extra;preflight();prep=json.load(open(prepared));assert prep['image']==new_image and prep['old_lock_sha256']==old_lock and stage.exists();assert hashlib.sha256((stage/'package-lock.json').read_bytes()).hexdigest()==prep['new_lock_sha256']
 before=compose.read_text();assert before.count(old_ref)==1;stamp=time.strftime('%Y%m%d%H%M%S');saved=root/('compose-brief-before-'+stamp+'.yaml');saved.write_text(before);saved.chmod(0o600);backup=root/('mutable-state-cold-'+stamp+'.tar.gz');restore=root/('mutable-state-restore-'+stamp);record=root/('brief-release-'+stamp+'.json')
 d={'service':'hass-nodered','status':'prepared','revision':revision,'previous_image':old_image,'new_image':new_image,'compose_backup':str(saved),'verified_dependency_backup':prep,'mutable_state_backup':str(backup),'mutable_state_restore':str(restore),'protected_flow_files':protected(),'rollback':'Stop selected nodered; restore only saved dependency paths/package files and previous Compose image; restart. Flows/settings/credentials remain authoritative. Verified mutable cold-state and immutable dependency backups support separately assessed full data recovery.'}
 save(record,d);swapped=False
 try:
  run(base+['stop','nodered']);d['status']='brief_stop_for_mutable_state';save(record,d)
  with backup.open('wb') as out:
   run(helper('tar',['czf','-','--exclude=./node_modules','--exclude=./.npm','--exclude=./.cache','--exclude=./.security-*','-C','/source','.'],mounts(**{'/source':(data,True)})),stdout=out)
  backup.chmod(0o600);restore.mkdir(mode=0o700)
  run(helper('tar',['xzf','/backup/'+backup.name,'-C','/restore'],mounts(**{'/backup':(root,True),'/restore':(restore,False)})))
  d['mutable_restore_verified']=tree('/source','/restore',data,restore,state=True);d['mutable_backup_sha256']=hashlib.sha256(backup.read_bytes()).hexdigest();d['status']='brief_cold_state_verified';save(record,d)
  script="""set -eu
for f in node_modules package.json package-lock.json vendor; do test ! -e /data/.security-before-REV-$f; done
for f in node_modules package.json package-lock.json vendor; do
 if [ -e /data/$f ]; then mv /data/$f /data/.security-before-REV-$f; fi
 mv /data/.security-stage-REV/$f /data/$f
done
rmdir /data/.security-stage-REV
""".replace('REV',revision)
  swapped=True;run(helper('sh',['-c',script],mounts(**{'/data':(data,False)})));compose.write_text(before.replace(old_ref,image));d['status']='starting_candidate';save(record,d);run(base+['up','-d','--no-deps','--pull','never','nodered'])
  for _ in range(90):
   now=json.loads(run(['docker','inspect','hass-nodered']))[0]
   try:
    with urllib.request.urlopen('http://127.0.0.1:1880/',timeout=3) as r:ok=r.status==200
   except:ok=False
   if now['Image']==new_image and now['State']['Running'] and (now['State'].get('Health') or {}).get('Status')=='healthy' and ok:break
   time.sleep(1)
  else:raise RuntimeError('Candidate Node-RED health/origin check failed')
  assert protected()==d['protected_flow_files'],'Protected flow/settings/credential content changed';d['status']='accepted_pending_installed_audit';save(record,d);print(json.dumps(d))
 except Exception:
  d['status']='failed_restoring_previous';save(record,d)
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
   run(helper('sh',['-c',script],mounts(**{'/data':(data,False)})))
  compose.write_text(before);run(base+['up','-d','--no-deps','--pull','never','nodered']);d['status']='previous_restored';save(record,d);raise
else:raise SystemExit('Mode must be prepare or cutover')
