const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const output = '/out';
const mappings = {
  'editor-dist': '/src/packages/frontend/editor-ui/dist',
  'design-system-dist': '/src/packages/frontend/@n8n/design-system/dist',
  'mcp-apps': '/src/packages/@n8n/mcp-apps/dist/apps',
};
const files = {};
for (const [name, source] of Object.entries(mappings)) {
  const target = path.join(output, name);
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, { recursive: true, dereference: true });
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) files[path.relative(output, file)] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
      else throw new Error('Unexpected artifact entry');
    }
  }
  walk(target);
}
const modules = JSON.parse(fs.readFileSync('/out/editor-markdown-modules.json'));
if (modules.version !== '14.3.3' || modules.chunks.length === 0) throw new Error('Missing Markdown build evidence');
const sorted = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
const info = {
  upstream: 'b58d9e89d60e9a3485bb511c5091d8be0d9511e4',
  upstream_archive_sha256: '0fc814db5450bf2a94290cc7e11da0411b69ae344c50305f29731c88449b7a83',
  markdown: '14.3.3',
  node: process.version,
  patch_sha256: crypto.createHash('sha256').update(fs.readFileSync('/build/frontend-source.patch')).digest('hex'),
  artifact_set_sha256: crypto.createHash('sha256').update(JSON.stringify(sorted)).digest('hex'),
  files: sorted,
  markdown_chunks: modules.chunks,
};
fs.writeFileSync(path.join(output, 'frontend-build-info.json'), JSON.stringify(info, null, 2));
console.log(JSON.stringify({ frontend_files: Object.keys(files).length, markdown: info.markdown, artifact_set_sha256: info.artifact_set_sha256 }));
