import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { MetaStore } from '../store/MetaStore';
import { setStorageDirOverride } from '../store/FileStore';

suite('MetaStore Test Suite', () => {
	let metaStore: MetaStore;
	let mockContext: Pick<vscode.ExtensionContext, 'globalState' | 'subscriptions'>;
	let testDir: string;

	setup(async () => {
		// Create unique test directory for each test
		testDir = path.join(os.tmpdir(), `workspace-chronicle-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		await fs.mkdir(testDir, { recursive: true });
		setStorageDirOverride(testDir);

		const data = new Map<string, unknown>();
		mockContext = {
			globalState: {
				keys(): readonly string[] {
					return Array.from(data.keys());
				},
				get(key: string, defaultValue?: unknown) {
					return data.has(key) ? data.get(key) : defaultValue;
				},
				update(key: string, value: unknown) {
					data.set(key, value);
					return Promise.resolve();
				},
				setKeysForSync(): void {}
			},
			subscriptions: []
		};
		metaStore = new MetaStore(mockContext as vscode.ExtensionContext);
	});

	teardown(async () => {
		setStorageDirOverride(null);
		try {
			await fs.rm(testDir, { recursive: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	test('should set and get label', async () => {
		const path = '/test/workspace.code-workspace';
		await metaStore.set(path, { label: 'Test Label' });
		const meta = await metaStore.get(path);
		assert.strictEqual(meta?.label, 'Test Label');
	});

	test('should set and get color', async () => {
		const path = '/test/workspace.code-workspace';
		await metaStore.set(path, { color: 'red' });
		const meta = await metaStore.get(path);
		assert.strictEqual(meta?.color, 'red');
	});

	test('should get all unique labels', async () => {
		await metaStore.set('/test/ws1.code-workspace', { label: 'Label1' });
		await metaStore.set('/test/ws2.code-workspace', { label: 'Label2' });
		await metaStore.set('/test/ws3.code-workspace', { label: 'Label1' });
		const labels = await metaStore.getAllLabels();
		assert.strictEqual(labels.length, 2);
		assert.ok(labels.includes('Label1'));
		assert.ok(labels.includes('Label2'));
	});

	test('should get all unique colors', async () => {
		await metaStore.set('/test/ws1.code-workspace', { color: 'red' });
		await metaStore.set('/test/ws2.code-workspace', { color: 'blue' });
		await metaStore.set('/test/ws3.code-workspace', { color: 'red' });
		const colors = await metaStore.getAllColors();
		assert.strictEqual(colors.length, 2);
		assert.ok(colors.includes('red'));
		assert.ok(colors.includes('blue'));
	});

	test('should merge metadata on partial update', async () => {
		const path = '/test/workspace.code-workspace';

		// Set label first
		await metaStore.set(path, { label: 'Test Label' });
		let meta = await metaStore.get(path);
		assert.strictEqual(meta?.label, 'Test Label');
		assert.strictEqual(meta?.color, undefined);

		// Add color, label should be preserved
		await metaStore.set(path, { color: 'blue' });
		meta = await metaStore.get(path);
		assert.strictEqual(meta?.label, 'Test Label');
		assert.strictEqual(meta?.color, 'blue');
	});

	test('should set label and color simultaneously', async () => {
		const path = '/test/workspace.code-workspace';
		await metaStore.set(path, { label: 'My Project', color: 'green' });

		const meta = await metaStore.get(path);
		assert.strictEqual(meta?.label, 'My Project');
		assert.strictEqual(meta?.color, 'green');
	});

	test('should return undefined for non-existent path', async () => {
		const meta = await metaStore.get('/non/existent/path.code-workspace');
		assert.strictEqual(meta, undefined);
	});

	test('should handle empty metadata store', async () => {
		const all = await metaStore.getAll();
		const labels = await metaStore.getAllLabels();
		const colors = await metaStore.getAllColors();

		assert.deepStrictEqual(all, {});
		assert.strictEqual(labels.length, 0);
		assert.strictEqual(colors.length, 0);
		assert.ok(Array.isArray(labels));
		assert.ok(Array.isArray(colors));
	});

	test('should return sorted labels', async () => {
		await metaStore.set('/test/ws1.code-workspace', { label: 'Zebra' });
		await metaStore.set('/test/ws2.code-workspace', { label: 'Apple' });
		await metaStore.set('/test/ws3.code-workspace', { label: 'Banana' });

		const labels = await metaStore.getAllLabels();
		assert.strictEqual(labels.length, 3);
		assert.strictEqual(labels[0], 'Apple');
		assert.strictEqual(labels[1], 'Banana');
		assert.strictEqual(labels[2], 'Zebra');
	});

	test('should return sorted colors', async () => {
		await metaStore.set('/test/ws1.code-workspace', { color: 'yellow' });
		await metaStore.set('/test/ws2.code-workspace', { color: 'blue' });
		await metaStore.set('/test/ws3.code-workspace', { color: 'red' });

		const colors = await metaStore.getAllColors();
		assert.strictEqual(colors.length, 3);
		assert.strictEqual(colors[0], 'blue');
		assert.strictEqual(colors[1], 'red');
		assert.strictEqual(colors[2], 'yellow');
	});

	test('should ignore entries without label when getting all labels', async () => {
		await metaStore.set('/test/ws1.code-workspace', { label: 'Label1' });
		await metaStore.set('/test/ws2.code-workspace', { color: 'red' }); // no label
		await metaStore.set('/test/ws3.code-workspace', { label: 'Label2' });

		const labels = await metaStore.getAllLabels();
		assert.strictEqual(labels.length, 2);
		assert.ok(labels.includes('Label1'));
		assert.ok(labels.includes('Label2'));
	});

	test('should ignore entries without color when getting all colors', async () => {
		await metaStore.set('/test/ws1.code-workspace', { color: 'red' });
		await metaStore.set('/test/ws2.code-workspace', { label: 'Label' }); // no color
		await metaStore.set('/test/ws3.code-workspace', { color: 'blue' });

		const colors = await metaStore.getAllColors();
		assert.strictEqual(colors.length, 2);
		assert.ok(colors.includes('red'));
		assert.ok(colors.includes('blue'));
	});

	test('should update existing label', async () => {
		const path = '/test/workspace.code-workspace';

		await metaStore.set(path, { label: 'Old Label' });
		assert.strictEqual((await metaStore.get(path))?.label, 'Old Label');

		await metaStore.set(path, { label: 'New Label' });
		assert.strictEqual((await metaStore.get(path))?.label, 'New Label');
	});

	test('should update existing color', async () => {
		const path = '/test/workspace.code-workspace';

		await metaStore.set(path, { color: 'red' });
		assert.strictEqual((await metaStore.get(path))?.color, 'red');

		await metaStore.set(path, { color: 'blue' });
		assert.strictEqual((await metaStore.get(path))?.color, 'blue');
	});
});
