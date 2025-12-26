import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import ignore, { type Ignore } from 'ignore';
import picomatch from 'picomatch';
import { MetaStore } from '../store/MetaStore';
import { HistoryStore } from '../store/HistoryStore';

// Default scan timeout in milliseconds (30 seconds)
const DEFAULT_SCAN_TIMEOUT_MS = 30000;

// Default interval (ms) for updating the tree during scanning
const DEFAULT_SCAN_UPDATE_INTERVAL_MS = 500;

// Built-in ignore globs. Keep this conservative and broadly applicable.
// Users can extend via settings.
const DEFAULT_IGNORE_GLOBS: string[] = [
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

type GitIgnoreCtx = {
	baseDir: string;
	ig: Ignore;
};

export class WorkspacesProvider implements vscode.TreeDataProvider<WorkspaceItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
	private tagFilter: { type: 'label' | 'color'; value: string } | null = null;
	private nameFilter: string = '';
	private cachedWorkspaceFiles: string[] = [];
	private isRefreshing = false;
	private refreshTimeout?: NodeJS.Timeout;
	private refreshPromise?: Promise<void>;
	private refreshGeneration = 0;
	private scanAborted = false;

	constructor(private meta: MetaStore, private history: HistoryStore) {}

	refresh() {
		const generation = ++this.refreshGeneration;
		// Debounce: clear existing timeout
		if (this.refreshTimeout) {
			clearTimeout(this.refreshTimeout);
		}

		this.cachedWorkspaceFiles = [];
		this._onDidChangeTreeData.fire();

		// Debounce refresh to avoid rapid consecutive calls
		this.refreshTimeout = setTimeout(() => {
			void this.refreshWorkspaceFiles(generation);
		}, 100);
	}

	private applyUpdate(files: string[], generation: number) {
		if (generation !== this.refreshGeneration) {
			return;
		}
		this.cachedWorkspaceFiles = files;
		this._onDidChangeTreeData.fire();
	}

	private async refreshWorkspaceFiles(generation: number): Promise<void> {
		const config = vscode.workspace.getConfiguration('workspaceChronicle');
		const scanWhenWorkspaceFileOpen = config.get<boolean>('scanWhenWorkspaceFileOpen') ?? false;
		const scanUpdateIntervalMs =
			config.get<number>('scanUpdateIntervalMs') ?? DEFAULT_SCAN_UPDATE_INTERVAL_MS;

		// Only scan when a folder is open, and (by default) no multi-root workspace file is active
		const workspaceFolders = vscode.workspace.workspaceFolders;
		const workspaceFile = vscode.workspace.workspaceFile;
		const shouldSearch =
			Array.isArray(workspaceFolders) &&
			workspaceFolders.length > 0 &&
			(!workspaceFile || scanWhenWorkspaceFileOpen);
		if (!shouldSearch) {
			this.applyUpdate([], generation);
			return;
		}

		if (this.isRefreshing) {
			// Wait for current refresh then run again with the latest generation
			return (this.refreshPromise = this.refreshPromise?.then(() => this.refreshWorkspaceFiles(generation)));
		}

		this.isRefreshing = true;
		this.scanAborted = false;
		this.refreshPromise = (async () => {
			try {
				const roots = config.get<string[]>('roots') || [];
				const timeoutMs = config.get<number>('scanTimeoutMs') ?? DEFAULT_SCAN_TIMEOUT_MS;
				const scanUseDefaultIgnore = config.get<boolean>('scanUseDefaultIgnore') ?? true;
				const scanIgnore = config.get<string[]>('scanIgnore') ?? [];
				const scanRespectGitignore = config.get<boolean>('scanRespectGitignore') ?? true;
				const scanStopAtWorkspaceFile = config.get<boolean>('scanStopAtWorkspaceFile') ?? true;

				const expandedRoots = roots.map(expandPath).filter(Boolean);
				const uniqueRoots = Array.from(new Set(expandedRoots));
				const allFiles = new Set<string>();

				const ignoreGlobs = [
					...(scanUseDefaultIgnore ? DEFAULT_IGNORE_GLOBS : []),
					...scanIgnore
				];
				const isGlobIgnored = picomatch(ignoreGlobs, {
					dot: true,
					nocase: true
				});

				const deadline = Date.now() + timeoutMs;
				let lastUpdateAt = 0;
				const maybeUpdate = () => {
					const now = Date.now();
					if (scanUpdateIntervalMs <= 0 || now - lastUpdateAt >= scanUpdateIntervalMs) {
						lastUpdateAt = now;
						this.applyUpdate(Array.from(allFiles), generation);
					}
				};

				const gitignoreCache = new Map<string, Ignore | null>();

				for (const root of uniqueRoots) {
					if (this.scanAborted) {
						break;
					}
					if (Date.now() > deadline) {
						this.scanAborted = true;
						break;
					}

					await scanForWorkspaceFiles(root, {
						deadline,
						respectGitignore: scanRespectGitignore,
						stopAtWorkspaceFile: scanStopAtWorkspaceFile,
						gitignoreCache,
						isGlobIgnored: (fullPath: string) => isGlobIgnored(toPosix(fullPath)),
						onFound: (file) => {
							allFiles.add(file);
							maybeUpdate();
						},
						isAborted: () => this.scanAborted
					});
				}

				if (Date.now() > deadline) {
					this.scanAborted = true;
				}

				if (this.scanAborted) {
					console.log(
						`[WorkspacesProvider] Scan timed out after ${timeoutMs}ms. Found ${allFiles.size} workspace files (partial).`
					);
				} else {
					console.log(
						`[WorkspacesProvider] Found ${allFiles.size} workspace files across ${uniqueRoots.length} roots`
					);
				}

				this.applyUpdate(Array.from(allFiles), generation);
			} catch (error) {
				console.error('[WorkspacesProvider] Error refreshing workspace files:', error);
			} finally {
				this.isRefreshing = false;
				this.scanAborted = false;
				this.refreshPromise = undefined;
			}
		})();

		return this.refreshPromise;
	}

	setTagFilter(type: 'label' | 'color', value: string) {
		this.tagFilter = { type, value };
		this._onDidChangeTreeData.fire();
	}

	setNameFilter(keyword: string) {
		this.nameFilter = keyword.toLowerCase();
		this._onDidChangeTreeData.fire();
	}

	clearTagFilter() {
		this.tagFilter = null;
		this._onDidChangeTreeData.fire();
	}

	clearNameFilter() {
		this.nameFilter = '';
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: WorkspaceItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: WorkspaceItem): Promise<WorkspaceItem[]> {
		if (element) {
			return [];
		}

		// Wait for initial refresh if cache is empty
		if (this.cachedWorkspaceFiles.length === 0) {
			await this.refreshWorkspaceFiles(this.refreshGeneration);
		}

		const items: WorkspaceItem[] = [];
		for (const file of this.cachedWorkspaceFiles) {
			const meta = await this.meta.get(file);

			const displayLabel = meta?.label || path.basename(file);

			// Apply name/path filter
			if (this.nameFilter) {
				const labelLower = displayLabel.toLowerCase();
				const pathLower = file.toLowerCase();
				if (!labelLower.includes(this.nameFilter) && !pathLower.includes(this.nameFilter)) {
					continue;
				}
			}

			// Apply tag filter
			if (this.tagFilter) {
				if (this.tagFilter.type === 'label' && meta?.label !== this.tagFilter.value) {
					continue;
				}
				if (this.tagFilter.type === 'color' && meta?.color !== this.tagFilter.value) {
					continue;
				}
			}

			const item = new WorkspaceItem(displayLabel, file, meta?.color);
			items.push(item);
		}

		// Sort by label
		items.sort((a, b) => {
			const labelA = typeof a.label === 'string' ? a.label : '';
			const labelB = typeof b.label === 'string' ? b.label : '';
			return labelA.localeCompare(labelB);
		});
		return items;
	}
}

