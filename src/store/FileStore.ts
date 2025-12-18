import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const APP_NAME = 'workspace-chronicle';

// Allow overriding storage directory for testing
let storageDirOverride: string | null = null;

export function setStorageDirOverride(dir: string | null): void {
	storageDirOverride = dir;
}

function getAppDataDir(): string {
	switch (process.platform) {
		case 'win32':
			return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), APP_NAME);
		case 'darwin':
			return path.join(os.homedir(), 'Library', 'Application Support', APP_NAME);
		default:
			// Linux and others: follow XDG Base Directory specification
			return path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), APP_NAME);
	}
}

export function getStorageDir(): string {
	if (storageDirOverride) {
		return storageDirOverride;
	}
	return getAppDataDir();
}

export async function ensureStorageDir(): Promise<void> {
	const dir = getStorageDir();
	await fs.mkdir(dir, { recursive: true });
}

export async function readJson<T>(filename: string, defaultValue: T): Promise<T> {
	try {
		const filePath = path.join(getStorageDir(), filename);
		const content = await fs.readFile(filePath, 'utf-8');
		return JSON.parse(content) as T;
	} catch {
		return defaultValue;
	}
}

export async function writeJson<T>(filename: string, data: T): Promise<void> {
	await ensureStorageDir();
	const filePath = path.join(getStorageDir(), filename);
	await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function fileExists(filename: string): Promise<boolean> {
	try {
		const filePath = path.join(getStorageDir(), filename);
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}
