import * as assert from 'assert';
import * as vscode from 'vscode';
import { addRootDirectory, removeRootDirectory, listRootDirectories } from '../commands/configureRoots';

suite('ConfigureRoots Test Suite', () => {
	let mockConfig: {
		roots: string[];
		update: (key: string, value: unknown, target: vscode.ConfigurationTarget) => Promise<void>;
	};

	let originalShowOpenDialog: typeof vscode.window.showOpenDialog;
	let originalShowQuickPick: typeof vscode.window.showQuickPick;
	let originalShowInformationMessage: typeof vscode.window.showInformationMessage;
	let originalGetConfiguration: typeof vscode.workspace.getConfiguration;

	setup(() => {
		// Initialize mock configuration
		mockConfig = {
			roots: ['${userHome}'],
			update: (key: string, value: unknown, _target: vscode.ConfigurationTarget) => {
				if (key === 'roots') {
					mockConfig.roots = value as string[];
				}
				return Promise.resolve();
			}
		};

		// Save original functions
		originalShowOpenDialog = vscode.window.showOpenDialog;
		originalShowQuickPick = vscode.window.showQuickPick;
		originalShowInformationMessage = vscode.window.showInformationMessage;
		originalGetConfiguration = vscode.workspace.getConfiguration;

		// Mock workspace configuration
		vscode.workspace.getConfiguration = (() => {
			return {
				get: (key: string, defaultValue?: unknown) => {
					if (key === 'roots') {
						return mockConfig.roots;
					}
					return defaultValue;
				},
				update: mockConfig.update,
				has: () => true,
				inspect: () => undefined
			} as unknown as vscode.WorkspaceConfiguration;
		}) as typeof vscode.workspace.getConfiguration;
	});

	teardown(() => {
		// Restore original functions
		vscode.window.showOpenDialog = originalShowOpenDialog;
		vscode.window.showQuickPick = originalShowQuickPick;
		vscode.window.showInformationMessage = originalShowInformationMessage;
		vscode.workspace.getConfiguration = originalGetConfiguration;
	});

	test('should add a new root directory', async () => {
		const testPath = '/test/new/path';
		const normalizedPath = vscode.Uri.file(testPath).fsPath;

		// Mock showOpenDialog
		vscode.window.showOpenDialog = () => {
			return Promise.resolve([vscode.Uri.file(testPath)]);
		};

		// Mock showInformationMessage
		let lastMessage = '';
		vscode.window.showInformationMessage = (message: string) => {
			lastMessage = message;
			return Promise.resolve(undefined);
		};

		await addRootDirectory();

		assert.strictEqual(mockConfig.roots.length, 2);
		assert.ok(mockConfig.roots.includes('${userHome}'));
		assert.ok(mockConfig.roots.includes(normalizedPath));
		assert.ok(lastMessage.includes('Added root directory'));
	});

	test('should not add duplicate root directory', async () => {
		const testPath = '/test/existing/path';
		const normalizedPath = vscode.Uri.file(testPath).fsPath;
		mockConfig.roots = ['${userHome}', normalizedPath];

		// Mock showOpenDialog - try to add existing path
		vscode.window.showOpenDialog = () => {
			return Promise.resolve([vscode.Uri.file(testPath)]);
		};

		// Mock showInformationMessage
		let lastMessage = '';
		vscode.window.showInformationMessage = (message: string) => {
			lastMessage = message;
			return Promise.resolve(undefined);
		};

		await addRootDirectory();

		assert.strictEqual(mockConfig.roots.length, 2);
		assert.ok(lastMessage.includes('already in the roots list'));
	});

	test('should handle cancelled folder selection', async () => {
		// Mock showOpenDialog to return undefined (cancelled)
		vscode.window.showOpenDialog = () => {
			return Promise.resolve(undefined);
		};

		const beforeLength = mockConfig.roots.length;
		await addRootDirectory();

		assert.strictEqual(mockConfig.roots.length, beforeLength);
	});

	test('should remove a root directory', async () => {
		// Add multiple roots
		mockConfig.roots = ['${userHome}', '/test/path1', '/test/path2'];

		// Mock showQuickPick to select second item
		vscode.window.showQuickPick = ((items: unknown) => {
			const itemsArray = items as { label: string }[];
			return Promise.resolve(itemsArray[1]); // Select /test/path1
		}) as unknown as typeof vscode.window.showQuickPick;

		// Mock showInformationMessage
		let lastMessage = '';
		vscode.window.showInformationMessage = (message: string) => {
			lastMessage = message;
			return Promise.resolve(undefined);
		};

		await removeRootDirectory();

		assert.strictEqual(mockConfig.roots.length, 2);
		assert.ok(mockConfig.roots.includes('${userHome}'));
		assert.ok(!mockConfig.roots.includes('/test/path1'));
		assert.ok(mockConfig.roots.includes('/test/path2'));
		assert.ok(lastMessage.includes('Removed root directory'));
	});

	test('should handle cancelled removal selection', async () => {
		mockConfig.roots = ['${userHome}', '/test/path1'];

		// Mock showQuickPick to return undefined (cancelled)
		vscode.window.showQuickPick = () => {
			return Promise.resolve(undefined);
		};

		const beforeLength = mockConfig.roots.length;
		await removeRootDirectory();

		assert.strictEqual(mockConfig.roots.length, beforeLength);
	});

	test('should handle empty roots list when removing', async () => {
		mockConfig.roots = [];

		// Mock showInformationMessage
		let lastMessage = '';
		vscode.window.showInformationMessage = (message: string) => {
			lastMessage = message;
			return Promise.resolve(undefined);
		};

		await removeRootDirectory();

		assert.ok(lastMessage.includes('No root directories configured'));
	});

	test('should list all root directories', () => {
		mockConfig.roots = ['${userHome}', '/test/path1', '/test/path2'];

		// Mock showInformationMessage
		let lastMessage = '';
		vscode.window.showInformationMessage = (message: string) => {
			lastMessage = message;
			return Promise.resolve(undefined);
		};

		listRootDirectories();

		assert.ok(lastMessage.includes('Root directories (3)'));
		assert.ok(lastMessage.includes('${userHome}'));
		assert.ok(lastMessage.includes('/test/path1'));
		assert.ok(lastMessage.includes('/test/path2'));
	});

	test('should handle empty roots list when listing', () => {
		mockConfig.roots = [];

		// Mock showInformationMessage
		let lastMessage = '';
		vscode.window.showInformationMessage = (message: string) => {
			lastMessage = message;
			return Promise.resolve(undefined);
		};

		listRootDirectories();

		assert.ok(lastMessage.includes('No root directories configured'));
	});

	test('should add multiple directories sequentially', async () => {
		const paths = ['/test/path1', '/test/path2', '/test/path3'];
		const normalizedPaths = paths.map(p => vscode.Uri.file(p).fsPath);

		for (const path of paths) {
			// Mock showOpenDialog for each path
			vscode.window.showOpenDialog = () => {
				return Promise.resolve([vscode.Uri.file(path)]);
			};

			// Mock showInformationMessage
			vscode.window.showInformationMessage = () => {
				return Promise.resolve(undefined);
			};

			await addRootDirectory();
		}

		assert.strictEqual(mockConfig.roots.length, 4); // ${userHome} + 3 paths
		assert.ok(mockConfig.roots.includes('${userHome}'));
		for (const normalizedPath of normalizedPaths) {
			assert.ok(mockConfig.roots.includes(normalizedPath));
		}
	});

	test('should remove all roots one by one', async () => {
		mockConfig.roots = ['/test/path1', '/test/path2', '/test/path3'];

		while (mockConfig.roots.length > 0) {
			// Mock showQuickPick to always select first item
			vscode.window.showQuickPick = ((items: unknown) => {
				const itemsArray = items as { label: string }[];
				return Promise.resolve(itemsArray[0]);
			}) as unknown as typeof vscode.window.showQuickPick;

			// Mock showInformationMessage
			vscode.window.showInformationMessage = () => {
				return Promise.resolve(undefined);
			};

			await removeRootDirectory();
		}

		assert.strictEqual(mockConfig.roots.length, 0);
	});

	test('should preserve other configuration when updating roots', async () => {
		// Simulate other configuration existing
		const testPath = '/test/new/path';
		const normalizedPath = vscode.Uri.file(testPath).fsPath;

		// Mock showOpenDialog
		vscode.window.showOpenDialog = () => {
			return Promise.resolve([vscode.Uri.file(testPath)]);
		};

		// Mock showInformationMessage
		vscode.window.showInformationMessage = () => {
			return Promise.resolve(undefined);
		};

		const beforeRoots = [...mockConfig.roots];
		await addRootDirectory();

		// Verify only roots changed
		assert.notDeepStrictEqual(mockConfig.roots, beforeRoots);
		assert.ok(mockConfig.roots.includes(normalizedPath));
	});
});

