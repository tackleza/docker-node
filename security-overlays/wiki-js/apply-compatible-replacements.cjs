const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const changes = require('./compatible-replacements.json')
for (const change of changes) {
  assert(change.path.startsWith('/wiki/node_modules/'))
  assert(change.target.startsWith('/wiki/node_modules/') || change.target.startsWith('/opt/wiki-security-deps/node_modules/'))
  const current = JSON.parse(fs.readFileSync(path.join(change.path, 'package.json')))
  const target = JSON.parse(fs.readFileSync(path.join(change.target, 'package.json')))
  assert.equal(current.version, change.expected, 'Unexpected pinned vendor package version')
  assert.equal(target.name, current.name, 'Replacement package name differs')
  assert.equal(target.version, change.version, 'Replacement package version differs')
  assert.equal(target.version.split('.')[0], current.version.split('.')[0], 'Cross-major replacement refused')
  assert.notEqual(fs.realpathSync(change.path), fs.realpathSync(change.target))
}
for (const change of changes) {
  fs.rmSync(change.path, { recursive: true })
  fs.symlinkSync(change.target, change.path, 'dir')
  assert.equal(JSON.parse(fs.readFileSync(path.join(change.path, 'package.json'))).version, change.version)
}
console.log(JSON.stringify({ sameMajorPackageReplacements: changes.length, pinnedVendorPathsVerified: true }))
