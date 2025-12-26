import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getStorageDir, readJson, writeJson } from './FileStore';

const WORKSPACE_FILES_CACHE_FILE = 'workspace-files-cache.json';
const CACHE_VERSION = 1;

export type WorkspaceFilesCacheKeyInput = {
	platform: NodeJS.Platform;
	roots: string[];
	ignoreGlobs: string[];
	respectGitignore: boolean;
	stopAtWorkspaceFile: boolean;
};

export function createWorkspaceFilesCacheSignature(input: WorkspaceFilesCacheKeyInput): string {
	// Keep deterministic ordering
	const normalized = {
		v: CACHE_VERSION,
		platform: input.platform,
		roots: [...input.roots].sort(),
		ignoreGlobs: [...input.ignoreGlobs].sort(),
		respectGitignore: input.respectGitignore,
		stopAtWorkspaceFile: input.stopAtWorkspaceFile
	};

	const json = JSON.stringify(normalized);
	return crypto.createHash('sha1').update(json).digest('hex');
}

type WorkspaceFilesCacheRecord = {
	version: number;
	platform: NodeJS.Platform;
	signature: string;
	savedAt: string;
	files: string[];
	partial: boolean;
};

export class WorkspaceFilesStore {
	async get(signature: string, platform: NodeJS.Platform): Promise<{ files: string[]; partial: boolean } | null> {
		const data = await readJson<WorkspaceFilesCacheRecord | null>(WORKSPACE_FILES_CACHE_FILE, null);
		if (!data) {
			return null;
		}
		if (data.version !== CACHE_VERSION) {
			return null;
		}
		if (data.platform !== platform) {
			return null;
		}
		if (data.signature !== signature) {
			return null;
		}
		return { files: data.files, partial: data.partial };
	}

	async set(
		signature: string,
		platform: NodeJS.Platform,
		files: string[],
		partial: boolean
	): Promise<void> {
		const record: WorkspaceFilesCacheRecord = {
			version: CACHE_VERSION,
			platform,
			signature,
			savedAt: new Date().toISOString(),
			files,
			partial
		};
		await writeJson(WORKSPACE_FILES_CACHE_FILE, record);
	}

	async clear(): Promise<void> {
		const filePath = path.join(getStorageDir(), WORKSPACE_FILES_CACHE_FILE);
		try {
			await fs.unlink(filePath);
		} catch (error) {
			// Missing cache is a normal case
			if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
				return;
			}
			console.error('[workspace-chronicle] Failed to delete workspace scan cache:', error);
			throw error;
		}
	}
}
