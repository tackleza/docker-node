'use strict';
// Restore symlink inode ownership from archive headers without following targets.
const fs=require('node:fs'),path=require('node:path');
const root=fs.realpathSync(process.argv[2]);const entries=JSON.parse(fs.readFileSync(process.argv[3]));let repaired=0;
for(const e of entries){if(path.isAbsolute(e.path))throw new Error('Absolute archive path rejected');const target=path.resolve(root,e.path);if(!target.startsWith(root+path.sep))throw new Error('Archive path escapes owned restore tree');let s;try{s=fs.lstatSync(target)}catch(err){if(err.code==='ENOENT')continue;throw err;}if(!s.isSymbolicLink())throw new Error('Expected restored symlink');const parent=fs.realpathSync(path.dirname(target));if(parent!==root&&!parent.startsWith(root+path.sep))throw new Error('Symlink ancestor escapes owned restore tree');if(!Number.isInteger(e.uid)||!Number.isInteger(e.gid)||e.uid<0||e.gid<0)throw new Error('Invalid archive ownership');fs.lchownSync(target,e.uid,e.gid);repaired++;}
console.log(JSON.stringify({ok:true,repairedSymlinkOwners:repaired}));
