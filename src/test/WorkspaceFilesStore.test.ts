import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { randomUUID } from 'crypto';
import { setStorageDirOverride } from '../store/FileStore';
import {
	createWorkspaceFilesCacheSignature,
	WorkspaceFilesStore
} from '../store/WorkspaceFilesStore';

suite('WorkspaceFilesStore Test Suite', () => {
	let testDir: string;
	let store: WorkspaceFilesStore;

	setup(async () => {
		testDir = path.join(os.tmpdir(), `workspace-chronicle-test-${randomUUID()}`);
		await fs.mkdir(testDir, { recursive: true });
		setStorageDirOverride(testDir);
		store = new WorkspaceFilesStore();
	});

	teardown(async () => {
		setStorageDirOverride(null);
		try {
			await fs.rm(testDir, { recursive: true });
		} catch {
			// ignore cleanup errors
		}
	});

	test('round-trips cached workspace files by signature', async () => {
		const signature = createWorkspaceFilesCacheSignature({
			platform: process.platform,
			roots: ['/a', '/b'],
			ignoreGlobs: ['**/node_modules/**'],
			respectGitignore: true,
			stopAtWorkspaceFile: true
		});

		await store.set(signature, process.platform, ['/a/x.code-workspace', '/b/y.code-workspace'], false);

		const loaded = await store.get(signature, process.platform);
		assert.ok(loaded);
		assert.deepStrictEqual(loaded?.files, ['/a/x.code-workspace', '/b/y.code-workspace']);
		assert.strictEqual(loaded?.partial, false);
	});

	test('returns null when signature does not match', async () => {
		const sig1 = createWorkspaceFilesCacheSignature({
			platform: process.platform,
			roots: ['/a'],
			ignoreGlobs: [],
			respectGitignore: true,
			stopAtWorkspaceFile: true
		});
		const sig2 = createWorkspaceFilesCacheSignature({
			platform: process.platform,
			roots: ['/b'],
			ignoreGlobs: [],
			respectGitignore: true,
			stopAtWorkspaceFile: true
		});

		await store.set(sig1, process.platform, ['/a/x.code-workspace'], false);
		const loaded = await store.get(sig2, process.platform);
		assert.strictEqual(loaded, null);
	});

	test('clear deletes persisted cache', async () => {
		const signature = createWorkspaceFilesCacheSignature({
			platform: process.platform,
			roots: ['/a'],
			ignoreGlobs: [],
			respectGitignore: true,
			stopAtWorkspaceFile: true
		});
		await store.set(signature, process.platform, ['/a/x.code-workspace'], false);
		assert.ok(await store.get(signature, process.platform));

		await store.clear();
		assert.strictEqual(await store.get(signature, process.platform), null);
	});
});
