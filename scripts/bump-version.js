#!/usr/bin/env node

/**
 * Version management script for workspace-chronicle
 *
 * Usage:
 *   node scripts/bump-version.js          # Increment patch version (0.0.8 -> 0.0.9)
 *   node scripts/bump-version.js --down   # Decrement patch version (0.0.9 -> 0.0.8)
 *   node scripts/bump-version.js --tag    # Create git tag for current version
 *   node scripts/bump-version.js --untag  # Delete git tag for current version
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packageJsonPath = path.join(__dirname, '..', 'package.json');

function readPackageJson() {
	return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
}

function writePackageJson(packageJson) {
	fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 4) + '\n', 'utf-8');
}

function validateVersionFormat(version) {
	if (!/^\d+\.\d+\.\d+$/.test(version)) {
		throw new Error(`Invalid version format: ${version} (must be digits and dots only, e.g., 1.2.3)`);
	}
}

function parseVersion(version) {
	validateVersionFormat(version);
	const parts = version.split('.');
	if (parts.length !== 3) {
		throw new Error(`Invalid version format: ${version}`);
	}
	const patch = parseInt(parts[2], 10);
	if (isNaN(patch)) {
		throw new Error(`Invalid patch version: ${parts[2]} is not a valid number`);
	}
	return {
		major: parts[0],
		minor: parts[1],
		patch
	};
}

function formatVersion({ major, minor, patch }) {
	return `${major}.${minor}.${patch}`;
}

function bumpPatch(currentPatch, direction) {
	if (direction === 'up') {
		return currentPatch + 1;
	} else if (direction === 'down') {
		if (currentPatch <= 0) {
			throw new Error('Cannot decrement: patch version is already 0');
		}
		return currentPatch - 1;
	}
	return currentPatch;
}

function bumpVersion(direction) {
	const packageJson = readPackageJson();
	const currentVersion = packageJson.version;
	const parsed = parseVersion(currentVersion);

	parsed.patch = bumpPatch(parsed.patch, direction);

	const newVersion = formatVersion(parsed);
	packageJson.version = newVersion;
	writePackageJson(packageJson);

	console.log(`Version ${direction === 'up' ? 'bumped' : 'decremented'}: ${currentVersion} -> ${newVersion}`);
	return newVersion;
}

function tagExists(tag) {
	try {
		execSync(`git rev-parse ${tag}`, { stdio: 'pipe' });
		return true;
	} catch {
		return false;
	}
}

function createTag() {
	const packageJson = readPackageJson();
	const version = packageJson.version;
	validateVersionFormat(version);
	const tag = `v${version}`;

	if (tagExists(tag)) {
		console.error(`Tag ${tag} already exists. Use --untag to remove it first.`);
		process.exit(1);
	}

	try {
		execSync(`git tag ${tag}`, { stdio: 'inherit' });
		console.log(`Created tag: ${tag}`);
		console.log(`To push: git push origin ${tag}`);
	} catch (error) {
		console.error('Failed to create tag:', error.message);
		process.exit(1);
	}
}

function deleteTag() {
	const packageJson = readPackageJson();
	const version = packageJson.version;
	validateVersionFormat(version);
	const tag = `v${version}`;

	try {
		// Delete local tag
		execSync(`git tag -d ${tag}`, { stdio: 'inherit' });
		console.log(`Deleted local tag: ${tag}`);

		// Ask about remote
		console.log(`To delete remote tag: git push origin --delete ${tag}`);
	} catch (error) {
		console.error('Failed to delete tag:', error.message);
		process.exit(1);
	}
}

function showHelp() {
	console.log(`
Version management script for workspace-chronicle

Usage:
  npm run bump              Increment patch version (0.0.8 -> 0.0.9)
  npm run bump:down         Decrement patch version (0.0.9 -> 0.0.8)
  npm run version:tag       Create git tag for current version
  npm run version:untag     Delete git tag for current version

Direct usage:
  node scripts/bump-version.js [options]

Options:
  --up      Increment patch version (default)
  --down    Decrement patch version
  --tag     Create git tag (v0.0.x)
  --untag   Delete git tag (v0.0.x)
  --help    Show this help
`);
}

// Export functions for testing
module.exports = {
	validateVersionFormat,
	parseVersion,
	formatVersion,
	bumpPatch,
	tagExists,
};

// Only run CLI when executed directly
if (require.main === module) {
	const args = process.argv.slice(2);

	if (args.includes('--help') || args.includes('-h')) {
		showHelp();
		process.exit(0);
	}

	if (args.includes('--tag')) {
		createTag();
	} else if (args.includes('--untag')) {
		deleteTag();
	} else if (args.includes('--down')) {
		bumpVersion('down');
	} else {
		// Default: increment
		bumpVersion('up');
	}
}
