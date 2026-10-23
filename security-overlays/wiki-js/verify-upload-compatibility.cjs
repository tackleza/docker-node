// Ordinary small multipart requests against the application's installed upload helper.
const assert = require('node:assert/strict');
const http = require('node:http');
const { createRequire } = require('node:module');
const requireApp = createRequire('/opt/wiki-security-deps/node_modules/apollo-server-express-v2/package.json');
const helperFile = requireApp.resolve('@apollographql/graphql-upload-8-fork');
const requireHelper = createRequire(helperFile);
const busboyFile = requireHelper.resolve('busboy/package.json');
assert.equal(require(busboyFile).name, '@fastify/busboy');
assert.equal(require(busboyFile).version, '3.2.4');
const { processRequest } = requireApp('@apollographql/graphql-upload-8-fork');
const deadline = setTimeout(() => { console.error('Upload compatibility check timed out'); process.exit(1); }, 15000);
const server = http.createServer(async (req, res) => {
  try {
    const operation = await processRequest(req, res, { maxFileSize: 1024, maxFiles: 2 });
    const uploads = Array.isArray(operation.variables.files) ? operation.variables.files : [operation.variables.file];
    const result = [];
    for (const upload of uploads) {
      const file = await (upload && typeof upload.then === 'function' ? upload : upload.promise);
      assert.equal(typeof file.createReadStream, 'function');
      const parts = [];
      for await (const part of file.createReadStream()) parts.push(part);
      result.push({ filename: file.filename, mimetype: file.mimetype, content: Buffer.concat(parts).toString('utf8') });
    }
    res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(result));
  } catch (error) { console.error(error.name + ': ' + error.message); res.statusCode = 500; res.end('Compatibility fixture failed'); }
});
function request(count) {
  const boundary = 'ordinary-wiki-upload-fixture';
  const variables = count === 1 ? { file: null } : { files: [null, null] };
  const map = count === 1 ? { '0': ['variables.file'] } : { '0': ['variables.files.0'], '1': ['variables.files.1'] };
  let body = '';
  for (const [name, value] of [['operations', JSON.stringify({ query: 'query Fixture { __typename }', variables })], ['map', JSON.stringify(map)]]) {
    body += `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;
  }
  for (let index = 0; index < count; index++) {
    body += `--${boundary}\r\nContent-Disposition: form-data; name="${index}"; filename="fixture-${index}.txt"\r\nContent-Type: text/plain\r\n\r\nordinary file ${index}\r\n`;
  }
  body += `--${boundary}--\r\n`;
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: server.address().port, method: 'POST', headers: { 'content-type': `multipart/form-data; boundary=${boundary}`, 'content-length': Buffer.byteLength(body) } }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('end', () => {
        try { assert.equal(res.statusCode, 200); resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (error) { reject(error); }
      });
    });
    req.on('error', reject); req.end(body);
  });
}
server.listen(0, '127.0.0.1', async () => {
  try {
    for (const count of [1, 2]) {
      assert.deepEqual(await request(count), Array.from({ length: count }, (_, index) => ({ filename: `fixture-${index}.txt`, mimetype: 'text/plain', content: `ordinary file ${index}` })));
    }
    console.log('Actual Apollo upload helper: normal single/multiple file metadata and contents preserved');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { clearTimeout(deadline); server.close(); }
});
