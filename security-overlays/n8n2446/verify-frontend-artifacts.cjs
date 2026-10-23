const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const base = '/usr/local/lib/node_modules/n8n/node_modules/.pnpm';
const mappings = {
  'editor-dist': base + '/n8n-editor-ui@file++++home+runner+_work+n8n+n8n+packages+frontend+editor-ui/node_modules/n8n-editor-ui/dist',
  'design-system-dist': base + '/@n8n+design-system@file++++home+runner+_work+n8n+n8n+packages+frontend+@n8n+design-system/node_modules/@n8n/design-system/dist',
  'mcp-apps': base + '/@n8n+mcp-apps@file++++home+runner+_work+n8n+n8n+packages+@n8n+mcp-apps/node_modules/@n8n/mcp-apps/dist/apps',
};
const info = JSON.parse(fs.readFileSync('/opt/n8n-security/frontend-build-info.json'));
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex');
if (info.markdown !== '14.3.3' || info.patch_sha256 !== hash(fs.readFileSync('/opt/n8n-security/frontend-source.patch'))) throw new Error('Frontend input mismatch');
const files = {};
for (const [name, root] of Object.entries(mappings)) {
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) files[name + '/' + path.relative(root, file)] = hash(fs.readFileSync(file));
      else throw new Error('Unexpected frontend entry');
    }
  }
  walk(root);
}
const sorted = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
if (JSON.stringify(sorted) !== JSON.stringify(info.files) || hash(JSON.stringify(sorted)) !== info.artifact_set_sha256) throw new Error('Installed frontend differs from the recorded build');
console.log(JSON.stringify({ installed_frontend_files: Object.keys(files).length, markdown: info.markdown, artifact_set_sha256: info.artifact_set_sha256 }));
