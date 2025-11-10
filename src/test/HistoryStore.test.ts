import * as assert from 'assert';
import * as vscode from 'vscode';
import { HistoryStore } from '../store/HistoryStore';

suite('HistoryStore Test Suite', () => {
	let historyStore: HistoryStore;
	let mockContext: Pick<vscode.ExtensionContext, 'globalState' | 'subscriptions'>;

	setup(() => {
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

	test('should add entry to history', () => {
		const entry = {
			name: 'test.code-workspace',
			path: '/test/test.code-workspace',
			mode: 'newWindow' as const,
			openedAt: new Date().toISOString()
		};
		historyStore.add(entry);
		const sorted = historyStore.getSorted();
		assert.strictEqual(sorted.length, 1);
		assert.strictEqual(sorted[0].path, entry.path);
	});

	test('should add multiple entries', () => {
		historyStore.add({
			name: 'ws1',
			path: '/test/ws1.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-01T00:00:00.000Z'
		});
		historyStore.add({
			name: 'ws2',
			path: '/test/ws2.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-02T00:00:00.000Z'
		});
		historyStore.add({
			name: 'ws3',
			path: '/test/ws3.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-03T00:00:00.000Z'
		});

		const sorted = historyStore.getSorted();
		assert.strictEqual(sorted.length, 3);
		// Most recent should be first
		assert.strictEqual(sorted[0].path, '/test/ws3.code-workspace');
	});

	test('should toggle sort mode', () => {
		// Default is 'recent', so first toggle goes to 'frequency'
		const mode1 = historyStore.toggleSort();
		assert.strictEqual(mode1, 'frequency');
		// Then 'name'
		const mode2 = historyStore.toggleSort();
		assert.strictEqual(mode2, 'name');
		// Then back to 'recent'
		const mode3 = historyStore.toggleSort();
		assert.strictEqual(mode3, 'recent');
	});

	test('should increment count when adding duplicate path', () => {
		const entry = {
			name: 'test.code-workspace',
			path: '/test/test.code-workspace',
			mode: 'newWindow' as const,
			openedAt: '2024-01-01T00:00:00.000Z'
		};
		
		historyStore.add(entry);
		historyStore.add({ ...entry, openedAt: '2024-01-02T00:00:00.000Z' });
		historyStore.add({ ...entry, openedAt: '2024-01-03T00:00:00.000Z' });

		const all = historyStore.getAll();
		assert.strictEqual(all.length, 1);
		assert.strictEqual(all[0].count, 3);
		assert.strictEqual(all[0].openedAt, '2024-01-03T00:00:00.000Z');
	});

	test('should sort by frequency correctly', () => {
		// Add entries with different frequencies
		historyStore.add({
			name: 'ws1',
			path: '/test/ws1.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-01T00:00:00.000Z'
		});
		// ws2 opened twice
		historyStore.add({
			name: 'ws2',
			path: '/test/ws2.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-02T00:00:00.000Z'
		});
		historyStore.add({
			name: 'ws2',
			path: '/test/ws2.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-03T00:00:00.000Z'
		});
		// ws3 opened 3 times
		historyStore.add({
			name: 'ws3',
			path: '/test/ws3.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-04T00:00:00.000Z'
		});
		historyStore.add({
			name: 'ws3',
			path: '/test/ws3.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-05T00:00:00.000Z'
		});
		historyStore.add({
			name: 'ws3',
			path: '/test/ws3.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-06T00:00:00.000Z'
		});

		historyStore.setSortMode('frequency');
		const sorted = historyStore.getSorted();

		assert.strictEqual(sorted.length, 3);
		assert.strictEqual(sorted[0].path, '/test/ws3.code-workspace');
		assert.strictEqual(sorted[0].count, 3);
		assert.strictEqual(sorted[1].path, '/test/ws2.code-workspace');
		assert.strictEqual(sorted[1].count, 2);
		assert.strictEqual(sorted[2].path, '/test/ws1.code-workspace');
		assert.strictEqual(sorted[2].count, 1);
	});

	test('should sort by name correctly', () => {
		historyStore.add({
			name: 'zebra.code-workspace',
			path: '/test/zebra.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-01T00:00:00.000Z'
		});
		historyStore.add({
			name: 'apple.code-workspace',
			path: '/test/apple.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-02T00:00:00.000Z'
		});
		historyStore.add({
			name: 'banana.code-workspace',
			path: '/test/banana.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-03T00:00:00.000Z'
		});

		historyStore.setSortMode('name');
		const sorted = historyStore.getSorted();

		assert.strictEqual(sorted.length, 3);
		assert.strictEqual(sorted[0].name, 'apple.code-workspace');
		assert.strictEqual(sorted[1].name, 'banana.code-workspace');
		assert.strictEqual(sorted[2].name, 'zebra.code-workspace');
	});

	test('should respect history limit', () => {
		// Add 5 entries
		for (let i = 0; i < 5; i++) {
			historyStore.add({
				name: `ws${i}.code-workspace`,
				path: `/test/ws${i}.code-workspace`,
				mode: 'newWindow',
				openedAt: new Date(2024, 0, i + 1).toISOString()
			});
		}

		const all = historyStore.getAll();
		// Default limit is 500, so all 5 should be there
		assert.strictEqual(all.length, 5);

		// Note: To properly test limit, we'd need to mock vscode.workspace.getConfiguration
		// This test verifies the basic behavior exists
	});

	test('should handle empty history', () => {
		const all = historyStore.getAll();
		const sorted = historyStore.getSorted();

		assert.strictEqual(all.length, 0);
		assert.strictEqual(sorted.length, 0);
		assert.ok(Array.isArray(all));
		assert.ok(Array.isArray(sorted));
	});

	test('should maintain most recent entry at top when duplicates added', () => {
		historyStore.add({
			name: 'ws1',
			path: '/test/ws1.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-01T00:00:00.000Z'
		});
		historyStore.add({
			name: 'ws2',
			path: '/test/ws2.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-02T00:00:00.000Z'
		});
		historyStore.add({
			name: 'ws3',
			path: '/test/ws3.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-03T00:00:00.000Z'
		});

		// Re-open ws1 (oldest) - should move to top
		historyStore.add({
			name: 'ws1',
			path: '/test/ws1.code-workspace',
			mode: 'newWindow',
			openedAt: '2024-01-04T00:00:00.000Z'
		});

		const sorted = historyStore.getSorted();
		assert.strictEqual(sorted.length, 3);
		assert.strictEqual(sorted[0].path, '/test/ws1.code-workspace');
		assert.strictEqual(sorted[0].openedAt, '2024-01-04T00:00:00.000Z');
	});

	test('should get and set sort mode', () => {
		assert.strictEqual(historyStore.getSortMode(), 'recent');
		
		historyStore.setSortMode('frequency');
		assert.strictEqual(historyStore.getSortMode(), 'frequency');
		
		historyStore.setSortMode('name');
		assert.strictEqual(historyStore.getSortMode(), 'name');
	});
});
