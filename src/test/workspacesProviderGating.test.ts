import * as assert from 'assert';
import { shouldScanWorkspaceFiles } from '../tree/scanGating';

suite('WorkspacesProvider gating Test Suite', () => {
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
});
