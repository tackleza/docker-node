const fs = require('node:fs'),
	assert = require('node:assert/strict'),
	crypto = require('node:crypto');
const { chromium } = require('/usr/local/lib/node_modules/playwright');
const base = 'http://urgent-n8n-ui-fixture:5678';
(async () => {
	const info = JSON.parse(fs.readFileSync('/fixture/frontend-build-info.json'));
	const expected = new Map(
		info.markdown_chunks.map((x) => [x.file, info.files['editor-dist/' + x.file]]),
	);
	const served = new Map(),
		errors = [];
	const browser = await chromium.launch({
		executablePath: '/usr/bin/chromium-browser',
		headless: true,
		args: ['--no-sandbox', '--disable-dev-shm-usage'],
	});
	try {
		const context = await browser.newContext();
		const settings = await context.request.get(base + '/rest/settings');
		assert.equal(settings.status(), 200);
		const setup = await context.request.post(base + '/rest/owner/setup', {
			data: {
				email: 'render-fixture@example.test',
				firstName: 'Rendering',
				lastName: 'Fixture',
				password: 'Fixture-Only-Strong-Password-2026',
			},
		});
		assert.equal(setup.status(), 200);
		const content = '"a '.repeat(64000) + "b' ".repeat(64000);
		const created = await context.request.post(base + '/rest/workflows', {
			data: {
				name: 'Rendering fixture',
				nodes: [
					{
						parameters: { content, width: 800, height: 600 },
						id: 'rendering-sticky',
						name: 'Sticky Note',
						type: 'n8n-nodes-base.stickyNote',
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
				settings: { executionOrder: 'v1' },
			},
		});
		assert.equal(created.status(), 200);
		const workflow = (await created.json()).data;
		assert.ok(workflow.id);
		const page = await context.newPage();
		page.on('pageerror', (e) => errors.push(e.message));
		page.on('response', async (r) => {
			for (const [name, sha] of expected) {
				if (new URL(r.url()).pathname.endsWith('/' + name)) {
					const actual = crypto
						.createHash('sha256')
						.update(await r.body())
						.digest('hex');
					served.set(name, { status: r.status(), sha256: actual, matches: actual === sha });
				}
			}
		});
		const start = Date.now();
		await page.goto(base + '/workflow/' + workflow.id, { waitUntil: 'domcontentloaded' });
		const note = page.locator('[data-test-id="sticky"]').first();
		await note.waitFor({ state: 'visible', timeout: 60000 });
		assert.ok((await note.textContent()).length > 300000);
		assert.equal(await note.locator('script').count(), 0);
		assert.ok(Date.now() - start < 30000);
		await page.waitForTimeout(1000);
		assert.equal(errors.length, 0, 'Unexpected browser exceptions');
		assert.ok(served.size > 0, 'No recorded Markdown chunk fetched');
		for (const value of served.values()) {
			assert.equal(value.status, 200);
			assert.ok(value.matches);
		}
		const record = {
			browser: await browser.version(),
			source_upstream: info.upstream,
			markdown: info.markdown,
			large_sticky_rendered: true,
			synthetic_text_characters: content.length,
			navigation_and_render_ms: Date.now() - start,
			page_errors: errors.length,
			served_markdown_chunks: Object.fromEntries(served),
			private_network_no_outbound: true,
			only_fixture_data: true,
		};
		fs.writeFileSync('/out/browser-accepted.json', JSON.stringify(record, null, 2));
		console.log(JSON.stringify(record));
	} finally {
		await browser.close();
	}
})().catch((e) => {
	fs.writeFileSync('/out/browser-error-private.log', e.stack || String(e), { mode: 0o600 });
	console.error('Browser fixture failed; inspect protected fixture error');
	process.exitCode = 1;
});
