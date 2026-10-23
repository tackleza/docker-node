// Run inside the built Wiki.js image, without a database or outbound network.
const assert = require('node:assert/strict')
const root = process.argv[2] || '/wiki'
const pkg = require(root + '/package.json')
const renderer = require(root + '/server/modules/rendering/html-security/renderer')
async function main () {
  assert.equal(pkg.version, '2.5.316')
  assert.equal(process.version, 'v24.22.1')
  for (const name of ['sqlite3', 'cpu-features', 'ssh2']) require(root + '/node_modules/' + name)
  const config = { safeHTML: true, allowDrawIoUnsafe: false, allowIFrames: false }
  const tabs = '<tabset><template v-slot:tabs=""><li>Tab</li></template><template v-slot:content=""><p>Content</p></template></tabset>'
  assert.equal(await renderer.init(tabs, config), tabs)
  const expression = '<tabset><template v-slot:tabs="{audit = doNotEvaluate()}"><li>Tab</li></template></tabset>'
  assert.equal(await renderer.init(expression, config), '<tabset><template v-slot:tabs=""><li>Tab</li></template></tabset>')
  assert.equal(await renderer.init('<p v-html="untrustedExpression()" @click="untrustedHandler()">Text</p>', config), '<p>Text</p>')
  console.log(JSON.stringify({ app: pkg.version, node: process.version, nativeModules: true, slotExpressionStripped: true, ordinaryTabsetPreserved: true }))
}
main().catch(() => { console.error('Wiki.js security verification failed'); process.exit(1) })
