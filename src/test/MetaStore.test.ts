import * as assert from 'assert';
import * as vscode from 'vscode';
import { MetaStore } from '../store/MetaStore';

suite('MetaStore Test Suite', () => {
	let metaStore: MetaStore;
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
		metaStore = new MetaStore(mockContext as vscode.ExtensionContext);
	});

	test('should set and get label', () => {
		const path = '/test/workspace.code-workspace';
		metaStore.set(path, { label: 'Test Label' });
		const meta = metaStore.get(path);
		assert.strictEqual(meta?.label, 'Test Label');
	});

	test('should set and get color', () => {
		const path = '/test/workspace.code-workspace';
		metaStore.set(path, { color: 'red' });
		const meta = metaStore.get(path);
		assert.strictEqual(meta?.color, 'red');
	});

	test('should get all unique labels', () => {
		metaStore.set('/test/ws1.code-workspace', { label: 'Label1' });
		metaStore.set('/test/ws2.code-workspace', { label: 'Label2' });
		metaStore.set('/test/ws3.code-workspace', { label: 'Label1' });
		const labels = metaStore.getAllLabels();
		assert.strictEqual(labels.length, 2);
		assert.ok(labels.includes('Label1'));
		assert.ok(labels.includes('Label2'));
	});

	test('should get all unique colors', () => {
		metaStore.set('/test/ws1.code-workspace', { color: 'red' });
		metaStore.set('/test/ws2.code-workspace', { color: 'blue' });
		metaStore.set('/test/ws3.code-workspace', { color: 'red' });
		const colors = metaStore.getAllColors();
		assert.strictEqual(colors.length, 2);
		assert.ok(colors.includes('red'));
		assert.ok(colors.includes('blue'));
	});

	test('should merge metadata on partial update', () => {
		const path = '/test/workspace.code-workspace';
		
		// Set label first
		metaStore.set(path, { label: 'Test Label' });
		let meta = metaStore.get(path);
		assert.strictEqual(meta?.label, 'Test Label');
		assert.strictEqual(meta?.color, undefined);
		
		// Add color, label should be preserved
		metaStore.set(path, { color: 'blue' });
		meta = metaStore.get(path);
		assert.strictEqual(meta?.label, 'Test Label');
		assert.strictEqual(meta?.color, 'blue');
	});

	test('should set label and color simultaneously', () => {
		const path = '/test/workspace.code-workspace';
		metaStore.set(path, { label: 'My Project', color: 'green' });
		
		const meta = metaStore.get(path);
		assert.strictEqual(meta?.label, 'My Project');
		assert.strictEqual(meta?.color, 'green');
	});

	test('should return undefined for non-existent path', () => {
		const meta = metaStore.get('/non/existent/path.code-workspace');
		assert.strictEqual(meta, undefined);
	});

	test('should handle empty metadata store', () => {
		const all = metaStore.getAll();
		const labels = metaStore.getAllLabels();
		const colors = metaStore.getAllColors();
		
		assert.deepStrictEqual(all, {});
		assert.strictEqual(labels.length, 0);
		assert.strictEqual(colors.length, 0);
		assert.ok(Array.isArray(labels));
		assert.ok(Array.isArray(colors));
	});

	test('should return sorted labels', () => {
		metaStore.set('/test/ws1.code-workspace', { label: 'Zebra' });
		metaStore.set('/test/ws2.code-workspace', { label: 'Apple' });
		metaStore.set('/test/ws3.code-workspace', { label: 'Banana' });
		
		const labels = metaStore.getAllLabels();
		assert.strictEqual(labels.length, 3);
		assert.strictEqual(labels[0], 'Apple');
		assert.strictEqual(labels[1], 'Banana');
		assert.strictEqual(labels[2], 'Zebra');
	});

	test('should return sorted colors', () => {
		metaStore.set('/test/ws1.code-workspace', { color: 'yellow' });
		metaStore.set('/test/ws2.code-workspace', { color: 'blue' });
		metaStore.set('/test/ws3.code-workspace', { color: 'red' });
		
		const colors = metaStore.getAllColors();
		assert.strictEqual(colors.length, 3);
		assert.strictEqual(colors[0], 'blue');
		assert.strictEqual(colors[1], 'red');
		assert.strictEqual(colors[2], 'yellow');
	});

	test('should ignore entries without label when getting all labels', () => {
		metaStore.set('/test/ws1.code-workspace', { label: 'Label1' });
		metaStore.set('/test/ws2.code-workspace', { color: 'red' }); // no label
		metaStore.set('/test/ws3.code-workspace', { label: 'Label2' });
		
		const labels = metaStore.getAllLabels();
		assert.strictEqual(labels.length, 2);
		assert.ok(labels.includes('Label1'));
		assert.ok(labels.includes('Label2'));
	});

	test('should ignore entries without color when getting all colors', () => {
		metaStore.set('/test/ws1.code-workspace', { color: 'red' });
		metaStore.set('/test/ws2.code-workspace', { label: 'Label' }); // no color
		metaStore.set('/test/ws3.code-workspace', { color: 'blue' });
		
		const colors = metaStore.getAllColors();
		assert.strictEqual(colors.length, 2);
		assert.ok(colors.includes('red'));
		assert.ok(colors.includes('blue'));
	});

	test('should update existing label', () => {
		const path = '/test/workspace.code-workspace';
		
		metaStore.set(path, { label: 'Old Label' });
		assert.strictEqual(metaStore.get(path)?.label, 'Old Label');
		
		metaStore.set(path, { label: 'New Label' });
		assert.strictEqual(metaStore.get(path)?.label, 'New Label');
	});

	test('should update existing color', () => {
		const path = '/test/workspace.code-workspace';
		
		metaStore.set(path, { color: 'red' });
		assert.strictEqual(metaStore.get(path)?.color, 'red');
		
		metaStore.set(path, { color: 'blue' });
		assert.strictEqual(metaStore.get(path)?.color, 'blue');
	});
});
