import * as path from 'path';
import * as fs from 'fs/promises';
import ignore, { type Ignore } from 'ignore';
import picomatch from 'picomatch';

// Built-in ignore globs. Keep this conservative and broadly applicable.
// Users can extend via settings.
export const DEFAULT_IGNORE_GLOBS: string[] = [
	'**/.git/**',
	'**/.hg/**',
	'**/.svn/**',
	'**/node_modules/**',
	'**/bower_components/**',
	'**/vendor/**',

	// Java / JVM
	'**/.gradle/**',
	'**/target/**',

	// Rust
	'**/target/**',

	// .NET (C#/F#)
	'**/bin/**',
	'**/obj/**',

	// Python
	'**/__pycache__/**',
	'**/.venv/**',
	'**/venv/**',
	'**/.tox/**',
	'**/.mypy_cache/**',
	'**/.pytest_cache/**',
	'**/.ruff_cache/**',

	// Node/JS tooling
	'**/.next/**',
	'**/.nuxt/**',
	'**/.turbo/**',
	'**/.yarn/**',
	'**/.pnpm-store/**',

	// Ruby
	'**/.bundle/**',
	'**/vendor/bundle/**',

	// Common build outputs
	'**/dist/**',
	'**/build/**',
	'**/out/**',
	'**/coverage/**',

	// Editor/cache dirs
	'**/.idea/**',
	'**/.cache/**'
];

export type GitIgnoreCtx = {
	baseDir: string;
	ig: Ignore;
};

export function toPosixPath(p: string): string {
	return p.split(path.sep).join('/');
}

export function createGlobIgnoreMatcher(globs: string[]): (fullPath: string) => boolean {
	const matcher = picomatch(globs, {
		dot: true,
		nocase: true
	});
	return (fullPath: string) => matcher(toPosixPath(fullPath));
}

async function getGitignoreForDir(dir: string, cache: Map<string, Ignore | null>): Promise<Ignore | null> {
	if (cache.has(dir)) {
		return cache.get(dir) ?? null;
	}

	try {
		const gitignorePath = path.join(dir, '.gitignore');
		const content = await fs.readFile(gitignorePath, 'utf8');
		const lines = content
			.split(/\r?\n/g)
			.map((l) => l.trimEnd())
			.filter((l) => l.length > 0 && !l.startsWith('#'));

		if (lines.length === 0) {
			cache.set(dir, null);
			return null;
		}

		const ig = ignore();
		ig.add(lines);
		cache.set(dir, ig);
		return ig;
	} catch {
		cache.set(dir, null);
		return null;
	}
}

function isIgnoredByGitignore(chain: GitIgnoreCtx[], fullPath: string, isDir: boolean): boolean {
	// Apply parent -> child; child rules can unignore what parent ignored.
	let ignored = false;
	for (const ctx of chain) {
		const rel = toPosixPath(path.relative(ctx.baseDir, fullPath));
		if (!rel || rel.startsWith('..')) {
			continue;
		}

		const testPath = isDir ? `${rel}/` : rel;
		const res = ctx.ig.test(testPath);
		if (res.unignored) {
			ignored = false;
		} else if (res.ignored) {
			ignored = true;
		}
	}
	return ignored;
}

export async function scanForWorkspaceFiles(
	root: string,
	opts: {
		deadline: number;
		respectGitignore: boolean;
		stopAtWorkspaceFile: boolean;
		gitignoreCache: Map<string, Ignore | null>;
		isGlobIgnored: (fullPath: string) => boolean;
		onFound: (fullPath: string) => void;
		isAborted: () => boolean;
	}
): Promise<void> {
	type Node = { dir: string; gitignores: GitIgnoreCtx[] };
	const stack: Node[] = [{ dir: root, gitignores: [] }];

	while (stack.length > 0) {
		if (opts.isAborted()) {
			return;
		}
		if (Date.now() > opts.deadline) {
			return;
		}

		const { dir, gitignores } = stack.pop()!;

		// Glob ignores first
		if (opts.isGlobIgnored(dir + path.sep)) {
			continue;
		}

		// Gitignore: if this directory is ignored by any .gitignore in the chain, skip it
		if (opts.respectGitignore && isIgnoredByGitignore(gitignores, dir, true)) {
			continue;
		}

		// Extend gitignore chain if .gitignore exists here
		let nextGitignores = gitignores;
		if (opts.respectGitignore) {
			const ig = await getGitignoreForDir(dir, opts.gitignoreCache);
			if (ig) {
				nextGitignores = [...gitignores, { baseDir: dir, ig }];
			}
		}

		let entries: import('fs').Dirent[];
		try {
			entries = await fs.readdir(dir, { withFileTypes: true });
		} catch {
			continue;
		}

		// Pass 1: find workspace files in this directory
		let foundHere = false;
		for (const ent of entries) {
			if (!ent.isFile()) {
				continue;
			}
			if (!ent.name.endsWith('.code-workspace')) {
				continue;
			}

			const full = path.join(dir, ent.name);

			if (opts.isGlobIgnored(full)) {
				continue;
			}
			if (opts.respectGitignore && isIgnoredByGitignore(nextGitignores, full, false)) {
				continue;
			}

			foundHere = true;
			opts.onFound(full);
		}

		// Branch pruning: if we found any .code-workspace here, optionally do not descend
		if (foundHere && opts.stopAtWorkspaceFile) {
			continue;
		}

		// Pass 2: descend into subdirectories
		for (const ent of entries) {
			if (!ent.isDirectory()) {
				continue;
			}
			if (ent.isSymbolicLink()) {
				continue;
			}

			const child = path.join(dir, ent.name);
			if (opts.isGlobIgnored(child + path.sep)) {
				continue;
			}
			if (opts.respectGitignore && isIgnoredByGitignore(nextGitignores, child, true)) {
				continue;
			}

			stack.push({ dir: child, gitignores: nextGitignores });
		}
	}
}
