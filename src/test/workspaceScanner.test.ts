import * as assert from 'assert';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { type Ignore } from 'ignore';
import {
	createGlobIgnoreMatcher,
	scanForWorkspaceFiles
} from '../tree/workspaceScanner';

async function makeTempDir(): Promise<string> {
	return fs.mkdtemp(path.join(os.tmpdir(), 'workspace-chronicle-test-'));
}

async function writeFile(filePath: string, content = ''): Promise<void> {
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, content, 'utf8');
}

async function cleanupTempDir(dir: string): Promise<void> {
	await fs.rm(dir, { recursive: true, force: true });
}

async function runScan(root: string, opts: { respectGitignore: boolean; stopAtWorkspaceFile: boolean; ignoreGlobs?: string[] }) {
	const found = new Set<string>();
	const gitignoreCache = new Map<string, Ignore | null>();
	const isGlobIgnored = createGlobIgnoreMatcher(opts.ignoreGlobs ?? []);

	await scanForWorkspaceFiles(root, {
		deadline: Date.now() + 60_000,
		respectGitignore: opts.respectGitignore,
		stopAtWorkspaceFile: opts.stopAtWorkspaceFile,
		gitignoreCache,
		isGlobIgnored,
		onFound: (p) => found.add(p),
		isAborted: () => false
	});

	return Array.from(found).sort();
}

suite('WorkspaceScanner Test Suite', () => {
	test('respects ignore globs', async () => {
		const dir = await makeTempDir();
		try {
			await writeFile(path.join(dir, 'go/pkg/a.code-workspace'), '{}');
			await writeFile(path.join(dir, 'go/src/b.code-workspace'), '{}');

			const results = await runScan(dir, {
				respectGitignore: false,
				stopAtWorkspaceFile: false,
				ignoreGlobs: ['**/go/pkg/**']
			});

			assert.strictEqual(results.length, 1);
			assert.ok(results[0].endsWith(path.join('go', 'src', 'b.code-workspace')));
		} finally {
			await cleanupTempDir(dir);
		}
	});

	test('respects .gitignore when enabled', async () => {
		const dir = await makeTempDir();
		try {
			await writeFile(path.join(dir, '.gitignore'), 'ignored/\n');
			await writeFile(path.join(dir, 'ignored/a.code-workspace'), '{}');
			await writeFile(path.join(dir, 'ok/b.code-workspace'), '{}');

			const results = await runScan(dir, {
				respectGitignore: true,
				stopAtWorkspaceFile: false
			});

			assert.strictEqual(results.length, 1);
			assert.ok(results[0].endsWith(path.join('ok', 'b.code-workspace')));
		} finally {
			await cleanupTempDir(dir);
		}
	});

	test('does not use .gitignore when disabled', async () => {
		const dir = await makeTempDir();
		try {
			await writeFile(path.join(dir, '.gitignore'), 'ignored/\n');
			await writeFile(path.join(dir, 'ignored/a.code-workspace'), '{}');
			await writeFile(path.join(dir, 'ok/b.code-workspace'), '{}');

			const results = await runScan(dir, {
				respectGitignore: false,
				stopAtWorkspaceFile: false
			});

			assert.strictEqual(results.length, 2);
			assert.ok(results.some((p) => p.endsWith(path.join('ignored', 'a.code-workspace'))));
			assert.ok(results.some((p) => p.endsWith(path.join('ok', 'b.code-workspace'))));
		} finally {
			await cleanupTempDir(dir);
		}
	});

	test('prunes subtree when workspace file found (stopAtWorkspaceFile=true)', async () => {
		const dir = await makeTempDir();
		try {
			await writeFile(path.join(dir, 'proj/proj.code-workspace'), '{}');
			await writeFile(path.join(dir, 'proj/deep/deep.code-workspace'), '{}');

			const results = await runScan(dir, {
				respectGitignore: false,
				stopAtWorkspaceFile: true
			});

			assert.strictEqual(results.length, 1);
			assert.ok(results[0].endsWith(path.join('proj', 'proj.code-workspace')));
		} finally {
			await cleanupTempDir(dir);
		}
	});

	test('does not prune when stopAtWorkspaceFile=false', async () => {
		const dir = await makeTempDir();
		try {
			await writeFile(path.join(dir, 'proj/proj.code-workspace'), '{}');
			await writeFile(path.join(dir, 'proj/deep/deep.code-workspace'), '{}');

			const results = await runScan(dir, {
				respectGitignore: false,
				stopAtWorkspaceFile: false
			});

			assert.strictEqual(results.length, 2);
			assert.ok(results.some((p) => p.endsWith(path.join('proj', 'proj.code-workspace'))));
			assert.ok(results.some((p) => p.endsWith(path.join('proj', 'deep', 'deep.code-workspace'))));
		} finally {
			await cleanupTempDir(dir);
		}
	});

	test('respects nested .gitignore rules', async () => {
		const dir = await makeTempDir();
		try {
			await writeFile(path.join(dir, 'sub/.gitignore'), 'skip/\n');
			await writeFile(path.join(dir, 'sub/skip/x.code-workspace'), '{}');
			await writeFile(path.join(dir, 'sub/keep/y.code-workspace'), '{}');

			const results = await runScan(dir, {
				respectGitignore: true,
				stopAtWorkspaceFile: false
			});

			assert.strictEqual(results.length, 1);
			assert.ok(results[0].endsWith(path.join('sub', 'keep', 'y.code-workspace')));
		} finally {
			await cleanupTempDir(dir);
		}
	});
});
