import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { type Ignore } from 'ignore';
import { MetaStore } from '../store/MetaStore';
import { HistoryStore } from '../store/HistoryStore';
import {
	createWorkspaceFilesCacheSignature,
	WorkspaceFilesStore
} from '../store/WorkspaceFilesStore';
import {
	DEFAULT_IGNORE_GLOBS,
	createGlobIgnoreMatcher,
	scanForWorkspaceFiles
} from './workspaceScanner';
import { shouldScanWorkspaceFiles } from './scanGating';

// Default scan timeout in milliseconds (30 seconds)
const DEFAULT_SCAN_TIMEOUT_MS = 30000;

// Default interval (ms) for updating the tree during scanning
const DEFAULT_SCAN_UPDATE_INTERVAL_MS = 500;

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

	constructor(
		private meta: MetaStore,
		private history: HistoryStore,
		private workspaceFiles: WorkspaceFilesStore
	) {}

	async clearScanCacheAndRescan(): Promise<void> {
		await this.workspaceFiles.clear();
		this.cachedWorkspaceFiles = [];
		this._onDidChangeTreeData.fire();
		const generation = ++this.refreshGeneration;
		void this.refreshWorkspaceFiles(generation, { forceScan: true });
	}

	refresh() {
		const generation = ++this.refreshGeneration;
		// Debounce: clear existing timeout
		if (this.refreshTimeout) {
			clearTimeout(this.refreshTimeout);
		}

		// Keep existing results visible while refreshing.
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

	private async refreshWorkspaceFiles(
		generation: number,
		options?: {
			forceScan?: boolean;
		}
	): Promise<void> {
		const config = vscode.workspace.getConfiguration('workspaceChronicle');
		const scanWhenWorkspaceFileOpen = config.get<boolean>('scanWhenWorkspaceFileOpen') ?? true;
		const scanWhenNoFolderOpen = config.get<boolean>('scanWhenNoFolderOpen') ?? true;
		const scanUpdateIntervalMs =
			config.get<number>('scanUpdateIntervalMs') ?? DEFAULT_SCAN_UPDATE_INTERVAL_MS;

		// Scan based on configured roots. By default, also scan when a multi-root workspace file is open.
		const workspaceFile = vscode.workspace.workspaceFile;
		const workspaceFolders = vscode.workspace.workspaceFolders;
		const hasFolderOpen = Array.isArray(workspaceFolders) && workspaceFolders.length > 0;
		const shouldSearch = shouldScanWorkspaceFiles({
			hasFolderOpen,
			workspaceFileOpen: Boolean(workspaceFile),
			scanWhenNoFolderOpen,
			scanWhenWorkspaceFileOpen
		});

		// Always try to show persisted cache immediately (even when scanning is gated off).
		// This avoids "0 from scratch" while still honoring scan gating by not scanning.
		const roots = config.get<string[]>('roots') || [];
		const scanUseDefaultIgnore = config.get<boolean>('scanUseDefaultIgnore') ?? true;
		const scanIgnore = config.get<string[]>('scanIgnore') ?? [];
		const scanRespectGitignore = config.get<boolean>('scanRespectGitignore') ?? true;
		const scanStopAtWorkspaceFile = config.get<boolean>('scanStopAtWorkspaceFile') ?? true;
		const expandedRoots = roots.map(expandPath).filter(Boolean);
		const uniqueRoots = Array.from(new Set(expandedRoots));
		const ignoreGlobs = [
			...(scanUseDefaultIgnore ? DEFAULT_IGNORE_GLOBS : []),
			...scanIgnore
		];
		if (process.platform === 'win32') {
			ignoreGlobs.push('**/AppData/**');
			ignoreGlobs.push('**/Application Data/**');
		}
		// Exclude user-home config dirs only when scanning the home root itself.
		const homeDir = path.resolve(os.homedir());
		for (const root of uniqueRoots) {
			if (path.resolve(root) !== homeDir) {
				continue;
			}
			const toPosixGlob = (p: string) => p.split(path.sep).join('/');
			ignoreGlobs.push(`${toPosixGlob(path.join(root, '.vscode'))}/**`);
			ignoreGlobs.push(`${toPosixGlob(path.join(root, '.kiro'))}/**`);
		}
		const signature = createWorkspaceFilesCacheSignature({
			platform: process.platform,
			roots: uniqueRoots,
			ignoreGlobs,
			respectGitignore: scanRespectGitignore,
			stopAtWorkspaceFile: scanStopAtWorkspaceFile
		});

		if (this.cachedWorkspaceFiles.length === 0) {
			try {
				const cached = await this.workspaceFiles.get(signature, process.platform);
				if (cached && cached.files.length > 0) {
					this.applyUpdate(cached.files, generation);
				}
			} catch (error) {
				console.error('[WorkspacesProvider] Failed to load workspace-files cache:', error);
			}
		}

		if (!shouldSearch && !options?.forceScan) {
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
				if (roots.length === 0) {
					this.applyUpdate([], generation);
					return;
				}
				const timeoutMs = config.get<number>('scanTimeoutMs') ?? DEFAULT_SCAN_TIMEOUT_MS;

				const allFiles = new Set<string>();
				const isGlobIgnored = createGlobIgnoreMatcher(ignoreGlobs);

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
						isGlobIgnored,
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

				const finalFiles = Array.from(allFiles);
				this.applyUpdate(finalFiles, generation);
				try {
					await this.workspaceFiles.set(signature, process.platform, finalFiles, this.scanAborted);
				} catch (error) {
					console.error('[WorkspacesProvider] Failed to persist workspace-files cache:', error);
				}
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
	const homeDrive = process.env.HOMEDRIVE;
	const homePath = process.env.HOMEPATH;
	const envHome = process.env.HOME || process.env.USERPROFILE;
	const homeDir = os.homedir() || envHome || (homeDrive && homePath ? path.join(homeDrive, homePath) : '');
	if (p.startsWith('~')) {
		return path.join(homeDir, p.slice(1));
	}
	if (p.includes('${userHome}')) {
		return p.replace(/\$\{userHome\}/g, homeDir);
	}
	return p;
}
