import { writeFileSync } from 'node:fs';
import { defineConfig, mergeConfig, type Plugin } from 'vite';

import baseConfig from './vite.config.mts';

const evidence: Plugin = {
	name: 'record-markdown-build-inputs',
	generateBundle(_options, bundle) {
		const chunks: Array<{ file: string; modules: string[] }> = [];
		for (const output of Object.values(bundle)) {
			if (output.type !== 'chunk') continue;
			const modules = Object.keys(output.modules).filter((id) =>
				id.includes('/node_modules/markdown-it/'),
			);
			if (modules.length > 0) {
				if (modules.some((id) => !id.includes('/markdown-it@14.3.3/'))) {
					throw new Error('The editor used an unexpected Markdown version');
				}
				chunks.push({ file: output.fileName, modules });
			}
		}
		if (chunks.length === 0) throw new Error('The editor has no recorded Markdown inputs');
		writeFileSync(
			'/out/editor-markdown-modules.json',
			JSON.stringify(
				{ upstream: 'b58d9e89d60e9a3485bb511c5091d8be0d9511e4', version: '14.3.3', chunks },
				null,
				2,
			),
		);
	},
};

export default defineConfig(mergeConfig(baseConfig, { plugins: [evidence] }));
