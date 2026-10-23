const fs=require('node:fs'),assert=require('node:assert/strict');
const file='/wiki/server/modules/storage/git/storage.js';const source=fs.readFileSync(file,'utf8');const old="const sgit = require('simple-git')\n";assert.equal(source.split(old).length,2,'Unexpected pinned Wiki Git adapter');const factory="sgit(this.repoPath, { maxConcurrentProcesses: 1 })";assert.equal(source.split(factory).length,2);
fs.writeFileSync(file,source.replace(old,"const { simpleGit: sgit } = require('simple-git')\n").replace(factory,"sgit(this.repoPath, { maxConcurrentProcesses: 1, unsafe: { allowUnsafeSshCommand: this.config.authType === 'ssh' } })"));
console.log(JSON.stringify({git4NamedFactoryMigration:true}));
