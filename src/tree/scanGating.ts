export type ScanGatingInput = {
	hasFolderOpen: boolean;
	workspaceFileOpen: boolean;
	scanWhenNoFolderOpen: boolean;
	scanWhenWorkspaceFileOpen: boolean;
};

export function shouldScanWorkspaceFiles(input: ScanGatingInput): boolean {
	const allowEmptyWindow = input.scanWhenNoFolderOpen || input.hasFolderOpen;
	const allowWhenWorkspaceFileOpen = !input.workspaceFileOpen || input.scanWhenWorkspaceFileOpen;
	return allowEmptyWindow && allowWhenWorkspaceFileOpen;
}
