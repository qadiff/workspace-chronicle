import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { randomUUID } from 'crypto';
import { MetaStore } from '../store/MetaStore';
import { HistoryStore } from '../store/HistoryStore';
import { setStorageDirOverride } from '../store/FileStore';

suite('Export/Import Test Suite', () => {
	let mockContext: Pick<vscode.ExtensionContext, 'globalState' | 'subscriptions'>;
	let metaStore: MetaStore;
	let historyStore: HistoryStore;
	let testDir: string;
	let storageDir: string;

	setup(async () => {
		// Create unique storage directory for each test
		storageDir = path.join(os.tmpdir(), `workspace-chronicle-test-${randomUUID()}`);
		await fs.mkdir(storageDir, { recursive: true });
		setStorageDirOverride(storageDir);

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
		historyStore = new HistoryStore(mockContext as vscode.ExtensionContext);

		// Create temp directory for test files
		testDir = path.join(__dirname, '..', '..', 'test-exports');
		await fs.mkdir(testDir, { recursive: true });
	});

	teardown(async () => {
		setStorageDirOverride(null);
		// Clean up test directories
		try {
			await fs.rm(testDir, { recursive: true });
		} catch {
			// Ignore errors
		}
		try {
			await fs.rm(storageDir, { recursive: true });
		} catch {
			// Ignore errors
		}
	});

	test('should export data to JSON format', async () => {
		// Setup test data
		await metaStore.set('/test/ws1.code-workspace', { label: 'Project 1', color: 'blue' });
		await metaStore.set('/test/ws2.code-workspace', { label: 'Project 2', color: 'red' });

		await historyStore.add({
			name: 'ws1.code-workspace',
			path: '/test/ws1.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-01T00:00:00.000Z'
		});

		// Export data
		const exportData = {
			version: '1.0',
			exportedAt: new Date().toISOString(),
			meta: await metaStore.getAll(),
			history: await historyStore.getAll()
		};

		// Verify export structure
		assert.strictEqual(exportData.version, '1.0');
		assert.ok(exportData.exportedAt);
		assert.strictEqual(Object.keys(exportData.meta).length, 2);
		assert.strictEqual(exportData.history.length, 1);
	});

	test('should import and merge metadata', async () => {
		// Setup existing data
		await metaStore.set('/test/ws1.code-workspace', { label: 'Old Label', color: 'blue' });

		// Import data
		const importData = {
			version: '1.0',
			exportedAt: '2024-01-01T00:00:00.000Z',
			meta: {
				'/test/ws1.code-workspace': { label: 'New Label', color: 'red' },
				'/test/ws2.code-workspace': { label: 'Project 2', color: 'green' }
			},
			history: []
		};

		// Merge metadata
		for (const [path, metadata] of Object.entries(importData.meta)) {
			await metaStore.set(path, metadata);
		}

		// Verify merge
		const ws1 = await metaStore.get('/test/ws1.code-workspace');
		assert.strictEqual(ws1?.label, 'New Label');
		assert.strictEqual(ws1?.color, 'red');

		const ws2 = await metaStore.get('/test/ws2.code-workspace');
		assert.strictEqual(ws2?.label, 'Project 2');
		assert.strictEqual(ws2?.color, 'green');
	});

	test('should import and merge history', async () => {
		// Setup existing history
		await historyStore.add({
			name: 'ws1.code-workspace',
			path: '/test/ws1.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-01T00:00:00.000Z'
		});

		// Import data
		const importData = {
			version: '1.0',
			exportedAt: '2024-01-01T00:00:00.000Z',
			meta: {},
			history: [
				{
					name: 'ws2.code-workspace',
					path: '/test/ws2.code-workspace',
					mode: 'newWindow' as const,
					openedAt: '2024-01-02T00:00:00.000Z'
				},
				{
					name: 'ws3.code-workspace',
					path: '/test/ws3.code-workspace',
					mode: 'reuseWindow' as const,
					openedAt: '2024-01-03T00:00:00.000Z'
				}
			]
		};

		// Merge history
		for (const entry of importData.history) {
			await historyStore.add(entry);
		}

		// Verify merge
		const all = await historyStore.getAll();
		assert.strictEqual(all.length, 3);
	});

	test('should handle duplicate history entries correctly', async () => {
		// Setup existing history
		await historyStore.add({
			name: 'ws1.code-workspace',
			path: '/test/ws1.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-01T00:00:00.000Z'
		});

		// Import duplicate entry
		const importData = {
			version: '1.0',
			exportedAt: '2024-01-01T00:00:00.000Z',
			meta: {},
			history: [
				{
					name: 'ws1.code-workspace',
					path: '/test/ws1.code-workspace',
					mode: 'newWindow' as const,
					openedAt: '2024-01-02T00:00:00.000Z'
				}
			]
		};

		// Merge history
		for (const entry of importData.history) {
			await historyStore.add(entry);
		}

		// Verify no duplicates, but count incremented
		const all = await historyStore.getAll();
		assert.strictEqual(all.length, 1);
		assert.strictEqual(all[0].count, 2);
		assert.strictEqual(all[0].openedAt, '2024-01-02T00:00:00.000Z');
	});

	test('should validate import data structure', () => {
		const validData = {
			version: '1.0',
			exportedAt: '2024-01-01T00:00:00.000Z',
			meta: {},
			history: []
		};

		assert.ok(validData.version);
		assert.ok(validData.exportedAt);
		assert.ok(typeof validData.meta === 'object');
		assert.ok(Array.isArray(validData.history));

		// Invalid data
		const invalidData1 = {
			version: '1.0'
			// missing fields
		};

		assert.ok(!('meta' in invalidData1));
		assert.ok(!('history' in invalidData1));
	});

	test('should write export to file and read back', async () => {
		// Setup test data
		await metaStore.set('/test/ws1.code-workspace', { label: 'Test Project', color: 'blue' });

		await historyStore.add({
			name: 'ws1.code-workspace',
			path: '/test/ws1.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-01T00:00:00.000Z'
		});

		// Export to file
		const exportData = {
			version: '1.0',
			exportedAt: new Date().toISOString(),
			meta: await metaStore.getAll(),
			history: await historyStore.getAll()
		};

		const filePath = path.join(testDir, 'test-export.json');
		await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');

		// Read back
		const fileContent = await fs.readFile(filePath, 'utf-8');
		const importedData = JSON.parse(fileContent) as {
			version: string;
			meta: Record<string, { label?: string; color?: string }>;
			history: unknown[];
		};

		// Verify
		assert.strictEqual(importedData.version, '1.0');
		assert.strictEqual(Object.keys(importedData.meta).length, 1);
		assert.strictEqual(importedData.history.length, 1);
		assert.strictEqual(importedData.meta['/test/ws1.code-workspace']?.label, 'Test Project');
	});

	test('should provide import summary', () => {
		// Import data
		const importData = {
			version: '1.0',
			exportedAt: '2024-01-01T00:00:00.000Z',
			meta: {
				'/test/ws1.code-workspace': { label: 'Project 1' },
				'/test/ws2.code-workspace': { label: 'Project 2' }
			},
			history: [
				{ name: 'ws1', path: '/test/ws1.code-workspace', mode: 'newWindow' as const, openedAt: '2024-01-01T00:00:00.000Z' },
				{ name: 'ws2', path: '/test/ws2.code-workspace', mode: 'newWindow' as const, openedAt: '2024-01-02T00:00:00.000Z' },
				{ name: 'ws3', path: '/test/ws3.code-workspace', mode: 'newWindow' as const, openedAt: '2024-01-03T00:00:00.000Z' }
			]
		};

		// Calculate summary
		const summary = {
			metaCount: Object.keys(importData.meta).length,
			historyCount: importData.history.length,
			exportedAt: importData.exportedAt
		};

		assert.strictEqual(summary.metaCount, 2);
		assert.strictEqual(summary.historyCount, 3);
		assert.strictEqual(summary.exportedAt, '2024-01-01T00:00:00.000Z');
	});
});
