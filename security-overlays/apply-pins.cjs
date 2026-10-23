'use strict';
const fs = require('node:fs');
const [manifest, pinsPath] = process.argv.slice(2);
const pkg = JSON.parse(fs.readFileSync(manifest));
const pins = JSON.parse(fs.readFileSync(pinsPath));
for (const [name, version] of Object.entries(pins.dependencies || {})) {
  if (!Object.hasOwn(pkg.dependencies || {}, name)) throw new Error(`Missing reviewed dependency ${name}`);
  pkg.dependencies[name] = version;
}
pkg.overrides = {...(pkg.overrides || {}), ...(pins.overrides || {})};
fs.writeFileSync(manifest, JSON.stringify(pkg, null, 2) + '\n');
