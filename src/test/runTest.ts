import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
	try {
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');
		const extensionTestsPath = path.resolve(__dirname, './suite/index');

		// Codex/VS Code extension-host shells may set this, which makes Electron
		// start as Node and reject VS Code extension-test flags.
		delete process.env.ELECTRON_RUN_AS_NODE;

		await runTests({ extensionDevelopmentPath, extensionTestsPath });
	} catch (err) {
		console.error('Failed to run tests', err);
		process.exit(1);
	}
}

void main();