class WorkspaceItem extends vscode.TreeItem {
	constructor(public readonly label: string, public readonly fullPath: string, color?: string) {
		super(label, vscode.TreeItemCollapsibleState.None);
		this.description = fullPath;
		this.command = {
			command: 'workspaceChronicle.open',
			title: 'Open Workspace',
			arguments: [fullPath]
		};
		this.tooltip = `${label}\n${fullPath}`;
		if (color) {
			// Create SVG icon with custom color
			const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="${encodeColor(color)}"/></svg>`;
			const svgDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
			this.iconPath = vscode.Uri.parse(svgDataUri);
		}
		this.contextValue = 'workspaceItem';
	}
}

function encodeColor(color: string): string {
	// If color starts with #, use it as-is
	if (color.startsWith('#')) {
		return color;
	}
	// If it's a named color, use it as-is
	return color;
}

function expandPath(p: string) {
	const homeDir = process.env.HOME || process.env.USERPROFILE || '';
	if (p.startsWith('~')) {
		return path.join(homeDir, p.slice(1));
	}
	if (p.includes('${userHome}')) {
		return p.replace(/\$\{userHome\}/g, homeDir);
	}
	return p;
}

function toPosix(p: string): string {
	return p.split(path.sep).join('/');
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
		const rel = toPosix(path.relative(ctx.baseDir, fullPath));
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

async function scanForWorkspaceFiles(
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
