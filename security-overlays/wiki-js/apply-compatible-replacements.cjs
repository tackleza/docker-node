const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const changes = require('./compatible-replacements.json')
const originalOwners = new Map()
for (const change of changes) {
  assert(change.path.startsWith('/wiki/node_modules/') || ['/opt/wiki-security-deps/node_modules/busboy', '/opt/wiki-security-deps/node_modules/fs-capacitor'].includes(change.path))
  assert(change.target.startsWith('/wiki/node_modules/') || change.target.startsWith('/opt/wiki-security-deps/node_modules/'))
  const current = JSON.parse(fs.readFileSync(path.join(change.path, 'package.json')))
  const target = JSON.parse(fs.readFileSync(path.join(change.target, 'package.json')))
  assert.equal(current.version, change.expected, 'Unexpected pinned vendor package version')
  assert.equal(target.name, current.name === 'passport-saml' ? '@node-saml/passport-saml' : current.name === 'busboy' ? '@fastify/busboy' : current.name, 'Replacement package name differs')
  assert.equal(target.version, change.version, 'Replacement package version differs')
  if (target.version.split('.')[0] !== current.version.split('.')[0]) {
    const migrations = { 'simple-git': ['3.30.0', '4.0.2'], tar: ['6.2.1', '7.5.22'], 'passport-saml': ['3.2.4', '5.1.1'], multer: ['1.4.4', '2.5.0'], 'node-fetch': ['1.7.3', '2.7.0'], busboy: ['0.3.1', '3.2.4'], 'fs-capacitor': ['2.0.4', '8.0.0'] }
    assert.deepEqual([current.version, target.version], migrations[current.name], 'Unvalidated major migration refused')
    assert(change.validatedMajorMigration)
  }
  assert.notEqual(fs.realpathSync(change.path), fs.realpathSync(change.target))
  const original = fs.lstatSync(change.path)
  originalOwners.set(change.path, { uid: original.uid, gid: original.gid })
}
for (const change of changes) {
  fs.rmSync(change.path, { recursive: true })
  fs.symlinkSync(change.target, change.path, 'dir')
  const owner = originalOwners.get(change.path)
  fs.lchownSync(change.path, owner.uid, owner.gid)
  assert.equal(JSON.parse(fs.readFileSync(path.join(change.path, 'package.json'))).version, change.version)
}
console.log(JSON.stringify({ pinnedPackageReplacements: changes.length, pinnedVendorPathsVerified: true }))
