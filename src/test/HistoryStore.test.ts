import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { HistoryStore } from '../store/HistoryStore';
import { setStorageDirOverride } from '../store/FileStore';

suite('HistoryStore Test Suite', () => {
	let historyStore: HistoryStore;
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
		historyStore = new HistoryStore(mockContext as vscode.ExtensionContext);
	});

	teardown(async () => {
		setStorageDirOverride(null);
		try {
			await fs.rm(testDir, { recursive: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	test('should add entry to history', async () => {
		const entry = {
			name: 'test.code-workspace',
			path: '/test/test.code-workspace',
			mode: 'newWindow' as const,
			openedAt: new Date().toISOString()
		};
		await historyStore.add(entry);
		const sorted = await historyStore.getSorted();
		assert.strictEqual(sorted.length, 1);
		assert.strictEqual(sorted[0].path, entry.path);
	});

	test('should add multiple entries', async () => {
		await historyStore.add({
			name: 'ws1',
			path: '/test/ws1.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-01T00:00:00.000Z'
		});
		await historyStore.add({
			name: 'ws2',
			path: '/test/ws2.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-02T00:00:00.000Z'
		});
		await historyStore.add({
			name: 'ws3',
			path: '/test/ws3.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-03T00:00:00.000Z'
		});

		const sorted = await historyStore.getSorted();
		assert.strictEqual(sorted.length, 3);
		// Most recent should be first
		assert.strictEqual(sorted[0].path, '/test/ws3.code-workspace');
	});

	test('should toggle sort mode', async () => {
		// Default is 'recent', so first toggle goes to 'frequency'
		const mode1 = await historyStore.toggleSort();
		assert.strictEqual(mode1, 'frequency');
		// Then 'name'
		const mode2 = await historyStore.toggleSort();
		assert.strictEqual(mode2, 'name');
		// Then back to 'recent'
		const mode3 = await historyStore.toggleSort();
		assert.strictEqual(mode3, 'recent');
	});

	test('should increment count when adding duplicate path', async () => {
		const entry = {
			name: 'test.code-workspace',
			path: '/test/test.code-workspace',
			mode: 'newWindow' as const,
			openedAt: '2024-01-01T00:00:00.000Z'
		};

		await historyStore.add(entry);
		await historyStore.add({ ...entry, openedAt: '2024-01-02T00:00:00.000Z' });
		await historyStore.add({ ...entry, openedAt: '2024-01-03T00:00:00.000Z' });

		const all = await historyStore.getAll();
		assert.strictEqual(all.length, 1);
		assert.strictEqual(all[0].count, 3);
		assert.strictEqual(all[0].openedAt, '2024-01-03T00:00:00.000Z');
	});

	test('should sort by frequency correctly', async () => {
		// Add entries with different frequencies
		await historyStore.add({
			name: 'ws1',
			path: '/test/ws1.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-01T00:00:00.000Z'
		});
		// ws2 opened twice
		await historyStore.add({
			name: 'ws2',
			path: '/test/ws2.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-02T00:00:00.000Z'
		});
		await historyStore.add({
			name: 'ws2',
			path: '/test/ws2.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-03T00:00:00.000Z'
		});
		// ws3 opened 3 times
		await historyStore.add({
			name: 'ws3',
			path: '/test/ws3.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-04T00:00:00.000Z'
		});
		await historyStore.add({
			name: 'ws3',
			path: '/test/ws3.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-05T00:00:00.000Z'
		});
		await historyStore.add({
			name: 'ws3',
			path: '/test/ws3.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-06T00:00:00.000Z'
		});

		await historyStore.setSortMode('frequency');
		const sorted = await historyStore.getSorted();

		assert.strictEqual(sorted.length, 3);
		assert.strictEqual(sorted[0].path, '/test/ws3.code-workspace');
		assert.strictEqual(sorted[0].count, 3);
		assert.strictEqual(sorted[1].path, '/test/ws2.code-workspace');
		assert.strictEqual(sorted[1].count, 2);
		assert.strictEqual(sorted[2].path, '/test/ws1.code-workspace');
		assert.strictEqual(sorted[2].count, 1);
	});

	test('should sort by name correctly', async () => {
		await historyStore.add({
			name: 'zebra.code-workspace',
			path: '/test/zebra.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-01T00:00:00.000Z'
		});
		await historyStore.add({
			name: 'apple.code-workspace',
			path: '/test/apple.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-02T00:00:00.000Z'
		});
		await historyStore.add({
			name: 'banana.code-workspace',
			path: '/test/banana.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-03T00:00:00.000Z'
		});

		await historyStore.setSortMode('name');
		const sorted = await historyStore.getSorted();

		assert.strictEqual(sorted.length, 3);
		assert.strictEqual(sorted[0].name, 'apple.code-workspace');
		assert.strictEqual(sorted[1].name, 'banana.code-workspace');
		assert.strictEqual(sorted[2].name, 'zebra.code-workspace');
	});

	test('should respect history limit', async () => {
		// Add 5 entries
		for (let i = 0; i < 5; i++) {
			await historyStore.add({
				name: `ws${i}.code-workspace`,
				path: `/test/ws${i}.code-workspace`,
				mode: 'newWindow',
				openedAt: new Date(2024, 0, i + 1).toISOString()
			});
		}

		const all = await historyStore.getAll();
		// Default limit is 500, so all 5 should be there
		assert.strictEqual(all.length, 5);

		// Note: To properly test limit, we'd need to mock vscode.workspace.getConfiguration
		// This test verifies the basic behavior exists
	});

	test('should handle empty history', async () => {
		const all = await historyStore.getAll();
		const sorted = await historyStore.getSorted();

		assert.strictEqual(all.length, 0);
		assert.strictEqual(sorted.length, 0);
		assert.ok(Array.isArray(all));
		assert.ok(Array.isArray(sorted));
	});

	test('should maintain most recent entry at top when duplicates added', async () => {
		await historyStore.add({
			name: 'ws1',
			path: '/test/ws1.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-01T00:00:00.000Z'
		});
		await historyStore.add({
			name: 'ws2',
			path: '/test/ws2.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-02T00:00:00.000Z'
		});
		await historyStore.add({
			name: 'ws3',
			path: '/test/ws3.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-03T00:00:00.000Z'
		});

		// Re-open ws1 (oldest) - should move to top
		await historyStore.add({
			name: 'ws1',
			path: '/test/ws1.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-04T00:00:00.000Z'
		});

		const sorted = await historyStore.getSorted();
		assert.strictEqual(sorted.length, 3);
		assert.strictEqual(sorted[0].path, '/test/ws1.code-workspace');
		assert.strictEqual(sorted[0].openedAt, '2024-01-04T00:00:00.000Z');
	});

	test('should remove a single entry by path', async () => {
		await historyStore.add({
			name: 'ws1',
			path: '/test/ws1.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-01T00:00:00.000Z'
		});
		await historyStore.add({
			name: 'ws2',
			path: '/test/ws2.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-02T00:00:00.000Z'
		});

		assert.strictEqual(await historyStore.remove('/test/ws1.code-workspace'), true);
		const all = await historyStore.getAll();
		assert.strictEqual(all.length, 1);
		assert.strictEqual(all[0].path, '/test/ws2.code-workspace');
	});

	test('remove returns false when path not found', async () => {
		await historyStore.add({
			name: 'ws1',
			path: '/test/ws1.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-01T00:00:00.000Z'
		});
		assert.strictEqual(await historyStore.remove('/test/missing.code-workspace'), false);
	});

	test('clear removes all entries', async () => {
		await historyStore.add({
			name: 'ws1',
			path: '/test/ws1.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-01T00:00:00.000Z'
		});
		await historyStore.add({
			name: 'ws2',
			path: '/test/ws2.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-02T00:00:00.000Z'
		});
		assert.strictEqual((await historyStore.getAll()).length, 2);
		await historyStore.clear();
		assert.strictEqual((await historyStore.getAll()).length, 0);
	});

	test('should get and set sort mode', async () => {
		assert.strictEqual(await historyStore.getSortMode(), 'recent');

		await historyStore.setSortMode('frequency');
		assert.strictEqual(await historyStore.getSortMode(), 'frequency');

		await historyStore.setSortMode('name');
		assert.strictEqual(await historyStore.getSortMode(), 'name');
	});
});
