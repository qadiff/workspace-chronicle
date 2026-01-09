import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { randomUUID } from 'crypto';
import { ColorAliasStore } from '../store/ColorAliasStore';
import { setStorageDirOverride } from '../store/FileStore';

suite('ColorAliasStore Test Suite', () => {
	let colorAliasStore: ColorAliasStore;
	let mockContext: Pick<vscode.ExtensionContext, 'globalState' | 'subscriptions'>;
	let testDir: string;

	setup(async () => {
		// Create unique test directory for each test
		testDir = path.join(os.tmpdir(), `workspace-chronicle-test-${randomUUID()}`);
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
		colorAliasStore = new ColorAliasStore(mockContext as vscode.ExtensionContext);
	});

	teardown(async () => {
		setStorageDirOverride(null);
		try {
			await fs.rm(testDir, { recursive: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	test('should set and get alias', async () => {
		await colorAliasStore.set('red', 'Important');
		const alias = await colorAliasStore.get('red');
		assert.strictEqual(alias, 'Important');
	});

	test('should return undefined for non-existent alias', async () => {
		const alias = await colorAliasStore.get('blue');
		assert.strictEqual(alias, undefined);
	});

	test('should clear alias when set to undefined', async () => {
		await colorAliasStore.set('red', 'Important');
		assert.strictEqual(await colorAliasStore.get('red'), 'Important');

		await colorAliasStore.set('red', undefined);
		assert.strictEqual(await colorAliasStore.get('red'), undefined);
	});

	test('should update existing alias', async () => {
		await colorAliasStore.set('red', 'Important');
		assert.strictEqual(await colorAliasStore.get('red'), 'Important');

		await colorAliasStore.set('red', 'Urgent');
		assert.strictEqual(await colorAliasStore.get('red'), 'Urgent');
	});

	test('should get all aliases', async () => {
		await colorAliasStore.set('red', 'Important');
		await colorAliasStore.set('blue', 'In Progress');
		await colorAliasStore.set('green', 'Done');

		const all = await colorAliasStore.getAll();
		assert.strictEqual(Object.keys(all).length, 3);
		assert.strictEqual(all['red'], 'Important');
		assert.strictEqual(all['blue'], 'In Progress');
		assert.strictEqual(all['green'], 'Done');
	});

	test('should return empty object when no aliases set', async () => {
		const all = await colorAliasStore.getAll();
		assert.deepStrictEqual(all, {});
	});

	test('should get display name with alias', async () => {
		await colorAliasStore.set('red', 'Important');
		const displayName = await colorAliasStore.getDisplayName('red');
		assert.strictEqual(displayName, 'Important (red)');
	});

	test('should get display name without alias', async () => {
		const displayName = await colorAliasStore.getDisplayName('blue');
		assert.strictEqual(displayName, 'blue');
	});

	test('should import all aliases', async () => {
		await colorAliasStore.set('red', 'Existing');

		await colorAliasStore.importAll({
			'blue': 'In Progress',
			'green': 'Done'
		});

		const all = await colorAliasStore.getAll();
		assert.strictEqual(all['red'], 'Existing'); // preserved
		assert.strictEqual(all['blue'], 'In Progress');
		assert.strictEqual(all['green'], 'Done');
	});

	test('should overwrite existing aliases on import', async () => {
		await colorAliasStore.set('red', 'Old Value');

		await colorAliasStore.importAll({
			'red': 'New Value'
		});

		const alias = await colorAliasStore.get('red');
		assert.strictEqual(alias, 'New Value');
	});

	test('should ignore empty strings in importAll', async () => {
		await colorAliasStore.importAll({
			'red': 'Important',
			'blue': '' // empty string should be ignored
		});

		const all = await colorAliasStore.getAll();
		assert.strictEqual(all['red'], 'Important');
		assert.strictEqual(all['blue'], undefined);
	});

	test('should persist aliases to file', async () => {
		await colorAliasStore.set('red', 'Important');
		await colorAliasStore.set('blue', 'In Progress');

		// Create a new store instance to verify persistence
		const newStore = new ColorAliasStore(mockContext as vscode.ExtensionContext);
		const alias = await newStore.get('red');
		assert.strictEqual(alias, 'Important');

		const all = await newStore.getAll();
		assert.strictEqual(all['blue'], 'In Progress');
	});

	test('should handle multiple colors independently', async () => {
		await colorAliasStore.set('red', 'Important');
		await colorAliasStore.set('blue', 'In Progress');
		await colorAliasStore.set('green', 'Done');

		// Clear one color
		await colorAliasStore.set('blue', undefined);

		assert.strictEqual(await colorAliasStore.get('red'), 'Important');
		assert.strictEqual(await colorAliasStore.get('blue'), undefined);
		assert.strictEqual(await colorAliasStore.get('green'), 'Done');
	});

	test('should handle Japanese characters in alias', async () => {
		await colorAliasStore.set('red', '重要');
		await colorAliasStore.set('blue', '進行中');

		assert.strictEqual(await colorAliasStore.get('red'), '重要');
		assert.strictEqual(await colorAliasStore.get('blue'), '進行中');

		const displayName = await colorAliasStore.getDisplayName('red');
		assert.strictEqual(displayName, '重要 (red)');
	});

	test('should reset internal state with _reset', async () => {
		await colorAliasStore.set('red', 'Important');
		assert.strictEqual(await colorAliasStore.get('red'), 'Important');

		colorAliasStore._reset();

		// After reset, cache is cleared but file still exists
		// So get should still return the value from file
		const alias = await colorAliasStore.get('red');
		assert.strictEqual(alias, 'Important');
	});
});
