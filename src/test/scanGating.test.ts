import * as assert from 'assert';
import { shouldScanWorkspaceFiles } from '../tree/scanGating';

suite('ScanGating Test Suite', () => {
	test('blocks scan in empty window when scanWhenNoFolderOpen=false', () => {
		assert.strictEqual(
			shouldScanWorkspaceFiles({
				hasFolderOpen: false,
				workspaceFileOpen: false,
				scanWhenNoFolderOpen: false,
				scanWhenWorkspaceFileOpen: true
			}),
			false
		);
	});

	test('allows scan in empty window when scanWhenNoFolderOpen=true', () => {
		assert.strictEqual(
			shouldScanWorkspaceFiles({
				hasFolderOpen: false,
				workspaceFileOpen: false,
				scanWhenNoFolderOpen: true,
				scanWhenWorkspaceFileOpen: true
			}),
			true
		);
	});

	test('blocks scan when workspace file is open and scanWhenWorkspaceFileOpen=false', () => {
		assert.strictEqual(
			shouldScanWorkspaceFiles({
				hasFolderOpen: true,
				workspaceFileOpen: true,
				scanWhenNoFolderOpen: true,
				scanWhenWorkspaceFileOpen: false
			}),
			false
		);
	});

	test('allows scan when workspace file is open and scanWhenWorkspaceFileOpen=true', () => {
		assert.strictEqual(
			shouldScanWorkspaceFiles({
				hasFolderOpen: true,
				workspaceFileOpen: true,
				scanWhenNoFolderOpen: true,
				scanWhenWorkspaceFileOpen: true
			}),
			true
		);
	});
});
