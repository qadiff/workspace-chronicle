import * as assert from 'assert';
import * as vscode from 'vscode';
import { getDefaultDirectory } from '../commands/exportImport';

suite('Export/Import Path Logic Test Suite', () => {
	let originalHome: string | undefined;
	let originalUserProfile: string | undefined;

	setup(() => {
		// Save original environment variables
		originalHome = process.env.HOME;
		originalUserProfile = process.env.USERPROFILE;
	});

	teardown(() => {
		// Restore original environment variables
		if (originalHome !== undefined) {
			process.env.HOME = originalHome;
		} else {
			delete process.env.HOME;
		}
		if (originalUserProfile !== undefined) {
			process.env.USERPROFILE = originalUserProfile;
		} else {
			delete process.env.USERPROFILE;
		}
	});

	test('should return workspace directory when workspace file is provided', () => {
		const workspaceUri = vscode.Uri.file('/Users/test/projects/my-workspace/project.code-workspace');
		const result = getDefaultDirectory(workspaceUri);

		assert.strictEqual(result, '/Users/test/projects/my-workspace');
	});

	test('should return workspace directory for nested workspace file', () => {
		const workspaceUri = vscode.Uri.file('/home/user/dev/workspace-files/test.code-workspace');
		const result = getDefaultDirectory(workspaceUri);

		assert.strictEqual(result, '/home/user/dev/workspace-files');
	});

	test('should return HOME when no workspace file is provided', () => {
		process.env.HOME = '/Users/testuser';
		const result = getDefaultDirectory(undefined);

		assert.strictEqual(result, '/Users/testuser');
	});

	test('should return USERPROFILE when HOME is not set', () => {
		delete process.env.HOME;
		process.env.USERPROFILE = 'C:\\Users\\TestUser';
		const result = getDefaultDirectory(undefined);

		assert.strictEqual(result, 'C:\\Users\\TestUser');
	});

	test('should return undefined when no workspace and no HOME/USERPROFILE', () => {
		delete process.env.HOME;
		delete process.env.USERPROFILE;
		const result = getDefaultDirectory(undefined);

		assert.strictEqual(result, undefined);
	});

	test('should ignore non-file scheme workspace URIs', () => {
		process.env.HOME = '/Users/testuser';
		const workspaceUri = vscode.Uri.parse('untitled:/workspace.code-workspace');
		const result = getDefaultDirectory(workspaceUri);

		// Should fall back to HOME since scheme is not 'file'
		assert.strictEqual(result, '/Users/testuser');
	});

	test('should handle paths with special characters', () => {
		const workspaceUri = vscode.Uri.file('/Users/Test User/My Documents/workspace.code-workspace');
		const result = getDefaultDirectory(workspaceUri);

		assert.strictEqual(result, '/Users/Test User/My Documents');
	});

	test('should handle workspace file at root directory', () => {
		const workspaceUri = vscode.Uri.file('/workspace.code-workspace');
		const result = getDefaultDirectory(workspaceUri);

		assert.strictEqual(result, '/');
	});

	test('should prefer HOME over USERPROFILE when both are set', () => {
		process.env.HOME = '/Users/testuser';
		process.env.USERPROFILE = 'C:\\Users\\TestUser';
		const result = getDefaultDirectory(undefined);

		assert.strictEqual(result, '/Users/testuser');
	});
});
